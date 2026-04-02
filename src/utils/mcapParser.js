/**
 * MCAP Log Parser
 *
 * Reads an MCAP file (ArrayBuffer) and returns a normalized data structure
 * compatible with the ManipulationReplay app.
 *
 * Supported message encodings: json
 * Supported topics:
 *   /joint_states, /gripper_state, /hand_state, /tactile_sensors,
 *   /system_monitor, /manipulation_events, /rosout, /robot_configuration,
 *   /performance_metrics
 */

import { McapStreamReader } from '@mcap/core'

// ── constants ─────────────────────────────────────────────────────────────────

const R2D = 180 / Math.PI           // radians → degrees
const TIMESERIES_STEP_S = 2         // resample interval in seconds
const CHART_WINDOW_POINTS = 60      // number of points in the rolling chart window

// ROS log levels → label
const ROS_LEVEL = { 1: 'DEBUG', 2: 'INFO', 4: 'WARN', 8: 'ERROR', 16: 'FATAL' }

// manipulation_event type → log level
const EVENT_LEVEL = { info: 'INFO', warning: 'WARN', error: 'ERROR', critical: 'ERROR' }

// ── progress callback helper ──────────────────────────────────────────────────

function noop() {}

// ── main parser ───────────────────────────────────────────────────────────────

/**
 * @param {ArrayBuffer} buffer  - MCAP file bytes
 * @param {function}    onProgress - called with (pct: 0-100, label: string)
 * @returns {Promise<ParsedLog>}
 */
export async function parseMcap(buffer, onProgress = noop) {
  const uint8 = new Uint8Array(buffer)
  const dec   = new TextDecoder()

  onProgress(5, 'Reading MCAP structure…')

  // ── pass 1: collect all records ──────────────────────────────────────────

  const reader   = new McapStreamReader({ validateCrcs: false })
  reader.append(uint8)

  const schemas  = new Map()   // id → schema record
  const channels = new Map()   // id → channel record
  // messages bucketed by topic: Map<topic, Array<{logTime: BigInt, data: any}>>
  const byTopic  = new Map()

  let msgCount = 0
  let record

  while ((record = reader.nextRecord()) !== undefined) {
    switch (record.type) {
      case 'Schema':
        schemas.set(record.id, record)
        break

      case 'Channel':
        channels.set(record.id, record)
        if (!byTopic.has(record.topic)) byTopic.set(record.topic, [])
        break

      case 'Message': {
        const ch = channels.get(record.channelId)
        if (!ch) break
        const topic = ch.topic

        let parsed
        try {
          if (ch.messageEncoding === 'json') {
            parsed = JSON.parse(dec.decode(record.data))
          } else {
            // For non-JSON encodings (ros2, cdr, protobuf) skip for now
            break
          }
        } catch {
          break
        }

        if (!byTopic.has(topic)) byTopic.set(topic, [])
        byTopic.get(topic).push({ logTime: record.logTime, data: parsed })
        msgCount++
        break
      }
    }
  }

  onProgress(30, `Parsed ${msgCount} messages across ${byTopic.size} topics…`)

  // ── determine time range ─────────────────────────────────────────────────

  let minNs = BigInt(Number.MAX_SAFE_INTEGER) * BigInt(1e9)
  let maxNs = 0n

  for (const msgs of byTopic.values()) {
    if (msgs.length === 0) continue
    msgs.sort((a, b) => (a.logTime < b.logTime ? -1 : a.logTime > b.logTime ? 1 : 0))
    if (msgs[0].logTime < minNs) minNs = msgs[0].logTime
    if (msgs[msgs.length - 1].logTime > maxNs) maxNs = msgs[msgs.length - 1].logTime
  }

  const totalDuration = Number(maxNs - minNs) / 1e9  // seconds
  const startUnixMs   = Number(minNs / 1000000n)      // Unix ms for display

  onProgress(40, 'Building time-series…')

  // ── pass 2: build time-series at TIMESERIES_STEP_S intervals ────────────

  const steps = Math.ceil(totalDuration / TIMESERIES_STEP_S) + 1

  // Helper: binary-search latest message at or before timeNs
  function latestBefore(msgs, timeNs) {
    let lo = 0, hi = msgs.length - 1, result = null
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (msgs[mid].logTime <= timeNs) { result = msgs[mid]; lo = mid + 1 }
      else hi = mid - 1
    }
    return result?.data ?? null
  }

  function formatTime(offsetSec) {
    const totalMs = startUnixMs + offsetSec * 1000
    return new Date(totalMs).toISOString().substring(11, 19)
  }

  const timeSeries = []

  for (let i = 0; i < steps; i++) {
    const t       = i * TIMESERIES_STEP_S
    const timeNs  = minNs + BigInt(Math.floor(t * 1e9))
    const point   = { t, time: formatTime(t) }

    // /joint_states
    const js = latestBefore(byTopic.get('/joint_states') ?? [], timeNs)
    if (js) {
      const pos = js.position ?? []
      const eff = js.effort   ?? []
      point.j1_pos = +(( pos[0] ?? 0) * R2D).toFixed(2)
      point.j2_pos = +(( pos[1] ?? 0) * R2D).toFixed(2)
      point.j3_pos = +(( pos[2] ?? 0) * R2D).toFixed(2)
      point.j4_pos = +(( pos[3] ?? 0) * R2D).toFixed(2)
      point.j5_pos = +(( pos[4] ?? 0) * R2D).toFixed(2)
      point.j6_pos = +(( pos[5] ?? 0) * R2D).toFixed(2)
      point.j1_torque = +(eff[0] ?? 0).toFixed(3)
      point.j2_torque = +(eff[1] ?? 0).toFixed(3)
      point.j3_torque = +(eff[2] ?? 0).toFixed(3)
      point.j4_torque = +(eff[3] ?? 0).toFixed(3)
      point.j5_torque = +(eff[4] ?? 0).toFixed(3)
      point.j6_torque = +(eff[5] ?? 0).toFixed(3)
    }

    // /gripper_state
    const gs = latestBefore(byTopic.get('/gripper_state') ?? [], timeNs)
    if (gs) {
      point.gripper_pos       = +((gs.position ?? 0) * 1000).toFixed(2)   // m → mm
      point.gripper_force     = +(gs.force ?? 0).toFixed(3)
      point.finger1_pressure  = +((gs.finger_forces?.[0] ?? 0)).toFixed(3)
      point.finger2_pressure  = +((gs.finger_forces?.[1] ?? 0)).toFixed(3)
      point.is_grasping       = gs.is_grasping ?? false
      point.object_detected   = gs.object_detected ?? false
    }

    // /system_monitor
    const sm = latestBefore(byTopic.get('/system_monitor') ?? [], timeNs)
    if (sm) {
      point.cpu               = +((sm.cpu_usage ?? 0) * 100).toFixed(1)
      point.memory            = +((sm.memory_usage ?? 0) * 100).toFixed(1)
      point.network_latency   = +((sm.network_latency ?? 0) * 1000).toFixed(1)  // s → ms
      point.battery_voltage   = +(sm.battery_voltage ?? 12.4).toFixed(3)
      point.battery_current   = +(sm.battery_current ?? 2.1).toFixed(3)
      point.battery_percentage= +((sm.battery_percentage ?? 0.87) * 100).toFixed(1)

      // Temperature sensors
      const temps = sm.temperature_sensors ?? []
      const getTemp = loc => temps.find(s => s.location === loc)?.temperature ?? 38
      point.j1_temp = +getTemp('joint_1_motor').toFixed(1)
      point.j2_temp = +getTemp('joint_2_motor').toFixed(1)
      point.j3_temp = +getTemp('joint_3_motor').toFixed(1)
      point.j4_temp = +getTemp('joint_4_motor').toFixed(1)
      point.j5_temp = +getTemp('joint_5_motor').toFixed(1)
      point.j6_temp = +getTemp('joint_6_motor').toFixed(1)
      point.cpu_temp = +getTemp('cpu').toFixed(1)
    }

    // /performance_metrics
    const pm = latestBefore(byTopic.get('/performance_metrics') ?? [], timeNs)
    if (pm) {
      point.power_consumption = +(pm.power_consumption ?? 145).toFixed(1)
      point.efficiency        = +((pm.efficiency_score ?? 0.89) * 100).toFixed(1)
      point.grip_success_rate = +((pm.grasp_success_rate ?? 0.95) * 100).toFixed(1)
      // j2 error in degrees (rms * R2D)
      const acc = pm.joint_accuracy ?? []
      point.j1_error = +((acc[0]?.rms_error ?? 0.002) * R2D).toFixed(3)
      point.j2_error = +((acc[1]?.rms_error ?? 0.008) * R2D).toFixed(3)
      point.j3_error = +((acc[2]?.rms_error ?? 0.002) * R2D).toFixed(3)
      // grip_pressure_stability: derived from gripper pressure variance (simulated via success rate)
      point.grip_pressure_stability = point.grip_success_rate ?? 90
    }

    timeSeries.push(point)
  }

  onProgress(65, 'Building log entries…')

  // ── pass 3: build log entries ────────────────────────────────────────────

  const logEntries = []
  let logId = 0

  // From /rosout
  for (const { logTime, data } of byTopic.get('/rosout') ?? []) {
    const t       = Number(logTime - minNs) / 1e9
    const levelN  = data.level ?? 2
    const level   = ROS_LEVEL[levelN] ?? 'INFO'
    const node    = (data.name ?? '').replace(/^\//, '')
    const component = guessComponent(node)
    logEntries.push({
      id:        logId++,
      t:         +t.toFixed(3),
      time:      formatTime(t),
      level,
      component,
      message:   data.msg ?? '',
      source:    '/rosout',
      node:      data.name,
      file:      data.file,
      line:      data.line,
    })
  }

  // From /manipulation_events
  for (const { logTime, data } of byTopic.get('/manipulation_events') ?? []) {
    const t       = Number(logTime - minNs) / 1e9
    const level   = EVENT_LEVEL[data.event_type] ?? 'INFO'
    const comp    = capitalise(data.component ?? 'system')
    logEntries.push({
      id:        logId++,
      t:         +t.toFixed(3),
      time:      formatTime(t),
      level,
      component: comp,
      message:   `[${data.event_code}] ${data.message}`,
      source:    '/manipulation_events',
      severity:  data.severity,
    })
  }

  logEntries.sort((a, b) => a.t - b.t)

  onProgress(80, 'Extracting issues & config…')

  // ── pass 4: extract issues (warn/error log entries) ──────────────────────

  const issues = logEntries
    .filter(e => e.level === 'ERROR' || e.level === 'WARN')
    .map(e => ({ t: e.t, time: e.time, level: e.level, component: e.component, message: e.message }))

  // ── pass 5: robot configuration ──────────────────────────────────────────

  const cfgMsgs = byTopic.get('/robot_configuration') ?? []
  const cfgRaw  = cfgMsgs.length > 0 ? cfgMsgs[0].data : null

  const config = buildConfig(cfgRaw, byTopic)

  onProgress(95, 'Finalising…')

  // ── bag metadata ─────────────────────────────────────────────────────────

  const bagInfo = {
    startTime:    new Date(startUnixMs).toISOString(),
    endTime:      new Date(startUnixMs + totalDuration * 1000).toISOString(),
    duration:     totalDuration,
    messageCount: msgCount,
    topicCount:   byTopic.size,
    topics:       [...byTopic.entries()].map(([topic, msgs]) => ({
      topic,
      messageCount: msgs.length,
      schemaName: schemas.get(channels.get(
        [...channels.values()].find(c => c.topic === topic)?.id
      )?.schemaId)?.name ?? 'unknown',
    })),
  }

  onProgress(100, 'Done')

  return {
    config,
    timeSeries,
    logEntries,
    issues,
    totalDuration,
    startUnixMs,
    bagInfo,
    CHART_WINDOW_POINTS,
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────

function guessComponent(node) {
  if (/arm|joint/i.test(node))     return 'Arm'
  if (/gripper/i.test(node))       return 'Gripper'
  if (/hand|finger|tactile/i.test(node)) return 'Hand'
  if (/system|monitor|cpu|net/i.test(node)) return 'System'
  return 'System'
}

function capitalise(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function buildConfig(raw, byTopic) {
  // Build active topic list from byTopic map
  const activeTopics = [...byTopic.entries()].map(([topic, msgs]) => {
    if (msgs.length === 0) return { name: topic, hz: 0, status: 'error' }
    // Estimate Hz from first 10 messages
    const sample = msgs.slice(0, Math.min(msgs.length, 10))
    let hz = null
    if (sample.length >= 2) {
      const spanNs = sample[sample.length - 1].logTime - sample[0].logTime
      const spanS  = Number(spanNs) / 1e9
      hz = spanS > 0 ? Math.round((sample.length - 1) / spanS) : null
    }
    const status = hz === 0 ? 'error' : hz != null && hz < 1 ? 'warn' : 'ok'
    return { name: topic, hz, status }
  })

  if (!raw) {
    return {
      robotId: 'MR-001',
      model: 'Manipulation Bot v2.1',
      gripperType: 'Parallel Jaw',
      handType: '5-Finger Anthropomorphic',
      dof: 6,
      jointLimits: [],
      activeTopics,
    }
  }

  return {
    robotId:     raw.robot_id      ?? 'MR-001',
    model:       raw.robot_model   ?? 'Unknown',
    gripperType: formatGripperType(raw.gripper_config?.type),
    handType:    formatHandType(raw.hand_config?.type),
    dof:         raw.arm_config?.dof ?? 6,
    jointLimits: (raw.arm_config?.joint_limits ?? []).map(j => ({
      name:        j.name,
      min:         +(j.min_position * R2D).toFixed(0),
      max:         +(j.max_position * R2D).toFixed(0),
      maxVelocity: j.max_velocity,
      maxTorque:   j.max_effort,
    })),
    gripper: raw.gripper_config,
    hand:    raw.hand_config,
    activeTopics,
  }
}

function formatGripperType(t) {
  if (!t) return 'Parallel Jaw'
  return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatHandType(t) {
  if (!t) return '5-Finger Anthropomorphic'
  return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ── chart window helper (exported for useReplay) ──────────────────────────────

/**
 * Returns a windowed slice of timeSeries centered around currentTime.
 * @param {Array}  timeSeries
 * @param {number} currentTime  (seconds from start)
 * @param {number} windowPoints (number of samples to show)
 */
export function getChartWindow(timeSeries, currentTime, windowPoints = CHART_WINDOW_POINTS) {
  const step     = TIMESERIES_STEP_S
  const curIdx   = Math.min(Math.floor(currentTime / step), timeSeries.length - 1)
  const start    = Math.max(0, curIdx - windowPoints)
  return timeSeries.slice(start, curIdx + 1)
}

/**
 * Returns the timeSeries data point nearest to currentTime.
 */
export function getDataAtTime(timeSeries, currentTime) {
  if (!timeSeries?.length) return null
  const step = TIMESERIES_STEP_S
  const idx  = Math.min(Math.floor(currentTime / step), timeSeries.length - 1)
  return timeSeries[Math.max(0, idx)]
}

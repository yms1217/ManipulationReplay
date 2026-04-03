/**
 * MCAP Log Parser — Wheeled Humanoid Dual-Arm
 *
 * Supported topics:
 *   /left_arm/joint_states, /right_arm/joint_states
 *   /left_arm/hand_state,   /right_arm/gripper_state
 *   /left_arm/tactile_sensors
 *   /mobile_base/state
 *   /system_monitor, /manipulation_events, /rosout
 *   /robot_configuration, /performance_metrics
 *
 * Legacy single-arm topics also handled for backward compat:
 *   /joint_states, /gripper_state, /hand_state
 */

import { McapStreamReader } from '@mcap/core'

// ── constants ─────────────────────────────────────────────────────────────────

const R2D = 180 / Math.PI
const TIMESERIES_STEP_S = 2
const CHART_WINDOW_POINTS = 60

const ROS_LEVEL  = { 1: 'DEBUG', 2: 'INFO', 4: 'WARN', 8: 'ERROR', 16: 'FATAL' }
const EVENT_LEVEL = { info: 'INFO', warning: 'WARN', error: 'ERROR', critical: 'ERROR' }

// component name normalisation for dual-arm
function normalizeComponent(raw) {
  if (!raw) return 'System'
  const s = raw.toLowerCase()
  if (s.includes('left_arm')  || s.includes('la_')) return 'Left Arm'
  if (s.includes('right_arm') || s.includes('ra_')) return 'Right Arm'
  if (s.includes('gripper'))   return 'Right Arm'
  if (s.includes('hand'))      return 'Left Arm'
  if (s.includes('arm') || s.includes('joint')) return 'Arm'
  if (s.includes('mobile') || s.includes('base') || s.includes('wheel')) return 'Base'
  return 'System'
}

function noop() {}

// ── main parser ───────────────────────────────────────────────────────────────

export async function parseMcap(buffer, onProgress = noop) {
  const uint8 = new Uint8Array(buffer)
  const dec   = new TextDecoder()

  onProgress(5, 'Reading MCAP structure…')

  const reader   = new McapStreamReader({ validateCrcs: false })
  reader.append(uint8)

  const schemas  = new Map()
  const channels = new Map()
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
          } else { break }
        } catch { break }
        if (!byTopic.has(topic)) byTopic.set(topic, [])
        byTopic.get(topic).push({ logTime: record.logTime, data: parsed })
        msgCount++
        break
      }
    }
  }

  onProgress(30, `Parsed ${msgCount} messages across ${byTopic.size} topics…`)

  // ── time range ─────────────────────────────────────────────────────────────

  let minNs = BigInt(Number.MAX_SAFE_INTEGER) * BigInt(1e9)
  let maxNs = 0n

  for (const msgs of byTopic.values()) {
    if (msgs.length === 0) continue
    msgs.sort((a, b) => (a.logTime < b.logTime ? -1 : a.logTime > b.logTime ? 1 : 0))
    if (msgs[0].logTime < minNs) minNs = msgs[0].logTime
    if (msgs[msgs.length - 1].logTime > maxNs) maxNs = msgs[msgs.length - 1].logTime
  }

  const totalDuration = Number(maxNs - minNs) / 1e9
  const startUnixMs   = Number(minNs / 1000000n)

  onProgress(40, 'Building time-series…')

  const steps = Math.ceil(totalDuration / TIMESERIES_STEP_S) + 1

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

  // Detect EE types from robot_configuration (once)
  const cfgMsgs = byTopic.get('/robot_configuration') ?? []
  const cfgRaw  = cfgMsgs.length > 0 ? cfgMsgs[0].data : null
  const laEeType = cfgRaw?.left_arm_config?.ee_type ?? 'hand'
  const raEeType = cfgRaw?.right_arm_config?.ee_type ?? 'gripper'

  const timeSeries = []

  for (let i = 0; i < steps; i++) {
    const t      = i * TIMESERIES_STEP_S
    const timeNs = minNs + BigInt(Math.floor(t * 1e9))
    const point  = { t, time: formatTime(t), la_ee_type: laEeType, ra_ee_type: raEeType }

    // ── Left Arm: /left_arm/joint_states ──────────────────────────────────
    const laJs = latestBefore(byTopic.get('/left_arm/joint_states') ?? [], timeNs)
    if (laJs) {
      const pos = laJs.position ?? []
      const eff = laJs.effort   ?? []
      point.la_j1_pos = +(( pos[0] ?? 0) * R2D).toFixed(2)
      point.la_j2_pos = +(( pos[1] ?? 0) * R2D).toFixed(2)
      point.la_j3_pos = +(( pos[2] ?? 0) * R2D).toFixed(2)
      point.la_j4_pos = +(( pos[3] ?? 0) * R2D).toFixed(2)
      point.la_j5_pos = +(( pos[4] ?? 0) * R2D).toFixed(2)
      point.la_j6_pos = +(( pos[5] ?? 0) * R2D).toFixed(2)
      point.la_j1_torque = +(eff[0] ?? 0).toFixed(3)
      point.la_j2_torque = +(eff[1] ?? 0).toFixed(3)
      point.la_j3_torque = +(eff[2] ?? 0).toFixed(3)
      point.la_j4_torque = +(eff[3] ?? 0).toFixed(3)
      point.la_j5_torque = +(eff[4] ?? 0).toFixed(3)
      point.la_j6_torque = +(eff[5] ?? 0).toFixed(3)
    }

    // ── Right Arm: /right_arm/joint_states ────────────────────────────────
    const raJs = latestBefore(byTopic.get('/right_arm/joint_states') ?? [], timeNs)
    if (raJs) {
      const pos = raJs.position ?? []
      const eff = raJs.effort   ?? []
      point.ra_j1_pos = +(( pos[0] ?? 0) * R2D).toFixed(2)
      point.ra_j2_pos = +(( pos[1] ?? 0) * R2D).toFixed(2)
      point.ra_j3_pos = +(( pos[2] ?? 0) * R2D).toFixed(2)
      point.ra_j4_pos = +(( pos[3] ?? 0) * R2D).toFixed(2)
      point.ra_j5_pos = +(( pos[4] ?? 0) * R2D).toFixed(2)
      point.ra_j6_pos = +(( pos[5] ?? 0) * R2D).toFixed(2)
      point.ra_j1_torque = +(eff[0] ?? 0).toFixed(3)
      point.ra_j2_torque = +(eff[1] ?? 0).toFixed(3)
      point.ra_j3_torque = +(eff[2] ?? 0).toFixed(3)
      point.ra_j4_torque = +(eff[3] ?? 0).toFixed(3)
      point.ra_j5_torque = +(eff[4] ?? 0).toFixed(3)
      point.ra_j6_torque = +(eff[5] ?? 0).toFixed(3)
    }

    // ── Left Arm Hand State ───────────────────────────────────────────────
    const laHand = latestBefore(byTopic.get('/left_arm/hand_state') ?? [], timeNs)
    if (laHand) {
      point.la_hand_stability = +((laHand.grasp_stability ?? 0.85) * 100).toFixed(1)
      point.la_is_grasping    = laHand.is_grasping ?? false
      point.la_finger_force   = 2.5  // placeholder; tactile gives total
      // temperatures from hand state
      const temps = laHand.temperature_sensors ?? []
      const getTemp = loc => temps.find(s => s.location === loc)?.temperature ?? 38
      point.la_j1_temp = +getTemp('la_joint_1_motor').toFixed(1)
      point.la_j2_temp = +getTemp('la_joint_2_motor').toFixed(1)
      point.la_j3_temp = +getTemp('la_joint_3_motor').toFixed(1)
      point.la_j4_temp = +getTemp('la_joint_4_motor').toFixed(1)
      point.la_j5_temp = +getTemp('la_joint_5_motor').toFixed(1)
      point.la_j6_temp = +getTemp('la_joint_6_motor').toFixed(1)
    }

    // ── Right Arm Gripper State ───────────────────────────────────────────
    const raGs = latestBefore(byTopic.get('/right_arm/gripper_state') ?? [], timeNs)
    if (raGs) {
      point.ra_gripper_pos       = +((raGs.position ?? 0) * 1000).toFixed(2)
      point.ra_gripper_force     = +(raGs.force ?? 0).toFixed(3)
      point.ra_finger1_pressure  = +((raGs.finger_forces?.[0] ?? 0)).toFixed(3)
      point.ra_finger2_pressure  = +((raGs.finger_forces?.[1] ?? 0)).toFixed(3)
      point.ra_is_grasping       = raGs.is_grasping ?? false
    }

    // ── Left Arm Tactile ──────────────────────────────────────────────────
    const laTac = latestBefore(byTopic.get('/left_arm/tactile_sensors') ?? [], timeNs)
    if (laTac) {
      point.la_total_force   = +(laTac.total_force ?? 0).toFixed(3)
      point.la_contact_points = laTac.contact_points ?? 0
    }

    // ── Mobile Base ───────────────────────────────────────────────────────
    const base = latestBefore(byTopic.get('/mobile_base/state') ?? [], timeNs)
    if (base) {
      point.base_vel_linear   = +(base.linear_velocity  ?? 0).toFixed(3)
      point.base_vel_angular  = +(base.angular_velocity ?? 0).toFixed(3)
      point.base_heading      = +(base.heading_deg ?? 0).toFixed(1)
    }

    // ── System Monitor ────────────────────────────────────────────────────
    const sm = latestBefore(byTopic.get('/system_monitor') ?? [], timeNs)
    if (sm) {
      point.cpu             = +((sm.cpu_usage    ?? 0) * 100).toFixed(1)
      point.memory          = +((sm.memory_usage ?? 0) * 100).toFixed(1)
      point.network_latency = +((sm.network_latency ?? 0) * 1000).toFixed(1)
      point.battery_voltage = +(sm.battery_voltage ?? 12.4).toFixed(3)
      point.battery_current = +(sm.battery_current ?? 2.1).toFixed(3)
      point.battery_percentage = +((sm.battery_percentage ?? 0.87) * 100).toFixed(1)

      const temps = sm.temperature_sensors ?? []
      const getT  = loc => temps.find(s => s.location === loc)?.temperature ?? 38
      // Fill temps from system_monitor if not already set from hand_state
      if (!point.la_j1_temp) point.la_j1_temp = +getT('la_joint_1_motor').toFixed(1)
      if (!point.la_j2_temp) point.la_j2_temp = +getT('la_joint_2_motor').toFixed(1)
      if (!point.la_j3_temp) point.la_j3_temp = +getT('la_joint_3_motor').toFixed(1)
      if (!point.la_j4_temp) point.la_j4_temp = +getT('la_joint_4_motor').toFixed(1)
      if (!point.la_j5_temp) point.la_j5_temp = +getT('la_joint_5_motor').toFixed(1)
      if (!point.la_j6_temp) point.la_j6_temp = +getT('la_joint_6_motor').toFixed(1)
      point.ra_j1_temp = +getT('ra_joint_1_motor').toFixed(1)
      point.ra_j2_temp = +getT('ra_joint_2_motor').toFixed(1)
      point.ra_j3_temp = +getT('ra_joint_3_motor').toFixed(1)
      point.ra_j4_temp = +getT('ra_joint_4_motor').toFixed(1)
      point.ra_j5_temp = +getT('ra_joint_5_motor').toFixed(1)
      point.ra_j6_temp = +getT('ra_joint_6_motor').toFixed(1)
      point.cpu_temp    = +getT('cpu').toFixed(1)
    }

    // ── Performance Metrics ───────────────────────────────────────────────
    const pm = latestBefore(byTopic.get('/performance_metrics') ?? [], timeNs)
    if (pm) {
      point.power_consumption    = +(pm.power_consumption ?? 195).toFixed(1)
      point.efficiency           = +((pm.efficiency_score ?? 0.88) * 100).toFixed(1)
      point.la_grip_success_rate = +((pm.la_grasp_success_rate ?? 0.93) * 100).toFixed(1)
      point.ra_grip_success_rate = +((pm.ra_grasp_success_rate ?? 0.95) * 100).toFixed(1)

      const laAcc = pm.left_arm_accuracy ?? []
      point.la_j1_error = +((laAcc[0]?.rms_error ?? 0.002) * R2D).toFixed(3)
      point.la_j2_error = +((laAcc[1]?.rms_error ?? 0.008) * R2D).toFixed(3)
      point.la_j3_error = +((laAcc[2]?.rms_error ?? 0.002) * R2D).toFixed(3)
      const raAcc = pm.right_arm_accuracy ?? []
      point.ra_j1_error = +((raAcc[0]?.rms_error ?? 0.002) * R2D).toFixed(3)
      point.ra_j2_error = +((raAcc[1]?.rms_error ?? 0.007) * R2D).toFixed(3)
      point.ra_j3_error = +((raAcc[2]?.rms_error ?? 0.002) * R2D).toFixed(3)
    }

    // ── Legacy single-arm fallback (/joint_states, /gripper_state) ────────
    if (!point.ra_j1_pos) {
      const js = latestBefore(byTopic.get('/joint_states') ?? [], timeNs)
      if (js) {
        const pos = js.position ?? []; const eff = js.effort ?? []
        point.ra_j1_pos = +(( pos[0] ?? 0) * R2D).toFixed(2)
        point.ra_j2_pos = +(( pos[1] ?? 0) * R2D).toFixed(2)
        point.ra_j3_pos = +(( pos[2] ?? 0) * R2D).toFixed(2)
        point.ra_j4_pos = +(( pos[3] ?? 0) * R2D).toFixed(2)
        point.ra_j5_pos = +(( pos[4] ?? 0) * R2D).toFixed(2)
        point.ra_j6_pos = +(( pos[5] ?? 0) * R2D).toFixed(2)
        point.ra_j1_torque = +(eff[0] ?? 0).toFixed(3)
        point.ra_j2_torque = +(eff[1] ?? 0).toFixed(3)
        point.ra_j3_torque = +(eff[2] ?? 0).toFixed(3)
        point.ra_j4_torque = +(eff[3] ?? 0).toFixed(3)
        point.ra_j5_torque = +(eff[4] ?? 0).toFixed(3)
        point.ra_j6_torque = +(eff[5] ?? 0).toFixed(3)
      }
    }
    if (!point.ra_gripper_pos) {
      const gs = latestBefore(byTopic.get('/gripper_state') ?? [], timeNs)
      if (gs) {
        point.ra_gripper_pos      = +((gs.position ?? 0) * 1000).toFixed(2)
        point.ra_gripper_force    = +(gs.force ?? 0).toFixed(3)
        point.ra_finger1_pressure = +((gs.finger_forces?.[0] ?? 0)).toFixed(3)
        point.ra_finger2_pressure = +((gs.finger_forces?.[1] ?? 0)).toFixed(3)
        point.ra_is_grasping      = gs.is_grasping ?? false
      }
    }

    timeSeries.push(point)
  }

  onProgress(65, 'Building log entries…')

  // ── log entries ────────────────────────────────────────────────────────────

  const logEntries = []
  let logId = 0

  for (const { logTime, data } of byTopic.get('/rosout') ?? []) {
    const t     = Number(logTime - minNs) / 1e9
    const levelN = data.level ?? 2
    const level  = ROS_LEVEL[levelN] ?? 'INFO'
    const node   = (data.name ?? '').replace(/^\//, '')
    const component = normalizeComponent(node)
    logEntries.push({
      id: logId++, t: +t.toFixed(3), time: formatTime(t),
      level, component, message: data.msg ?? '',
      source: '/rosout', node: data.name, file: data.file, line: data.line,
    })
  }

  for (const { logTime, data } of byTopic.get('/manipulation_events') ?? []) {
    const t    = Number(logTime - minNs) / 1e9
    const level = EVENT_LEVEL[data.event_type] ?? 'INFO'
    const comp  = normalizeComponent(data.component ?? 'system')
    logEntries.push({
      id: logId++, t: +t.toFixed(3), time: formatTime(t),
      level, component: comp,
      message: `[${data.event_code}] ${data.message}`,
      source: '/manipulation_events', severity: data.severity,
    })
  }

  logEntries.sort((a, b) => a.t - b.t)

  onProgress(80, 'Extracting issues & config…')

  const issues = logEntries
    .filter(e => e.level === 'ERROR' || e.level === 'WARN')
    .map(e => ({ t: e.t, time: e.time, level: e.level, component: e.component, message: e.message }))

  const config = buildConfig(cfgRaw, byTopic, laEeType, raEeType, schemas, channels)

  onProgress(95, 'Finalising…')

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

  return { config, timeSeries, logEntries, issues, totalDuration, startUnixMs, bagInfo, CHART_WINDOW_POINTS }
}

// ── helpers ────────────────────────────────────────────────────────────────────

function buildConfig(raw, byTopic, laEeType, raEeType, schemas, channels) {
  const activeTopics = [...byTopic.entries()].map(([topic, msgs]) => {
    if (msgs.length === 0) return { name: topic, hz: 0, status: 'error' }
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
      robotId: 'HW-001', model: 'Wheeled Humanoid v1.0',
      leftArm:  { eeType: laEeType, dof: 6, eeLabel: laEeType === 'hand' ? '5-Finger Hand' : 'Parallel Jaw Gripper' },
      rightArm: { eeType: raEeType, dof: 6, eeLabel: raEeType === 'gripper' ? 'Parallel Jaw Gripper' : '5-Finger Hand' },
      mobileBase: { type: 'differential_drive', wheelCount: 2 },
      dof: 12, jointLimits: [], activeTopics,
    }
  }

  return {
    robotId:   raw.robot_id    ?? 'HW-001',
    model:     raw.robot_model ?? 'Wheeled Humanoid v1.0',
    leftArm: {
      eeType: laEeType,
      dof:    raw.left_arm_config?.dof ?? 6,
      eeLabel: laEeType === 'hand' ? '5-Finger Hand' : 'Parallel Jaw Gripper',
    },
    rightArm: {
      eeType: raEeType,
      dof:    raw.right_arm_config?.dof ?? 6,
      eeLabel: raEeType === 'gripper' ? 'Parallel Jaw Gripper' : '5-Finger Hand',
    },
    mobileBase: {
      type:        raw.mobile_base_config?.type ?? 'differential_drive',
      wheelCount:  raw.mobile_base_config?.wheel_count ?? 2,
      maxVel:      raw.mobile_base_config?.max_velocity ?? 1.0,
    },
    dof: (raw.left_arm_config?.dof ?? 6) + (raw.right_arm_config?.dof ?? 6),
    jointLimits: (raw.left_arm_config?.joint_limits ?? []).map(j => ({
      name:        j.name,
      min:         +(j.min_position * R2D).toFixed(0),
      max:         +(j.max_position * R2D).toFixed(0),
      maxVelocity: j.max_velocity,
      maxTorque:   j.max_effort,
    })),
    activeTopics,
  }
}

// ── chart/time helpers (exported for useReplay) ────────────────────────────────

export function getChartWindow(timeSeries, currentTime, windowPoints = CHART_WINDOW_POINTS) {
  const step   = TIMESERIES_STEP_S
  const curIdx = Math.min(Math.floor(currentTime / step), timeSeries.length - 1)
  const start  = Math.max(0, curIdx - windowPoints)
  return timeSeries.slice(start, curIdx + 1)
}

export function getDataAtTime(timeSeries, currentTime) {
  if (!timeSeries?.length) return null
  const step = TIMESERIES_STEP_S
  const idx  = Math.min(Math.floor(currentTime / step), timeSeries.length - 1)
  return timeSeries[Math.max(0, idx)]
}

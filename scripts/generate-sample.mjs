/**
 * MCAP Sample Log Generator — Wheeled Humanoid Dual-Arm
 * Generates a realistic 10-minute ROS2 log in MCAP format.
 * Output: public/sample-log.mcap
 *
 * Topics:
 *   /left_arm/joint_states      (2 Hz)
 *   /right_arm/joint_states     (2 Hz)
 *   /left_arm/hand_state        (0.5 Hz)
 *   /right_arm/gripper_state    (1 Hz)
 *   /left_arm/tactile_sensors   (2 Hz)
 *   /mobile_base/state          (1 Hz)
 *   /system_monitor             (0.5 Hz)
 *   /manipulation_events        (event)
 *   /rosout                     (event)
 *   /robot_configuration        (once)
 *   /performance_metrics        (0.2 Hz)
 */

import { McapWriter } from '@mcap/core'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'sample-log.mcap')

// ── helpers ───────────────────────────────────────────────────────────────────

function rnd(min, max) { return min + Math.random() * (max - min) }
function noise(base, amp, t) {
  return base + amp * Math.sin(t * 0.5) + amp * 0.3 * Math.sin(t * 1.3)
}

const START_UNIX_S = 1710942000  // 2024-03-20T14:20:00+09:00
function toNs(offsetSec) {
  return BigInt(Math.floor((START_UNIX_S + offsetSec) * 1e9))
}
function stamp(offsetSec) {
  return { sec: START_UNIX_S + Math.floor(offsetSec), nanosec: Math.floor((offsetSec % 1) * 1e9) }
}
function d2r(deg) { return deg * Math.PI / 180 }

// ── in-memory writable ────────────────────────────────────────────────────────

let chunks = []
let totalBytes = 0n

const writable = {
  position: () => totalBytes,
  write: async (buf) => {
    chunks.push(Buffer.from(buf))
    totalBytes += BigInt(buf.byteLength)
  },
}

const enc = new TextEncoder()
function jsonSchema(obj) { return enc.encode(JSON.stringify(obj)) }
function jsonMsg(obj)    { return enc.encode(JSON.stringify(obj)) }

// ── robot dynamics simulation ─────────────────────────────────────────────────

// Left arm (hand EE) — slightly different profile
function laJointPositions(t) {
  return [
    d2r(noise(30, 8, t * 0.08)),
    d2r(noise(-45, 10, t * 0.06)),
    d2r(noise(80, 6, t * 0.10)),
    d2r(noise(15, 4, t * 0.12)),
    d2r(noise(-20, 5, t * 0.07)),
    d2r(noise(10, 3, t * 0.15)),
  ]
}
function laJointEfforts(t) {
  const j2warn = t > 130 && t < 150
  return [
    noise(2.0, 0.4, t * 0.09),
    j2warn ? noise(2.5, 0.3, t * 0.09) : noise(1.7, 0.5, t * 0.07 + 1),
    noise(0.9, 0.3, t * 0.11),
    noise(1.1, 0.2, t * 0.13),
    noise(0.7, 0.25, t * 0.08),
    noise(0.4, 0.15, t * 0.10),
  ]
}
function laJointTemps(t) {
  return [
    noise(37, 2, t * 0.01),
    noise(41, 3, t * 0.012),
    t > 350 ? noise(55, 4, t * 0.015) : noise(37, 2, t * 0.013),
    noise(34, 1.5, t * 0.011),
    noise(39, 2, t * 0.012),
    noise(36, 1.5, t * 0.010),
  ]
}

// Right arm (gripper EE)
function raJointPositions(t) {
  return [
    d2r(noise(45, 8, t * 0.07 + 1)),
    d2r(noise(-30, 10, t * 0.05 + 0.5)),
    d2r(noise(90, 6, t * 0.09 + 0.3)),
    d2r(noise(20, 4, t * 0.11 + 0.7)),
    d2r(noise(-15, 5, t * 0.08 + 0.2)),
    d2r(noise(5, 3, t * 0.14 + 0.4)),
  ]
}
function raJointEfforts(t) {
  return [
    noise(2.1, 0.4, t * 0.09 + 0.5),
    noise(1.8, 0.5, t * 0.07 + 1.5),
    noise(0.9, 0.3, t * 0.10 + 0.8),
    noise(1.2, 0.2, t * 0.12 + 0.3),
    noise(0.8, 0.25, t * 0.09 + 0.6),
    noise(0.5, 0.15, t * 0.11 + 0.1),
  ]
}
function raJointTemps(t) {
  return [
    noise(38, 2, t * 0.011 + 0.2),
    noise(42, 3, t * 0.013 + 0.3),
    noise(38, 2, t * 0.014 + 0.1),
    noise(35, 1.5, t * 0.012 + 0.4),
    noise(40, 2, t * 0.013 + 0.5),
    noise(37, 1.5, t * 0.011 + 0.2),
  ]
}

function raGripperPos(t)   { return Math.max(0, noise(0.015, 0.005, t * 0.05 + 0.5)) }
function raGripperForce(t) { return Math.max(0, noise(2.5, 1.2, t * 0.08 + 0.3)) }
function raFingerForces(t) {
  const anomaly = t > 252 && t < 270
  return [
    Math.max(0, noise(3.2, 0.8, t * 0.09 + 0.4)),
    anomaly ? Math.max(0, noise(0.8, 1.2, t * 0.18)) : Math.max(0, noise(2.8, 0.5, t * 0.09 + 0.1)),
  ]
}

function cpuUsage(t) {
  return t > 320 && t < 360
    ? Math.min(1, noise(0.85, 0.08, t * 0.2))
    : Math.min(1, noise(0.45, 0.10, t * 0.1))
}

// ── main ──────────────────────────────────────────────────────────────────────

const DURATION_S = 600

const EVENTS = [
  { t: 5,   level: 2, node: '/left_arm_controller',  msg: '[LA] 6-DOF arm ready. Hand EE mounted.' },
  { t: 6,   level: 2, node: '/right_arm_controller', msg: '[RA] 6-DOF arm ready. Gripper EE mounted.' },
  { t: 8,   level: 2, node: '/mobile_base',          msg: 'Mobile base initialized: differential drive ready' },
  { t: 20,  level: 2, node: '/right_arm_controller', msg: '[RA] Gripper initialized: parallel_jaw, max 50mm' },
  { t: 22,  level: 2, node: '/left_arm_controller',  msg: '[LA] Hand initialized: 5-finger anthropomorphic, 15 DOF' },
  { t: 50,  level: 2, node: '/left_arm_controller',  msg: '[LA] move_to_position([30, -45, 80]) — trajectory planned' },
  { t: 52,  level: 2, node: '/right_arm_controller', msg: '[RA] move_to_position([45, -30, 90]) — trajectory planned' },
  { t: 65,  level: 2, node: '/right_arm_controller', msg: '[RA] Gripper close command, target force: 5.0N' },
  { t: 95,  level: 2, node: '/left_arm_controller',  msg: '[LA] Target position reached within ±0.5°' },
  { t: 96,  level: 2, node: '/right_arm_controller', msg: '[RA] Target position reached within ±0.5°' },
  { t: 132, level: 4, node: '/left_arm_controller',  msg: '[LA] J2 approaching velocity limit (85% of max)' },
  { t: 145, level: 2, node: '/left_arm_controller',  msg: '[LA] Velocity reduced to 70%' },
  { t: 160, level: 2, node: '/right_arm_controller', msg: '[RA] Stable grip — 95% confidence' },
  { t: 210, level: 4, node: '/system_monitor',       msg: 'Network latency spike: 45ms (threshold 20ms)' },
  { t: 225, level: 2, node: '/system_monitor',       msg: 'Network latency normalized: 15ms' },
  { t: 252, level: 8, node: '/right_arm_controller', msg: '[RA] Pressure sensor anomaly on finger 2' },
  { t: 258, level: 4, node: '/right_arm_controller', msg: '[RA] Grip recalibration in progress' },
  { t: 270, level: 2, node: '/right_arm_controller', msg: '[RA] Grip stable after adjustment (4.8N)' },
  { t: 321, level: 8, node: '/system_monitor',       msg: 'CPU spike: 89% (threshold 80%)' },
  { t: 330, level: 4, node: '/system_monitor',       msg: 'CPU still elevated: 83%' },
  { t: 345, level: 2, node: '/system_monitor',       msg: 'CPU normalized: 52%' },
  { t: 355, level: 4, node: '/left_arm_controller',  msg: '[LA] J3 motor temperature: 55°C (limit 60°C)' },
  { t: 368, level: 4, node: '/left_arm_controller',  msg: '[LA] Thermal throttle applied to J3' },
  { t: 385, level: 2, node: '/right_arm_controller', msg: '[RA] Release command — object released' },
  { t: 410, level: 4, node: '/system_monitor',       msg: 'Left hand tactile sensor unresponsive: Finger 2, Sensor 3' },
  { t: 440, level: 2, node: '/left_arm_controller',  msg: '[LA] New task: adaptive_grasp(cylinder, 60N)' },
  { t: 441, level: 2, node: '/right_arm_controller', msg: '[RA] New task: pick_and_place(box, target=shelf_A)' },
  { t: 480, level: 2, node: '/left_arm_controller',  msg: '[LA] J2 recalibration completed' },
  { t: 530, level: 8, node: '/right_arm_controller', msg: '[RA] Grip force instability — auto-adjustment triggered' },
  { t: 550, level: 2, node: '/right_arm_controller', msg: '[RA] Grip stabilized' },
  { t: 590, level: 2, node: '/system_monitor',       msg: 'Dual-arm task complete. LA:93% RA:95%' },
]

const MANIP_EVENTS = [
  { t: 132, type: 'warning', component: 'left_arm',  code: 'VELOCITY_LIMIT_APPROACH',  msg: '[LA] J2 velocity at 85% of limit', severity: 1 },
  { t: 210, type: 'warning', component: 'system',    code: 'NETWORK_LATENCY_SPIKE',     msg: 'Network latency spike: 45ms', severity: 1 },
  { t: 252, type: 'error',   component: 'right_arm', code: 'PRESSURE_SENSOR_ANOMALY',   msg: '[RA] Pressure sensor anomaly on finger 2', severity: 2 },
  { t: 321, type: 'error',   component: 'system',    code: 'CPU_THRESHOLD_EXCEEDED',    msg: 'CPU usage 89% — threshold 80%', severity: 2 },
  { t: 355, type: 'warning', component: 'left_arm',  code: 'MOTOR_TEMP_HIGH',           msg: '[LA] J3 motor: 55°C (limit 60°C)', severity: 2 },
  { t: 410, type: 'warning', component: 'system',    code: 'SENSOR_UNRESPONSIVE',       msg: 'Left hand tactile offline: Finger 2 Sensor 3', severity: 1 },
  { t: 480, type: 'info',    component: 'left_arm',  code: 'CALIBRATION_COMPLETE',      msg: '[LA] J2 recalibration completed', severity: 0 },
  { t: 530, type: 'error',   component: 'right_arm', code: 'GRIP_FORCE_INSTABILITY',    msg: '[RA] Grip force instability — auto-adjust', severity: 2 },
]

async function generate() {
  console.log('Generating dual-arm wheeled humanoid MCAP sample…')

  const writer = new McapWriter({ writable })
  await writer.start({ library: 'manipulation-replay-generator/2.0', profile: 'ros2' })

  // ── Schemas ────────────────────────────────────────────────────────────────

  const sJointState = await writer.registerSchema({
    name: 'sensor_msgs/JointState', encoding: 'jsonschema',
    data: jsonSchema({ type: 'object', properties: {
      header: { type: 'object' },
      name:     { type: 'array', items: { type: 'string' } },
      position: { type: 'array', items: { type: 'number' } },
      velocity: { type: 'array', items: { type: 'number' } },
      effort:   { type: 'array', items: { type: 'number' } },
    }}),
  })

  const sHandState = await writer.registerSchema({
    name: 'custom/HandState', encoding: 'jsonschema',
    data: jsonSchema({ type: 'object', properties: {
      header: { type: 'object' },
      hand_type: { type: 'string' },
      ee_type: { type: 'string' },
      finger_names: { type: 'array', items: { type: 'string' } },
      finger_joint_positions: { type: 'object' },
      finger_joint_efforts: { type: 'object' },
      grasp_type: { type: 'string' },
      grasp_stability: { type: 'number' },
      is_grasping: { type: 'boolean' },
    }}),
  })

  const sGripperState = await writer.registerSchema({
    name: 'custom/GripperState', encoding: 'jsonschema',
    data: jsonSchema({ type: 'object', properties: {
      header: { type: 'object' },
      ee_type: { type: 'string' },
      gripper_type: { type: 'string' },
      position: { type: 'number' },
      force: { type: 'number' },
      finger_forces: { type: 'array', items: { type: 'number' } },
      is_grasping: { type: 'boolean' },
      object_detected: { type: 'boolean' },
    }}),
  })

  const sTactile = await writer.registerSchema({
    name: 'custom/TactileSensors', encoding: 'jsonschema',
    data: jsonSchema({ type: 'object', properties: {
      header: { type: 'object' },
      sensor_count: { type: 'number' },
      total_force: { type: 'number' },
      contact_points: { type: 'number' },
    }}),
  })

  const sMobileBase = await writer.registerSchema({
    name: 'custom/MobileBaseState', encoding: 'jsonschema',
    data: jsonSchema({ type: 'object', properties: {
      header: { type: 'object' },
      base_type: { type: 'string' },
      linear_velocity: { type: 'number' },
      angular_velocity: { type: 'number' },
      heading_deg: { type: 'number' },
      odometry: { type: 'object' },
      wheel_speeds: { type: 'object' },
    }}),
  })

  const sSystemMonitor = await writer.registerSchema({
    name: 'custom/SystemMonitor', encoding: 'jsonschema',
    data: jsonSchema({ type: 'object', properties: {
      header: { type: 'object' },
      cpu_usage: { type: 'number' },
      memory_usage: { type: 'number' },
      network_latency: { type: 'number' },
      battery_voltage: { type: 'number' },
      battery_current: { type: 'number' },
      battery_percentage: { type: 'number' },
      temperature_sensors: { type: 'array' },
    }}),
  })

  const sManipEvent = await writer.registerSchema({
    name: 'custom/ManipulationEvent', encoding: 'jsonschema',
    data: jsonSchema({ type: 'object', properties: {
      header: { type: 'object' },
      event_type: { type: 'string' },
      component: { type: 'string' },
      event_code: { type: 'string' },
      message: { type: 'string' },
      severity: { type: 'number' },
    }}),
  })

  const sRosout = await writer.registerSchema({
    name: 'rosgraph_msgs/Log', encoding: 'jsonschema',
    data: jsonSchema({ type: 'object', properties: {
      header: { type: 'object' },
      level: { type: 'number' },
      name: { type: 'string' },
      msg: { type: 'string' },
      file: { type: 'string' },
      line: { type: 'number' },
    }}),
  })

  const sRobotConfig = await writer.registerSchema({
    name: 'custom/RobotConfiguration', encoding: 'jsonschema',
    data: jsonSchema({ type: 'object' }),
  })

  const sPerfMetrics = await writer.registerSchema({
    name: 'custom/PerformanceMetrics', encoding: 'jsonschema',
    data: jsonSchema({ type: 'object', properties: {
      header: { type: 'object' },
      left_arm_accuracy: { type: 'array' },
      right_arm_accuracy: { type: 'array' },
      la_grasp_success_rate: { type: 'number' },
      ra_grasp_success_rate: { type: 'number' },
      power_consumption: { type: 'number' },
      efficiency_score: { type: 'number' },
    }}),
  })

  // ── Channels ───────────────────────────────────────────────────────────────

  const meta = new Map()
  const cLaJoint   = await writer.registerChannel({ topic: '/left_arm/joint_states',   messageEncoding: 'json', schemaId: sJointState,   metadata: meta })
  const cRaJoint   = await writer.registerChannel({ topic: '/right_arm/joint_states',  messageEncoding: 'json', schemaId: sJointState,   metadata: meta })
  const cLaHand    = await writer.registerChannel({ topic: '/left_arm/hand_state',     messageEncoding: 'json', schemaId: sHandState,    metadata: meta })
  const cRaGripper = await writer.registerChannel({ topic: '/right_arm/gripper_state', messageEncoding: 'json', schemaId: sGripperState, metadata: meta })
  const cLaTactile = await writer.registerChannel({ topic: '/left_arm/tactile_sensors',messageEncoding: 'json', schemaId: sTactile,      metadata: meta })
  const cBase      = await writer.registerChannel({ topic: '/mobile_base/state',       messageEncoding: 'json', schemaId: sMobileBase,   metadata: meta })
  const cSys       = await writer.registerChannel({ topic: '/system_monitor',          messageEncoding: 'json', schemaId: sSystemMonitor,metadata: meta })
  const cManip     = await writer.registerChannel({ topic: '/manipulation_events',     messageEncoding: 'json', schemaId: sManipEvent,   metadata: meta })
  const cLog       = await writer.registerChannel({ topic: '/rosout',                  messageEncoding: 'json', schemaId: sRosout,       metadata: meta })
  const cConfig    = await writer.registerChannel({ topic: '/robot_configuration',     messageEncoding: 'json', schemaId: sRobotConfig,  metadata: meta })
  const cPerf      = await writer.registerChannel({ topic: '/performance_metrics',     messageEncoding: 'json', schemaId: sPerfMetrics,  metadata: meta })

  let seq = 0
  async function msg(channelId, t, data) {
    const logTime = toNs(t)
    await writer.addMessage({ channelId, logTime, publishTime: logTime, sequence: seq++, data: jsonMsg(data) })
  }

  // ── Robot configuration (once) ────────────────────────────────────────────

  await msg(cConfig, 0, {
    header: { stamp: stamp(0), frame_id: '' },
    robot_id: 'HW-001',
    robot_model: 'Wheeled Humanoid v1.0',
    left_arm_config: {
      dof: 6, ee_type: 'hand',
      joint_names: ['la_j1','la_j2','la_j3','la_j4','la_j5','la_j6'],
      joint_limits: [
        { name:'la_j1', min_position:-3.14, max_position:3.14, max_velocity:2.0, max_effort:50 },
        { name:'la_j2', min_position:-2.09, max_position:2.09, max_velocity:2.0, max_effort:50 },
        { name:'la_j3', min_position:-3.14, max_position:3.14, max_velocity:2.5, max_effort:40 },
        { name:'la_j4', min_position:-1.57, max_position:1.57, max_velocity:3.0, max_effort:30 },
        { name:'la_j5', min_position:-1.57, max_position:1.57, max_velocity:3.0, max_effort:25 },
        { name:'la_j6', min_position:-3.14, max_position:3.14, max_velocity:4.0, max_effort:20 },
      ],
    },
    right_arm_config: {
      dof: 6, ee_type: 'gripper',
      joint_names: ['ra_j1','ra_j2','ra_j3','ra_j4','ra_j5','ra_j6'],
      joint_limits: [
        { name:'ra_j1', min_position:-3.14, max_position:3.14, max_velocity:2.0, max_effort:50 },
        { name:'ra_j2', min_position:-2.09, max_position:2.09, max_velocity:2.0, max_effort:50 },
        { name:'ra_j3', min_position:-3.14, max_position:3.14, max_velocity:2.5, max_effort:40 },
        { name:'ra_j4', min_position:-1.57, max_position:1.57, max_velocity:3.0, max_effort:30 },
        { name:'ra_j5', min_position:-1.57, max_position:1.57, max_velocity:3.0, max_effort:25 },
        { name:'ra_j6', min_position:-3.14, max_position:3.14, max_velocity:4.0, max_effort:20 },
      ],
    },
    hand_config: { type: '5_finger_anthropomorphic', dof: 15, tactile_sensor_count: 45 },
    gripper_config: { type: 'parallel_jaw', max_opening: 0.05, max_force: 100, finger_count: 2 },
    mobile_base_config: { type: 'differential_drive', wheel_count: 2, wheel_radius: 0.15, max_velocity: 1.0 },
  })

  // ── Time-series ──────────────────────────────────────────────────────────

  for (let t = 0; t <= DURATION_S; t += 0.5) {
    const laPos = laJointPositions(t)
    const laEff = laJointEfforts(t)
    const laVel = Array.from({ length: 6 }, (_, i) => noise(0, 0.12, t * (0.08 + i * 0.01)))
    await msg(cLaJoint, t, {
      header: { stamp: stamp(t), frame_id: 'left_arm_base' },
      name: ['la_j1','la_j2','la_j3','la_j4','la_j5','la_j6'],
      position: laPos.map(v => +v.toFixed(5)),
      velocity: laVel.map(v => +v.toFixed(5)),
      effort:   laEff.map(v => +v.toFixed(4)),
    })

    const raPos = raJointPositions(t)
    const raEff = raJointEfforts(t)
    const raVel = Array.from({ length: 6 }, (_, i) => noise(0, 0.13, t * (0.07 + i * 0.01) + 0.5))
    await msg(cRaJoint, t, {
      header: { stamp: stamp(t), frame_id: 'right_arm_base' },
      name: ['ra_j1','ra_j2','ra_j3','ra_j4','ra_j5','ra_j6'],
      position: raPos.map(v => +v.toFixed(5)),
      velocity: raVel.map(v => +v.toFixed(5)),
      effort:   raEff.map(v => +v.toFixed(4)),
    })
  }

  for (let t = 0; t <= DURATION_S; t += 2) {
    const latemps = laJointTemps(t)
    await msg(cLaHand, t, {
      header: { stamp: stamp(t), frame_id: 'left_hand_link' },
      ee_type: 'hand',
      hand_type: '5_finger_anthropomorphic',
      finger_names: ['thumb','index','middle','ring','pinky'],
      finger_joint_positions: {
        thumb:  [+noise(45,3,t*0.05).toFixed(2), +noise(38,2,t*0.06).toFixed(2), +noise(25,2,t*0.07).toFixed(2)],
        index:  [+noise(32,4,t*0.04).toFixed(2), +noise(46,3,t*0.05).toFixed(2), +noise(38,2,t*0.06).toFixed(2)],
        middle: [+noise(29,3,t*0.05).toFixed(2), +noise(42,2,t*0.06).toFixed(2), +noise(36,2,t*0.07).toFixed(2)],
        ring:   [+noise(26,2,t*0.05).toFixed(2), +noise(40,2,t*0.06).toFixed(2), +noise(33,2,t*0.07).toFixed(2)],
        pinky:  [+noise(22,2,t*0.05).toFixed(2), +noise(36,2,t*0.06).toFixed(2), +noise(31,2,t*0.07).toFixed(2)],
      },
      finger_joint_efforts: {
        thumb: [2.3,1.8,1.2], index: [1.8,2.1,1.5], middle: [1.6,1.9,1.3], ring: [1.4,1.7,1.1], pinky: [1.1,1.4,0.9],
      },
      grasp_type: t > 440 ? 'power_grasp' : 'precision_grasp',
      grasp_stability: +noise(0.85, 0.08, t * 0.05).toFixed(3),
      is_grasping: noise(2.8, 0.9, t * 0.09) > 1.5,
      temperature_sensors: latemps.map((temp, i) => ({ location: `la_joint_${i+1}_motor`, temperature: +temp.toFixed(2) })),
    })
  }

  for (let t = 0; t <= DURATION_S; t += 1) {
    const ff = raFingerForces(t)
    const pos = raGripperPos(t)
    const force = raGripperForce(t)
    await msg(cRaGripper, t, {
      header: { stamp: stamp(t), frame_id: 'right_gripper_link' },
      ee_type: 'gripper',
      gripper_type: 'parallel_jaw',
      position: +pos.toFixed(5),
      force: +force.toFixed(3),
      finger_forces: ff.map(v => +v.toFixed(3)),
      is_grasping: force > 1.5,
      object_detected: force > 2.0,
    })
  }

  for (let t = 0; t <= DURATION_S; t += 0.5) {
    const ff = [noise(2.8, 0.9, t * 0.09), noise(0.6, 0.3, t * 0.10)]
    await msg(cLaTactile, t, {
      header: { stamp: stamp(t), frame_id: 'left_hand_link' },
      sensor_count: 45,
      total_force: +(ff[0] * 3 + ff[1] * 2).toFixed(3),
      contact_points: Math.floor(rnd(18, 28)),
    })
  }

  for (let t = 0; t <= DURATION_S; t += 1) {
    const linV = noise(0.3, 0.15, t * 0.04)
    const angV = noise(0, 0.08, t * 0.06)
    await msg(cBase, t, {
      header: { stamp: stamp(t), frame_id: 'base_link' },
      base_type: 'differential_drive',
      linear_velocity: +linV.toFixed(4),
      angular_velocity: +angV.toFixed(4),
      heading_deg: +((t * 0.5) % 360).toFixed(2),
      odometry: { x: +noise(0, 1.2, t * 0.01).toFixed(3), y: +noise(0, 0.8, t * 0.008).toFixed(3) },
      wheel_speeds: {
        left:  +(linV - angV * 0.15).toFixed(4),
        right: +(linV + angV * 0.15).toFixed(4),
      },
    })
  }

  for (let t = 0; t <= DURATION_S; t += 2) {
    const laTemps = laJointTemps(t)
    const raTemps = raJointTemps(t)
    await msg(cSys, t, {
      header: { stamp: stamp(t), frame_id: '' },
      cpu_usage:        +Math.min(1, cpuUsage(t)).toFixed(4),
      memory_usage:     +noise(0.67, 0.05, t * 0.05).toFixed(4),
      network_latency:  +((t > 210 && t < 230) ? rnd(0.030, 0.050) : rnd(0.008, 0.020)).toFixed(4),
      battery_voltage:  +(12.4 - t * 0.001).toFixed(3),
      battery_current:  +noise(2.1, 0.3, t * 0.08).toFixed(3),
      battery_percentage: +(0.87 - t * 0.00005).toFixed(4),
      temperature_sensors: [
        ...laTemps.map((temp, i) => ({ location: `la_joint_${i+1}_motor`, temperature: +temp.toFixed(2) })),
        ...raTemps.map((temp, i) => ({ location: `ra_joint_${i+1}_motor`, temperature: +temp.toFixed(2) })),
        { location: 'cpu',           temperature: +noise(52, 4, t * 0.02).toFixed(2) },
        { location: 'battery',       temperature: +noise(35, 1.5, t * 0.01).toFixed(2) },
      ],
    })
  }

  for (let t = 0; t <= DURATION_S; t += 5) {
    await msg(cPerf, t, {
      header: { stamp: stamp(t), frame_id: '' },
      left_arm_accuracy: ['la_j1','la_j2','la_j3','la_j4','la_j5','la_j6'].map((name, i) => ({
        joint_name: name,
        rms_error: +noise([0.002,0.008,0.002,0.003,0.004,0.001][i], 0.002, t * 0.1).toFixed(5),
        max_error:  +noise([0.005,0.015,0.008,0.009,0.010,0.004][i], 0.004, t * 0.1).toFixed(5),
      })),
      right_arm_accuracy: ['ra_j1','ra_j2','ra_j3','ra_j4','ra_j5','ra_j6'].map((name, i) => ({
        joint_name: name,
        rms_error: +noise([0.002,0.007,0.002,0.003,0.004,0.001][i], 0.002, t * 0.1 + 0.5).toFixed(5),
        max_error:  +noise([0.005,0.014,0.007,0.008,0.009,0.003][i], 0.004, t * 0.1 + 0.5).toFixed(5),
      })),
      la_grasp_success_rate: +noise(0.93, 0.04, t * 0.05).toFixed(4),
      ra_grasp_success_rate: +noise(0.95, 0.03, t * 0.05 + 0.5).toFixed(4),
      power_consumption: +noise(195, 25, t * 0.06).toFixed(2),
      efficiency_score: +noise(0.88, 0.05, t * 0.04).toFixed(4),
    })
  }

  // ── Events ────────────────────────────────────────────────────────────────

  for (const e of MANIP_EVENTS) {
    await msg(cManip, e.t, {
      header: { stamp: stamp(e.t), frame_id: '' },
      event_type: e.type, component: e.component,
      event_code: e.code, message: e.msg, severity: e.severity,
    })
  }

  for (const e of EVENTS) {
    await msg(cLog, e.t, {
      header: { stamp: stamp(e.t), frame_id: '' },
      level: e.level, name: e.node, msg: e.msg,
      file: `${e.node.replace('/', '')}.cpp`,
      line: 100 + Math.floor(Math.random() * 400),
    })
  }

  // ── Finalize ──────────────────────────────────────────────────────────────

  await writer.end()

  const output = Buffer.concat(chunks)
  fs.writeFileSync(OUTPUT_PATH, output)

  const sizeMB = (output.length / 1024 / 1024).toFixed(2)
  console.log(`✅  Written: ${OUTPUT_PATH}`)
  console.log(`   Size: ${sizeMB} MB  |  Messages: ${seq}  |  Duration: ${DURATION_S}s`)
}

generate().catch(err => { console.error(err); process.exit(1) })

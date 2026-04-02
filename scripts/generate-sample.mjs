/**
 * MCAP Sample Log Generator
 * Generates a realistic 10-minute ROS2 manipulation robot log in MCAP format.
 * Output: public/sample-log.mcap
 *
 * Topics generated:
 *   /joint_states           (2 Hz)  sensor_msgs/JointState
 *   /gripper_state          (1 Hz)  custom/GripperState
 *   /hand_state             (0.5Hz) custom/HandState
 *   /tactile_sensors        (2 Hz)  custom/TactileSensors
 *   /system_monitor         (0.5Hz) custom/SystemMonitor
 *   /manipulation_events    (event) custom/ManipulationEvent
 *   /rosout                 (event) rosgraph_msgs/Log
 *   /robot_configuration    (once)  custom/RobotConfiguration
 *   /performance_metrics    (0.2Hz) custom/PerformanceMetrics
 */

import { McapWriter } from '@mcap/core'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'sample-log.mcap')

// ── helpers ──────────────────────────────────────────────────────────────────

function rnd(min, max) { return min + Math.random() * (max - min) }
function noise(base, amp, t) {
  return base + amp * Math.sin(t * 0.5) + amp * 0.3 * Math.sin(t * 1.3)
}

// Convert seconds offset to nanoseconds BigInt timestamp
const START_UNIX_S = 1710942000  // 2024-03-20T14:20:00+09:00
function toNs(offsetSec) {
  return BigInt(Math.floor((START_UNIX_S + offsetSec) * 1e9))
}

function d2r(deg) { return deg * Math.PI / 180 }
function r2d(rad) { return rad * 180 / Math.PI }

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

// ── JSON Schema helpers ───────────────────────────────────────────────────────

const enc = new TextEncoder()

function jsonSchema(obj) {
  return enc.encode(JSON.stringify(obj))
}

function jsonMsg(obj) {
  return enc.encode(JSON.stringify(obj))
}

function stamp(offsetSec) {
  const ns = Math.floor((offsetSec % 1) * 1e9)
  return { sec: START_UNIX_S + Math.floor(offsetSec), nanosec: ns }
}

// ── robot dynamics simulation ─────────────────────────────────────────────────

function jointPositions(t) {
  return [
    d2r(noise(45, 8, t * 0.08)),
    d2r(noise(-30, 10, t * 0.06)),
    d2r(noise(90, 6, t * 0.10)),
    d2r(noise(20, 4, t * 0.12)),
    d2r(noise(-15, 5, t * 0.07)),
    d2r(noise(5, 3, t * 0.15)),
  ]
}

function jointVelocities(t) {
  return Array.from({ length: 6 }, (_, i) =>
    noise(0, 0.15, t * (0.08 + i * 0.01))
  )
}

function jointEfforts(t) {
  return [
    noise(2.1, 0.4, t * 0.09),
    noise(1.8, 0.5, t * 0.07 + 1),
    noise(0.9, 0.3, t * 0.11),
    noise(1.2, 0.2, t * 0.13),
    noise(0.8, 0.25, t * 0.08),
    noise(0.5, 0.15, t * 0.10),
  ]
}

function gripperPos(t) { return Math.max(0, noise(0.015, 0.005, t * 0.05)) }
function gripperForce(t) { return Math.max(0, noise(2.5, 1.2, t * 0.08)) }

function fingerForces(t) {
  const anomaly = t > 252 && t < 270
  return [
    Math.max(0, noise(3.2, 0.8, t * 0.09)),
    anomaly
      ? Math.max(0, noise(0.8, 1.2, t * 0.18))
      : Math.max(0, noise(2.8, 0.5, t * 0.09)),
  ]
}

function cpuUsage(t) {
  return t > 320 && t < 360
    ? Math.min(1, noise(0.85, 0.08, t * 0.2))
    : Math.min(1, noise(0.45, 0.10, t * 0.1))
}

function jointTemps(t) {
  return [
    noise(38, 2, t * 0.01),
    noise(42, 3, t * 0.012),
    t > 350 ? noise(55, 4, t * 0.015) : noise(38, 2, t * 0.013),
    noise(35, 1.5, t * 0.011),
    noise(40, 2, t * 0.012),
    noise(37, 1.5, t * 0.010),
  ]
}

// ── main generator ────────────────────────────────────────────────────────────

const DURATION_S = 600  // 10 minutes

const EVENTS = [
  { t: 5,   level: 2, node: '/arm_controller',     msg: 'Initialization complete. 6-DOF arm ready.' },
  { t: 8,   level: 2, node: '/gripper_controller', msg: 'Gripper initialized: parallel_jaw, max 50mm' },
  { t: 20,  level: 2, node: '/hand_controller',    msg: 'Hand initialized: 5-finger anthropomorphic, 15 DOF' },
  { t: 50,  level: 2, node: '/arm_controller',     msg: 'move_to_position([45, -30, 90]) — trajectory planned' },
  { t: 65,  level: 2, node: '/gripper_controller', msg: 'Close command received, target force: 5.0N' },
  { t: 95,  level: 2, node: '/arm_controller',     msg: 'Target position reached within ±0.5°' },
  { t: 132, level: 4, node: '/arm_controller',     msg: 'Joint 2 approaching velocity limit (current: 85% of max)' },
  { t: 145, level: 2, node: '/arm_controller',     msg: 'Velocity reduced to 70% — within limits' },
  { t: 160, level: 2, node: '/gripper_controller', msg: 'Stable grip achieved — object detected 95% confidence' },
  { t: 210, level: 4, node: '/system_monitor',     msg: 'Network latency spike: 45ms (threshold 20ms)' },
  { t: 225, level: 2, node: '/system_monitor',     msg: 'Network latency normalized: 15ms' },
  { t: 252, level: 8, node: '/gripper_controller', msg: 'Pressure sensor anomaly on finger 2 — auto-recalibration' },
  { t: 258, level: 4, node: '/gripper_controller', msg: 'Grip adjustment in progress' },
  { t: 270, level: 2, node: '/gripper_controller', msg: 'Grip stable after adjustment (4.8N)' },
  { t: 321, level: 8, node: '/system_monitor',     msg: 'CPU spike: 89% (threshold 80%)' },
  { t: 330, level: 4, node: '/system_monitor',     msg: 'CPU still elevated: 83%' },
  { t: 345, level: 2, node: '/system_monitor',     msg: 'CPU normalized: 52%' },
  { t: 355, level: 4, node: '/arm_controller',     msg: 'Joint 3 motor temperature approaching limit: 55°C (limit 60°C)' },
  { t: 368, level: 4, node: '/arm_controller',     msg: 'Thermal throttle applied to Joint 3' },
  { t: 385, level: 2, node: '/gripper_controller', msg: 'Release command — object released' },
  { t: 410, level: 4, node: '/system_monitor',     msg: 'Tactile sensor unresponsive: Finger 2, Sensor 3' },
  { t: 440, level: 2, node: '/arm_controller',     msg: 'New task: adaptive_grasp(cylinder, 60N)' },
  { t: 480, level: 2, node: '/arm_controller',     msg: 'Joint 2 recalibration completed' },
  { t: 530, level: 8, node: '/gripper_controller', msg: 'Grip force instability — auto-adjustment triggered' },
  { t: 550, level: 2, node: '/gripper_controller', msg: 'Grip stabilized' },
  { t: 590, level: 2, node: '/arm_controller',     msg: 'Task completed — success rate 95%' },
]

const MANIP_EVENTS = [
  { t: 132, type: 'warning',  component: 'arm',     code: 'VELOCITY_LIMIT_APPROACH',   msg: 'Joint 2 velocity at 85% of limit', severity: 1 },
  { t: 210, type: 'warning',  component: 'system',  code: 'NETWORK_LATENCY_SPIKE',      msg: 'Network latency spike: 45ms', severity: 1 },
  { t: 252, type: 'error',    component: 'gripper', code: 'PRESSURE_SENSOR_ANOMALY',    msg: 'Pressure sensor anomaly on finger 2', severity: 2 },
  { t: 321, type: 'error',    component: 'system',  code: 'CPU_THRESHOLD_EXCEEDED',     msg: 'CPU usage 89% — threshold 80%', severity: 2 },
  { t: 355, type: 'warning',  component: 'arm',     code: 'MOTOR_TEMP_HIGH',            msg: 'Joint 3 motor: 55°C (limit 60°C)', severity: 2 },
  { t: 410, type: 'warning',  component: 'system',  code: 'SENSOR_UNRESPONSIVE',        msg: 'Tactile sensor offline: Finger 2 Sensor 3', severity: 1 },
  { t: 480, type: 'info',     component: 'arm',     code: 'CALIBRATION_COMPLETE',       msg: 'Joint 2 recalibration completed', severity: 0 },
  { t: 530, type: 'error',    component: 'gripper', code: 'GRIP_FORCE_INSTABILITY',     msg: 'Grip force instability — auto-adjust', severity: 2 },
]

async function generate() {
  console.log('Generating sample MCAP…')

  const writer = new McapWriter({ writable })
  await writer.start({ library: 'manipulation-replay-generator/1.0', profile: 'ros2' })

  // ── Register schemas ────────────────────────────────────────────────────────

  const sJointState = await writer.registerSchema({
    name: 'sensor_msgs/JointState',
    encoding: 'jsonschema',
    data: jsonSchema({
      type: 'object', title: 'sensor_msgs/JointState',
      properties: {
        header:   { type: 'object' },
        name:     { type: 'array', items: { type: 'string' } },
        position: { type: 'array', items: { type: 'number' } },
        velocity: { type: 'array', items: { type: 'number' } },
        effort:   { type: 'array', items: { type: 'number' } },
      },
    }),
  })

  const sGripperState = await writer.registerSchema({
    name: 'custom/GripperState',
    encoding: 'jsonschema',
    data: jsonSchema({
      type: 'object', title: 'custom/GripperState',
      properties: {
        header:           { type: 'object' },
        gripper_type:     { type: 'string' },
        position:         { type: 'number' },
        target_position:  { type: 'number' },
        force:            { type: 'number' },
        target_force:     { type: 'number' },
        finger_positions: { type: 'array', items: { type: 'number' } },
        finger_forces:    { type: 'array', items: { type: 'number' } },
        is_grasping:      { type: 'boolean' },
        object_detected:  { type: 'boolean' },
      },
    }),
  })

  const sHandState = await writer.registerSchema({
    name: 'custom/HandState',
    encoding: 'jsonschema',
    data: jsonSchema({
      type: 'object', title: 'custom/HandState',
      properties: {
        header:                   { type: 'object' },
        hand_type:                { type: 'string' },
        finger_names:             { type: 'array', items: { type: 'string' } },
        finger_joint_positions:   { type: 'object' },
        finger_joint_efforts:     { type: 'object' },
        grasp_type:               { type: 'string' },
        grasp_stability:          { type: 'number' },
      },
    }),
  })

  const sTactile = await writer.registerSchema({
    name: 'custom/TactileSensors',
    encoding: 'jsonschema',
    data: jsonSchema({
      type: 'object', title: 'custom/TactileSensors',
      properties: {
        header:         { type: 'object' },
        sensor_count:   { type: 'number' },
        finger_sensors: { type: 'object' },
        total_force:    { type: 'number' },
        contact_points: { type: 'number' },
        center_of_pressure: { type: 'object' },
      },
    }),
  })

  const sSystemMonitor = await writer.registerSchema({
    name: 'custom/SystemMonitor',
    encoding: 'jsonschema',
    data: jsonSchema({
      type: 'object', title: 'custom/SystemMonitor',
      properties: {
        header:               { type: 'object' },
        cpu_usage:            { type: 'number' },
        memory_usage:         { type: 'number' },
        network_latency:      { type: 'number' },
        packet_loss:          { type: 'number' },
        battery_voltage:      { type: 'number' },
        battery_current:      { type: 'number' },
        battery_percentage:   { type: 'number' },
        temperature_sensors:  { type: 'array' },
      },
    }),
  })

  const sManipEvent = await writer.registerSchema({
    name: 'custom/ManipulationEvent',
    encoding: 'jsonschema',
    data: jsonSchema({
      type: 'object', title: 'custom/ManipulationEvent',
      properties: {
        header:    { type: 'object' },
        event_type:{ type: 'string' },
        component: { type: 'string' },
        event_code:{ type: 'string' },
        message:   { type: 'string' },
        severity:  { type: 'number' },
      },
    }),
  })

  const sRosout = await writer.registerSchema({
    name: 'rosgraph_msgs/Log',
    encoding: 'jsonschema',
    data: jsonSchema({
      type: 'object', title: 'rosgraph_msgs/Log',
      properties: {
        header:   { type: 'object' },
        level:    { type: 'number' },
        name:     { type: 'string' },
        msg:      { type: 'string' },
        file:     { type: 'string' },
        function: { type: 'string' },
        line:     { type: 'number' },
      },
    }),
  })

  const sRobotConfig = await writer.registerSchema({
    name: 'custom/RobotConfiguration',
    encoding: 'jsonschema',
    data: jsonSchema({ type: 'object', title: 'custom/RobotConfiguration' }),
  })

  const sPerfMetrics = await writer.registerSchema({
    name: 'custom/PerformanceMetrics',
    encoding: 'jsonschema',
    data: jsonSchema({
      type: 'object', title: 'custom/PerformanceMetrics',
      properties: {
        header:                 { type: 'object' },
        joint_accuracy:         { type: 'array' },
        grasp_success_rate:     { type: 'number' },
        power_consumption:      { type: 'number' },
        efficiency_score:       { type: 'number' },
        command_response_times: { type: 'array' },
      },
    }),
  })

  // ── Register channels ───────────────────────────────────────────────────────

  const meta = new Map()
  const cJoint    = await writer.registerChannel({ topic: '/joint_states',         messageEncoding: 'json', schemaId: sJointState,   metadata: meta })
  const cGripper  = await writer.registerChannel({ topic: '/gripper_state',        messageEncoding: 'json', schemaId: sGripperState, metadata: meta })
  const cHand     = await writer.registerChannel({ topic: '/hand_state',           messageEncoding: 'json', schemaId: sHandState,    metadata: meta })
  const cTactile  = await writer.registerChannel({ topic: '/tactile_sensors',      messageEncoding: 'json', schemaId: sTactile,      metadata: meta })
  const cSys      = await writer.registerChannel({ topic: '/system_monitor',       messageEncoding: 'json', schemaId: sSystemMonitor,metadata: meta })
  const cManip    = await writer.registerChannel({ topic: '/manipulation_events',  messageEncoding: 'json', schemaId: sManipEvent,   metadata: meta })
  const cLog      = await writer.registerChannel({ topic: '/rosout',               messageEncoding: 'json', schemaId: sRosout,       metadata: meta })
  const cConfig   = await writer.registerChannel({ topic: '/robot_configuration',  messageEncoding: 'json', schemaId: sRobotConfig,  metadata: meta })
  const cPerf     = await writer.registerChannel({ topic: '/performance_metrics',  messageEncoding: 'json', schemaId: sPerfMetrics,  metadata: meta })

  let seq = 0
  async function msg(channelId, t, data) {
    const logTime = toNs(t)
    await writer.addMessage({ channelId, logTime, publishTime: logTime, sequence: seq++, data: jsonMsg(data) })
  }

  // ── Robot configuration (once at t=0) ──────────────────────────────────────

  await msg(cConfig, 0, {
    header: { stamp: stamp(0), frame_id: '' },
    robot_id: 'MR-001',
    robot_model: 'Manipulation Bot v2.1',
    arm_config: {
      dof: 6,
      joint_names: ['joint_1','joint_2','joint_3','joint_4','joint_5','joint_6'],
      joint_limits: [
        { name:'joint_1', min_position:-3.14, max_position:3.14, max_velocity:2.0, max_effort:50 },
        { name:'joint_2', min_position:-2.09, max_position:2.09, max_velocity:2.0, max_effort:50 },
        { name:'joint_3', min_position:-3.14, max_position:3.14, max_velocity:2.5, max_effort:40 },
        { name:'joint_4', min_position:-1.57, max_position:1.57, max_velocity:3.0, max_effort:30 },
        { name:'joint_5', min_position:-1.57, max_position:1.57, max_velocity:3.0, max_effort:25 },
        { name:'joint_6', min_position:-3.14, max_position:3.14, max_velocity:4.0, max_effort:20 },
      ],
    },
    gripper_config: { type: 'parallel_jaw', max_opening: 0.05, max_force: 100, finger_count: 2 },
    hand_config: {
      type: '5_finger_anthropomorphic',
      dof: 15,
      tactile_sensor_count: 45,
      last_calibration: '2024-03-15T09:30:00Z',
    },
  })

  // ── Time-series topics ──────────────────────────────────────────────────────

  const JOINT_HZ  = 2   // /joint_states   every 0.5s
  const GRIP_HZ   = 1   // /gripper_state  every 1s
  const HAND_HZ   = 0.5 // /hand_state     every 2s
  const TAC_HZ    = 2   // /tactile        every 0.5s
  const SYS_HZ    = 0.5 // /system_monitor every 2s
  const PERF_HZ   = 0.2 // /performance    every 5s

  for (let t = 0; t <= DURATION_S; t += 1 / JOINT_HZ) {
    const pos = jointPositions(t)
    const vel = jointVelocities(t)
    const eff = jointEfforts(t)
    await msg(cJoint, t, {
      header: { stamp: stamp(t), frame_id: 'base_link' },
      name: ['joint_1','joint_2','joint_3','joint_4','joint_5','joint_6'],
      position: pos.map(v => +v.toFixed(5)),
      velocity: vel.map(v => +v.toFixed(5)),
      effort:   eff.map(v => +v.toFixed(4)),
    })
  }

  for (let t = 0; t <= DURATION_S; t += 1 / GRIP_HZ) {
    const pos = gripperPos(t)
    const force = gripperForce(t)
    const ff = fingerForces(t)
    await msg(cGripper, t, {
      header: { stamp: stamp(t), frame_id: 'gripper_link' },
      gripper_type: 'parallel_jaw',
      position: +pos.toFixed(5),
      target_position: 0.015,
      force: +force.toFixed(3),
      target_force: 5.0,
      finger_positions: [+(pos / 2).toFixed(5), +(pos / 2).toFixed(5)],
      finger_forces: ff.map(v => +v.toFixed(3)),
      is_grasping: force > 1.5,
      object_detected: force > 2.0,
    })
  }

  for (let t = 0; t <= DURATION_S; t += 1 / HAND_HZ) {
    await msg(cHand, t, {
      header: { stamp: stamp(t), frame_id: 'hand_link' },
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
        thumb:  [2.3, 1.8, 1.2], index: [1.8, 2.1, 1.5],
        middle: [1.6, 1.9, 1.3], ring:  [1.4, 1.7, 1.1],
        pinky:  [1.1, 1.4, 0.9],
      },
      grasp_type: t > 440 ? 'power_grasp' : 'precision_grasp',
      grasp_stability: +noise(0.85, 0.08, t * 0.05).toFixed(3),
    })
  }

  for (let t = 0; t <= DURATION_S; t += 1 / TAC_HZ) {
    const ff = fingerForces(t)
    await msg(cTactile, t, {
      header: { stamp: stamp(t), frame_id: 'hand_link' },
      sensor_count: 45,
      finger_sensors: {
        thumb:  Array.from({length:9}, (_,i) => ({ pressure: +noise(ff[0]*0.3, 0.5, t+i).toFixed(3), contact: ff[0] > 0.5 })),
        index:  Array.from({length:9}, (_,i) => ({ pressure: +noise(ff[1]*0.35, 0.6, t+i).toFixed(3), contact: ff[1] > 0.5 })),
        middle: Array.from({length:9}, (_,i) => ({ pressure: +noise(ff[0]*0.25, 0.4, t+i).toFixed(3), contact: ff[0] > 0.5 })),
        ring:   Array.from({length:9}, (_,i) => ({ pressure: +noise(ff[1]*0.2, 0.3, t+i).toFixed(3), contact: ff[1] > 0.3 })),
        pinky:  Array.from({length:9}, (_,i) => ({ pressure: +noise(ff[0]*0.15, 0.2, t+i).toFixed(3), contact: ff[0] > 0.2 })),
      },
      total_force: +(ff[0] * 3 + ff[1] * 2).toFixed(3),
      contact_points: Math.floor(rnd(18, 28)),
      center_of_pressure: { x: +rnd(0.008, 0.016).toFixed(4), y: +rnd(0.004, 0.012).toFixed(4) },
    })
  }

  for (let t = 0; t <= DURATION_S; t += 1 / SYS_HZ) {
    const temps = jointTemps(t)
    await msg(cSys, t, {
      header: { stamp: stamp(t), frame_id: '' },
      cpu_usage:          +Math.min(1, cpuUsage(t)).toFixed(4),
      memory_usage:       +noise(0.67, 0.05, t * 0.05).toFixed(4),
      network_latency:    +((t > 210 && t < 230) ? rnd(0.030, 0.050) : rnd(0.008, 0.020)).toFixed(4),
      packet_loss:        +rnd(0, 0.002).toFixed(5),
      battery_voltage:    +(12.4 - t * 0.001).toFixed(3),
      battery_current:    +noise(2.1, 0.3, t * 0.08).toFixed(3),
      battery_percentage: +(0.87 - t * 0.00005).toFixed(4),
      temperature_sensors: [
        { location: 'joint_1_motor', temperature: +temps[0].toFixed(2) },
        { location: 'joint_2_motor', temperature: +temps[1].toFixed(2) },
        { location: 'joint_3_motor', temperature: +temps[2].toFixed(2) },
        { location: 'joint_4_motor', temperature: +temps[3].toFixed(2) },
        { location: 'joint_5_motor', temperature: +temps[4].toFixed(2) },
        { location: 'joint_6_motor', temperature: +temps[5].toFixed(2) },
        { location: 'cpu',           temperature: +noise(52, 4, t * 0.02).toFixed(2) },
        { location: 'battery',       temperature: +noise(35, 1.5, t * 0.01).toFixed(2) },
      ],
    })
  }

  for (let t = 0; t <= DURATION_S; t += 1 / PERF_HZ) {
    await msg(cPerf, t, {
      header: { stamp: stamp(t), frame_id: '' },
      joint_accuracy: ['joint_1','joint_2','joint_3','joint_4','joint_5','joint_6'].map((name, i) => ({
        joint_name: name,
        rms_error: +noise([0.002,0.008,0.002,0.003,0.004,0.001][i], 0.002, t * 0.1).toFixed(5),
        max_error:  +noise([0.005,0.015,0.008,0.009,0.010,0.004][i], 0.004, t * 0.1).toFixed(5),
      })),
      grasp_success_rate:     +noise(0.95, 0.04, t * 0.05).toFixed(4),
      power_consumption:      +noise(145, 20, t * 0.06).toFixed(2),
      efficiency_score:       +noise(0.89, 0.05, t * 0.04).toFixed(4),
      command_response_times: [
        { command_type: 'move_joints', avg_response_time: +noise(0.15, 0.03, t * 0.1).toFixed(4) },
        { command_type: 'grip',        avg_response_time: +noise(0.08, 0.02, t * 0.1).toFixed(4) },
      ],
    })
  }

  // ── Events ──────────────────────────────────────────────────────────────────

  for (const e of MANIP_EVENTS) {
    await msg(cManip, e.t, {
      header: { stamp: stamp(e.t), frame_id: '' },
      event_type: e.type,
      component:  e.component,
      event_code: e.code,
      message:    e.msg,
      severity:   e.severity,
    })
  }

  for (const e of EVENTS) {
    await msg(cLog, e.t, {
      header:   { stamp: stamp(e.t), frame_id: '' },
      level:    e.level,
      name:     e.node,
      msg:      e.msg,
      file:     `${e.node.replace('/', '')}.cpp`,
      function: 'execute',
      line:     100 + Math.floor(Math.random() * 400),
    })
  }

  // ── Finalize ─────────────────────────────────────────────────────────────────

  await writer.end()

  const output = Buffer.concat(chunks)
  fs.writeFileSync(OUTPUT_PATH, output)

  const sizeMB = (output.length / 1024 / 1024).toFixed(2)
  const msgCount = seq
  console.log(`✅  Written: ${OUTPUT_PATH}`)
  console.log(`   Size: ${sizeMB} MB  |  Messages: ${msgCount}  |  Duration: ${DURATION_S}s`)
}

generate().catch(err => { console.error(err); process.exit(1) })

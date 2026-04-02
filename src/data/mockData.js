import dayjs from 'dayjs'

const BASE_TIME = dayjs('2024-03-20T14:20:00')

function timeAt(seconds) {
  return BASE_TIME.add(seconds, 'second')
}

function rnd(min, max) {
  return +(min + Math.random() * (max - min)).toFixed(3)
}

function noise(base, amp, t) {
  return +(base + amp * Math.sin(t * 0.5) + amp * 0.3 * Math.sin(t * 1.3)).toFixed(3)
}

// Generate time-series data points over 600 seconds (10 min)
const TOTAL_SECONDS = 600
const SAMPLE_RATE = 2 // every 2s => 300 points

export function generateTimeSeriesData() {
  const points = []
  for (let t = 0; t <= TOTAL_SECONDS; t += SAMPLE_RATE) {
    const ts = timeAt(t)
    points.push({
      t,
      time: ts.format('HH:mm:ss'),
      // Joint states (6 DOF)
      j1_pos: noise(45, 8, t * 0.08),
      j2_pos: noise(-30, 10, t * 0.06),
      j3_pos: noise(90, 6, t * 0.10),
      j4_pos: noise(20, 4, t * 0.12),
      j5_pos: noise(-15, 5, t * 0.07),
      j6_pos: noise(5, 3, t * 0.15),
      j1_torque: noise(2.1, 0.4, t * 0.09),
      j2_torque: noise(1.8, 0.5, t * 0.07 + 1),
      j3_torque: noise(0.9, 0.3, t * 0.11),
      j4_torque: noise(1.2, 0.2, t * 0.13),
      j5_torque: noise(0.8, 0.25, t * 0.08),
      j6_torque: noise(0.5, 0.15, t * 0.10),
      j1_temp: noise(38, 2, t * 0.01),
      j2_temp: noise(42, 3, t * 0.012),
      j3_temp: t > 350 ? noise(55, 4, t * 0.015) : noise(38, 2, t * 0.013),
      // Gripper
      gripper_pos: noise(15, 5, t * 0.05),
      gripper_force: noise(2.5, 1.2, t * 0.08),
      finger1_pressure: noise(3.2, 0.8, t * 0.09),
      finger2_pressure: t > 250 ? noise(2.0, 1.5, t * 0.12) : noise(2.8, 0.5, t * 0.09),
      // System
      cpu: t > 320 && t < 360 ? noise(85, 8, t * 0.2) : noise(45, 10, t * 0.1),
      memory: noise(67, 5, t * 0.05),
      battery_voltage: +(12.4 - t * 0.001).toFixed(2),
      battery_current: noise(2.1, 0.3, t * 0.08),
      network_latency: t > 210 && t < 230 ? noise(45, 10, t * 0.5) : noise(12, 3, t * 0.2),
      // Performance
      j1_error: noise(0.1, 0.05, t * 0.2),
      j2_error: noise(0.8, 0.3, t * 0.18),
      j3_error: noise(0.2, 0.08, t * 0.22),
      grip_pressure_stability: t > 250 ? noise(70, 15, t * 0.15) : noise(88, 5, t * 0.1),
      power_consumption: noise(145, 20, t * 0.06),
    })
  }
  return points
}

// Issues/markers on the timeline
export const ISSUES = [
  { t: 132, time: '14:22:12', level: 'WARN', component: 'Arm', message: 'Joint 2 approaching velocity limit (current: 85% of max)' },
  { t: 210, time: '14:23:30', level: 'WARN', component: 'System', message: 'Network latency spike detected (peak: 45ms)' },
  { t: 252, time: '14:24:12', level: 'ERROR', component: 'Gripper', message: 'Pressure sensor reading anomaly detected on finger 2' },
  { t: 321, time: '14:25:21', level: 'ERROR', component: 'System', message: 'CPU usage spike: 89% (threshold: 80%)' },
  { t: 355, time: '14:25:55', level: 'WARN', component: 'Arm', message: 'Joint 3 motor temperature approaching limit (55°C)' },
  { t: 410, time: '14:26:50', level: 'WARN', component: 'System', message: 'One tactile sensor unresponsive (Finger 2, Sensor 3)' },
  { t: 480, time: '14:28:00', level: 'INFO', component: 'Arm', message: 'Recalibration completed for Joint 2' },
  { t: 530, time: '14:28:50', level: 'ERROR', component: 'Gripper', message: 'Grip force instability - auto-adjustment triggered' },
]

// Full log entries
export function generateLogEntries() {
  const entries = []
  const events = [
    { t: 0, level: 'INFO', component: 'System', message: 'Manipulation Replay session started' },
    { t: 5, level: 'INFO', component: 'Arm', message: 'Joint motion command received: target=[45, -30, 90, 20, -15, 5]' },
    { t: 8, level: 'INFO', component: 'Arm', message: 'All joints started moving to target position' },
    { t: 20, level: 'INFO', component: 'Gripper', message: 'Gripper initialized: parallel_jaw type, max opening 50mm' },
    { t: 35, level: 'DEBUG', component: 'System', message: '/joint_states: publishing at 50Hz' },
    { t: 50, level: 'INFO', component: 'Arm', message: 'Target position reached within tolerance (±0.5°)' },
    { t: 65, level: 'INFO', component: 'Gripper', message: 'Close command received with target force: 5.0N' },
    { t: 80, level: 'DEBUG', component: 'Gripper', message: 'Finger 1 position: 7.5mm, Finger 2 position: 7.5mm' },
    { t: 95, level: 'INFO', component: 'Arm', message: 'move_to_position([30, -45, 75]) - trajectory planned' },
    { t: 120, level: 'INFO', component: 'System', message: 'ROS topics active: 12/15 (/joint_states, /gripper_state, /tf ...)' },
    { t: 132, level: 'WARN', component: 'Arm', message: 'Joint 2 approaching velocity limit (current: 85% of max)' },
    { t: 145, level: 'INFO', component: 'Arm', message: 'Velocity reduced to 70% to stay within limits' },
    { t: 160, level: 'INFO', component: 'Gripper', message: 'Grip stable - object detected, confidence: 95%' },
    { t: 178, level: 'DEBUG', component: 'Hand', message: 'Adaptive grasp algorithm: power_grasp configuration applied' },
    { t: 195, level: 'INFO', component: 'Hand', message: 'All 5 fingers in contact with object' },
    { t: 210, level: 'WARN', component: 'System', message: 'Network latency spike detected (peak: 45ms)' },
    { t: 225, level: 'INFO', component: 'System', message: 'Network latency normalized (15ms)' },
    { t: 240, level: 'DEBUG', component: 'Arm', message: 'Joint angles: J1=45.2°, J2=-31.5°, J3=89.8°, J4=19.7°, J5=-14.9°, J6=5.1°' },
    { t: 252, level: 'ERROR', component: 'Gripper', message: 'Pressure sensor reading anomaly detected on finger 2' },
    { t: 258, level: 'WARN', component: 'Gripper', message: 'Grip adjustment attempted - recalibrating pressure threshold' },
    { t: 270, level: 'INFO', component: 'Gripper', message: 'Grip adjustment completed - stable grasp achieved' },
    { t: 285, level: 'INFO', component: 'Hand', message: 'Index finger torque limit approached - reducing force' },
    { t: 300, level: 'DEBUG', component: 'System', message: 'CPU: 45%, Memory: 67%, Battery: 87%' },
    { t: 315, level: 'INFO', component: 'Arm', message: 'move_to_position([0, 0, 0]) - returning to home' },
    { t: 321, level: 'ERROR', component: 'System', message: 'CPU usage spike: 89% (threshold: 80%)' },
    { t: 330, level: 'WARN', component: 'System', message: 'CPU usage still elevated: 83%' },
    { t: 345, level: 'INFO', component: 'System', message: 'CPU usage normalized: 52%' },
    { t: 355, level: 'WARN', component: 'Arm', message: 'Joint 3 motor temperature approaching limit (55°C, limit: 60°C)' },
    { t: 368, level: 'DEBUG', component: 'Arm', message: 'Thermal throttling applied to Joint 3 - max velocity reduced' },
    { t: 385, level: 'INFO', component: 'Gripper', message: 'Release command executed - object released successfully' },
    { t: 400, level: 'INFO', component: 'Arm', message: 'Home position reached' },
    { t: 410, level: 'WARN', component: 'System', message: 'One tactile sensor unresponsive (Finger 2, Sensor 3)' },
    { t: 425, level: 'DEBUG', component: 'Hand', message: 'Sensor diagnostic: 44/45 sensors operational' },
    { t: 440, level: 'INFO', component: 'Arm', message: 'New task: grasp_object(type=cylinder, force=60N)' },
    { t: 455, level: 'INFO', component: 'Hand', message: 'adaptive_grasp initiated for cylindrical object' },
    { t: 470, level: 'INFO', component: 'Hand', message: 'Grasp formation completed - all fingers synchronized' },
    { t: 480, level: 'INFO', component: 'Arm', message: 'Recalibration completed for Joint 2' },
    { t: 495, level: 'DEBUG', component: 'System', message: '/tactile_sensors: publishing at 100Hz' },
    { t: 510, level: 'INFO', component: 'Gripper', message: 'Object lifted - weight estimation: 0.48kg' },
    { t: 525, level: 'INFO', component: 'Arm', message: 'move trajectory: lift + translate (0.3m)' },
    { t: 530, level: 'ERROR', component: 'Gripper', message: 'Grip force instability - auto-adjustment triggered' },
    { t: 538, level: 'WARN', component: 'Gripper', message: 'Force sensor recalibration in progress' },
    { t: 550, level: 'INFO', component: 'Gripper', message: 'Grip stabilized after force adjustment' },
    { t: 565, level: 'INFO', component: 'Hand', message: 'Stable grasp achieved - stability: 91%' },
    { t: 580, level: 'INFO', component: 'Arm', message: 'Place position reached' },
    { t: 590, level: 'INFO', component: 'Gripper', message: 'Object placed successfully - task complete' },
    { t: 598, level: 'INFO', component: 'System', message: 'Task completed - duration: 598s, success rate: 95%' },
  ]
  return events.map((e, i) => ({
    id: i,
    ...e,
    time: timeAt(e.t).format('HH:mm:ss'),
    fullTime: timeAt(e.t).format('HH:mm:ss.SSS'),
  }))
}

// Robot configuration
export const ROBOT_CONFIG = {
  robotId: 'MR-001',
  model: 'Manipulation Bot v2.1',
  gripperType: 'Parallel Jaw',
  handType: '5-Finger Anthropomorphic',
  dof: 6,
  jointLimits: [
    { name: 'Joint 1', min: -180, max: 180, maxVelocity: 2.0, maxTorque: 50 },
    { name: 'Joint 2', min: -120, max: 120, maxVelocity: 2.0, maxTorque: 50 },
    { name: 'Joint 3', min: -180, max: 180, maxVelocity: 2.5, maxTorque: 40 },
    { name: 'Joint 4', min: -90, max: 90, maxVelocity: 3.0, maxTorque: 30 },
    { name: 'Joint 5', min: -90, max: 90, maxVelocity: 3.0, maxTorque: 25 },
    { name: 'Joint 6', min: -180, max: 180, maxVelocity: 4.0, maxTorque: 20 },
  ],
  activeTopics: [
    { name: '/joint_states', hz: 50, status: 'ok' },
    { name: '/gripper_state', hz: 20, status: 'ok' },
    { name: '/arm_controller/cmd', hz: 10, status: 'ok' },
    { name: '/tactile_sensors', hz: 100, status: 'ok' },
    { name: '/tf', hz: 100, status: 'ok' },
    { name: '/hand_state', hz: 5, status: 'warn' },
    { name: '/diagnostics', hz: 1, status: 'ok' },
    { name: '/camera/image', hz: 0, status: 'error' },
    { name: '/system_monitor', hz: 5, status: 'ok' },
    { name: '/manipulation_events', hz: null, status: 'ok' },
    { name: '/lidar/scan', hz: 0, status: 'error' },
    { name: '/imu/data', hz: 0, status: 'error' },
  ],
}

// Log files list
export const LOG_FILES = [
  { id: 1, name: '2024-03-20_14:20_MR-001.bag', size: '2.3 GB', duration: '00:10:00', issues: 6, selected: true },
  { id: 2, name: '2024-03-20_09:15_MR-001.bag', size: '1.8 GB', duration: '00:08:30', issues: 2, selected: false },
  { id: 3, name: '2024-03-19_16:45_MR-001.bag', size: '3.1 GB', duration: '00:14:20', issues: 11, selected: false },
  { id: 4, name: '2024-03-19_10:00_MR-001.bag', size: '2.7 GB', duration: '00:12:00', issues: 4, selected: false },
]

export const TOTAL_DURATION = TOTAL_SECONDS

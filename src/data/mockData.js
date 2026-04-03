import dayjs from 'dayjs'

const BASE_TIME = dayjs('2024-03-20T14:20:00')

function timeAt(seconds) {
  return BASE_TIME.add(seconds, 'second')
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

    // Left arm (ee_type: 'hand') — slightly different motion profile
    const la_j3hot = t > 350
    const la_j2warn = t > 130 && t < 150

    // Right arm (ee_type: 'gripper') — independent motion
    const ra_gripAnomaly = t > 250 && t < 270

    points.push({
      t,
      time: ts.format('HH:mm:ss'),

      // ── Left Arm (6-DOF, Hand EE) ─────────────────────
      la_j1_pos: noise(30, 8, t * 0.08),
      la_j2_pos: noise(-45, 10, t * 0.06),
      la_j3_pos: noise(80, 6, t * 0.10),
      la_j4_pos: noise(15, 4, t * 0.12),
      la_j5_pos: noise(-20, 5, t * 0.07),
      la_j6_pos: noise(10, 3, t * 0.15),
      la_j1_torque: noise(2.0, 0.4, t * 0.09),
      la_j2_torque: la_j2warn ? noise(2.5, 0.3, t * 0.09) : noise(1.7, 0.5, t * 0.07 + 1),
      la_j3_torque: noise(0.9, 0.3, t * 0.11),
      la_j4_torque: noise(1.1, 0.2, t * 0.13),
      la_j5_torque: noise(0.7, 0.25, t * 0.08),
      la_j6_torque: noise(0.4, 0.15, t * 0.10),
      la_j1_temp: noise(37, 2, t * 0.01),
      la_j2_temp: noise(41, 3, t * 0.012),
      la_j3_temp: la_j3hot ? noise(55, 4, t * 0.015) : noise(37, 2, t * 0.013),
      la_j4_temp: noise(34, 1.5, t * 0.011),
      la_j5_temp: noise(39, 2, t * 0.012),
      la_j6_temp: noise(36, 1.5, t * 0.010),
      // Hand EE on left arm
      la_hand_stability: t > 440 ? noise(88, 8, t * 0.06) : noise(75, 10, t * 0.05),
      la_finger_force: noise(2.8, 0.9, t * 0.09),
      la_is_grasping: noise(2.8, 0.9, t * 0.09) > 1.5,
      la_ee_type: 'hand',

      // ── Right Arm (6-DOF, Gripper EE) ────────────────
      ra_j1_pos: noise(45, 8, t * 0.07 + 1),
      ra_j2_pos: noise(-30, 10, t * 0.05 + 0.5),
      ra_j3_pos: noise(90, 6, t * 0.09 + 0.3),
      ra_j4_pos: noise(20, 4, t * 0.11 + 0.7),
      ra_j5_pos: noise(-15, 5, t * 0.08 + 0.2),
      ra_j6_pos: noise(5, 3, t * 0.14 + 0.4),
      ra_j1_torque: noise(2.1, 0.4, t * 0.09 + 0.5),
      ra_j2_torque: noise(1.8, 0.5, t * 0.07 + 1.5),
      ra_j3_torque: noise(0.9, 0.3, t * 0.10 + 0.8),
      ra_j4_torque: noise(1.2, 0.2, t * 0.12 + 0.3),
      ra_j5_torque: noise(0.8, 0.25, t * 0.09 + 0.6),
      ra_j6_torque: noise(0.5, 0.15, t * 0.11 + 0.1),
      ra_j1_temp: noise(38, 2, t * 0.011 + 0.2),
      ra_j2_temp: noise(42, 3, t * 0.013 + 0.3),
      ra_j3_temp: noise(38, 2, t * 0.014 + 0.1),
      ra_j4_temp: noise(35, 1.5, t * 0.012 + 0.4),
      ra_j5_temp: noise(40, 2, t * 0.013 + 0.5),
      ra_j6_temp: noise(37, 1.5, t * 0.011 + 0.2),
      // Gripper EE on right arm
      ra_gripper_pos: noise(15, 5, t * 0.05 + 0.5),
      ra_gripper_force: noise(2.5, 1.2, t * 0.08 + 0.3),
      ra_finger1_pressure: noise(3.2, 0.8, t * 0.09 + 0.4),
      ra_finger2_pressure: ra_gripAnomaly
        ? noise(2.0, 1.5, t * 0.12 + 0.2)
        : noise(2.8, 0.5, t * 0.09 + 0.1),
      ra_is_grasping: noise(2.5, 1.2, t * 0.08 + 0.3) > 1.5,
      ra_ee_type: 'gripper',

      // ── Mobile Base ───────────────────────────────────
      base_vel_linear: noise(0.3, 0.15, t * 0.04),
      base_vel_angular: noise(0.0, 0.08, t * 0.06),
      base_heading: +(((t * 0.5) % 360)).toFixed(1),

      // ── System ────────────────────────────────────────
      cpu: t > 320 && t < 360 ? noise(85, 8, t * 0.2) : noise(45, 10, t * 0.1),
      memory: noise(67, 5, t * 0.05),
      battery_voltage: +(12.4 - t * 0.001).toFixed(2),
      battery_current: noise(2.1, 0.3, t * 0.08),
      battery_percentage: +(87 - t * 0.005).toFixed(1),
      network_latency: t > 210 && t < 230 ? noise(45, 10, t * 0.5) : noise(12, 3, t * 0.2),

      // ── Performance ───────────────────────────────────
      la_j1_error: noise(0.1, 0.05, t * 0.2),
      la_j2_error: noise(0.8, 0.3, t * 0.18),
      la_j3_error: noise(0.2, 0.08, t * 0.22),
      ra_j1_error: noise(0.12, 0.05, t * 0.19),
      ra_j2_error: noise(0.7, 0.25, t * 0.17),
      ra_j3_error: noise(0.18, 0.07, t * 0.21),
      grip_pressure_stability: t > 250 ? noise(70, 15, t * 0.15) : noise(88, 5, t * 0.1),
      power_consumption: noise(195, 25, t * 0.06),   // dual-arm + base → higher
    })
  }
  return points
}

// Issues/markers on the timeline — dual-arm scenarios
export const ISSUES = [
  { t: 132, time: '14:22:12', level: 'WARN',  component: 'Left Arm',  message: 'LA J2 approaching velocity limit (85% of max)' },
  { t: 210, time: '14:23:30', level: 'WARN',  component: 'System',    message: 'Network latency spike detected (peak: 45ms)' },
  { t: 252, time: '14:24:12', level: 'ERROR', component: 'Right Arm', message: 'RA Gripper pressure sensor anomaly on finger 2' },
  { t: 321, time: '14:25:21', level: 'ERROR', component: 'System',    message: 'CPU usage spike: 89% (threshold: 80%)' },
  { t: 355, time: '14:25:55', level: 'WARN',  component: 'Left Arm',  message: 'LA J3 motor temperature approaching limit (55°C)' },
  { t: 410, time: '14:26:50', level: 'WARN',  component: 'System',    message: 'One tactile sensor unresponsive (Left Hand, Finger 2)' },
  { t: 480, time: '14:28:00', level: 'INFO',  component: 'Left Arm',  message: 'Left arm J2 recalibration completed' },
  { t: 530, time: '14:28:50', level: 'ERROR', component: 'Right Arm', message: 'RA Grip force instability — auto-adjustment triggered' },
]

// Full log entries — dual-arm humanoid context
export function generateLogEntries() {
  const events = [
    { t: 0,   level: 'INFO',  component: 'System',    message: 'Wheeled Humanoid Manipulation Replay session started' },
    { t: 5,   level: 'INFO',  component: 'Left Arm',  message: '[LA] 6-DOF arm ready. Hand EE mounted.' },
    { t: 6,   level: 'INFO',  component: 'Right Arm', message: '[RA] 6-DOF arm ready. Gripper EE mounted.' },
    { t: 8,   level: 'INFO',  component: 'System',    message: 'Mobile base initialized: wheel drive ready' },
    { t: 20,  level: 'INFO',  component: 'Right Arm', message: '[RA] Gripper initialized: parallel_jaw, max 50mm' },
    { t: 22,  level: 'INFO',  component: 'Left Arm',  message: '[LA] Hand initialized: 5-finger anthropomorphic, 15 DOF' },
    { t: 35,  level: 'DEBUG', component: 'System',    message: '/left_arm/joint_states: 50Hz | /right_arm/joint_states: 50Hz' },
    { t: 50,  level: 'INFO',  component: 'Left Arm',  message: '[LA] move_to_position([30, -45, 80]) — trajectory planned' },
    { t: 52,  level: 'INFO',  component: 'Right Arm', message: '[RA] move_to_position([45, -30, 90]) — trajectory planned' },
    { t: 65,  level: 'INFO',  component: 'Right Arm', message: '[RA] Gripper close command, target force: 5.0N' },
    { t: 80,  level: 'DEBUG', component: 'Right Arm', message: '[RA] Finger1: 7.5mm, Finger2: 7.5mm' },
    { t: 95,  level: 'INFO',  component: 'Left Arm',  message: '[LA] Target position reached within ±0.5°' },
    { t: 96,  level: 'INFO',  component: 'Right Arm', message: '[RA] Target position reached within ±0.5°' },
    { t: 120, level: 'INFO',  component: 'System',    message: 'ROS topics active: 16/18 (/left_arm/joint_states, /right_arm/joint_states ...)' },
    { t: 132, level: 'WARN',  component: 'Left Arm',  message: '[LA] J2 approaching velocity limit (current: 85% of max)' },
    { t: 145, level: 'INFO',  component: 'Left Arm',  message: '[LA] Velocity reduced to 70% to stay within limits' },
    { t: 160, level: 'INFO',  component: 'Right Arm', message: '[RA] Grip stable — object detected 95% confidence' },
    { t: 178, level: 'DEBUG', component: 'Left Arm',  message: '[LA] Adaptive grasp: power_grasp configuration applied' },
    { t: 195, level: 'INFO',  component: 'Left Arm',  message: '[LA] All 5 fingers in contact with object' },
    { t: 210, level: 'WARN',  component: 'System',    message: 'Network latency spike (peak: 45ms)' },
    { t: 225, level: 'INFO',  component: 'System',    message: 'Network latency normalized (15ms)' },
    { t: 240, level: 'DEBUG', component: 'Left Arm',  message: '[LA] J1=30°, J2=-46°, J3=79°, J4=15°, J5=-21°, J6=10°' },
    { t: 252, level: 'ERROR', component: 'Right Arm', message: '[RA] Pressure sensor anomaly on finger 2' },
    { t: 258, level: 'WARN',  component: 'Right Arm', message: '[RA] Grip recalibration in progress' },
    { t: 270, level: 'INFO',  component: 'Right Arm', message: '[RA] Grip stable after adjustment (4.8N)' },
    { t: 285, level: 'INFO',  component: 'Left Arm',  message: '[LA] Index finger torque limit approached — reducing force' },
    { t: 300, level: 'DEBUG', component: 'System',    message: 'CPU: 45%, Memory: 67%, Battery: 87%, Base: moving 0.3m/s' },
    { t: 315, level: 'INFO',  component: 'Left Arm',  message: '[LA] move_to_position home — returning' },
    { t: 316, level: 'INFO',  component: 'Right Arm', message: '[RA] move_to_position home — returning' },
    { t: 321, level: 'ERROR', component: 'System',    message: 'CPU usage spike: 89% (threshold: 80%)' },
    { t: 330, level: 'WARN',  component: 'System',    message: 'CPU usage still elevated: 83%' },
    { t: 345, level: 'INFO',  component: 'System',    message: 'CPU usage normalized: 52%' },
    { t: 355, level: 'WARN',  component: 'Left Arm',  message: '[LA] J3 motor temperature: 55°C (limit: 60°C)' },
    { t: 368, level: 'DEBUG', component: 'Left Arm',  message: '[LA] Thermal throttle applied to J3 — velocity reduced' },
    { t: 385, level: 'INFO',  component: 'Right Arm', message: '[RA] Release command — object released' },
    { t: 400, level: 'INFO',  component: 'Left Arm',  message: '[LA] Home position reached' },
    { t: 401, level: 'INFO',  component: 'Right Arm', message: '[RA] Home position reached' },
    { t: 410, level: 'WARN',  component: 'System',    message: 'Left hand tactile sensor unresponsive (Finger 2, Sensor 3)' },
    { t: 425, level: 'DEBUG', component: 'Left Arm',  message: '[LA] Hand diagnostic: 44/45 sensors operational' },
    { t: 440, level: 'INFO',  component: 'Left Arm',  message: '[LA] New task: adaptive_grasp(cylinder, 60N)' },
    { t: 441, level: 'INFO',  component: 'Right Arm', message: '[RA] New task: pick_and_place(box, target=shelf_A)' },
    { t: 455, level: 'INFO',  component: 'Left Arm',  message: '[LA] Adaptive grasp initiated for cylindrical object' },
    { t: 470, level: 'INFO',  component: 'Left Arm',  message: '[LA] Grasp formation — all fingers synchronized' },
    { t: 480, level: 'INFO',  component: 'Left Arm',  message: '[LA] J2 recalibration completed' },
    { t: 495, level: 'DEBUG', component: 'System',    message: '/left_arm/tactile_sensors: 100Hz | mobile base: 0.25m/s' },
    { t: 510, level: 'INFO',  component: 'Right Arm', message: '[RA] Object lifted — weight estimate: 0.48kg' },
    { t: 525, level: 'INFO',  component: 'Right Arm', message: '[RA] Trajectory: lift + translate (0.3m)' },
    { t: 530, level: 'ERROR', component: 'Right Arm', message: '[RA] Grip force instability — auto-adjustment triggered' },
    { t: 538, level: 'WARN',  component: 'Right Arm', message: '[RA] Force sensor recalibration in progress' },
    { t: 550, level: 'INFO',  component: 'Right Arm', message: '[RA] Grip stabilized after force adjustment' },
    { t: 565, level: 'INFO',  component: 'Left Arm',  message: '[LA] Stable grasp — stability: 91%' },
    { t: 580, level: 'INFO',  component: 'Right Arm', message: '[RA] Place position reached' },
    { t: 590, level: 'INFO',  component: 'Right Arm', message: '[RA] Object placed — task complete' },
    { t: 598, level: 'INFO',  component: 'System',    message: 'Dual-arm task complete — duration: 598s, LA success: 93%, RA success: 95%' },
  ]
  return events.map((e, i) => ({
    id: i,
    ...e,
    time: timeAt(e.t).format('HH:mm:ss'),
    fullTime: timeAt(e.t).format('HH:mm:ss.SSS'),
  }))
}

// Robot configuration — wheeled humanoid with dual arms
export const ROBOT_CONFIG = {
  robotId: 'HW-001',
  model: 'Wheeled Humanoid v1.0',
  leftArm: {
    eeType: 'hand',
    dof: 6,
    eeLabel: '5-Finger Hand',
  },
  rightArm: {
    eeType: 'gripper',
    dof: 6,
    eeLabel: 'Parallel Jaw Gripper',
  },
  mobileBase: {
    type: 'differential_drive',
    wheelCount: 2,
    wheelRadius: 0.15,
    maxVel: 1.0,
    maxAngVel: 1.5,
  },
  dof: 12,  // total arm DOF
  jointLimits: [
    { name: 'J1', min: -180, max: 180, maxVelocity: 2.0, maxTorque: 50 },
    { name: 'J2', min: -120, max: 120, maxVelocity: 2.0, maxTorque: 50 },
    { name: 'J3', min: -180, max: 180, maxVelocity: 2.5, maxTorque: 40 },
    { name: 'J4', min: -90,  max: 90,  maxVelocity: 3.0, maxTorque: 30 },
    { name: 'J5', min: -90,  max: 90,  maxVelocity: 3.0, maxTorque: 25 },
    { name: 'J6', min: -180, max: 180, maxVelocity: 4.0, maxTorque: 20 },
  ],
  activeTopics: [
    { name: '/left_arm/joint_states',   hz: 50,  status: 'ok' },
    { name: '/right_arm/joint_states',  hz: 50,  status: 'ok' },
    { name: '/left_arm/hand_state',     hz: 10,  status: 'ok' },
    { name: '/right_arm/gripper_state', hz: 20,  status: 'ok' },
    { name: '/left_arm/tactile',        hz: 100, status: 'ok' },
    { name: '/mobile_base/state',       hz: 20,  status: 'ok' },
    { name: '/tf',                      hz: 100, status: 'ok' },
    { name: '/diagnostics',             hz: 1,   status: 'ok' },
    { name: '/system_monitor',          hz: 5,   status: 'ok' },
    { name: '/manipulation_events',     hz: null, status: 'ok' },
    { name: '/camera/image',            hz: 0,   status: 'error' },
    { name: '/lidar/scan',              hz: 0,   status: 'error' },
  ],
}

export const TOTAL_DURATION = TOTAL_SECONDS

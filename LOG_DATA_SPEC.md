# Manipulation Replay — 로그 데이터 스펙

> 웹 뷰어에서 모든 항목이 정상 표시되려면 아래 MCAP 토픽과 필드를 포함해야 합니다.  
> 인코딩: **JSON** (messageEncoding: `"json"`)  
> 파일 포맷: **MCAP** (ROS2 profile)

---

## 토픽 목록 및 권장 발행 주기

| # | 토픽 | 권장 주기 | 필수 여부 | 설명 |
|---|---|---|---|---|
| 1 | `/robot_configuration` | 1회 (시작 시) | **필수** | 로봇 ID, EE 타입 등 정적 설정 |
| 2 | `/left_arm/joint_states` | 2 Hz 이상 | **필수** | 좌측 팔 6-DOF 관절 상태 |
| 3 | `/right_arm/joint_states` | 2 Hz 이상 | **필수** | 우측 팔 6-DOF 관절 상태 |
| 4 | `/left_arm/hand_state` | 0.5 Hz 이상 | LA=hand일 때 필수 | 5-finger Hand 상태 + 모터 온도 |
| 5 | `/right_arm/gripper_state` | 1 Hz 이상 | RA=gripper일 때 필수 | Parallel Jaw 상태 + 핑거 압력 |
| 6 | `/left_arm/tactile_sensors` | 1 Hz 이상 | 권장 | 촉각 센서 합산 데이터 |
| 7 | `/mobile_base/state` | 1 Hz 이상 | 권장 | 이동 베이스 속도·헤딩 |
| 8 | `/system_monitor` | 1 Hz 이상 | **필수** | CPU·메모리·배터리·온도 |
| 9 | `/performance_metrics` | 0.2 Hz 이상 | 권장 | 정확도·성공률·전력 |
| 10 | `/rosout` | 이벤트 | **필수** | 로그 메시지 (하단 로그창) |
| 11 | `/manipulation_events` | 이벤트 | 권장 | 구조화된 이벤트 (이슈 마커) |

---

## 토픽별 메시지 구조 및 UI 매핑

---

### 1. `/robot_configuration`

로그 시작 시 **1회** 발행. EE 타입을 이 토픽에서 읽어 전체 화면 구성을 결정합니다.

```json
{
  "header": { "stamp": { "sec": 1710942000, "nanosec": 0 }, "frame_id": "" },
  "robot_id": "HW-001",
  "robot_model": "Wheeled Humanoid v1.0",

  "left_arm_config": {
    "dof": 6,
    "ee_type": "hand",
    "joint_names": ["la_j1", "la_j2", "la_j3", "la_j4", "la_j5", "la_j6"],
    "joint_limits": [
      { "name": "la_j1", "min_position": -3.14, "max_position": 3.14, "max_velocity": 2.0, "max_effort": 50 },
      { "name": "la_j2", "min_position": -2.09, "max_position": 2.09, "max_velocity": 2.0, "max_effort": 50 },
      { "name": "la_j3", "min_position": -3.14, "max_position": 3.14, "max_velocity": 2.5, "max_effort": 40 },
      { "name": "la_j4", "min_position": -1.57, "max_position": 1.57, "max_velocity": 3.0, "max_effort": 30 },
      { "name": "la_j5", "min_position": -1.57, "max_position": 1.57, "max_velocity": 3.0, "max_effort": 25 },
      { "name": "la_j6", "min_position": -3.14, "max_position": 3.14, "max_velocity": 4.0, "max_effort": 20 }
    ]
  },

  "right_arm_config": {
    "dof": 6,
    "ee_type": "gripper",
    "joint_names": ["ra_j1", "ra_j2", "ra_j3", "ra_j4", "ra_j5", "ra_j6"],
    "joint_limits": [ /* 동일 구조 */ ]
  },

  "hand_config": {
    "type": "5_finger_anthropomorphic",
    "dof": 15,
    "tactile_sensor_count": 45
  },

  "gripper_config": {
    "type": "parallel_jaw",
    "max_opening": 0.05,
    "max_force": 100,
    "finger_count": 2
  },

  "mobile_base_config": {
    "type": "differential_drive",
    "wheel_count": 2,
    "wheel_radius": 0.15,
    "max_velocity": 1.0
  }
}
```

**UI 매핑**

| 필드 | 표시 위치 |
|---|---|
| `robot_id` | Header — 로봇 ID 배지 |
| `robot_model` | Header — 모델명 |
| `left_arm_config.ee_type` | Header LA 배지 / End-Effector 탭 좌측 패널 타입 결정 (`"hand"` → 5-Finger Hand 패널, `"gripper"` → Parallel Jaw 패널) |
| `right_arm_config.ee_type` | Header RA 배지 / End-Effector 탭 우측 패널 타입 결정 |
| `left_arm_config.joint_limits[].max_effort` | Left Arm 탭 — 토크 게이지 최대값 기준 |
| `mobile_base_config.type` | System 탭 — 베이스 타입 표시 |

---

### 2. `/left_arm/joint_states` 및 `/right_arm/joint_states`

`sensor_msgs/JointState` 형식. **position 단위: radian**, **effort 단위: Nm**

```json
{
  "header": { "stamp": { "sec": 1710942050, "nanosec": 0 }, "frame_id": "left_arm_base" },
  "name":     ["la_j1", "la_j2", "la_j3", "la_j4", "la_j5", "la_j6"],
  "position": [0.5236, -0.7854, 1.3963, 0.2618, -0.3491, 0.1745],
  "velocity": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  "effort":   [2.0, 1.7, 0.9, 1.1, 0.7, 0.4]
}
```

> `/right_arm/joint_states`도 동일 구조. `frame_id`는 `"right_arm_base"`.

**UI 매핑**

| 인덱스 | 내부 필드명 (파서 변환 후) | 표시 위치 |
|---|---|---|
| `position[0]` → rad→deg | `la_j1_pos` (deg) | Left Arm 탭 — J1 각도 게이지 및 실시간 차트 |
| `position[1]` | `la_j2_pos` | Left Arm 탭 — J2 |
| `position[2]` | `la_j3_pos` | Left Arm 탭 — J3 |
| `position[3]` | `la_j4_pos` | Left Arm 탭 — J4 |
| `position[4]` | `la_j5_pos` | Left Arm 탭 — J5 |
| `position[5]` | `la_j6_pos` | Left Arm 탭 — J6 |
| `effort[0]` | `la_j1_torque` | Left Arm 탭 — J1 토크 게이지 및 차트 |
| `effort[1]` | `la_j2_torque` | Left Arm 탭 — J2 토크 (2.3Nm 초과 시 경고) |
| `effort[2~5]` | `la_j3~6_torque` | Left Arm 탭 — J3~6 토크 |
| `position[0~5]` (RA) | `ra_j1~6_pos` | Right Arm 탭 — 동일 구조 |
| `effort[0~5]` (RA) | `ra_j1~6_torque` | Right Arm 탭 — 동일 구조 |
| `la_j1~6_pos` | — | 3D 뷰 — Left Arm FK 관절 각도 |
| `ra_j1~6_pos` | — | 3D 뷰 — Right Arm FK 관절 각도 |

---

### 3. `/left_arm/hand_state`

5-Finger Hand EE 상태 + 모터 온도.

```json
{
  "header": { "stamp": { "sec": 1710942050, "nanosec": 0 }, "frame_id": "left_hand_link" },
  "ee_type": "hand",
  "hand_type": "5_finger_anthropomorphic",
  "finger_names": ["thumb", "index", "middle", "ring", "pinky"],

  "finger_joint_positions": {
    "thumb":  [45.2, 38.7, 25.1],
    "index":  [32.1, 45.6, 38.2],
    "middle": [28.5, 42.3, 35.7],
    "ring":   [25.8, 40.1, 33.4],
    "pinky":  [22.3, 35.9, 30.8]
  },

  "finger_joint_efforts": {
    "thumb":  [2.3, 1.8, 1.2],
    "index":  [1.8, 2.1, 1.5],
    "middle": [1.6, 1.9, 1.3],
    "ring":   [1.4, 1.7, 1.1],
    "pinky":  [1.1, 1.4, 0.9]
  },

  "grasp_type": "power_grasp",
  "grasp_stability": 0.91,
  "is_grasping": true,

  "temperature_sensors": [
    { "location": "la_joint_1_motor", "temperature": 37.5 },
    { "location": "la_joint_2_motor", "temperature": 41.2 },
    { "location": "la_joint_3_motor", "temperature": 55.1 },
    { "location": "la_joint_4_motor", "temperature": 34.0 },
    { "location": "la_joint_5_motor", "temperature": 39.3 },
    { "location": "la_joint_6_motor", "temperature": 36.1 }
  ]
}
```

**UI 매핑**

| 필드 | 내부 필드명 | 표시 위치 |
|---|---|---|
| `grasp_stability` × 100 | `la_hand_stability` (%) | End-Effector 탭 Hand — Stability 게이지 및 경고 (75% 미만 시 WARN) |
| `is_grasping` | `la_is_grasping` | End-Effector 탭 Hand — 파지 상태 박스 (🟢 Grasping / ⬜ Open) |
| `grasp_type` | — | End-Effector 탭 Hand — Grasp 타입 표시 |
| `finger_joint_positions.thumb[0~2]` | — | End-Effector 탭 Hand — Finger Joint Matrix J1/J2/J3 행, Thumb 열 |
| `finger_joint_positions.index[0~2]` | — | Finger Joint Matrix Index 열 |
| `finger_joint_positions.middle~pinky` | — | Finger Joint Matrix 나머지 열 |
| `finger_joint_efforts.*.[]` | — | Finger Joint Matrix Nm 행 |
| `temperature_sensors[].temperature` (la_joint_N_motor) | `la_j1~6_temp` (°C) | Left Arm 탭 — J1~J6 온도 게이지 (44°C WARN, 50°C ERROR) |
| — | — | System 탭 — 온도 분포 그리드 |
| — | — | Overview 탭 — Joint 상태 카드 온도 표시 |
| `grasp_stability` | — | 3D 뷰 — Hand 손가락 curl 각도 계산 |

---

### 4. `/right_arm/gripper_state`

Parallel Jaw Gripper 상태.

```json
{
  "header": { "stamp": { "sec": 1710942050, "nanosec": 0 }, "frame_id": "right_gripper_link" },
  "ee_type": "gripper",
  "gripper_type": "parallel_jaw",
  "position": 0.015,
  "force": 4.8,
  "finger_forces": [3.2, 2.9],
  "is_grasping": true,
  "object_detected": true
}
```

**UI 매핑**

| 필드 | 변환 | 내부 필드명 | 표시 위치 |
|---|---|---|---|
| `position` (m) | × 1000 → mm | `ra_gripper_pos` (mm) | End-Effector 탭 Gripper — 개방거리 게이지 + 시계열 AreaChart (0~50mm) |
| `force` (N) | — | `ra_gripper_force` | End-Effector 탭 Gripper — Grip Force 게이지 (0~10N) |
| `finger_forces[0]` (N) | — | `ra_finger1_pressure` | End-Effector 탭 Gripper — Finger 1 압력 게이지 + 시계열 LineChart |
| `finger_forces[1]` (N) | — | `ra_finger2_pressure` | End-Effector 탭 Gripper — Finger 2 압력 게이지 (1.5N 미만 WARN, 0.8N 미만 ERROR) |
| `is_grasping` | — | `ra_is_grasping` | End-Effector 탭 Gripper — 파지 상태 박스 |
| `position` × 1000 | — | — | 3D 뷰 — Right Arm Gripper 개방 시각화 |
| `finger_forces[1]` | 압력 이상 시 | — | Overview 탭 / AnalysisPanel 탭 배지 — RA 경고 알림 |

---

### 5. `/left_arm/tactile_sensors`

Hand 촉각 센서 합산 데이터. 상세 센서 배열이 없어도 합산값만으로 충분합니다.

```json
{
  "header": { "stamp": { "sec": 1710942050, "nanosec": 0 }, "frame_id": "left_hand_link" },
  "sensor_count": 45,
  "total_force": 60.5,
  "contact_points": 23
}
```

**UI 매핑**

| 필드 | 내부 필드명 | 표시 위치 |
|---|---|---|
| `total_force` (N) | `la_total_force` | End-Effector 탭 Hand — "Active: N sensors · Total: X.XN" |
| `contact_points` | `la_contact_points` | End-Effector 탭 Hand — Sensor Integrity (45 중 몇 개 활성) |

---

### 6. `/mobile_base/state`

```json
{
  "header": { "stamp": { "sec": 1710942050, "nanosec": 0 }, "frame_id": "base_link" },
  "base_type": "differential_drive",
  "linear_velocity": 0.32,
  "angular_velocity": -0.05,
  "heading_deg": 45.0,
  "odometry": { "x": 1.23, "y": -0.45 },
  "wheel_speeds": { "left": 0.29, "right": 0.35 }
}
```

**UI 매핑**

| 필드 | 내부 필드명 | 표시 위치 |
|---|---|---|
| `linear_velocity` (m/s) | `base_vel_linear` | Overview 탭 — Base 속도 게이지 |
| `angular_velocity` (rad/s) | `base_vel_angular` | Overview 탭 — Base 각속도 게이지 |
| `heading_deg` (deg) | `base_heading` | Overview 탭 — Base 헤딩 표시 |

---

### 7. `/system_monitor`

```json
{
  "header": { "stamp": { "sec": 1710942050, "nanosec": 0 }, "frame_id": "" },
  "cpu_usage": 0.52,
  "memory_usage": 0.67,
  "network_latency": 0.012,
  "battery_voltage": 12.3,
  "battery_current": 2.1,
  "battery_percentage": 0.82,
  "temperature_sensors": [
    { "location": "la_joint_1_motor", "temperature": 37.5 },
    { "location": "la_joint_2_motor", "temperature": 41.2 },
    { "location": "la_joint_3_motor", "temperature": 55.1 },
    { "location": "la_joint_4_motor", "temperature": 34.0 },
    { "location": "la_joint_5_motor", "temperature": 39.3 },
    { "location": "la_joint_6_motor", "temperature": 36.1 },
    { "location": "ra_joint_1_motor", "temperature": 38.1 },
    { "location": "ra_joint_2_motor", "temperature": 42.0 },
    { "location": "ra_joint_3_motor", "temperature": 38.5 },
    { "location": "ra_joint_4_motor", "temperature": 35.2 },
    { "location": "ra_joint_5_motor", "temperature": 40.1 },
    { "location": "ra_joint_6_motor", "temperature": 37.0 },
    { "location": "cpu",              "temperature": 52.3 },
    { "location": "battery",          "temperature": 35.0 }
  ]
}
```

> `temperature_sensors`의 `location` 문자열은 위 예시와 **정확히 일치**해야 파서가 각 Joint 온도를 올바르게 매핑합니다.

**UI 매핑**

| 필드 | 변환 | 내부 필드명 | 표시 위치 |
|---|---|---|---|
| `cpu_usage` | × 100 | `cpu` (%) | Overview 탭 CPU 게이지 / System 탭 CPU 차트 / Performance 탭 추이 차트 |
| `memory_usage` | × 100 | `memory` (%) | Overview 탭 메모리 게이지 / System 탭 |
| `network_latency` | × 1000 | `network_latency` (ms) | Overview 탭 네트워크 게이지 (30ms 초과 시 경고) |
| `battery_voltage` | — | `battery_voltage` (V) | Overview 탭 배터리 게이지 |
| `battery_current` | — | `battery_current` (A) | Performance 탭 세션 통계 |
| `battery_percentage` | × 100 | `battery_percentage` (%) | Overview 탭 배터리 % |
| `temperature_sensors[location=la_joint_N_motor]` | — | `la_j1~6_temp` (°C) | Left Arm 탭 — J1~J6 온도 게이지 (hand_state 없을 때 fallback) |
| `temperature_sensors[location=ra_joint_N_motor]` | — | `ra_j1~6_temp` (°C) | Right Arm 탭 — J1~J6 온도 게이지 |
| `temperature_sensors[location=cpu]` | — | `cpu_temp` (°C) | System 탭 — 온도 분포 그리드 (CPU 항목) |
| `cpu_usage` > 0.80 | — | — | AnalysisPanel — System 탭 배지 경고 |

---

### 8. `/performance_metrics`

```json
{
  "header": { "stamp": { "sec": 1710942050, "nanosec": 0 }, "frame_id": "" },
  "left_arm_accuracy": [
    { "joint_name": "la_j1", "rms_error": 0.00115, "max_error": 0.00287 },
    { "joint_name": "la_j2", "rms_error": 0.00461, "max_error": 0.00863 },
    { "joint_name": "la_j3", "rms_error": 0.00115, "max_error": 0.00462 }
  ],
  "right_arm_accuracy": [
    { "joint_name": "ra_j1", "rms_error": 0.00115, "max_error": 0.00287 },
    { "joint_name": "ra_j2", "rms_error": 0.00402, "max_error": 0.00805 },
    { "joint_name": "ra_j3", "rms_error": 0.00104, "max_error": 0.00403 }
  ],
  "la_grasp_success_rate": 0.93,
  "ra_grasp_success_rate": 0.95,
  "power_consumption": 195.0,
  "efficiency_score": 0.88
}
```

> `rms_error` 단위: **radian**. 파서가 × (180/π) → degree로 변환합니다.

**UI 매핑**

| 필드 | 변환 | 내부 필드명 | 표시 위치 |
|---|---|---|---|
| `left_arm_accuracy[0~2].rms_error` | rad→deg | `la_j1~3_error` (°) | Performance 탭 — LA 정확도 게이지 및 수치 |
| `right_arm_accuracy[0~2].rms_error` | rad→deg | `ra_j1~3_error` (°) | Performance 탭 — RA 정확도 게이지 및 수치 |
| `la_grasp_success_rate` | × 100 | `la_grip_success_rate` (%) | Performance 탭 — LA EE 성공률 게이지 |
| `ra_grasp_success_rate` | × 100 | `ra_grip_success_rate` (%) | Performance 탭 — RA EE 성공률 게이지 |
| `power_consumption` | — | `power_consumption` (W) | Performance 탭 세션 통계 / System 탭 전력 |
| `efficiency_score` | × 100 | `efficiency` (%) | Performance 탭 참고값 |

---

### 9. `/rosout`

`rosgraph_msgs/Log` 형식. 하단 로그 패널의 주 데이터 소스.

```json
{
  "header": { "stamp": { "sec": 1710942050, "nanosec": 0 }, "frame_id": "" },
  "level": 4,
  "name": "/left_arm_controller",
  "msg": "[LA] J3 motor temperature: 55°C (limit 60°C)",
  "file": "arm_controller.cpp",
  "line": 247
}
```

**`level` 값 정의**

| 값 | 레벨 | 색상 |
|---|---|---|
| 1 | DEBUG | 회색 |
| 2 | INFO | 기본 |
| 4 | WARN | 노랑 |
| 8 | ERROR | 빨강 |
| 16 | FATAL | 진빨강 |

**컴포넌트 자동 분류** (`name` 필드 기반)

| node 이름 패턴 | 분류 결과 |
|---|---|
| `left_arm`, `la_` 포함 | Left Arm |
| `right_arm`, `ra_` 포함 | Right Arm |
| `gripper` 포함 | Right Arm |
| `hand` 포함 | Left Arm |
| `mobile`, `base`, `wheel` 포함 | Base |
| 기타 | System |

**UI 매핑**

| 필드 | 표시 위치 |
|---|---|
| `msg` | 하단 로그 패널 — 메시지 컬럼 |
| `level` | 하단 로그 패널 — 레벨 배지 + 배경색 |
| `name` → 컴포넌트 분류 | 하단 로그 패널 — 컴포넌트 필터 배지 |
| ERROR/WARN | 타임라인 슬라이더 — 이슈 마커 (빨강/노랑 점) |
| ERROR/WARN | 탭 배지 — 해당 컴포넌트 탭에 경고 표시 |

---

### 10. `/manipulation_events`

구조화된 이벤트. `/rosout`과 별도로 이슈 마커에 반영됩니다.

```json
{
  "header": { "stamp": { "sec": 1710942050, "nanosec": 0 }, "frame_id": "" },
  "event_type": "error",
  "component": "right_arm",
  "event_code": "PRESSURE_SENSOR_ANOMALY",
  "message": "[RA] Pressure sensor anomaly on finger 2",
  "severity": 2
}
```

**`event_type` 값 정의**

| 값 | 매핑 레벨 |
|---|---|
| `"info"` | INFO |
| `"warning"` | WARN |
| `"error"` | ERROR |
| `"critical"` | ERROR |

**`component` 값 정의**

| 값 | 분류 |
|---|---|
| `"left_arm"` | Left Arm |
| `"right_arm"` | Right Arm |
| `"system"` | System |
| `"base"` | Base |

**UI 매핑**

| 필드 | 표시 위치 |
|---|---|
| `message` + `event_code` | 하단 로그 패널 — `[EVENT_CODE] message` 형식으로 표시 |
| `event_type` → 레벨 | 하단 로그 패널 — 레벨 배지 |
| ERROR/WARN | 타임라인 슬라이더 — 이슈 마커 |

---

## 필드 누락 시 기본값 (Fallback)

파서는 필드가 없을 때 아래 기본값을 사용합니다. 데이터가 없으면 해당 UI 항목은 기본값으로 표시됩니다.

| 내부 필드 | 기본값 | 비고 |
|---|---|---|
| `la_ee_type` | `"hand"` | `/robot_configuration` 없을 때 |
| `ra_ee_type` | `"gripper"` | `/robot_configuration` 없을 때 |
| `la_j*_pos` | `0` | `/left_arm/joint_states` 없을 때 |
| `la_j*_temp` | `38` | `/left_arm/hand_state` 및 `/system_monitor` 모두 없을 때 |
| `la_hand_stability` | `85` | 0.0~1.0 → % 변환 |
| `ra_gripper_pos` | `0` mm | position(m) × 1000 |
| `ra_finger2_pressure` | `0` N | 1.5N 미만 시 WARN 표시됨 |
| `cpu` | `0` % | cpu_usage × 100 |
| `battery_percentage` | `87` % | battery_percentage × 100 |
| `la_grip_success_rate` | `93` % | la_grasp_success_rate × 100 |
| `ra_grip_success_rate` | `95` % | ra_grasp_success_rate × 100 |

---

## 경고/에러 판단 기준 (화면에서 강조 표시되는 임계값)

| 항목 | 경고 (WARN) | 에러 (ERROR) |
|---|---|---|
| 팔 관절 온도 (`la/ra_jN_temp`) | 44°C 이상 | 50°C 이상 |
| LA J2 토크 (`la_j2_torque`) | 2.3Nm 초과 | — |
| RA Finger 2 압력 (`ra_finger2_pressure`) | 1.5N 미만 | 0.8N 미만 |
| Hand 안정성 (`la_hand_stability`) | 75% 미만 | — |
| CPU 사용률 (`cpu`) | — | 80% 초과 |
| 네트워크 지연 (`network_latency`) | — | 30ms 초과 |

---

## 온도 센서 location 문자열 규칙

`/system_monitor`와 `/left_arm/hand_state`의 `temperature_sensors` 배열에서 사용하는 `location` 문자열은 아래 규칙을 따라야 합니다.

```
la_joint_1_motor  ~ la_joint_6_motor   ← Left Arm J1~J6
ra_joint_1_motor  ~ ra_joint_6_motor   ← Right Arm J1~J6
cpu                                    ← CPU 온도
battery                                ← 배터리 온도 (참고용, 현재 UI 미사용)
```

이 외 location 값은 파서에서 무시됩니다.

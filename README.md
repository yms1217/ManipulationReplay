# Manipulation Replay

휠 기반 이족 듀얼암 로봇의 Manipulation 로그를 MCAP 형식으로 리플레이하고 분석하는 웹 애플리케이션입니다.

---

## 기술 스택

| 분류 | 라이브러리 |
|---|---|
| UI 프레임워크 | React 18 (No TypeScript) |
| 번들러 | Vite |
| 패키지 매니저 | pnpm |
| 스타일링 | styled-components v6 |
| 3D 시각화 | Three.js + @react-three/fiber + @react-three/drei |
| 차트 | Recharts |
| MCAP 파싱 | @mcap/core v2.2 |
| S3 연동 | @aws-sdk/client-s3 |

---

## 시작하기

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev

# 프로덕션 빌드
pnpm build

# 샘플 MCAP 파일 생성 (약 2MB, 600초)
pnpm generate-sample
```

---

## 로봇 모델 사양

**Wheeled Humanoid v1.0** — 휠 이동 기반 듀얼암 휴머노이드

| 항목 | 사양 |
|---|---|
| 이동 방식 | Differential Drive (2 drive wheels + 2 casters) |
| 팔 구성 | 좌우 각 6-DOF, 총 12-DOF |
| Left Arm EE | 5-Finger Hand (`la_ee_type: 'hand'`) |
| Right Arm EE | Parallel Jaw Gripper (`ra_ee_type: 'gripper'`) |
| 센서 | 관절 인코더 × 12, 촉각 센서 × 45, 압력 센서 × 2, IMU, 카메라 |

---

## 페이지 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER (8vh)                                                   │
│  🤖 HW-001 | Wheeled Humanoid v1.0 | LA:✋ 5-Finger  RA:🤏 Jaw │
├──────────────────────────┬──────────────────────────────────────┤
│  LEFT PANEL (50%)        │  RIGHT PANEL (50%)                  │
│  ┌────────────────────┐  │  ┌──────────────────────────────┐   │
│  │  3D Visualization  │  │  │  Tab Bar                     │   │
│  │  (flex: 3)         │  │  │  Overview / Left Arm /       │   │
│  │  Wheeled Humanoid  │  │  │  Right Arm / End-Effector /  │   │
│  │  FK Animation      │  │  │  System / Performance        │   │
│  └────────────────────┘  │  ├──────────────────────────────┤   │
│  ┌────────────────────┐  │  │  Tab Content (scrollable)    │   │
│  │  Replay Controls   │  │  └──────────────────────────────┘   │
│  │  (flex: 1)         │  │                                     │
│  └────────────────────┘  │                                     │
├──────────────────────────┴──────────────────────────────────────┤
│  ▲▲ DRAG HANDLE (상하 드래그로 로그창 높이 조절) ▲▲             │
├─────────────────────────────────────────────────────────────────┤
│  LOG ENTRIES (기본 20vh, 80px~60vh 조절 가능)                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 주요 기능

### 1. MCAP 로그 로드

| 방법 | 설명 |
|---|---|
| 로컬 파일 | 드래그 앤 드롭 또는 파일 선택 |
| S3 | 버킷/키 지정 후 직접 다운로드 (진행률 표시) |
| 샘플 | `pnpm generate-sample`로 생성한 샘플 자동 로드 |

- 로드하지 않으면 **Mock 모드**로 동작 (LA=Hand, RA=Gripper 기본값)

### 2. 리플레이 컨트롤

- 재생 / 일시정지 / 정지
- 재생 속도: 0.25× ~ 4× (6단계)
- 타임라인 슬라이더 — 전체 구간 탐색
- 이슈 마커 — 색상별 구분 (ERROR=빨강, WARN=노랑)
- 이전/다음 이슈 점프 버튼

### 3. 3D 시각화

Forward Kinematics 기반 실시간 자세 표시:

| 구성요소 | 설명 |
|---|---|
| WheelBase | 플랫폼 + 드라이브 휠 × 2 + 캐스터 × 2 |
| Torso | 하부 실린더 + 흉부 박스 + 어깨 요크 |
| Head | 넥 + 헤드 구체 + 카메라 센서 |
| Left Arm | 6-DOF FK, 미러 없음 |
| Right Arm | 6-DOF FK, J1 Yaw / J4 Wrist Roll 미러 |
| 5-Finger Hand | 손바닥 + 5 손가락 (stability 기반 curl) |
| Parallel Gripper | 손바닥 + 2 핑거 박스 (개방거리 연동) |

오버레이: 좌우 팔 Joint 각도/토크/온도 패널, EE 상태 정보

### 4. 분석 패널 (6개 탭)

모든 탭은 로그창 높이 조절 시 **스크롤**로 전체 내용 확인 가능.

#### Overview
- 시스템 상태: 배터리, 네트워크, CPU, 모바일 베이스 속도
- 좌우 팔 6-Joint 게이지 (각도·토크·온도)
- ROS 토픽 현황, End-Effector 상태
- 최근 이벤트 (INFO/WARN/ERROR 색상 구분)

#### Left Arm / Right Arm
- Joint 상태 카드 × 6 (각도·토크·온도, 이상 시 색상 강조)
- 실시간 차트: Position(deg) + Torque(Nm) — J1~J3 3선
- 정확도 분석: J1~J3 오차율 + 온도 경고
- 제어 명령 이력 (타임스탬프 + warn/error 구분)

#### End-Effector
EE 타입은 MCAP의 `/robot_configuration` 토픽에서 읽고, Mock 모드는 LA=hand / RA=gripper 고정.

**Parallel Jaw (Gripper)**
- 파지 상태: Grasping/Open + 개방거리
- 게이지: Grip Force / Finger 1 Press. / Finger 2 Press.
- 압력 분포 히트맵 (8셀 × 2핑거) + 범례
- 시계열 차트: 개방 거리(AreaChart) + F1/F2 압력(LineChart)
- 제어 로그 + 경고 박스

**5-Finger Hand**
- Finger Joint Matrix: J1~J3 × 5 손가락 각도(°) + 토크(Nm) 표
- 촉각 센서 히트맵: 5 손가락 × 7 셀 그리드
- 관절 각도 차트: J1/J2 시계열
- Hand Health Status: 평균 온도 / 센서 무결성 / 기계적 마모 / 최근 캘리브레이션
- 제어 로그 + 경고 박스

#### System Status
- 시스템 리소스: CPU / Memory / Battery / Network 게이지 + 시계열 차트
- 시스템 경고: 타임스탬프 + error/warn 색상 알림 목록
- 온도 분포: LA/RA J1~J6 + CPU 온도 그리드
- ROS 토픽 상태: 상태(ok/warn/err) + 발행 주파수
- 센서 상태: 각 센서군 정상/이상 수량
- 시스템 진단: 디스크 / Swap / Load / Uptime / DOF / Base

#### Performance
- Dual-Arm 정확도 비교: LA vs RA J1~J3 오차율 게이지
- End-Effector 성능: LA/RA 파지 성공률 + 압력 안정성
- 에러 빈도 차트: BarChart (LA=teal, RA=purple)
- 세션 통계: 성공률 / 총 에러/경고 / 피크 CPU / 평균 응답시간
- 감지된 이슈 패턴 + 성능 추이 차트

### 5. 로그 엔트리 패널

- **높이 조절**: 드래그 핸들로 80px ~ 60vh 자유 조절
- 레벨 필터: ALL / ERROR / WARN / INFO / DEBUG
- 컴포넌트 필터: ALL / Left Arm / Right Arm / System / Base
- 키워드 검색
- 시간 범위: 최근 1분 / 5분 / 전체
- 로그 클릭 → 해당 시점으로 리플레이 점프

---

## MCAP 토픽 구조

| 토픽 | 타입 | 주기 | 설명 |
|---|---|---|---|
| `/robot_configuration` | JSON | 1회 | 로봇 설정 (EE 타입 등) |
| `/left_arm/joint_states` | JSON | 2Hz | LA J1~J6 pos/vel/torque |
| `/right_arm/joint_states` | JSON | 2Hz | RA J1~J6 pos/vel/torque |
| `/left_arm/hand_state` | JSON | 0.5Hz | LA 손 안정성, 파지 상태, 온도 |
| `/right_arm/gripper_state` | JSON | 1Hz | RA 개방거리, 핑거 압력 |
| `/left_arm/tactile_sensors` | JSON | 2Hz | LA 촉각 센서 배열 |
| `/mobile_base/state` | JSON | 1Hz | 선속도, 각속도, 헤딩 |
| `/system_monitor` | JSON | 1Hz | CPU / Memory / Battery / Network |
| `/manipulation_events` | JSON | 이벤트 | 이슈/경고 이벤트 |
| `/rosout` | JSON | 이벤트 | 로그 메시지 |
| `/performance_metrics` | JSON | 1Hz | 전력, 오차, 성공률 |

---

## 데이터 필드 규칙

```
la_j{1-6}_pos      # Left Arm Joint 각도 (deg)
la_j{1-6}_torque   # Left Arm Joint 토크 (Nm)
la_j{1-6}_temp     # Left Arm Joint 온도 (°C)
la_hand_stability  # Hand 안정성 (%)
la_is_grasping     # 파지 여부 (bool)
la_ee_type         # 'hand' | 'gripper'

ra_j{1-6}_pos      # Right Arm Joint 각도 (deg)
ra_j{1-6}_torque   # Right Arm Joint 토크 (Nm)
ra_j{1-6}_temp     # Right Arm Joint 온도 (°C)
ra_gripper_pos     # Gripper 개방거리 (mm)
ra_gripper_force   # Grip Force (N)
ra_finger1/2_pressure  # 핑거 압력 (N)
ra_is_grasping     # 파지 여부 (bool)
ra_ee_type         # 'hand' | 'gripper'

base_vel_linear    # 선속도 (m/s)
base_vel_angular   # 각속도 (rad/s)
base_heading       # 헤딩 (deg)

cpu / memory       # 시스템 리소스 (%)
battery_voltage    # 배터리 전압 (V)
network_latency    # 네트워크 지연 (ms)
```

---

## 프로젝트 구조

```
src/
├── App.jsx                      # 루트 레이아웃, MCAP 로드 파이프라인, 드래그 리사이즈
├── main.jsx
├── styles/
│   └── theme.js                 # 색상 / 폰트 / 쉐도우 토큰
├── data/
│   └── mockData.js              # Mock 데이터 (ROBOT_CONFIG, generateMockData 등)
├── hooks/
│   └── useReplay.js             # 재생 상태 머신 (play/pause/seek/chartData)
├── utils/
│   └── mcapParser.js            # MCAP → timeSeries + config + logEntries
├── services/
│   └── s3Service.js             # S3 다운로드 / 샘플 로드
├── components/
│   ├── Header.jsx               # 로봇 ID·모델·EE 배지, 파일 로드 버튼
│   ├── RobotVisualization.jsx   # Three.js 3D 휠 휴머노이드 FK
│   ├── ReplayControls.jsx       # 재생 컨트롤, 타임라인, 이슈 마커
│   ├── AnalysisPanel.jsx        # 탭 바 + 탭 라우팅
│   ├── LogEntries.jsx           # 로그 필터링 + 테이블
│   ├── LoadingOverlay.jsx       # 로딩 진행률 오버레이
│   ├── S3Browser.jsx            # S3 버킷 브라우저 모달
│   ├── McapDropZone.jsx         # 드롭존 (로컬/S3/샘플)
│   └── tabs/
│       ├── OverviewTab.jsx      # 전체 요약
│       ├── ArmAnalysisTab.jsx   # 팔 분석 (side prop)
│       ├── EndEffectorTab.jsx   # EE 분석 (Gripper / Hand)
│       ├── SystemStatusTab.jsx  # 시스템 상태
│       └── PerformanceTab.jsx   # 성능 분석
scripts/
└── generate-sample.mjs          # 샘플 MCAP 생성 스크립트 (600초, ~2MB)
```

---

## Mock 모드

MCAP 파일 없이 실행하면 `mockData.js`의 데이터로 동작합니다.

- 시뮬레이션 주기: 100ms (10Hz)
- LA: 5-Finger Hand, RA: Parallel Jaw Gripper 고정
- J3 온도 상승, RA Finger 2 압력 이상, CPU 스파이크 등 시나리오 포함

---

## 이슈 분석 시나리오

### Joint 에러 분석
1. Overview에서 경고 배지 확인 → Left/Right Arm 탭 이동
2. Joint 상태 카드에서 이상 Joint 확인 (빨강/노랑 강조)
3. 실시간 차트에서 토크/온도 이상 패턴 확인
4. 하단 로그에서 해당 시점 이벤트 클릭 → 리플레이 점프

### Gripper 이상 분석
1. End-Effector 탭 → RA(Parallel Jaw) 패널
2. Finger 2 압력 게이지 및 히트맵에서 불균형 확인
3. 시계열 차트에서 F1/F2 압력 발산 시점 파악
4. 제어 로그에서 캘리브레이션 이력 확인

### 시스템 부하 분석
1. System 탭 → CPU/Memory 게이지 + 시계열 차트
2. 시스템 경고 목록에서 임계치 초과 이벤트 확인
3. Performance 탭에서 에러 빈도 BarChart 패턴 분석
4. 성능 추이 차트에서 CPU / J3 온도 상관관계 확인

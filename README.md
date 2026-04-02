# Manipulation Replay 요구사항
0. 기술 스택 : 
- React (No typescript)
- pnpm
- vite
- styled-components

1. 페이지 개요
목적: 관제 시스템에서 선택한 로봇의 Manipulation 로그를 리플레이하며 이슈 분석
접근 방식: 관제 → 로봇 상세 화면 → "Manipulation Replay" 버튼 → 새 창 팝업
설계 원칙: 스크롤 없는 단일 화면에서 직관적 이슈 분석
2. 페이지 레이아웃 (100% 화면 활용)
2.1 상단 영역 (Header - 8% 높이)
좌측: 선택된 로봇 ID, 모델명, 현재 그리퍼/핸드 타입
우측: 날짜 시간 선택, 조회 버튼, 로그 파일 선택 드롭다운, 로그 다운로드 버튼, 새로고침 버튼
2.2 메인 콘텐츠 영역 (72% 높이)
좌측 영역 (50% 너비) - 3D 시각화 & 리플레이 컨트롤
3D 시각화 (75% 높이)

로봇 팔 Joint 상태 실시간 표시
그리퍼/핸드 상태 및 개폐 시각화
Joint 각도 기반 로봇 자세 표시
에러 발생 Joint 빨간색 하이라이팅
압력 센서 데이터 기반 접촉점 표시
리플레이 컨트롤 (25% 높이)

재생/일시정지/정지/처음으로 버튼
재생 속도 조절 슬라이더 (0.1x ~ 10x)
타임라인 슬라이더 (전체 로그 기간)
현재 재생 시점 및 총 시간 표시
이슈 발생 지점 마커 (색상별 구분)
이전/다음 이슈로 점프 버튼
우측 영역 (50% 너비) - 분석 패널 (탭 구성)
탭 순서: Overview → Arm Analysis → Gripper Analysis → Hand Analysis → System Status → Performance

2.3 하단 영역 (Log Entries - 20% 높이)
필터 바 (상단)

로그 레벨 필터 (ERROR/WARN/INFO/DEBUG)
컴포넌트 필터 (Arm/Gripper/Hand/System)
키워드 검색 입력창
시간 범위 필터 (최근 1분/5분/전체)
로그 테이블 (하단)

컬럼: 시간, 레벨, 컴포넌트, 메시지, 액션
에러/경고 로그 색상 하이라이팅
클릭 시 해당 시점으로 리플레이 점프
관련 로그 그룹핑 및 확장/축소
3. 분석 패널 상세 구성
3.1 Overview 탭
로봇 현재 상태 (50%)

전원 상태, 연결 상태, 동작 모드
현재 배터리 전압/전류 수치
Joint 각도/토크, 그리퍼 압력 현재값 (게이지)
온도, 진동 센서 현재값
현재 작업 상태 (50%)

현재 실행 중인 ROS 토픽 리스트
최근 수신된 명령 이력
현재 발생 중인 에러/경고 메시지
최근 주요 이벤트 타임라인
3.2 Arm Analysis 탭
Joint 상태 분석 (60%)

각 Joint별 각도/속도/토크 실시간 차트
Joint 한계값 대비 현재값 게이지
Joint별 온도 및 진동 센서 데이터
비정상 수치 하이라이팅
Joint 명령 및 응답 (40%)

목표 각도 vs 실제 각도 비교 차트
Joint 제어 명령 이력
Joint 에러 메시지 및 상태 코드
3.3 Gripper Analysis 탭
파지 상태 분석 (70%)

그리퍼 개폐 각도 실시간 차트
압력 센서 값 시계열 차트
물체 감지 센서 상태
압력 센서 분포 히트맵
그리퍼 제어 상태 (30%)

핑거 위치 센서 값
그리퍼 제어 명령 이력
파지/해제 이벤트 로그
3.4 Hand Analysis 탭
다관절 핸드 센서 데이터 (70%)

각 핑거별 Joint 각도/토크 매트릭스
촉각 센서 압력 분포 히트맵
핑거별 온도 및 진동 센서 데이터
핸드 제어 로그 (30%)

핑거별 제어 명령 이력
핸드 형태 변경 명령 로그
핸드 관련 에러 메시지
3.5 System Status 탭
시스템 리소스 (50%)

CPU/메모리 사용률 실시간 차트
네트워크 지연시간 및 패킷 손실률
배터리 전압/전류/온도 차트
시스템 온도 분포
통신 및 연결 상태 (50%)

ROS 토픽 발행/구독 빈도 차트
메시지 지연시간 분석
네트워크 연결 상태 로그
센서 데이터 수신 상태
3.6 Performance 탭
실시간 계산 지표 (60%)

Joint 목표값 대비 실제값 오차 (RMS)
그리퍼 압력 변화율
최근 N분간 에러 발생 빈도
현재 전력 소모율
선택된 시간 구간 내 통계
로그 기반 분석 (40%)

로그 기간 내 에러/경고 개수 및 유형별 분류
명령 실행 시간 분포 차트
반복되는 에러 패턴 감지
시간대별 시스템 부하 패턴
4. 핵심 기능 요구사항
4.1 로그 관리 및 다운로드
로그 파일 관리

업로드된 로그 파일 목록 (파일명, 크기, 기간)
로그 파일 미리보기
여러 로그 파일 병합 기능
선택적 다운로드

전체 로그 다운로드 (원본 ROS bag)
필터링된 로그 다운로드 (JSON/CSV)
특정 시간 구간 로그 다운로드
이슈 관련 로그만 다운로드
4.2 인터랙티브 리플레이
정밀한 시점 제어

마우스 드래그로 타임라인 탐색
키보드 단축키 (스페이스바: 재생/일시정지)
이슈 발생 지점 자동 점프 기능
동기화된 시각화

3D 로봇 모델과 로그 데이터 실시간 동기화
차트 데이터와 현재 재생 시점 연동
로그 엔트리 하이라이팅과 시각화 연동
4.3 탭 간 연동 기능
상태 기반 알림

Overview에서 이상 상태 감지 시 해당 분석 탭에 알림 표시
각 탭에서 이슈 발견 시 Overview에 요약 정보 표시
시점 동기화

한 탭에서 특정 시점 선택 시 모든 탭이 해당 시점 데이터로 업데이트
로그 엔트리 선택 시 관련 탭 자동 활성화
5. 주요 사용 시나리오
5.1 Joint 에러 분석 시나리오
이슈 발견: Overview에서 Joint 에러 메시지 확인
상세 분석: Arm Analysis 탭에서 해당 Joint의 각도/토크 차트 확인
시각적 확인: 3D 시각화에서 문제 Joint 빨간색 하이라이팅 확인
패턴 분석: Performance 탭에서 에러 발생 빈도 및 패턴 분석
로그 확인: 하단 로그 테이블에서 관련 에러 메시지 상세 확인
데이터 저장: 해당 구간 로그 다운로드
5.2 그리퍼 동작 이상 분석 시나리오
이슈 감지: Overview에서 그리퍼 관련 에러 메시지 발견
센서 분석: Gripper Analysis 탭에서 압력 센서 및 각도 데이터 확인
패턴 확인: 압력 분포 히트맵에서 비정상 패턴 발견
시점 추적: 리플레이 컨트롤로 이상 발생 시점 정밀 탐색
원인 파악: 로그 엔트리에서 상세 에러 정보 및 명령 이력 확인
보고서 작성: 분석 결과를 바탕으로 이슈 리포트 생성
5.3 시스템 성능 모니터링 시나리오
전체 상황 파악: Overview에서 현재 로봇 전체 상태 확인
리소스 분석: System Status에서 CPU/메모리 사용률 급증 확인
성능 지표 확인: Performance 탭에서 해당 시점의 전체 시스템 부하 분석
원인 추적: 각 하드웨어 탭에서 부하 증가 원인 분석
로그 검증: 로그 엔트리에서 관련 이벤트 및 에러 메시지 확인
예방 조치: 분석 결과를 바탕으로 예방 정비 계획 수립
5.4 복합 이슈 분석 시나리오
다중 이슈 감지: Overview에서 여러 이슈가 동시 발생한 시점 확인
우선순위 결정: 이슈 심각도에 따른 분석 순서 결정
순차적 분석: Arm → Gripper/Hand → System 순으로 각 탭에서 상세 분석
연관성 파악: 탭 간 연동을 통해 이슈 간 연관성 확인
근본 원인 도출: Performance 탭에서 종합적인 패턴 분석
해결 방안 도출: 분석 결과를 바탕으로 종합적인 해결 방안 제시
5.5 정기 점검 시나리오
전체 로그 로드: 정기 점검 기간의 전체 로그 파일 로드
성능 트렌드 확인: Performance 탭에서 전체 기간 성능 변화 확인
이상 구간 식별: 성능 저하 또는 이상 패턴 구간 식별
상세 분석: 식별된 구간을 각 하드웨어 탭에서 상세 분석
예방 정비 계획: System Status 기반 예방 정비 포인트 확인
점검 보고서: 종합 분석 결과 및 권장사항 문서화
10. 화면 정의
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                           HEADER (8% 높이)                                                        │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 🤖 Robot ID: MR-001 | Model: Manipulation Bot v2.1 | Gripper: Parallel Jaw    [로그파일선택▼] [다운로드] [새로고침] │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
 
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                        MAIN CONTENT (72% 높이)                                                   │
├─────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────┤
│           좌측 (50% 너비)              │                        우측 (50% 너비)                                      │
├─────────────────────────────────────┤                                                                           │
│                                     │ ┌─ Overview ─┬─ Arm Analysis ─┬─ Gripper ─┬─ Hand ─┬─ System ─┬─ Perf ─┐ │
│          3D 로봇 시각화                │ │                                                                       │ │
│                                     │ │  🔋 Battery: 87% (12.4V)    📡 Connected    🔄 Auto Mode            │ │
│     ┌─────────────────────────┐     │ │                                                                       │ │
│     │                         │     │ │  Joint Status:                                                        │ │
│     │    🦾                   │     │ │  ┌─ J1: 45° ──●────┐ ┌─ J2: -30° ●──────┐ ┌─ J3: 90° ────●──┐      │ │
│     │      \                  │     │ │  │    Torque: 2.1Nm │ │    Torque: 1.8Nm │ │   Torque: 0.9Nm │      │ │
│     │       \                 │     │ │  └─────────────────┘ └─────────────────┘ └─────────────────┘      │ │
│     │        \____🤏          │     │ │                                                                       │ │
│     │                         │     │ │  Gripper: 🟢 Open (15mm)    Pressure: 0.2N                          │ │
│     │                         │     │ │  Temperature: 🌡️ 42°C       Vibration: 📊 0.1g                      │ │
│     │                         │     │ │                                                                       │ │
│     └─────────────────────────┘     │ │  Current Task Status:                                                 │ │
│                                     │ │  📋 Active Topics: /arm_controller, /gripper_controller               │ │
│     (75% 높이)                       │ │  📝 Recent Commands: move_to_position(x:0.5, y:0.2, z:0.8)           │ │
├─────────────────────────────────────┤ │  ⚠️  Current Alerts: None                                             │ │
│        리플레이 컨트롤                  │ │                                                                       │ │
│                                     │ │  Event Timeline:                                                      │ │
│ ⏮️ ⏸️ ▶️ ⏭️    Speed: [●────] 2.0x    │ │  14:32:15 - Move command received                                     │ │
│                                     │ │  14:32:16 - Joint motion started                                     │ │
│ Timeline:                           │ │  14:32:18 - Target position reached                                  │ │
│ ├──●────🔴──────────🟡────────────┤ │ │  14:32:19 - Gripper close command                                    │ │
│ 14:30    14:32    14:35    14:40   │ │                                                                       │ │
│                                     │ └───────────────────────────────────────────────────────────────────────┘ │
│ Current: 14:32:15 / Total: 00:10:30│                                                                           │
│                                     │                                                                           │
│ [◀️ Prev Issue] [Next Issue ▶️]     │                                                                           │
│                                     │                                                                           │
│ (25% 높이)                           │                                                                           │
└─────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────┘
 
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      LOG ENTRIES (20% 높이)                                                      │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Filters: [ERROR▼] [Arm▼] [🔍 Search...                    ] [Last 1min▼]                                        │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Time     │Level│Component│Message                                                                    │Action      │
├──────────┼─────┼─────────┼───────────────────────────────────────────────────────────────────────────┼────────────┤
│14:32:15  │INFO │Arm      │Joint motion command received: target=[45, -30, 90]                       │[Jump To]   │
│14:32:16  │INFO │Arm      │All joints started moving to target position                              │[Jump To]   │
│14:32:17  │WARN │Arm      │Joint 2 approaching velocity limit (current: 85% of max)                 │[Jump To]   │
│14:32:18  │INFO │Arm      │Target position reached within tolerance                                  │[Jump To]   │
│14:32:19  │INFO │Gripper  │Close command received with target force: 5.0N                           │[Jump To]   │
│14:32:20  │ERROR│Gripper  │Pressure sensor reading anomaly detected on finger 1                     │[Jump To]   │
│14:32:21  │WARN │System   │CPU usage spike detected: 89% (threshold: 80%)                           │[Jump To]   │
└──────────┴─────┴─────────┴───────────────────────────────────────────────────────────────────────────┴────────────┘
Arm Analysis 탭 선택 시:
┌───────────────────────────────────────────────────────────────────────────┐
│ Overview │🔧 Arm Analysis │ Gripper │ Hand │ System │ Performance          │
├───────────────────────────────────────────────────────────────────────────┤
│                    Joint 상태 분석 (60%)                                    │
│                                                                           │
│ Joint 1 (Base):           Joint 2 (Shoulder):        Joint 3 (Elbow):    │
│ ┌─ Angle: 45° ────●──┐   ┌─ Angle: -30° ●─────┐    ┌─ Angle: 90° ────●─┐│
│ │ Target: 45°      │   │ Target: -30°        │    │ Target: 90°       ││
│ │ Torque: 2.1Nm    │   │ Torque: 1.8Nm       │    │ Torque: 0.9Nm     ││
│ │ Temp: 🌡️ 38°C     │   │ Temp: 🌡️ 42°C        │    │ Temp: 🌡️ 35°C      ││
│ └─────────────────┘   └─────────────────────┘    └─────────────────────┘│
│                                                                           │
│ Real-time Charts:                                                         │
│ Angle: ┌─────────────────────────────────────────────────────────────┐   │
│        │     ╭─╮                                                     │   │
│        │    ╱   ╲                                                    │   │
│        │   ╱     ╲___                                                │   │
│        │  ╱          ╲___                                            │   │
│        └─────────────────────────────────────────────────────────────┘   │
│                                                                           │
│ Torque:┌─────────────────────────────────────────────────────────────┐   │
│        │  ⚠️                                                          │   │
│        │ ╱╲╱╲                                                        │   │
│        │╱    ╲                                                       │   │
│        │      ╲___                                                   │   │
│        └─────────────────────────────────────────────────────────────┘   │
├───────────────────────────────────────────────────────────────────────────┤
│                   Joint 명령 및 응답 (40%)                                 │
│                                                                           │
│ Target vs Actual Comparison:                                              │
│ ┌─────────────────────────────────────────────────────────────────────┐   │
│ │ Joint 1: ████████████████████████████████████████ 100% accuracy    │   │
│ │ Joint 2: ████████████████████████████████████▓▓▓▓  89% accuracy    │   │
│ │ Joint 3: ████████████████████████████████████████  98% accuracy    │   │
│ └─────────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│ Recent Commands:                                                          │
│ • 14:32:15 - move_to_position([45, -30, 90]) - ✅ Success                 │
│ • 14:31:45 - move_to_position([30, -45, 75]) - ✅ Success                 │
│ • 14:31:20 - home_position() - ✅ Success                                 │
│                                                                           │
│ Error Messages:                                                           │
│ • 14:32:17 - ⚠️ Joint 2 velocity limit warning                            │
└───────────────────────────────────────────────────────────────────────────┘
Gripper Analysis 탭 선택 시:
┌───────────────────────────────────────────────────────────────────────────┐
│ Overview │ Arm Analysis │🤏 Gripper Analysis │ Hand │ System │ Performance │
├───────────────────────────────────────────────────────────────────────────┤
│                      파지 상태 분석 (70%)                                    │
│                                                                           │
│ Gripper Opening:                    Pressure Sensors:                    │
│ ┌─ Current: 15mm ──●────────┐      ┌─────────────────────────────────┐   │
│ │ Target: 15mm             │      │ Finger 1:  ████████ 3.2N       │   │
│ │ Max: 50mm                │      │ Finger 2:  ██████▓▓ 2.8N ⚠️     │   │
│ └─────────────────────────┘      └─────────────────────────────────┘   │
│                                                                           │
│ Pressure Distribution Heatmap:                                            │
│ ┌─────────────────────────────────────────────────────────────────────┐   │
│ │ Finger 1:  🟩🟩🟩🟨🟨🟨🟥🟥  │  Finger 2:  🟩🟩🟨🟨🟨🟧🟧🟥  │   │
│ │           (Normal grip)        │           (Uneven pressure)    │   │
│ └─────────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│ Time Series Charts:                                                       │
│ Opening: ┌───────────────────────────────────────────────────────────┐   │
│          │     ╭─────╮                                               │   │
│          │    ╱       ╲                                              │   │
│          │   ╱         ╲                                             │   │
│          │  ╱           ╲____                                        │   │
│          └───────────────────────────────────────────────────────────┘   │
│                                                                           │
│ Pressure:┌───────────────────────────────────────────────────────────┐   │
│          │                    ⚠️                                      │   │
│          │                   ╱╲                                      │   │
│          │                  ╱  ╲                                     │   │
│          │                 ╱    ╲____                                │   │
│          └───────────────────────────────────────────────────────────┘   │
├───────────────────────────────────────────────────────────────────────────┤
│                     그리퍼 제어 상태 (30%)                                  │
│                                                                           │
│ Finger Positions:                Object Detection:                       │
│ • Finger 1: 7.5mm (synchronized) • Status: 🟢 Object Detected            │
│ • Finger 2: 7.5mm (synchronized) • Confidence: 95%                       │
│                                   • Estimated Size: 25mm x 15mm          │
│                                                                           │
│ Recent Events:                                                            │
│ • 14:32:19 - Gripper close command received (target: 5.0N)               │
│ • 14:32:20 - ⚠️ Pressure sensor anomaly on finger 1                      │
│ • 14:32:21 - Grip adjustment attempted                                    │
│ • 14:32:22 - Stable grip achieved                                         │
└───────────────────────────────────────────────────────────────────────────┘
Hand Analysis 탭 선택 시:
┌───────────────────────────────────────────────────────────────────────────┐
│ ┌─ Overview ─┬─ Arm Analysis ─┬─ Gripper ─┬─✋ Hand ─┬─ System ─┬─ Perf ─┐ │
│ │                                                                       │ │
│ │  ✋ Multi-Joint Hand Sensor Data (70%):                               │ │
│ │  ┌─ Finger Joint Matrix ──────────────────────────────────────────────┐ │ │
│ │  │           Thumb    Index    Middle   Ring     Pinky               │ │ │
│ │  │ Joint 1:  45.2°    32.1°    28.5°   25.8°    22.3°              │ │ │
│ │  │ Joint 2:  38.7°    45.6°    42.3°   40.1°    35.9°              │ │ │
│ │  │ Joint 3:  25.1°    38.2°    35.7°   33.4°    30.8°              │ │ │
│ │  │                                                                   │ │ │
│ │  │ Torque:   2.3Nm    1.8Nm    1.6Nm   1.4Nm    1.1Nm              │ │ │
│ │  │ Status:   ✅ OK    ⚠️ High   ✅ OK    ✅ OK     ✅ OK              │ │ │
│ │  └───────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                       │ │
│ │  🤚 Hand Shape Visualization:                                         │ │ │
│ │  ┌─ Current Hand Pose ─────────────────────────────────────────────────┐ │ │
│ │  │     Thumb                                                         │ │ │
│ │  │       ╲                                                           │ │ │
│ │  │        ●─●─●                                                      │ │ │
│ │  │         ╲                                                         │ │ │
│ │  │          ●─●─●─● Index (⚠️ High torque)                          │ │ │
│ │  │          ●─●─●─● Middle                                           │ │ │
│ │  │          ●─●─●─● Ring                                             │ │ │
│ │  │          ●─●─●   Pinky                                            │ │ │
│ │  │                                                                   │ │ │
│ │  │ Grasp Type: Power Grasp (Cylindrical Object)                     │ │ │
│ │  │ Stability: ⚠️ 78% (Index finger stress detected)                 │ │ │
│ │  └───────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                       │ │
│ │  👆 Tactile Sensor Heatmap:                                          │ │ │
│ │  ┌─ Pressure Distribution ─────────────────────────────────────────────┐ │ │
│ │  │ Thumb:  🟩🟩🟨🟨🟧🟧🟥  (15.2N)                                   │ │ │
│ │  │ Index:  🟩🟨🟨🟧🟧🟥🟥  (18.7N) ⚠️ High pressure                  │ │ │
│ │  │ Middle: 🟩🟩🟩🟨🟨🟧🟧  (12.3N)                                   │ │ │
│ │  │ Ring:   🟩🟩🟩🟩🟨🟨🟧  (8.9N)                                    │ │ │
│ │  │ Pinky:  🟩🟩🟩🟩🟩🟨🟨  (5.4N)                                    │ │ │
│ │  │                                                                   │ │ │
│ │  │ Contact Points: 23 active sensors                                 │ │ │
│ │  │ Total Force: 60.5N                                                │ │ │
│ │  │ Center of Pressure: (12mm, 8mm) from palm center                 │ │ │
│ │  └───────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                       │ │
│ │  📊 Finger Performance Charts:                                       │ │ │
│ │  ┌─ Joint Angles Over Time ───────────────────────────────────────────┐ │ │
│ │  │ 60°┤                                                              │ │ │
│ │  │ 50°┤ ╭─ Index J2 ─────────────╮                                   │ │ │
│ │  │ 40°┤╱                         ╲                                   │ │ │
│ │  │ 30°┤     ╭─ Thumb J1 ─────╮    ╲                                  │ │ │
│ │  │ 20°┤    ╱               ╲   ╲                                     │ │ │
│ │  │ 10°┤   ╱                 ╲   ╲                                    │ │ │
│ │  │  0°┤──╱───────────────────╲───╲──                                │ │ │
│ │  │   └┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼──    │ │ │
│ │  │    14:20   14:21   14:22   14:23 ← 현재                          │ │ │
│ │  └───────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                       │ │
│ ├───────────────────────────────────────────────────────────────────────┤ │
│ │  🎛️ Hand Control Logs (30%):                                         │ │
│ │  ┌─ Finger Control Commands ──────────────────────────────────────────┐ │ │
│ │  │ Recent Commands:                                                  │ │ │
│ │  │ [14:23:10] adaptive_grasp(object_type="cylinder", force=60N)      │ │ │
│ │  │ [14:23:12] ✅ Grasp formation completed                          │ │ │
│ │  │ [14:23:15] ⚠️ Index finger torque limit approached               │ │ │
│ │  │ [14:23:18] adjust_grip(reduce_index_force=true)                   │ │ │
│ │  │                                                                   │ │ │
│ │  │ Finger Coordination Status:                                       │ │ │
│ │  │ • Thumb-Index Opposition: ✅ 95% synchronized                     │ │ │
│ │  │ • Middle-Ring Coupling: ✅ 92% synchronized                       │ │ │
│ │  │ • Pinky Independence: ✅ 88% controlled                           │ │ │
│ │  └───────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                       │ │
│ │  ┌─ Hand Configuration & Events ──────────────────────────────────────┐ │ │
│ │  │ Current Hand Configuration:                                       │ │ │
│ │  │ • Hand Type: 5-Finger Anthropomorphic                            │ │ │
│ │  │ • DOF: 15 (3 per finger)                                         │ │ │
│ │  │ • Tactile Sensors: 45 active (3 per finger segment)              │ │ │
│ │  │ • Last Calibration: 2024-03-15 09:30:00                          │ │ │
│ │  │                                                                   │ │ │
│ │  │ Recent Events:                                                    │ │ │
│ │  │ ● 14:23:10 - Adaptive grasp algorithm initiated                   │ │ │
│ │  │ ● 14:23:12 - Object contact detected on all fingers              │ │ │
│ │  │ ⚠️ 14:23:15 - Index finger stress threshold exceeded             │ │ │
│ │  │ ● 14:23:18 - Grip adjustment completed                            │ │ │
│ │  │ ● 14:23:20 - Stable grasp achieved                                │ │ │
│ │  │                                                                   │ │ │
│ │  │ Hand Health Status:                                               │ │ │
│ │  │ • Motor Temperature: 🌡️ Avg 38°C (Max: 42°C on Index)           │ │ │
│ │  │ • Sensor Integrity: ✅ 44/45 sensors operational                 │ │ │
│ │  │ • Mechanical Wear: 🟢 Low (Usage: 1,247 hours)                   │ │ │
│ │  └───────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                       │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
1. 다관절 핸드 센서 데이터 (70% 영역)

Finger Joint Matrix: 각 손가락별 3개 관절의 각도와 토크를 매트릭스 형태로 표시

Hand Shape Visualization: 현재 손 모양을 간단한 ASCII 아트로 시각화하여 직관적 이해

Tactile Sensor Heatmap: 각 손가락별 압력 분포를 색상으로 표현 (🟩낮음 → 🟥높음)

Performance Charts: 시간에 따른 관절 각도 변화를 차트로 표시

2. Hand Control Logs (30% 영역)

Finger Control Commands: 손가락별 제어 명령 이력

Coordination Status: 손가락 간 협조 제어 성능 (엄지-검지 대립, 중지-약지 연동 등)

Hand Configuration: 핸드 하드웨어 사양 및 캘리브레이션 정보

Health Status: 모터 온도, 센서 상태, 기계적 마모도 등

3. 시각적 요소

색상 코딩: 🟢정상, 🟡주의, 🔴위험 상태 구분

히트맵: 압력 분포를 직관적으로 표현

게이지: 각 손가락별 성능 지표

타임라인 차트: 시간에 따른 변화 추이

4. Hand 특화 정보

Grasp Type 인식: 현재 파지 형태 분류 (Power Grasp, Precision Grasp 등)

적응적 제어: 물체 특성에 따른 자동 그립 조정

손가락별 독립 제어: 각 손가락의 개별 성능 모니터링

촉각 피드백: 실시간 압력 및 접촉 정보



System 탭 선택 시:
┌───────────────────────────────────────────────────────────────────────────┐
│ ┌─ Overview ─┬─ Arm Analysis ─┬─ Gripper ─┬─ Hand ─┬─🖥️ System ─┬─ Perf ─┐ │
│ │                                                                       │ │
│ │  🖥️ System Resources (50%):                                          │ │
│ │  ┌─ CPU & Memory Usage ──────────────────────────────────────────────┐ │ │
│ │  │ CPU Usage: 85% ████████████████████████████████████████████▓▓▓▓▓ │ │ │
│ │  │ ⚠️ High usage (Threshold: 80%)                                   │ │ │
│ │  │                                                                   │ │ │
│ │  │ Memory: 67% ████████████████████████████████████▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │ │
│ │  │ Used: 5.4GB / Total: 8.0GB                                       │ │ │
│ │  │                                                                   │ │ │
│ │  │ 📊 Real-time Charts:                                             │ │ │
│ │  │ CPU: ┌─────────────────────────────────────────────────────────┐ │ │ │
│ │  │ 100%┤                                    ⚠️                     │ │ │
│ │  │  80%┤                              ╭─────╯╲                     │ │ │
│ │  │  60%┤                        ╭─────╯       ╲                    │ │ │
│ │  │  40%┤                  ╭─────╯             ╲                   │ │ │
│ │  │  20%┤            ╭─────╯                   ╲                   │ │ │
│ │  │   0%┤────────────╯                         ╲──                 │ │ │
│ │  │    └┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼── │ │ │
│ │  │     14:20   14:21   14:22   14:23 ← 현재                       │ │ │
│ │  └───────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                       │ │
│ │  ⚡ Power & Network Status:                                           │ │
│ │  ┌─ Battery Status ──────────────┬─ Network Performance ────────────┐ │ │
│ │  │ Voltage: 12.4V ──●─────────  │ │ Latency: 15ms ──●──────────── │ │ │
│ │  │ Current: 2.1A  ──●─────────  │ │ Packet Loss: 0.1% ●────────── │ │ │
│ │  │ Charge: 87% ████████████████▓ │ │ Bandwidth: 95% ████████████▓▓ │ │ │
│ │  │ Est. Runtime: 4.2 hours      │ │ Connection: ✅ Stable          │ │ │
│ │  └──────────────────────────────┴─────────────────────────────────┘ │ │
│ │                                                                       │ │
│ │  🌡️ Temperature Distribution:                                        │ │
│ │  ┌─ Component Temperatures ────────────────────────────────────────────┐ │ │
│ │  │ Joint Motors:                                                     │ │ │
│ │  │ • J1: 38°C 🟢  • J2: 42°C 🟡  • J3: 55°C 🔴 (Limit: 60°C)      │ │ │
│ │  │ • J4: 35°C 🟢  • J5: 40°C 🟡  • J6: 37°C 🟢                     │ │ │
│ │  │                                                                   │ │ │
│ │  │ System Components:                                                │ │ │
│ │  │ • CPU: 52°C 🟡     • GPU: 48°C 🟢     • Battery: 35°C 🟢        │ │ │
│ │  │ • Gripper: 41°C 🟢 • Hand: 39°C 🟢    • PSU: 45°C 🟢           │ │ │
│ │  │                                                                   │ │ │
│ │  │ 📈 Temperature Trends:                                           │ │ │
│ │  │ 70°C┤                                                            │ │ │
│ │  │ 60°C┤                                          ╭─ J3 (Critical)  │ │ │
│ │  │ 50°C┤                                    ╭─────╯                 │ │ │
│ │  │ 40°C┤ ╭─ J2 ─────────────────────────────╯                      │ │ │
│ │  │ 30°C┤╱                                                           │ │ │
│ │  │    └┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼──  │ │ │
│ │  │     14:20   14:21   14:22   14:23 ← 현재                        │ │ │
│ │  └───────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                       │ │
│ ├───────────────────────────────────────────────────────────────────────┤ │
│ │  📡 Communication & Connection Status (50%):                         │ │
│ │  ┌─ ROS Topic Status ──────────────────────────────────────────────────┐ │ │
│ │  │ Active Topics (12/15):                                            │ │ │
│ │  │ ✅ /joint_states        (50 Hz)  │ ✅ /gripper_state     (20 Hz) │ │ │
│ │  │ ✅ /arm_controller/cmd  (10 Hz)  │ ✅ /tactile_sensors   (100Hz) │ │ │
│ │  │ ✅ /tf                  (100Hz)  │ ⚠️ /hand_state        (5 Hz)  │ │ │
│ │  │ ✅ /diagnostics        (1 Hz)   │ ❌ /camera/image      (0 Hz)  │ │ │
│ │  │ ✅ /system_monitor     (5 Hz)   │ ❌ /lidar/scan        (0 Hz)  │ │ │
│ │  │ ✅ /manipulation_events(var)    │ ❌ /imu/data          (0 Hz)  │ │ │
│ │  │                                                                   │ │ │
│ │  │ 📊 Message Frequency Chart:                                      │ │ │
│ │  │ 100Hz┤ ╭─ /tactile_sensors                                       │ │ │
│ │  │  80Hz┤╱                                                          │ │ │
│ │  │  60Hz┤     ╭─ /joint_states                                      │ │ │
│ │  │  40Hz┤    ╱                                                      │ │ │
│ │  │  20Hz┤   ╱    ╭─ /gripper_state                                  │ │ │
│ │  │   0Hz┤──╱─────╱──────────────────────────────────────────────── │ │ │
│ │  │     └┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼── │ │ │
│ │  │      14:20   14:21   14:22   14:23 ← 현재                       │ │ │
│ │  └───────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                       │ │
│ │  🔍 Data Integrity & Diagnostics:                                    │ │
│ │  ┌─ Sensor Health Status ─────────────────────────────────────────────┐ │ │
│ │  │ Joint Encoders:     ✅ 6/6 Online    │ Pressure Sensors: ⚠️ 44/45 │ │ │
│ │  │ Temperature Sensors: ✅ 8/8 Online    │ Tactile Sensors: ✅ 45/45  │ │ │
│ │  │ IMU Sensors:        ❌ 0/1 Offline   │ Vision Sensors:  ❌ 0/2    │ │ │
│ │  │                                                                   │ │ │
│ │  │ Message Integrity:                                                │ │ │
│ │  │ • Dropped Messages: 23 (0.02% of total)                          │ │ │
│ │  │ • Corrupted Packets: 1                                           │ │ │
│ │  │ • Sequence Gaps: 5 detected                                      │ │ │
│ │  │ • Average Delay: 12ms (Target: <20ms)                            │ │ │
│ │  │                                                                   │ │ │
│ │  │ System Diagnostics:                                               │ │ │
│ │  │ • Disk Usage: 78% (45GB / 58GB available)                        │ │ │
│ │  │ • Swap Usage: 12% (0.5GB / 4GB)                                  │ │ │
│ │  │ • Load Average: 2.1, 1.8, 1.5 (1min, 5min, 15min)              │ │ │
│ │  │ • Uptime: 2 days, 14 hours, 23 minutes                           │ │ │
│ │  └───────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                       │ │
│ │  ⚠️ System Alerts & Warnings:                                        │ │
│ │  • 14:23:21 - CPU usage exceeded 80% threshold                       │ │
│ │  • 14:23:15 - Joint 3 motor temperature approaching limit (55°C)     │ │ │
│ │  • 14:22:45 - Camera sensor connection lost                          │ │ │
│ │  • 14:22:30 - One tactile sensor unresponsive (Finger 2, Sensor 3)  │ │ │
│ │  • 14:21:10 - Network latency spike detected (peak: 45ms)            │ │ │
│ │                                                                       │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
System Status 탭의 주요 특징:

1. System Resources (50% 영역)

CPU & Memory 실시간 모니터링

사용률 게이지와 임계값 경고

시간에 따른 사용률 변화 차트

메모리 사용량 상세 정보

Power & Network Status

배터리 전압/전류/충전량 실시간 표시

네트워크 지연시간 및 패킷 손실률

예상 작동 시간 계산

Temperature Distribution

각 컴포넌트별 온도 상태 (🟢정상, 🟡주의, 🔴위험)

Joint 모터별 온도 모니터링

시간에 따른 온도 변화 트렌드

2. Communication & Connection Status (50% 영역)

ROS Topic Status

활성 토픽 목록과 발행 빈도

토픽별 상태 표시 (✅정상, ⚠️주의, ❌오프라인)

메시지 빈도 실시간 차트

Data Integrity & Diagnostics

센서별 온라인/오프라인 상태

메시지 무결성 통계 (드롭, 손상, 지연)

시스템 진단 정보 (디스크, 메모리, 로드)

System Alerts & Warnings

시간순 시스템 경고 및 알림

임계값 초과 이벤트

센서 연결 상태 변화

3. 시각적 요소

실시간 차트: CPU, 온도, 메시지 빈도 등

게이지: 배터리, 네트워크, 사용률 등

상태 표시등: 🟢🟡🔴 색상으로 상태 구분

히트맵: 온도 분포 시각화

4. System Status 특화 정보

리소스 모니터링: CPU, 메모리, 디스크, 네트워크

하드웨어 상태: 온도, 전력, 센서 상태

통신 품질: 토픽 빈도, 메시지 무결성, 지연시간

시스템 진단: 업타임, 로드 평균, 스왑 사용량

Performance 탭 선택 시:
┌───────────────────────────────────────────────────────────────────────────┐
│ Overview │ Arm Analysis │ Gripper │ Hand │ System │📊 Performance          │
├───────────────────────────────────────────────────────────────────────────┤
│                    실시간 계산 지표 (60%)                                    │
│                                                                           │
│ Current Performance Metrics:                                              │
│ ┌─────────────────────────────────────────────────────────────────────┐   │
│ │ Joint Accuracy (RMS Error):                                        │   │
│ │ • Joint 1: ████████████████████████████████████████ 0.1° (Excellent)│   │
│ │ • Joint 2: ████████████████████████████████████▓▓▓▓ 0.8° (Good)    │   │
│ │ • Joint 3: ████████████████████████████████████████ 0.2° (Excellent)│   │
│ │                                                                     │   │
│ │ Gripper Performance:                                                │   │
│ │ • Pressure Stability: ████████████████████████▓▓▓▓▓▓ 78% (Fair)     │   │
│ │ • Grip Success Rate: ████████████████████████████████ 95% (Excellent)│   │
│ │                                                                     │   │
│ │ Power Consumption:                                                  │   │
│ │ • Current Draw: 2.4A (Normal range: 1.8-3.2A)                      │   │
│ │ • Efficiency: ████████████████████████████████████▓▓ 89%            │   │
│ └─────────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│ Error Frequency (Last 10 minutes):                                       │
│ ┌─────────────────────────────────────────────────────────────────────┐   │
│ │ Errors: ▓▓░░░░▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│ │ Warns:  ▓▓▓░░▓▓░░▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│ │         14:30   14:32   14:34   14:36   14:38   14:40              │   │
│ └─────────────────────────────────────────────────────────────────────┘   │
├───────────────────────────────────────────────────────────────────────────┤
│                     로그 기반 분석 (40%)                                    │
│                                                                           │
│ Session Statistics:                                                       │
│ • Total Errors: 3 (2 Gripper, 1 System)                                 │
│ • Total Warnings: 8 (5 Arm, 2 Gripper, 1 System)                        │
│ • Average Command Response Time: 0.15s                                   │
│ • Peak CPU Usage: 89% (at 14:32:21)                                      │
│                                                                           │
│ Detected Patterns:                                                        │
│ ⚠️ Recurring Issue: Gripper pressure sensor instability                   │
│    - Frequency: Every 3-4 grip attempts                                  │
│    - Recommendation: Sensor calibration required                         │
│                                                                           │
│ 📈 Performance Trend:                                                     │
│ ┌─────────────────────────────────────────────────────────────────────┐   │
│ │ Overall: ████████████████████████████████████▓▓▓▓ Stable (85%)      │   │
│ │ Trend:   ↗️ Slight improvement over last hour                        │   │
│ └─────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────────┘
주요 시각적 특징
1. 색상 코딩
🟢 녹색: 정상 상태, 성공
🟡 노란색: 경고, 주의 필요
🔴 빨간색: 에러, 위험 상태
🔵 파란색: 정보, 중립 상태
2. 인터랙티브 요소
게이지: 실시간 수치 표시 (각도, 토크, 압력 등)
차트: 시계열 데이터 시각화
히트맵: 압력 분포, 온도 분포
진행바: 성능 지표, 정확도 표시
3. 상태 표시
아이콘: 🤖(로봇), 🔋(배터리), 📡(연결), 🌡️(온도), ⚠️(경고)
상태 표시등: 🟢(정상), 🟡(주의), 🔴(위험)
버튼: 재생 컨트롤, 점프 기능


# ROS 기반 Manipulation 로봇 로그 데이터 요구사항
1. ROS 표준 데이터 (기본 제공)
1.1 Joint State 관련 (sensor_msgs/JointState)


# /joint_states 토픽
header:
  stamp: 시간 정보
  frame_id: 프레임 ID
name: [joint1, joint2, joint3, ...]  # Joint 이름
position: [0.5, -0.3, 1.2, ...]     # Joint 각도 (rad)
velocity: [0.1, 0.0, -0.2, ...]     # Joint 속도 (rad/s)
effort: [2.3, 1.8, 0.9, ...]        # Joint 토크 (Nm)
1.2 로봇 상태 정보 (diagnostic_msgs/DiagnosticArray)
# /diagnostics 토픽
header:
  stamp: 시간 정보
status:
  - name: "arm_controller"
    level: 0  # OK=0, WARN=1, ERROR=2
    message: "All joints operational"
    hardware_id: "arm_hw"
    values:
      - key: "temperature"
        value: "42.5"
1.3 TF 변환 정보 (tf2_msgs/TFMessage)
# /tf 토픽
transforms:
  - header:
      stamp: 시간 정보
      frame_id: "base_link"
    child_frame_id: "end_effector"
    transform:
      translation: {x: 0.5, y: 0.2, z: 0.8}
      rotation: {x: 0, y: 0, z: 0, w: 1}
1.4 제어 명령 (trajectory_msgs/JointTrajectory)
# /arm_controller/command 토픽
header:
  stamp: 시간 정보
joint_names: [joint1, joint2, joint3]
points:
  - positions: [0.5, -0.3, 1.2]
    velocities: [0.1, 0.0, -0.2]
    time_from_start: {secs: 2, nsecs: 0}
1.5 시스템 로그 (rosgraph_msgs/Log)
# /rosout 토픽
header:
  stamp: 시간 정보
level: 2  # DEBUG=1, INFO=2, WARN=4, ERROR=8, FATAL=16
name: "/arm_controller"
msg: "Joint motion completed successfully"
file: "arm_controller.cpp"
function: "executeTrajectory"
line: 245
2. 추가 필요 데이터 (커스텀 구현)
2.1 그리퍼/핸드 상태 데이터
# /gripper_state 토픽 (커스텀)
header:
  stamp: 시간 정보
gripper_type: "parallel_jaw"  # parallel_jaw, multi_finger
position: 0.023  # 그리퍼 개방 거리 (m)
target_position: 0.025
force: 15.2  # 현재 파지력 (N)
target_force: 20.0
finger_positions: [0.0115, 0.0115]  # 각 핑거 위치
finger_forces: [7.6, 7.6]  # 각 핑거 힘
is_grasping: true
object_detected: true
2.2 다관절 핸드 상태 데이터
# /hand_state 토픽 (커스텀)
header:
  stamp: 시간 정보
hand_type: "5_finger_anthropomorphic"
finger_names: ["thumb", "index", "middle", "ring", "pinky"]
finger_joint_positions:
  thumb: [0.45, 0.38, 0.25]    # 각 손가락의 3개 관절 각도
  index: [0.32, 0.46, 0.38]
  middle: [0.29, 0.42, 0.36]
  ring: [0.26, 0.40, 0.33]
  pinky: [0.22, 0.36, 0.31]
finger_joint_efforts:
  thumb: [2.3, 1.8, 1.2]       # 각 관절 토크
  index: [1.8, 2.1, 1.5]
  middle: [1.6, 1.9, 1.3]
  ring: [1.4, 1.7, 1.1]
  pinky: [1.1, 1.4, 0.9]
grasp_type: "power_grasp"  # power_grasp, precision_grasp, etc.
grasp_stability: 0.78
2.3 촉각 센서 데이터
# /tactile_sensors 토픽 (커스텀)
header:
  stamp: 시간 정보
sensor_count: 45
finger_sensors:
  thumb:
    - position: {x: 0.01, y: 0.005, z: 0.0}
      pressure: 5.2
      contact: true
    - position: {x: 0.02, y: 0.005, z: 0.0}
      pressure: 4.8
      contact: true
  index:
    - pressure: 6.1
      contact: true
    # ... 각 센서별 데이터
total_force: 60.5
center_of_pressure: {x: 0.012, y: 0.008, z: 0.0}
contact_points: 23
2.4 작업 상태 및 명령 이력
# /task_status 토픽 (커스텀)
header:
  stamp: 시간 정보
current_task: "grasp_object"
task_phase: "approach"  # approach, grasp, lift, move, place, release
progress: 0.65  # 0.0 ~ 1.0
target_object:
  type: "cylinder"
  estimated_size: {length: 0.15, diameter: 0.05}
  estimated_weight: 0.5
  material: "unknown"
command_history:
  - timestamp: 시간
    command: "move_to_position"
    parameters: {x: 0.5, y: 0.2, z: 0.8}
    status: "completed"
  - timestamp: 시간
    command: "close_gripper"
    parameters: {force: 20.0}
    status: "executing"
2.5 시스템 리소스 모니터링
# /system_monitor 토픽 (커스텀)
header:
  stamp: 시간 정보
cpu_usage: 0.85  # 0.0 ~ 1.0
memory_usage: 0.67
network_latency: 0.015  # seconds
packet_loss: 0.001  # 0.0 ~ 1.0
battery_voltage: 12.4  # V
battery_current: 2.1   # A
battery_percentage: 0.87
temperature_sensors:
  - location: "joint_1_motor"
    temperature: 42.5  # Celsius
  - location: "joint_2_motor"
    temperature: 38.2
  - location: "cpu"
    temperature: 55.1
2.6 에러 및 이벤트 로그
# /manipulation_events 토픽 (커스텀)
header:
  stamp: 시간 정보
event_type: "error"  # info, warning, error, critical
component: "arm_controller"  # arm, gripper, hand, system, task
event_code: "JOINT_LIMIT_EXCEEDED"
message: "Joint 3 position limit exceeded: target=180°, limit=175°"
severity: 2  # 1=low, 2=medium, 3=high, 4=critical
context:
  joint_name: "joint_3"
  current_position: 3.05  # rad
  target_position: 3.14
  limit_position: 3.05
recovery_action: "stop_motion"
2.7 성능 지표 데이터
# /performance_metrics 토픽 (커스텀)
header:
  stamp: 시간 정보
joint_accuracy:
  - joint_name: "joint_1"
    rms_error: 0.002  # rad
    max_error: 0.005
  - joint_name: "joint_2"
    rms_error: 0.008
    max_error: 0.015
command_response_times:
  - command_type: "move_joints"
    avg_response_time: 0.15  # seconds
    min_response_time: 0.12
    max_response_time: 0.23
grasp_success_rate: 0.95  # 0.0 ~ 1.0
power_consumption: 145.0  # Watts
efficiency_score: 0.89
2.8 캘리브레이션 및 설정 정보
# /robot_configuration 토픽 (커스텀)
header:
  stamp: 시간 정보
robot_id: "MR-001"
robot_model: "Manipulation Bot v2.1"
arm_config:
  dof: 6
  joint_limits:
    - name: "joint_1"
      min_position: -3.14
      max_position: 3.14
      max_velocity: 2.0
      max_effort: 50.0
gripper_config:
  type: "parallel_jaw"
  max_opening: 0.05  # m
  max_force: 100.0   # N
  finger_count: 2
hand_config:
  type: "5_finger_anthropomorphic"
  dof: 15
  tactile_sensor_count: 45
  last_calibration: "2024-03-15T09:30:00Z"
3. 로그 파일 구조 (ROS Bag)
3.1 필수 토픽 목록
# 표준 ROS 토픽
/joint_states                    # Joint 상태
/tf                             # 변환 정보
/diagnostics                    # 진단 정보
/rosout                         # 시스템 로그
/arm_controller/command         # 제어 명령
/arm_controller/state           # 컨트롤러 상태
 
# 커스텀 토픽
/gripper_state                  # 그리퍼 상태
/hand_state                     # 핸드 상태 (다관절 핸드인 경우)
/tactile_sensors               # 촉각 센서
/task_status                   # 작업 상태
/system_monitor                # 시스템 모니터링
/manipulation_events           # 이벤트 로그
/performance_metrics           # 성능 지표
/robot_configuration           # 로봇 설정
3.2 로그 메타데이터
# bag 파일 메타데이터
bag_info:
  start_time: "2024-03-20T14:20:00Z"
  end_time: "2024-03-20T14:40:00Z"
  duration: 1200.0  # seconds
  message_count: 125000
  robot_id: "MR-001"
  session_id: "session_20240320_142000"
  operator: "user123"
  task_description: "Pick and place operation"
  environment: "laboratory"
4. 구현 우선순위
Phase 1 (필수)
Joint States (표준)
그리퍼 상태 (커스텀)
시스템 로그 (표준)
작업 이벤트 (커스텀)
Phase 2 (중요)
다관절 핸드 상태 (커스텀)
시스템 모니터링 (커스텀)
성능 지표 (커스텀)
Phase 3 (고급)
촉각 센서 (커스텀)
상세 진단 정보 (커스텀)
캘리브레이션 정보 (커스텀)
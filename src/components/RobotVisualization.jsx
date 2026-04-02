/**
 * RobotVisualization — Three.js 기반 6-DOF 로봇 팔 3D 시각화
 *
 * 구조 (Forward Kinematics):
 *   Base → J1(Y) → Link1 → J2(X) → Link2 → J3(X)
 *       → Link3 → J4(Y) → Link4 → J5(X) → Link5 → J6(Y) → Gripper
 *
 * 조작:
 *   마우스 좌버튼 드래그 — 회전
 *   마우스 우버튼 드래그 — 패닝
 *   스크롤              — 줌
 */

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, Html, Environment } from '@react-three/drei'
import * as THREE from 'three'
import styled from 'styled-components'
import { theme } from '../styles/theme'

// ── styled wrappers ───────────────────────────────────────────────────────────

const Container = styled.div`
  width: 100%;
  height: 100%;
  background: #0B1929;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
`

const Overlay = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  pointer-events: none;
`

const JointBadge = styled.div`
  background: rgba(10, 22, 40, 0.88);
  border: 1px solid ${p =>
    p.error ? theme.colors.statusError :
    p.warn  ? theme.colors.statusWarn  :
    'rgba(44,158,158,0.45)'};
  border-radius: 4px;
  padding: 2px 7px;
  font-size: 10px;
  font-family: 'Consolas', monospace;
  color: ${p =>
    p.error ? theme.colors.statusError :
    p.warn  ? theme.colors.statusWarn  :
    'rgba(255,255,255,0.78)'};
`

const Hint = styled.div`
  position: absolute;
  bottom: 8px;
  right: 8px;
  font-size: 10px;
  color: rgba(255,255,255,0.28);
  text-align: right;
  line-height: 1.6;
  pointer-events: none;
`

const EEInfo = styled.div`
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(10,22,40,0.85);
  border: 1px solid rgba(44,158,158,0.3);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 10px;
  color: rgba(255,255,255,0.7);
  line-height: 1.7;
  pointer-events: none;
  font-family: 'Consolas', monospace;
`

// ── constants ─────────────────────────────────────────────────────────────────

const D2R = Math.PI / 180

// Link lengths (Three.js units ≈ meters)
const L = {
  base:     0.20,   // base cylinder height
  link1:    0.38,   // shoulder → elbow (upper arm)
  link2:    0.36,   // elbow → wrist  (forearm)
  link3:    0.14,   // wrist1
  link4:    0.12,   // wrist2
  link5:    0.10,   // wrist3 / EE offset
}

// Radii
const R = {
  base:   0.08,
  link1:  0.045,
  link2:  0.038,
  link3:  0.030,
  link4:  0.025,
  link5:  0.020,
  joint:  0.055,
}

// Colors
const C = {
  normal:  '#2C9E9E',
  warn:    '#F39C12',
  error:   '#E74C3C',
  gripper: '#4CD9C0',
  base:    '#1A3A4A',
  floor:   '#0D2030',
}

// ── material helpers ──────────────────────────────────────────────────────────

function linkColor(temp, isError) {
  if (isError || temp > 57) return C.error
  if (temp > 44)            return C.warn
  return C.normal
}

function useMat(color, emissiveIntensity = 0.15) {
  return useMemo(() => new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity,
    roughness: 0.35,
    metalness: 0.6,
  }), [color, emissiveIntensity])
}

// ── sub-components ────────────────────────────────────────────────────────────

/** A cylindrical link segment pointing along +Y */
function Link({ length, radius, color, children }) {
  const mat = useMat(color)
  return (
    <group>
      {/* shift cylinder so its bottom is at origin */}
      <mesh position={[0, length / 2, 0]} material={mat} castShadow>
        <cylinderGeometry args={[radius, radius * 1.1, length, 16]} />
      </mesh>
      {/* children sit at the top of this link */}
      <group position={[0, length, 0]}>
        {children}
      </group>
    </group>
  )
}

/** Joint sphere */
function JointSphere({ radius, color, label }) {
  const mat = useMat(color, 0.25)
  return (
    <group>
      <mesh material={mat} castShadow>
        <sphereGeometry args={[radius, 20, 20]} />
      </mesh>
    </group>
  )
}

/** Parallel-jaw gripper */
function Gripper({ openMm = 15, color = C.gripper }) {
  const open = Math.max(2, Math.min(50, openMm)) / 1000  // mm → m, clamped
  const mat = useMat(color, 0.2)
  const fingerW  = 0.018
  const fingerH  = 0.06
  const fingerD  = 0.012
  return (
    <group>
      {/* palm */}
      <mesh position={[0, 0.025, 0]} material={mat} castShadow>
        <boxGeometry args={[0.06, 0.05, 0.03]} />
      </mesh>
      {/* finger 1 */}
      <mesh position={[ open / 2 + fingerW / 2, 0.065, 0]} material={mat} castShadow>
        <boxGeometry args={[fingerW, fingerH, fingerD]} />
      </mesh>
      {/* finger 2 */}
      <mesh position={[-open / 2 - fingerW / 2, 0.065, 0]} material={mat} castShadow>
        <boxGeometry args={[fingerW, fingerH, fingerD]} />
      </mesh>
    </group>
  )
}

/** The full 6-DOF robot arm using FK */
function RobotArm({ angles, temps, gripperOpenMm, isGrasping }) {
  const [j1, j2, j3, j4, j5, j6] = angles.map(a => a * D2R)

  const t = temps
  const c1 = linkColor(t[0], false)
  const c2 = linkColor(t[1], false)
  const c3 = linkColor(t[2], t[2] > 57)
  const c4 = linkColor(t[3], false)
  const c5 = linkColor(t[4], false)
  const c6 = linkColor(t[5], false)

  const baseMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: C.base, roughness: 0.5, metalness: 0.7,
  }), [])

  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: C.floor, roughness: 0.9, metalness: 0.1,
  }), [])

  return (
    <group>
      {/* Floor disc */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]} receiveShadow material={floorMat}>
        <circleGeometry args={[0.5, 48]} />
      </mesh>

      {/* Base cylinder */}
      <mesh position={[0, L.base / 2, 0]} material={baseMat} castShadow receiveShadow>
        <cylinderGeometry args={[R.base, R.base * 1.2, L.base, 24]} />
      </mesh>

      {/* J1 — base yaw (Y-axis) */}
      <group position={[0, L.base, 0]} rotation-y={j1}>
        <JointSphere radius={R.joint} color={c1} />

        {/* Link 1 (upper arm) */}
        <group rotation-x={-Math.PI / 2}>   {/* rotate link to go forward (Z→Y) */}
          <Link length={L.link1} radius={R.link1} color={c1}>

            {/* J2 — shoulder pitch (X-axis) */}
            <group rotation-x={j2}>
              <JointSphere radius={R.joint * 0.9} color={c2} />

              <Link length={L.link2} radius={R.link2} color={c2}>

                {/* J3 — elbow pitch (X-axis) */}
                <group rotation-x={j3}>
                  <JointSphere radius={R.joint * 0.8} color={c3} />

                  <Link length={L.link3} radius={R.link3} color={c3}>

                    {/* J4 — wrist roll (Y-axis) */}
                    <group rotation-y={j4}>
                      <JointSphere radius={R.joint * 0.65} color={c4} />

                      <Link length={L.link4} radius={R.link4} color={c4}>

                        {/* J5 — wrist pitch (X-axis) */}
                        <group rotation-x={j5}>
                          <JointSphere radius={R.joint * 0.55} color={c5} />

                          <Link length={L.link5} radius={R.link5} color={c5}>

                            {/* J6 — wrist yaw (Y-axis) */}
                            <group rotation-y={j6}>
                              <JointSphere radius={R.joint * 0.45} color={c6} />
                              <group position={[0, 0.01, 0]}>
                                <Gripper
                                  openMm={gripperOpenMm}
                                  color={isGrasping ? '#27AE60' : C.gripper}
                                />
                              </group>
                            </group>

                          </Link>
                        </group>
                      </Link>
                    </group>
                  </Link>
                </group>
              </Link>
            </group>

          </Link>
        </group>
      </group>
    </group>
  )
}

/** Scene lighting & environment */
function Lights() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[3, 5, 3]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.1}
        shadow-camera-far={20}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
      />
      <pointLight position={[-2, 3, -2]} intensity={0.4} color="#4CD9C0" />
      <pointLight position={[2, 1, 2]} intensity={0.2} color="#2C9E9E" />
    </>
  )
}

// ── main export ───────────────────────────────────────────────────────────────

const DEFAULT_ANGLES = [0, -20, 60, 0, -40, 0]
const DEFAULT_TEMPS  = [38, 38, 38, 38, 38, 38]

export default function RobotVisualization({ data }) {
  const angles = data ? [
    data.j1_pos ?? 0, data.j2_pos ?? 0, data.j3_pos ?? 0,
    data.j4_pos ?? 0, data.j5_pos ?? 0, data.j6_pos ?? 0,
  ] : DEFAULT_ANGLES

  const temps = data ? [
    data.j1_temp ?? 38, data.j2_temp ?? 38, data.j3_temp ?? 38,
    data.j4_temp ?? 38, data.j5_temp ?? 38, data.j6_temp ?? 38,
  ] : DEFAULT_TEMPS

  const gripperOpenMm = data?.gripper_pos ?? 20
  const isGrasping    = data?.is_grasping ?? false

  const torques = data ? [
    data.j1_torque, data.j2_torque, data.j3_torque,
    data.j4_torque, data.j5_torque, data.j6_torque,
  ] : [0,0,0,0,0,0]

  return (
    <Container>
      <Canvas
        shadows
        camera={{ position: [1.8, 1.4, 1.8], fov: 45, near: 0.01, far: 50 }}
        gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping }}
        style={{ background: 'transparent' }}
      >
        <color attach="background" args={['#0B1929']} />
        <fog attach="fog" args={['#0B1929', 6, 20]} />

        <Lights />

        <RobotArm
          angles={angles}
          temps={temps}
          gripperOpenMm={gripperOpenMm}
          isGrasping={isGrasping}
        />

        {/* Floor grid */}
        <Grid
          position={[0, -0.002, 0]}
          args={[4, 4]}
          cellSize={0.1}
          cellThickness={0.5}
          cellColor="#1A3A4A"
          sectionSize={0.5}
          sectionThickness={1}
          sectionColor="#2C5566"
          fadeDistance={5}
          fadeStrength={1}
          infiniteGrid={false}
        />

        <OrbitControls
          makeDefault
          enablePan
          enableZoom
          enableRotate
          minDistance={0.5}
          maxDistance={6}
          minPolarAngle={0}
          maxPolarAngle={Math.PI * 0.85}
          target={[0, 0.6, 0]}
          dampingFactor={0.08}
          enableDamping
        />
      </Canvas>

      {/* Joint status overlay */}
      <Overlay>
        {['J1','J2','J3','J4','J5','J6'].map((j, i) => {
          const isError = j === 'J3' && temps[2] > 55
          const isWarn  = (j === 'J2' && (torques[1] ?? 0) > 2.2) ||
                          (j === 'J3' && temps[2] > 44 && temps[2] <= 55)
          return (
            <JointBadge key={j} error={isError} warn={isWarn}>
              {isError ? '🔴' : isWarn ? '🟡' : '🟢'}&nbsp;
              {j}: {angles[i]?.toFixed(1)}°&nbsp;|&nbsp;{torques[i]?.toFixed(2) ?? '—'}Nm
            </JointBadge>
          )
        })}
      </Overlay>

      {/* EE info */}
      {data && (
        <EEInfo>
          Gripper: {gripperOpenMm.toFixed(1)}mm
          &nbsp;{isGrasping ? '🟢 Grasping' : '⬜ Open'}<br />
          Temp J3: {temps[2]?.toFixed(1)}°C
          {temps[2] > 55 ? ' 🔴' : temps[2] > 44 ? ' 🟡' : ' 🟢'}
        </EEInfo>
      )}

      <Hint>
        🖱 드래그: 회전&nbsp;&nbsp;우클릭: 패닝<br />
        스크롤: 줌인/아웃
      </Hint>
    </Container>
  )
}

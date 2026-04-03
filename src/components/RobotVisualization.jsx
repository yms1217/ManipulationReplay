/**
 * RobotVisualization — Wheeled Humanoid Dual-Arm 3D
 *
 * Robot structure:
 *   Mobile base (differential drive, 2 large wheels)
 *   Torso (body + chest panel)
 *   Head (sensor cluster)
 *   Left Arm  (6-DOF FK, EE: hand or gripper)
 *   Right Arm (6-DOF FK, EE: hand or gripper)
 *
 * Camera controls:
 *   Left-drag — orbit   Right-drag — pan   Scroll — zoom
 */

import { useRef, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
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
  gap: 2px;
  pointer-events: none;
`

const ArmPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const ArmLabel = styled.div`
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: ${p => p.side === 'left' ? '#4CD9C0' : '#9B8CFF'};
  font-family: 'Consolas', monospace;
  text-transform: uppercase;
  margin-bottom: 1px;
`

const JointBadge = styled.div`
  background: rgba(10, 22, 40, 0.88);
  border: 1px solid ${p =>
    p.error ? theme.colors.statusError :
    p.warn  ? theme.colors.statusWarn  :
    p.side === 'right' ? 'rgba(155,140,255,0.45)' :
    'rgba(44,158,158,0.45)'};
  border-radius: 3px;
  padding: 1px 6px;
  font-size: 9px;
  font-family: 'Consolas', monospace;
  color: ${p =>
    p.error ? theme.colors.statusError :
    p.warn  ? theme.colors.statusWarn  :
    'rgba(255,255,255,0.75)'};
`

const Hint = styled.div`
  position: absolute;
  bottom: 8px;
  right: 8px;
  font-size: 9px;
  color: rgba(255,255,255,0.25);
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
  font-size: 9px;
  color: rgba(255,255,255,0.65);
  line-height: 1.7;
  pointer-events: none;
  font-family: 'Consolas', monospace;
`

// ── constants ─────────────────────────────────────────────────────────────────

const D2R = Math.PI / 180

const L = {
  link1: 0.34,
  link2: 0.32,
  link3: 0.12,
  link4: 0.10,
  link5: 0.08,
}

const R = {
  link1:  0.040,
  link2:  0.034,
  link3:  0.026,
  link4:  0.022,
  link5:  0.018,
  joint:  0.048,
}

const C = {
  left:    '#2C9E9E',
  right:   '#7B68EE',
  warn:    '#F39C12',
  error:   '#E74C3C',
  gripper: '#4CD9C0',
  hand:    '#A688FA',
  base:    '#1A3A4A',
  torso:   '#162F45',
  wheel:   '#0F2233',
  floor:   '#0D2030',
  head:    '#1E4A6A',
}

// ── material helpers ──────────────────────────────────────────────────────────

function jColor(temp, isError, side) {
  if (isError || temp > 57) return C.error
  if (temp > 44)            return C.warn
  return side === 'right' ? C.right : C.left
}

function useMat(color, emissiveIntensity = 0.15) {
  return useMemo(() => new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity, roughness: 0.35, metalness: 0.6,
  }), [color, emissiveIntensity])
}

function useFlatMat(color) {
  return useMemo(() => new THREE.MeshStandardMaterial({
    color, roughness: 0.6, metalness: 0.4,
  }), [color])
}

// ── sub-components ────────────────────────────────────────────────────────────

function Link({ length, radius, color, children }) {
  const mat = useMat(color)
  return (
    <group>
      <mesh position={[0, length / 2, 0]} material={mat} castShadow>
        <cylinderGeometry args={[radius, radius * 1.08, length, 14]} />
      </mesh>
      <group position={[0, length, 0]}>{children}</group>
    </group>
  )
}

function JointSphere({ radius, color }) {
  const mat = useMat(color, 0.22)
  return (
    <mesh material={mat} castShadow>
      <sphereGeometry args={[radius, 16, 16]} />
    </mesh>
  )
}

function ParallelGripper({ openMm = 15, color = C.gripper }) {
  const open = Math.max(2, Math.min(50, openMm)) / 1000
  const mat  = useMat(color, 0.18)
  return (
    <group>
      <mesh position={[0, 0.022, 0]} material={mat} castShadow>
        <boxGeometry args={[0.052, 0.044, 0.026]} />
      </mesh>
      <mesh position={[ open / 2 + 0.009, 0.056, 0]} material={mat} castShadow>
        <boxGeometry args={[0.016, 0.052, 0.010]} />
      </mesh>
      <mesh position={[-open / 2 - 0.009, 0.056, 0]} material={mat} castShadow>
        <boxGeometry args={[0.016, 0.052, 0.010]} />
      </mesh>
    </group>
  )
}

function FiveFingerHand({ stability = 85, color = C.hand }) {
  const mat  = useMat(color, 0.18)
  const curl = Math.max(0, Math.min(1, (100 - stability) / 60))  // open=0, closed=1
  const fingerLen = 0.05
  return (
    <group>
      {/* palm */}
      <mesh position={[0, 0.028, 0]} material={mat} castShadow>
        <boxGeometry args={[0.060, 0.050, 0.018]} />
      </mesh>
      {/* 4 fingers */}
      {[-0.020, -0.006, 0.006, 0.020].map((x, i) => (
        <group key={i} position={[x, 0.055, 0]} rotation-z={curl * 0.6 * (i % 2 === 0 ? 1 : -1) * 0.3}>
          <mesh position={[0, fingerLen / 2, 0]} material={mat} castShadow>
            <cylinderGeometry args={[0.005, 0.006, fingerLen, 8]} />
          </mesh>
        </group>
      ))}
      {/* thumb */}
      <group position={[-0.034, 0.035, 0]} rotation-z={Math.PI * 0.3 + curl * 0.4}>
        <mesh position={[0, 0.022, 0]} material={mat} castShadow>
          <cylinderGeometry args={[0.006, 0.007, 0.044, 8]} />
        </mesh>
      </group>
    </group>
  )
}

/** 6-DOF arm with FK, side = 'left' | 'right' */
function Arm({ angles = [0,0,0,0,0,0], temps = [38,38,38,38,38,38], side = 'left', eeType = 'gripper', eeMm = 15, eeStability = 85, isGrasping = false }) {
  const [j1, j2, j3, j4, j5, j6] = angles.map(a => a * D2R)
  const t = temps
  const mirror = side === 'right' ? -1 : 1  // mirror J1 yaw for right arm

  const c = (i, isErr) => jColor(t[i], isErr, side)
  const c1 = c(0, false)
  const c2 = c(1, false)
  const c3 = c(2, t[2] > 57)
  const c4 = c(3, false)
  const c5 = c(4, false)
  const c6 = c(5, false)

  const eeColor = isGrasping ? '#27AE60' : (eeType === 'hand' ? C.hand : C.gripper)

  return (
    <group>
      {/* J1 — shoulder yaw (Y) */}
      <group rotation-y={j1 * mirror}>
        <JointSphere radius={R.joint} color={c1} />
        {/* link1 goes forward (rotate -X to align Y→Z) */}
        <group rotation-x={-Math.PI / 2}>
          <Link length={L.link1} radius={R.link1} color={c1}>

            {/* J2 — shoulder pitch (X) */}
            <group rotation-x={j2}>
              <JointSphere radius={R.joint * 0.88} color={c2} />
              <Link length={L.link2} radius={R.link2} color={c2}>

                {/* J3 — elbow pitch (X) */}
                <group rotation-x={j3}>
                  <JointSphere radius={R.joint * 0.78} color={c3} />
                  <Link length={L.link3} radius={R.link3} color={c3}>

                    {/* J4 — wrist roll (Y) */}
                    <group rotation-y={j4 * mirror}>
                      <JointSphere radius={R.joint * 0.64} color={c4} />
                      <Link length={L.link4} radius={R.link4} color={c4}>

                        {/* J5 — wrist pitch (X) */}
                        <group rotation-x={j5}>
                          <JointSphere radius={R.joint * 0.54} color={c5} />
                          <Link length={L.link5} radius={R.link5} color={c5}>

                            {/* J6 — wrist yaw (Y) */}
                            <group rotation-y={j6 * mirror}>
                              <JointSphere radius={R.joint * 0.44} color={c6} />
                              <group position={[0, 0.008, 0]}>
                                {eeType === 'hand'
                                  ? <FiveFingerHand stability={eeStability} color={eeColor} />
                                  : <ParallelGripper openMm={eeMm} color={eeColor} />
                                }
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

/** Mobile base: flat platform + 2 drive wheels + 2 caster wheels */
function WheelBase() {
  const platMat  = useFlatMat(C.base)
  const wheelMat = useFlatMat(C.wheel)

  return (
    <group>
      {/* Platform disc */}
      <mesh position={[0, 0.14, 0]} material={platMat} castShadow receiveShadow>
        <cylinderGeometry args={[0.34, 0.36, 0.06, 32]} />
      </mesh>
      {/* Drive wheel L */}
      <mesh position={[-0.36, 0.14, 0]} rotation-z={Math.PI / 2} material={wheelMat} castShadow>
        <cylinderGeometry args={[0.14, 0.14, 0.06, 24]} />
      </mesh>
      {/* Drive wheel R */}
      <mesh position={[ 0.36, 0.14, 0]} rotation-z={Math.PI / 2} material={wheelMat} castShadow>
        <cylinderGeometry args={[0.14, 0.14, 0.06, 24]} />
      </mesh>
      {/* Caster front */}
      <mesh position={[0, 0.05, 0.28]} material={wheelMat} castShadow>
        <sphereGeometry args={[0.05, 12, 12]} />
      </mesh>
      {/* Caster rear */}
      <mesh position={[0, 0.05, -0.28]} material={wheelMat} castShadow>
        <sphereGeometry args={[0.05, 12, 12]} />
      </mesh>
    </group>
  )
}

/** Humanoid torso */
function Torso() {
  const bodyMat  = useFlatMat(C.torso)
  const chestMat = useMat(C.left, 0.08)

  return (
    <group>
      {/* Lower torso / waist */}
      <mesh position={[0, 0.38, 0]} material={bodyMat} castShadow>
        <cylinderGeometry args={[0.14, 0.20, 0.18, 20]} />
      </mesh>
      {/* Upper torso / chest */}
      <mesh position={[0, 0.60, 0]} material={bodyMat} castShadow>
        <boxGeometry args={[0.40, 0.28, 0.22]} />
      </mesh>
      {/* Chest panel glow */}
      <mesh position={[0, 0.60, 0.115]} material={chestMat} castShadow>
        <boxGeometry args={[0.18, 0.12, 0.004]} />
      </mesh>
      {/* Shoulder yoke */}
      <mesh position={[0, 0.76, 0]} material={bodyMat} castShadow>
        <boxGeometry args={[0.52, 0.08, 0.20]} />
      </mesh>
    </group>
  )
}

/** Head with camera / sensor indicator */
function Head() {
  const headMat   = useFlatMat(C.head)
  const sensorMat = useMat('#4CD9C0', 0.35)

  return (
    <group position={[0, 0.88, 0]}>
      {/* Neck */}
      <mesh position={[0, 0.06, 0]} material={headMat} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 0.12, 16]} />
      </mesh>
      {/* Head sphere */}
      <mesh position={[0, 0.18, 0]} material={headMat} castShadow>
        <sphereGeometry args={[0.10, 20, 20]} />
      </mesh>
      {/* Camera / sensor eye */}
      <mesh position={[0, 0.18, 0.095]} material={sensorMat} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 0.012, 12]} />
      </mesh>
    </group>
  )
}

/** Lights */
function Lights() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[3, 6, 4]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.1}
        shadow-camera-far={20}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={4}
        shadow-camera-bottom={-1}
      />
      <pointLight position={[-2, 3, -2]} intensity={0.3} color="#4CD9C0" />
      <pointLight position={[ 2, 2,  2]} intensity={0.2} color="#7B68EE" />
    </>
  )
}

/** Full wheeled humanoid */
function WheelHumanoid({ laAngles, raAngles, laTemps, raTemps, laEeType, raEeType, laEeMm, raEeMm, laStability, raStability, laGrasping, raGrasping }) {
  return (
    <group>
      <WheelBase />
      <Torso />
      <Head />

      {/* Left Arm — shoulder at (-0.30, 0.78, 0), arm extends left (−X) */}
      <group position={[-0.30, 0.78, 0]}>
        {/* rotate so arm extends in -X direction */}
        <group rotation-z={Math.PI / 2}>
          <Arm
            angles={laAngles}
            temps={laTemps}
            side="left"
            eeType={laEeType}
            eeMm={laEeMm}
            eeStability={laStability}
            isGrasping={laGrasping}
          />
        </group>
      </group>

      {/* Right Arm — shoulder at (+0.30, 0.78, 0), arm extends right (+X) */}
      <group position={[0.30, 0.78, 0]}>
        <group rotation-z={-Math.PI / 2}>
          <Arm
            angles={raAngles}
            temps={raTemps}
            side="right"
            eeType={raEeType}
            eeMm={raEeMm}
            eeStability={raStability}
            isGrasping={raGrasping}
          />
        </group>
      </group>
    </group>
  )
}

// ── defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_LA_ANGLES = [0, -20, 60, 0, -40, 0]
const DEFAULT_RA_ANGLES = [0, -20, 60, 0, -40, 0]
const DEFAULT_TEMPS     = [38, 38, 38, 38, 38, 38]

// ── main export ───────────────────────────────────────────────────────────────

export default function RobotVisualization({ data, config }) {
  const laAngles = data ? [
    data.la_j1_pos ?? 0, data.la_j2_pos ?? 0, data.la_j3_pos ?? 0,
    data.la_j4_pos ?? 0, data.la_j5_pos ?? 0, data.la_j6_pos ?? 0,
  ] : DEFAULT_LA_ANGLES

  const raAngles = data ? [
    data.ra_j1_pos ?? 0, data.ra_j2_pos ?? 0, data.ra_j3_pos ?? 0,
    data.ra_j4_pos ?? 0, data.ra_j5_pos ?? 0, data.ra_j6_pos ?? 0,
  ] : DEFAULT_RA_ANGLES

  const laTemps = data ? [
    data.la_j1_temp ?? 38, data.la_j2_temp ?? 38, data.la_j3_temp ?? 38,
    data.la_j4_temp ?? 38, data.la_j5_temp ?? 38, data.la_j6_temp ?? 38,
  ] : DEFAULT_TEMPS

  const raTemps = data ? [
    data.ra_j1_temp ?? 38, data.ra_j2_temp ?? 38, data.ra_j3_temp ?? 38,
    data.ra_j4_temp ?? 38, data.ra_j5_temp ?? 38, data.ra_j6_temp ?? 38,
  ] : DEFAULT_TEMPS

  const laEeType    = data?.la_ee_type    ?? config?.leftArm?.eeType  ?? 'hand'
  const raEeType    = data?.ra_ee_type    ?? config?.rightArm?.eeType ?? 'gripper'
  const laEeMm      = data?.la_gripper_pos  ?? 20
  const raEeMm      = data?.ra_gripper_pos  ?? 20
  const laStability = data?.la_hand_stability ?? 85
  const raStability = data?.ra_hand_stability ?? 85
  const laGrasping  = data?.la_is_grasping ?? false
  const raGrasping  = data?.ra_is_grasping ?? false

  const laTorques = data ? [
    data.la_j1_torque, data.la_j2_torque, data.la_j3_torque,
    data.la_j4_torque, data.la_j5_torque, data.la_j6_torque,
  ] : [0,0,0,0,0,0]

  const raTorques = data ? [
    data.ra_j1_torque, data.ra_j2_torque, data.ra_j3_torque,
    data.ra_j4_torque, data.ra_j5_torque, data.ra_j6_torque,
  ] : [0,0,0,0,0,0]

  function jointStatus(temp, torque, isError) {
    if (isError || temp > 57) return 'error'
    if (temp > 44 || torque > 2.4) return 'warn'
    return 'ok'
  }

  const laJoints = laAngles.map((ang, i) => ({
    name: `J${i+1}`, ang, torque: laTorques[i], temp: laTemps[i],
    status: jointStatus(laTemps[i], laTorques[i], i === 2 && laTemps[2] > 57),
  }))
  const raJoints = raAngles.map((ang, i) => ({
    name: `J${i+1}`, ang, torque: raTorques[i], temp: raTemps[i],
    status: jointStatus(raTemps[i], raTorques[i], false),
  }))

  return (
    <Container>
      <Canvas
        shadows
        camera={{ position: [2.2, 1.8, 2.2], fov: 42, near: 0.01, far: 50 }}
        gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping }}
        style={{ background: 'transparent' }}
      >
        <color attach="background" args={['#0B1929']} />
        <fog attach="fog" args={['#0B1929', 7, 22]} />

        <Lights />

        <WheelHumanoid
          laAngles={laAngles} raAngles={raAngles}
          laTemps={laTemps}   raTemps={raTemps}
          laEeType={laEeType} raEeType={raEeType}
          laEeMm={laEeMm}     raEeMm={raEeMm}
          laStability={laStability} raStability={raStability}
          laGrasping={laGrasping}   raGrasping={raGrasping}
        />

        <Grid
          position={[0, -0.001, 0]}
          args={[5, 5]}
          cellSize={0.1}
          cellThickness={0.5}
          cellColor="#1A3A4A"
          sectionSize={0.5}
          sectionThickness={1}
          sectionColor="#2C5566"
          fadeDistance={6}
          fadeStrength={1}
          infiniteGrid={false}
        />

        <OrbitControls
          makeDefault
          enablePan enableZoom enableRotate
          minDistance={0.8}
          maxDistance={7}
          minPolarAngle={0}
          maxPolarAngle={Math.PI * 0.82}
          target={[0, 0.7, 0]}
          dampingFactor={0.08}
          enableDamping
        />
      </Canvas>

      {/* Left arm overlay */}
      <Overlay>
        <ArmPanel>
          <ArmLabel side="left">◀ Left Arm [{laEeType === 'hand' ? 'Hand' : 'Grip'}]</ArmLabel>
          {laJoints.map(j => (
            <JointBadge key={j.name} side="left" error={j.status === 'error'} warn={j.status === 'warn'}>
              {j.status === 'error' ? '🔴' : j.status === 'warn' ? '🟡' : '🟢'}&nbsp;
              {j.name}: {j.ang?.toFixed(1)}°&nbsp;|&nbsp;{j.torque?.toFixed(2) ?? '—'}Nm
            </JointBadge>
          ))}
        </ArmPanel>

        <div style={{ height: '6px' }} />

        <ArmPanel>
          <ArmLabel side="right">Right Arm [{raEeType === 'hand' ? 'Hand' : 'Grip'}] ▶</ArmLabel>
          {raJoints.map(j => (
            <JointBadge key={j.name} side="right" error={j.status === 'error'} warn={j.status === 'warn'}>
              {j.status === 'error' ? '🔴' : j.status === 'warn' ? '🟡' : '🟢'}&nbsp;
              {j.name}: {j.ang?.toFixed(1)}°&nbsp;|&nbsp;{j.torque?.toFixed(2) ?? '—'}Nm
            </JointBadge>
          ))}
        </ArmPanel>
      </Overlay>

      {data && (
        <EEInfo>
          LA: {laEeType === 'hand'
            ? `Hand ${laGrasping ? '🤜 Grasping' : '✋ Open'} · ${laStability?.toFixed(0)}% stable`
            : `Grip ${laGrasping ? '🟢 Grasping' : '⬜ Open'} · ${laEeMm?.toFixed(1)}mm`
          }<br />
          RA: {raEeType === 'hand'
            ? `Hand ${raGrasping ? '🤜 Grasping' : '✋ Open'} · ${raStability?.toFixed(0)}% stable`
            : `Grip ${raGrasping ? '🟢 Grasping' : '⬜ Open'} · ${raEeMm?.toFixed(1)}mm`
          }<br />
          Base: {data.base_vel_linear != null
            ? `${data.base_vel_linear?.toFixed(2)}m/s · hdg ${data.base_heading?.toFixed(0)}°`
            : '—'
          }
        </EEInfo>
      )}

      <Hint>
        드래그: 회전&nbsp;&nbsp;우클릭: 패닝<br />
        스크롤: 줌
      </Hint>
    </Container>
  )
}

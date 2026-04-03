/**
 * EndEffectorTab — 각 팔의 EE 타입에 따라 내용이 달라짐
 *   Parallel Jaw  : 파지 상태, 압력분포 히트맵, 시계열 차트, 경고
 *   5-Finger Hand : Finger Joint Matrix, 촉각센서 히트맵, 관절 각도 차트 + Hand Health, 제어 로그, 경고
 */

import styled from 'styled-components'
import { theme } from '../../styles/theme'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

// ── shared styles ─────────────────────────────────────────────────────────────

const Root = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  height: 100%;
  overflow: hidden;
`

const Col = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  overflow-x: hidden;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(44,158,158,0.3); border-radius: 2px; }
`

const Card = styled.div`
  background: ${theme.colors.surfaceAlt};
  border: 1px solid ${p =>
    p.side === 'left'  ? 'rgba(44,158,158,0.28)' :
    p.side === 'right' ? 'rgba(123,104,238,0.28)' :
    theme.colors.borderLight};
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
`

const Title = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${p => p.side === 'left' ? '#2C9E9E' : p.side === 'right' ? '#7B68EE' : theme.colors.textMuted};
  padding-bottom: 4px;
  border-bottom: 1px solid ${theme.colors.borderLight};
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
`

const EETag = styled.span`
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 10px;
  font-weight: 700;
  background: ${p => p.side === 'left' ? 'rgba(44,158,158,0.15)' : 'rgba(123,104,238,0.15)'};
  color: ${p => p.side === 'left' ? '#2C9E9E' : '#7B68EE'};
  border: 1px solid ${p => p.side === 'left' ? 'rgba(44,158,158,0.4)' : 'rgba(123,104,238,0.4)'};
`

const GaugeRow = styled.div`display: flex; align-items: center; gap: 6px; font-size: 10px;`
const GLabel   = styled.span`width: 84px; color: ${theme.colors.textSecondary}; flex-shrink: 0;`
const GBar     = styled.div`flex: 1; height: 5px; background: ${theme.colors.bgDark}; border-radius: 3px; overflow: hidden;`
const GFill    = styled.div`
  height: 100%; width: ${p => p.pct}%;
  background: ${p =>
    p.error ? theme.colors.statusError :
    p.warn  ? theme.colors.statusWarn  :
    p.side === 'right' ? '#7B68EE' : theme.colors.primary};
  border-radius: 3px; transition: width 0.3s;
`
const GVal = styled.span`
  min-width: 42px; text-align: right; font-size: 10px; font-weight: 600;
  color: ${p => p.error ? theme.colors.statusError : p.warn ? theme.colors.statusWarn : theme.colors.text};
`

const StatusBox = styled.div`
  padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;
  background: ${p => p.grasping ? 'rgba(39,174,96,0.12)' : theme.colors.bgDark};
  border: 1px solid ${p => p.grasping ? 'rgba(39,174,96,0.4)' : theme.colors.borderLight};
  color: ${p => p.grasping ? theme.colors.statusOk : theme.colors.textSecondary};
  flex-shrink: 0;
`

const HeatCell = styled.div`
  width: 13px; height: 13px; border-radius: 2px;
  background: ${p => {
    const v = p.val
    if (v < 0.25) return '#27AE60'
    if (v < 0.50) return '#F1C40F'
    if (v < 0.75) return '#E67E22'
    return '#E74C3C'
  }};
`

const AlertBox = styled.div`
  padding: 4px 7px; font-size: 10px;
  border-left: 2px solid ${p => p.error ? theme.colors.statusError : p.info ? theme.colors.statusInfo : theme.colors.statusWarn};
  background: ${p => p.error ? theme.colors.logError : p.info ? theme.colors.logInfo : theme.colors.logWarn};
  border-radius: 0 4px 4px 0;
  color: ${theme.colors.textSecondary};
  flex-shrink: 0;
`

const CmdItem = styled.div`
  font-size: 10px; font-family: 'Consolas', monospace;
  padding: 3px 5px; margin-bottom: 2px;
  background: ${p => p.error ? theme.colors.logError : p.warn ? theme.colors.logWarn : theme.colors.surface};
  border-left: 2px solid ${p => p.error ? theme.colors.statusError : p.warn ? theme.colors.statusWarn : theme.colors.borderLight};
  border-radius: 0 3px 3px 0;
  color: ${theme.colors.textSecondary};
`

const Matrix = styled.table`width: 100%; border-collapse: collapse; font-size: 10px;`
const Th = styled.th`
  color: ${theme.colors.textMuted}; text-align: center; padding: 2px 3px;
  border-bottom: 1px solid ${theme.colors.border}; font-weight: 600;
`
const Td = styled.td`
  text-align: center; padding: 2px 3px;
  color: ${p => p.warn ? theme.colors.statusWarn : p.error ? theme.colors.statusError : theme.colors.text};
  font-family: 'Consolas', monospace;
  border-bottom: 1px solid ${theme.colors.borderLight};
`

// ── static data ────────────────────────────────────────────────────────────────

const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']

const JOINT_ANGLES = [
  [45.2, 32.1, 28.5, 25.8, 22.3],
  [38.7, 45.6, 42.3, 40.1, 35.9],
  [25.1, 38.2, 35.7, 33.4, 30.8],
]
const TORQUES = [2.3, 1.8, 1.6, 1.4, 1.1]

const HEATMAP = [
  [0.3, 0.5, 0.7, 0.85, 0.9, 0.95, 1.0],
  [0.3, 0.6, 0.8, 0.90, 0.95, 1.0, 1.0],
  [0.2, 0.3, 0.4, 0.60, 0.7, 0.8, 0.9],
  [0.1, 0.2, 0.3, 0.40, 0.5, 0.6, 0.7],
  [0.1, 0.15,0.2, 0.30, 0.4, 0.5, 0.6],
]
const FINGER_FORCES = [15.2, 18.7, 12.3, 8.9, 5.4]

const HAND_CMDS = [
  { time: '14:23:10', msg: 'adaptive_grasp(type="cylinder", force=60N)', warn: false, error: false },
  { time: '14:23:12', msg: '✅ Grasp formation completed', warn: false, error: false },
  { time: '14:23:15', msg: '⚠️ Index finger torque limit approached', warn: true,  error: false },
  { time: '14:23:18', msg: 'adjust_grip(reduce_index_force=true)', warn: false, error: false },
  { time: '14:23:20', msg: '✅ Stable grasp — stability: 91%', warn: false, error: false },
]

const GRIP_CMDS = [
  { time: '14:22:18', msg: 'close(target_force=5.0N)', warn: false, error: false },
  { time: '14:22:20', msg: '✅ Grip stable — object 95% confidence', warn: false, error: false },
  { time: '14:24:12', msg: '❌ Pressure anomaly: finger 2', warn: false, error: true },
  { time: '14:24:18', msg: '⚠️ Recalibration in progress', warn: true, error: false },
  { time: '14:24:30', msg: '✅ Grip stable after adjustment (4.8N)', warn: false, error: false },
]

// ── Gripper panel ─────────────────────────────────────────────────────────────

function GripperPanel({ data, side, chartData }) {
  const pre     = side === 'left' ? 'la' : 'ra'
  const color   = side === 'left' ? '#2C9E9E' : '#7B68EE'
  const pos     = data[`${pre}_gripper_pos`]        ?? 15
  const force   = data[`${pre}_gripper_force`]      ?? 0
  const f1      = data[`${pre}_finger1_pressure`]   ?? 0
  const f2      = data[`${pre}_finger2_pressure`]   ?? 0
  const grasping = data[`${pre}_is_grasping`]       ?? false
  const f2warn  = f2 < 1.5
  const f2err   = f2 < 0.8

  // Heatmap: 8 pressure cells per finger, scaled from live data
  const f1cells = [0.2, 0.3, 0.4, 0.55, 0.65, 0.7, (f1 / 6), (f1 / 5)].map(v => Math.min(1, v))
  const f2cells = f2warn
    ? [0.2, 0.4, 0.6, 0.8, 0.9, 0.95, 0.98, 1.0]
    : [0.2, 0.3, 0.4, 0.5, (f2 / 6), (f2 / 5), (f2 / 4), (f2 / 3.5)].map(v => Math.min(1, v))

  return (
    <>
      {/* Grip state */}
      <Card side={side} style={{ flex: '0 0 auto' }}>
        <Title side={side}>
          파지 상태
          <EETag side={side}>🤏 Parallel Jaw</EETag>
        </Title>
        <StatusBox grasping={grasping}>
          {grasping ? '🟢 Grasping' : '⬜ Open'} &nbsp;·&nbsp; 개방: {pos.toFixed(1)}mm / 50mm
        </StatusBox>
        <GaugeRow>
          <GLabel>Grip Force</GLabel>
          <GBar><GFill pct={(force / 10) * 100} side={side} /></GBar>
          <GVal>{force.toFixed(2)}N</GVal>
        </GaugeRow>
        <GaugeRow>
          <GLabel>Finger 1 Press.</GLabel>
          <GBar><GFill pct={(f1 / 5) * 100} side={side} /></GBar>
          <GVal>{f1.toFixed(2)}N</GVal>
        </GaugeRow>
        <GaugeRow>
          <GLabel>Finger 2 Press.</GLabel>
          <GBar><GFill pct={(f2 / 5) * 100} error={f2err} warn={f2warn && !f2err} side={side} /></GBar>
          <GVal error={f2err} warn={f2warn && !f2err}>{f2.toFixed(2)}N</GVal>
        </GaugeRow>
        <div style={{ fontSize: '10px', color: theme.colors.textMuted }}>
          Object: 25mm × 15mm · Confidence: 95%
        </div>
      </Card>

      {/* Pressure heatmap */}
      <Card side={side} style={{ flex: '0 0 auto' }}>
        <Title side={side}>압력 분포 히트맵</Title>
        <div style={{ fontSize: '10px', color: theme.colors.textMuted, marginBottom: '2px' }}>
          Finger 1 — Normal
        </div>
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
          {f1cells.map((v, i) => <HeatCell key={i} val={v} />)}
          <span style={{ marginLeft: '4px', fontSize: '10px', color: theme.colors.textMuted }}>{f1.toFixed(1)}N</span>
        </div>
        <div style={{ fontSize: '10px', color: f2warn ? theme.colors.statusError : theme.colors.textMuted, marginTop: '4px', marginBottom: '2px' }}>
          Finger 2 — {f2warn ? '⚠️ 압력 불균형' : 'Normal'}
        </div>
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
          {f2cells.map((v, i) => <HeatCell key={i} val={v} />)}
          <span style={{ marginLeft: '4px', fontSize: '10px', color: f2warn ? theme.colors.statusError : theme.colors.textMuted }}>{f2.toFixed(1)}N</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', fontSize: '9px', marginTop: '4px' }}>
          {[['Low','#27AE60'],['Mid','#F1C40F'],['High','#E67E22'],['Max','#E74C3C']].map(([l,c]) => (
            <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '3px', color: theme.colors.textMuted }}>
              <span style={{ width: 8, height: 8, background: c, borderRadius: 1, display: 'inline-block' }} />
              {l}
            </span>
          ))}
        </div>
      </Card>

      {/* Time series chart */}
      <Card side={side} style={{ flex: '0 0 auto', minHeight: '220px' }}>
        <Title side={side}>시계열 차트</Title>
        <div style={{ flex: '0 0 120px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ fontSize: '9px', color: theme.colors.textMuted }}>개방 거리 (mm)</div>
          <div style={{ height: '50px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 2, right: 4, left: -22, bottom: 0 }}>
                <XAxis dataKey="time" tick={{ fontSize: 7 }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 7 }} tickLine={false} domain={[0, 50]} />
                <Tooltip contentStyle={{ fontSize: 9 }} />
                <Area dataKey={`${pre}_gripper_pos`} stroke={color} fill={color + '20'} dot={false} strokeWidth={1.5} name="Opening" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ fontSize: '9px', color: theme.colors.textMuted }}>압력 센서 (N)</div>
          <div style={{ height: '50px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 2, right: 4, left: -22, bottom: 0 }}>
                <XAxis dataKey="time" tick={{ fontSize: 7 }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 7 }} tickLine={false} domain={[0, 6]} />
                <Tooltip contentStyle={{ fontSize: 9 }} />
                <ReferenceLine y={1.5} stroke={theme.colors.statusError} strokeDasharray="3 3" />
                <Line dataKey={`${pre}_finger1_pressure`} stroke={color} dot={false} strokeWidth={1.5} name="F1" />
                <Line dataKey={`${pre}_finger2_pressure`} stroke={theme.colors.statusError} dot={false} strokeWidth={1.5} strokeOpacity={0.8} name="F2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Gripper log */}
        <div style={{ maxHeight: '68px', overflow: 'auto', flexShrink: 0 }}>
          {GRIP_CMDS.map((c, i) => (
            <CmdItem key={i} warn={c.warn} error={c.error}>
              <span style={{ color: theme.colors.textMuted }}>[{c.time}]</span> {c.msg}
            </CmdItem>
          ))}
        </div>
        {f2warn && (
          <AlertBox error>
            ⚠️ Finger 2 압력 이상 ({f2.toFixed(2)}N) — 센서 캘리브레이션 권장
          </AlertBox>
        )}
        {!f2warn && (
          <AlertBox info>
            💡 Grip stable · Force: {force.toFixed(1)}N / 5.0N target
          </AlertBox>
        )}
      </Card>
    </>
  )
}

// ── Hand panel ────────────────────────────────────────────────────────────────

function HandPanel({ data, side, chartData }) {
  const pre        = side === 'left' ? 'la' : 'ra'
  const color      = side === 'left' ? '#2C9E9E' : '#7B68EE'
  const stability  = data[`${pre}_hand_stability`]  ?? 85
  const totalForce = data[`${pre}_total_force`]     ?? 60.5
  const contacts   = data[`${pre}_contact_points`]  ?? 23
  const grasping   = data[`${pre}_is_grasping`]     ?? false
  const stabWarn   = stability < 75

  return (
    <>
      {/* Finger Joint Matrix */}
      <Card side={side} style={{ flex: '0 0 auto' }}>
        <Title side={side}>
          Finger Joint Matrix
          <EETag side={side}>✋ 5-Finger Hand</EETag>
        </Title>
        <Matrix>
          <thead>
            <tr>
              <Th></Th>
              {FINGERS.map(f => <Th key={f}>{f.slice(0,5)}</Th>)}
            </tr>
          </thead>
          <tbody>
            {JOINT_ANGLES.map((row, ri) => (
              <tr key={ri}>
                <Td style={{ color: theme.colors.textMuted, textAlign: 'left' }}>J{ri+1}</Td>
                {row.map((val, ci) => <Td key={ci}>{val.toFixed(1)}°</Td>)}
              </tr>
            ))}
            <tr>
              <Td style={{ color: theme.colors.textMuted, textAlign: 'left' }}>Nm</Td>
              {TORQUES.map((t, i) => (
                <Td key={i} warn={i === 1 && t > 1.7}>
                  {t.toFixed(1)}{i === 1 && t > 1.7 ? '⚠' : ''}
                </Td>
              ))}
            </tr>
          </tbody>
        </Matrix>
        <div style={{ display: 'flex', gap: '8px', fontSize: '10px', marginTop: '2px' }}>
          <span style={{ color: theme.colors.textMuted }}>Grasp:</span>
          <span style={{ fontWeight: 600 }}>Power (Cylinder)</span>
          <span style={{ color: stabWarn ? theme.colors.statusWarn : theme.colors.statusOk }}>
            {stabWarn ? '⚠️' : '✅'} {stability.toFixed(0)}% Stability
          </span>
        </div>
      </Card>

      {/* Tactile heatmap */}
      <Card side={side} style={{ flex: '0 0 auto' }}>
        <Title side={side}>촉각 센서 히트맵</Title>
        {FINGERS.map((f, fi) => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '40px', fontSize: '10px', color: theme.colors.textSecondary }}>{f}</span>
            {HEATMAP[fi].map((v, i) => <HeatCell key={i} val={v} />)}
            <span style={{ fontSize: '10px', color: fi === 1 ? theme.colors.statusWarn : theme.colors.textMuted, marginLeft: '3px' }}>
              {FINGER_FORCES[fi].toFixed(1)}N{fi === 1 ? ' ⚠' : ''}
            </span>
          </div>
        ))}
        <div style={{ fontSize: '10px', color: theme.colors.textMuted, marginTop: '2px' }}>
          Active: {contacts} sensors · Total: {totalForce.toFixed(1)}N
        </div>
      </Card>

      {/* Joint angle chart + Health Status */}
      <Card side={side} style={{ flex: '0 0 auto', minHeight: '260px' }}>
        <Title side={side}>관절 각도 차트</Title>
        <div style={{ flex: '0 0 80px', minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 2, right: 4, left: -22, bottom: 0 }}>
              <XAxis dataKey="time" tick={{ fontSize: 7 }} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 7 }} tickLine={false} domain={['auto','auto']} />
              <Tooltip contentStyle={{ fontSize: 9 }} />
              <Line dataKey={`${pre}_j1_pos`} stroke={color} dot={false} strokeWidth={1.5} name="J1" />
              <Line dataKey={`${pre}_j2_pos`} stroke={color} dot={false} strokeWidth={1.5} strokeOpacity={0.65} name="J2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ fontSize: '10px', color: theme.colors.textMuted, marginTop: '2px', flexShrink: 0 }}>Hand Health Status</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {[
            { label: 'Motor Avg Temp', val: `${(data[`${pre}_j1_temp`] ?? 38).toFixed(0)}°C`, ok: (data[`${pre}_j1_temp`] ?? 38) < 44 },
            { label: 'Sensor Integrity', val: `${contacts}/45`,    ok: contacts >= 44 },
            { label: 'Mechanical Wear',  val: 'Low · 1,247h',      ok: true },
            { label: 'Last Calibration', val: '2024-03-15',        ok: true },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', padding: '2px 6px', background: theme.colors.surface, borderRadius: '4px', border: `1px solid ${theme.colors.borderLight}` }}>
              <span style={{ color: theme.colors.textSecondary }}>{s.label}</span>
              <span style={{ fontWeight: 600, color: s.ok ? theme.colors.statusOk : theme.colors.statusWarn }}>{s.val}</span>
            </div>
          ))}
        </div>
        {/* Hand control log */}
        <div style={{ maxHeight: '60px', overflow: 'auto', flexShrink: 0, marginTop: '2px' }}>
          {HAND_CMDS.map((c, i) => (
            <CmdItem key={i} warn={c.warn} error={c.error}>
              <span style={{ color: theme.colors.textMuted }}>[{c.time}]</span> {c.msg}
            </CmdItem>
          ))}
        </div>
        {stabWarn ? (
          <AlertBox>⚠️ Grasp stability {stability.toFixed(0)}% — grip adjustment recommended</AlertBox>
        ) : (
          <AlertBox info>🤚 DOF: 15 · Tactile: 45 sensors · Type: Anthropomorphic</AlertBox>
        )}
      </Card>
    </>
  )
}

// ── main export ───────────────────────────────────────────────────────────────

export default function EndEffectorTab({ data, chartData, config }) {
  if (!data) return null

  const laEeType = data.la_ee_type ?? config?.leftArm?.eeType  ?? 'hand'
  const raEeType = data.ra_ee_type ?? config?.rightArm?.eeType ?? 'gripper'

  return (
    <Root>
      {/* Left Arm EE */}
      <Col>
        {laEeType === 'hand'
          ? <HandPanel    data={data} side="left"  chartData={chartData} />
          : <GripperPanel data={data} side="left"  chartData={chartData} />
        }
      </Col>

      {/* Right Arm EE */}
      <Col>
        {raEeType === 'hand'
          ? <HandPanel    data={data} side="right" chartData={chartData} />
          : <GripperPanel data={data} side="right" chartData={chartData} />
        }
      </Col>
    </Root>
  )
}

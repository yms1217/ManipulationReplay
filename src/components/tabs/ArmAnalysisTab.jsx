import styled from 'styled-components'
import { theme } from '../../styles/theme'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  overflow: hidden;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  flex: 1;
  overflow: hidden;
  min-height: 0;
`

const Card = styled.div`
  background: ${theme.colors.surfaceAlt};
  border: 1px solid ${theme.colors.borderLight};
  border-radius: 8px;
  padding: 8px 10px;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 4px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: ${theme.colors.border}; border-radius: 2px; }
`

const Title = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${p => p.side === 'left' ? '#2C9E9E' : '#7B68EE'};
  padding-bottom: 4px;
  border-bottom: 1px solid ${theme.colors.borderLight};
  flex-shrink: 0;
`

const JointCard = styled.div`
  background: ${p => p.error ? '#FFF0EF' : p.warn ? '#FFFBF0' : theme.colors.surface};
  border: 1px solid ${p => p.error ? theme.colors.statusError : p.warn ? theme.colors.statusWarn : theme.colors.borderLight};
  border-radius: 5px;
  padding: 4px 7px;
  font-size: 10px;
`

const JRow = styled.div`
  display: flex; justify-content: space-between; align-items: center; gap: 5px;
`

const MicroBar = styled.div`
  flex: 1; height: 4px; background: ${theme.colors.bgDark}; border-radius: 2px; overflow: hidden;
`

const MicroFill = styled.div`
  height: 100%; width: ${p => p.pct}%;
  background: ${p =>
    p.error ? theme.colors.statusError :
    p.warn  ? theme.colors.statusWarn  :
    p.side === 'right' ? '#7B68EE' : theme.colors.primary};
  border-radius: 2px;
`

const AccRow = styled.div`display: flex; flex-direction: column; gap: 2px; margin-bottom: 3px;`

const CmdItem = styled.div`
  font-size: 10px;
  font-family: 'Consolas', monospace;
  padding: 3px 5px;
  background: ${p => p.warn ? theme.colors.logWarn : p.error ? theme.colors.logError : theme.colors.surface};
  border-left: 2px solid ${p => p.warn ? theme.colors.statusWarn : p.error ? theme.colors.statusError : theme.colors.borderLight};
  border-radius: 0 3px 3px 0;
  color: ${theme.colors.textSecondary};
  margin-bottom: 2px;
`

// 제어 명령 이력 (side-aware)
const LA_CMDS = [
  { time: '14:22:10', cmd: '[LA] move_to_position([30, -45, 80])', warn: false, error: false },
  { time: '14:22:12', cmd: '⚠️ [LA] J2 velocity limit approach (85%)', warn: true, error: false },
  { time: '14:22:15', cmd: '[LA] Velocity reduced to 70% — within limits', warn: false, error: false },
  { time: '14:25:55', cmd: '⚠️ [LA] J3 motor 55°C — throttle applied', warn: true, error: false },
  { time: '14:28:00', cmd: '✅ [LA] J2 recalibration completed', warn: false, error: false },
  { time: '14:28:40', cmd: '[LA] adaptive_grasp(cylinder, 60N)', warn: false, error: false },
]
const RA_CMDS = [
  { time: '14:22:08', cmd: '[RA] move_to_position([45, -30, 90])', warn: false, error: false },
  { time: '14:22:18', cmd: '✅ [RA] Target position reached ±0.5°', warn: false, error: false },
  { time: '14:24:12', cmd: '❌ [RA] Gripper finger 2 pressure anomaly', warn: false, error: true },
  { time: '14:24:18', cmd: '⚠️ [RA] Grip recalibration in progress', warn: true, error: false },
  { time: '14:24:30', cmd: '✅ [RA] Grip stable after adjustment (4.8N)', warn: false, error: false },
  { time: '14:28:50', cmd: '❌ [RA] Grip force instability — auto-adjust', warn: false, error: true },
]

export default function ArmAnalysisTab({ data, chartData, side = 'left' }) {
  if (!data) return null

  const pre   = side === 'left' ? 'la' : 'ra'
  const color = side === 'left' ? '#2C9E9E' : '#7B68EE'
  const label = side === 'left' ? '◀ Left Arm' : 'Right Arm ▶'
  const cmds  = side === 'left' ? LA_CMDS : RA_CMDS

  const joints = [1,2,3,4,5,6].map(i => {
    const pos    = data[`${pre}_j${i}_pos`]    ?? 0
    const torque = data[`${pre}_j${i}_torque`] ?? 0
    const temp   = data[`${pre}_j${i}_temp`]   ?? 38
    const warn   = (i === 2 && torque > 2.3) || (i === 3 && temp > 44 && temp < 57)
    const error  = (i === 3 && temp >= 57)
    return { name: `J${i}`, pos, torque, temp, warn, error }
  })

  const j3temp = data[`${pre}_j3_temp`] ?? 38
  const j3warn = j3temp > 44

  const accData = [1,2,3].map(i => ({
    joint: `J${i}`,
    error: data[`${pre}_j${i}_error`] ?? 0.2,
    accuracy: Math.max(0, 100 - ((data[`${pre}_j${i}_error`] ?? 0.2) * 50)),
  }))

  return (
    <Wrap>
      <Grid>
        {/* Joint states */}
        <Card>
          <Title side={side}>Joint 상태 — {label}</Title>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'visible', minHeight: '220px' }}>
            {joints.map(j => (
              <JointCard key={j.name} warn={j.warn} error={j.error}>
                <JRow>
                  <span style={{ fontWeight: 600, color: j.error ? theme.colors.statusError : j.warn ? theme.colors.statusWarn : theme.colors.text }}>
                    {j.error ? '🔴' : j.warn ? '🟡' : '🟢'} {j.name}
                  </span>
                  <span style={{ color: theme.colors.textMuted }}>
                    {j.pos?.toFixed(1)}° · {j.torque?.toFixed(2)}Nm · {j.temp?.toFixed(0)}°C
                  </span>
                </JRow>
                <JRow style={{ marginTop: '2px' }}>
                  <span style={{ color: theme.colors.textMuted, minWidth: '26px' }}>Pos</span>
                  <MicroBar>
                    <MicroFill pct={Math.abs(j.pos) / 1.8} error={j.error} warn={j.warn} side={side} />
                  </MicroBar>
                </JRow>
                <JRow>
                  <span style={{ color: theme.colors.textMuted, minWidth: '26px' }}>Torq</span>
                  <MicroBar>
                    <MicroFill pct={(j.torque / 5) * 100} error={j.error} warn={j.warn} side={side} />
                  </MicroBar>
                </JRow>
              </JointCard>
            ))}
          </div>
        </Card>

        {/* Real-time charts */}
        <Card>
          <Title side={side}>실시간 차트</Title>
          <div style={{ minHeight: '170px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ fontSize: '10px', color: theme.colors.textMuted }}>Position (deg)</div>
            <div style={{ height: '70px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 2, right: 4, left: -22, bottom: 0 }}>
                  <XAxis dataKey="time" tick={{ fontSize: 7 }} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 7 }} tickLine={false} domain={['auto','auto']} />
                  <Tooltip contentStyle={{ fontSize: 9, padding: '2px 5px' }} />
                  <Line dataKey={`${pre}_j1_pos`} stroke={color} dot={false} strokeWidth={1.5} name="J1" />
                  <Line dataKey={`${pre}_j2_pos`} stroke={color} dot={false} strokeWidth={1.5} strokeOpacity={0.7} name="J2" />
                  <Line dataKey={`${pre}_j3_pos`} stroke={color} dot={false} strokeWidth={1.5} strokeOpacity={0.45} name="J3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: '10px', color: theme.colors.textMuted }}>Torque (Nm)</div>
            <div style={{ height: '70px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 2, right: 4, left: -22, bottom: 0 }}>
                  <XAxis dataKey="time" tick={{ fontSize: 7 }} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 7 }} tickLine={false} domain={[0, 4]} />
                  <Tooltip contentStyle={{ fontSize: 9 }} />
                  <ReferenceLine y={3.5} stroke={theme.colors.statusWarn} strokeDasharray="3 3" />
                  <Line dataKey={`${pre}_j1_torque`} stroke={color} dot={false} strokeWidth={1.5} name="J1" />
                  <Line dataKey={`${pre}_j2_torque`} stroke={color} dot={false} strokeWidth={1.5} strokeOpacity={0.7} name="J2" />
                  <Line dataKey={`${pre}_j3_torque`} stroke={color} dot={false} strokeWidth={1.5} strokeOpacity={0.45} name="J3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Accuracy */}
        <Card>
          <Title side={side}>정확도 분석 (J1–J3)</Title>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflow: 'visible', minHeight: '80px' }}>
            {accData.map(a => (
              <AccRow key={a.joint}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: theme.colors.textSecondary }}>
                  <span>{a.joint}</span>
                  <span style={{ color: a.accuracy < 92 ? theme.colors.statusWarn : theme.colors.statusOk }}>
                    {a.accuracy.toFixed(0)}% · ±{a.error.toFixed(2)}°
                  </span>
                </div>
                <div style={{ height: '5px', background: theme.colors.bgDark, borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${a.accuracy}%`, background: a.accuracy < 92 ? theme.colors.statusWarn : color, borderRadius: '3px' }} />
                </div>
              </AccRow>
            ))}

            {j3warn && (
              <div style={{ fontSize: '10px', padding: '4px 6px', background: theme.colors.logWarn, borderRadius: '4px', color: theme.colors.statusWarn }}>
                ⚠️ {label} J3: {j3temp.toFixed(0)}°C — 온도 임계치 근접 (limit: 60°C)
              </div>
            )}
          </div>
        </Card>

        {/* 제어 명령 이력 */}
        <Card>
          <Title side={side}>제어 명령 이력</Title>
          <div style={{ overflow: 'visible', minHeight: '80px' }}>
            {cmds.map((c, i) => (
              <CmdItem key={i} warn={c.warn} error={c.error}>
                <span style={{ color: theme.colors.textMuted }}>[{c.time}]</span> {c.cmd}
              </CmdItem>
            ))}
          </div>
          <div style={{ fontSize: '10px', padding: '3px 6px', background: theme.colors.logInfo, borderRadius: '4px', color: theme.colors.statusInfo, flexShrink: 0 }}>
            {side === 'left'
              ? `💡 LA J3 ${(data[`${pre}_j3_temp`] ?? 38).toFixed(0)}°C — thermal throttle active`
              : `💡 RA Grip force: ${(data.ra_gripper_force ?? 0).toFixed(1)}N / 5.0N target`
            }
          </div>
        </Card>
      </Grid>
    </Wrap>
  )
}

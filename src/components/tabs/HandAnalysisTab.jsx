import styled from 'styled-components'
import { theme } from '../../styles/theme'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const Wrap = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  height: 100%;
  overflow: hidden;
`

const Card = styled.div`
  background: ${theme.colors.surfaceAlt};
  border: 1px solid ${theme.colors.borderLight};
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  overflow: hidden;
`

const Title = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${theme.colors.textMuted};
  padding-bottom: 4px;
  border-bottom: 1px solid ${theme.colors.borderLight};
  flex-shrink: 0;
`

const Matrix = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
`

const Th = styled.th`
  color: ${theme.colors.textMuted};
  text-align: center;
  padding: 2px 4px;
  border-bottom: 1px solid ${theme.colors.border};
  font-weight: 600;
`

const Td = styled.td`
  text-align: center;
  padding: 2px 4px;
  color: ${p => p.warn ? theme.colors.statusWarn : p.ok ? theme.colors.text : theme.colors.statusError};
  font-family: 'Consolas', monospace;
  border-bottom: 1px solid ${theme.colors.borderLight};
`

const FingerViz = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const FingerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
`

const FingerName = styled.span`
  width: 40px;
  color: ${theme.colors.textSecondary};
  flex-shrink: 0;
`

const HeatCell = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 1px;
  background: ${p => {
    const v = p.val
    if (v < 0.25) return '#27AE60'
    if (v < 0.5) return '#F1C40F'
    if (v < 0.75) return '#E67E22'
    return '#E74C3C'
  }};
`

const ForceLabel = styled.span`
  margin-left: 4px;
  color: ${p => p.warn ? theme.colors.statusWarn : theme.colors.textMuted};
  font-family: monospace;
`

const CmdItem = styled.div`
  font-size: 10px;
  font-family: 'Consolas', monospace;
  padding: 3px 5px;
  background: ${p => p.warn ? theme.colors.logWarn : p.error ? theme.colors.logError : theme.colors.surface};
  border-left: 2px solid ${p => p.warn ? theme.colors.statusWarn : p.error ? theme.colors.statusError : theme.colors.borderLight};
  border-radius: 0 3px 3px 0;
  color: ${theme.colors.textSecondary};
`

const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']
const JOINT_ANGLES = [
  [45.2, 32.1, 28.5, 25.8, 22.3],
  [38.7, 45.6, 42.3, 40.1, 35.9],
  [25.1, 38.2, 35.7, 33.4, 30.8],
]
const TORQUES = [2.3, 1.8, 1.6, 1.4, 1.1]
const FORCES = [15.2, 18.7, 12.3, 8.9, 5.4]
const HEATMAP = [
  [0.3, 0.5, 0.7, 0.85, 0.9, 0.95, 1.0],
  [0.3, 0.6, 0.8, 0.9, 0.95, 1.0, 1.0],
  [0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9],
  [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7],
  [0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6],
]

const CMDS = [
  { time: '14:23:10', msg: 'adaptive_grasp(type="cylinder", force=60N)', warn: false },
  { time: '14:23:12', msg: '✅ Grasp formation completed', warn: false },
  { time: '14:23:15', msg: '⚠️ Index finger torque limit approached', warn: true },
  { time: '14:23:18', msg: 'adjust_grip(reduce_index_force=true)', warn: false },
  { time: '14:23:20', msg: '✅ Stable grasp achieved (91%)', warn: false },
]

export default function HandAnalysisTab({ data, chartData }) {
  if (!data) return null

  return (
    <Wrap>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
        <Card style={{ flex: '0 0 auto' }}>
          <Title>Finger Joint Matrix</Title>
          <Matrix>
            <thead>
              <tr>
                <Th></Th>
                {FINGERS.map(f => <Th key={f}>{f.slice(0, 5)}</Th>)}
              </tr>
            </thead>
            <tbody>
              {JOINT_ANGLES.map((row, ri) => (
                <tr key={ri}>
                  <Td style={{ color: theme.colors.textMuted, textAlign: 'left' }}>J{ri + 1}</Td>
                  {row.map((val, ci) => (
                    <Td key={ci} ok>
                      {val.toFixed(1)}°
                    </Td>
                  ))}
                </tr>
              ))}
              <tr>
                <Td style={{ color: theme.colors.textMuted, textAlign: 'left' }}>Nm</Td>
                {TORQUES.map((t, i) => (
                  <Td key={i} warn={i === 1 && t > 1.7}>
                    {t.toFixed(1)} {i === 1 && t > 1.7 ? '⚠' : ''}
                  </Td>
                ))}
              </tr>
            </tbody>
          </Matrix>
          <div style={{ display: 'flex', gap: '8px', fontSize: '11px', marginTop: '2px' }}>
            <span style={{ color: theme.colors.textMuted }}>Grasp:</span>
            <span style={{ color: theme.colors.text, fontWeight: 600 }}>Power Grasp (Cylinder)</span>
            <span style={{ color: theme.colors.statusWarn }}>⚠️ 78% Stability</span>
          </div>
        </Card>

        <Card style={{ flex: '0 0 auto' }}>
          <Title>촉각 센서 히트맵</Title>
          <FingerViz>
            {FINGERS.map((f, fi) => (
              <FingerRow key={f}>
                <FingerName>{f}</FingerName>
                {HEATMAP[fi].map((v, i) => <HeatCell key={i} val={v} />)}
                <ForceLabel warn={fi === 1}>
                  {FORCES[fi].toFixed(1)}N {fi === 1 ? '⚠' : ''}
                </ForceLabel>
              </FingerRow>
            ))}
          </FingerViz>
          <div style={{ fontSize: '10px', color: theme.colors.textMuted, marginTop: '2px' }}>
            Active: 23 sensors · Total: 60.5N · CoP: (12mm, 8mm)
          </div>
        </Card>

        <Card style={{ flex: 1, minHeight: 0 }}>
          <Title>Hand 제어 로그</Title>
          <div style={{ overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {CMDS.map((c, i) => (
              <CmdItem key={i} warn={c.warn}>
                <span style={{ color: theme.colors.textMuted }}>[{c.time}]</span> {c.msg}
              </CmdItem>
            ))}
            <CmdItem style={{ marginTop: '4px' }}>
              Thumb-Index: ✅ 95% sync · Middle-Ring: ✅ 92% · Pinky: ✅ 88%
            </CmdItem>
          </div>
        </Card>
      </div>

      <Card>
        <Title>관절 각도 차트</Title>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <ResponsiveContainer width="100%" height="45%">
            <LineChart data={chartData} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="time" tick={{ fontSize: 8 }} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 8 }} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 10 }} />
              <Line dataKey="j1_pos" stroke={theme.colors.chartLine1} dot={false} strokeWidth={1.5} name="Thumb J1" />
              <Line dataKey="j2_pos" stroke={theme.colors.chartLine2} dot={false} strokeWidth={1.5} name="Index J2" />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ fontSize: '10px', color: theme.colors.textMuted }}>Hand Health Status</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflow: 'auto' }}>
            {[
              { label: 'Motor Avg Temp', val: '38°C', sub: '(Max: 42°C on Index)', ok: true },
              { label: 'Sensor Integrity', val: '44/45', sub: 'operational', ok: true },
              { label: 'Mechanical Wear', val: 'Low', sub: '1,247h usage', ok: true },
              { label: 'Last Calibration', val: '2024-03-15', sub: '09:30:00', ok: true },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', padding: '3px 6px', background: theme.colors.surface, borderRadius: '4px', border: `1px solid ${theme.colors.borderLight}` }}>
                <span style={{ color: theme.colors.textSecondary }}>{s.label}</span>
                <span style={{ fontWeight: 600, color: s.ok ? theme.colors.statusOk : theme.colors.statusError }}>
                  {s.val} <span style={{ fontWeight: 400, color: theme.colors.textMuted }}>{s.sub}</span>
                </span>
              </div>
            ))}
            <div style={{ padding: '4px 6px', background: theme.colors.logInfo, borderRadius: '4px', fontSize: '11px', color: theme.colors.statusInfo }}>
              🤚 Hand Type: 5-Finger Anthropomorphic · DOF: 15 · Tactile: 45 sensors
            </div>
          </div>
        </div>
      </Card>
    </Wrap>
  )
}

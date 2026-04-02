import styled from 'styled-components'
import { theme } from '../../styles/theme'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'

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
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 5px;
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

const JointCard = styled.div`
  background: ${p => p.error ? '#FFF0EF' : p.warn ? '#FFFBF0' : theme.colors.surface};
  border: 1px solid ${p => p.error ? theme.colors.statusError : p.warn ? theme.colors.statusWarn : theme.colors.borderLight};
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 11px;
`

const JRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
`

const JName = styled.span`
  font-weight: 600;
  color: ${p => p.error ? theme.colors.statusError : p.warn ? theme.colors.statusWarn : theme.colors.text};
`

const MicroBar = styled.div`
  flex: 1;
  height: 4px;
  background: ${theme.colors.bgDark};
  border-radius: 2px;
  overflow: hidden;
`

const MicroFill = styled.div`
  height: 100%;
  width: ${p => p.pct}%;
  background: ${p => p.error ? theme.colors.statusError : p.warn ? theme.colors.statusWarn : theme.colors.primary};
  border-radius: 2px;
`

const CmdList = styled.div`
  overflow: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
`

const CmdItem = styled.div`
  font-size: 10px;
  font-family: 'Consolas', monospace;
  color: ${theme.colors.textSecondary};
  padding: 3px 5px;
  background: ${p => p.warn ? theme.colors.logWarn : theme.colors.surface};
  border-left: 2px solid ${p => p.warn ? theme.colors.statusWarn : theme.colors.borderLight};
  border-radius: 0 3px 3px 0;
`

const CMDS = [
  { time: '14:32:15', cmd: 'move_to_position([45, -30, 90])', status: '✅ Success', warn: false },
  { time: '14:31:45', cmd: 'move_to_position([30, -45, 75])', status: '✅ Success', warn: false },
  { time: '14:31:20', cmd: 'home_position()', status: '✅ Success', warn: false },
  { time: '14:32:17', cmd: 'WARN: J2 velocity limit approach', status: '⚠️', warn: true },
]

const ACC = [
  { joint: 'J1', accuracy: 100, error: 0.1 },
  { joint: 'J2', accuracy: 89, error: 0.8 },
  { joint: 'J3', accuracy: 98, error: 0.2 },
  { joint: 'J4', accuracy: 96, error: 0.3 },
  { joint: 'J5', accuracy: 94, error: 0.4 },
  { joint: 'J6', accuracy: 99, error: 0.1 },
]

export default function ArmAnalysisTab({ data, chartData }) {
  if (!data) return null

  const j2warn = data.j2_torque > 2.2
  const j3hot = data.j3_temp > 50

  const joints = [
    { name: 'J1', pos: data.j1_pos, torque: data.j1_torque, temp: data.j1_temp, warn: false, error: false },
    { name: 'J2', pos: data.j2_pos, torque: data.j2_torque, temp: data.j2_temp, warn: j2warn, error: false },
    { name: 'J3', pos: data.j3_pos, torque: data.j3_torque, temp: data.j3_temp, warn: j3hot && data.j3_temp < 57, error: j3hot && data.j3_temp >= 57 },
    { name: 'J4', pos: data.j4_pos, torque: data.j4_torque, temp: data.j1_temp, warn: false, error: false },
    { name: 'J5', pos: data.j5_pos, torque: data.j5_torque, temp: data.j2_temp, warn: false, error: false },
    { name: 'J6', pos: data.j6_pos, torque: data.j6_torque, temp: data.j3_temp, warn: false, error: false },
  ]

  return (
    <Wrap>
      <Grid>
        {/* Joint States */}
        <Card>
          <Title>Joint 상태 분석</Title>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'auto', flex: 1 }}>
            {joints.map(j => (
              <JointCard key={j.name} warn={j.warn} error={j.error}>
                <JRow>
                  <JName warn={j.warn} error={j.error}>
                    {j.error ? '🔴' : j.warn ? '🟡' : '🟢'} {j.name}
                  </JName>
                  <span style={{ color: theme.colors.textMuted, fontSize: '10px' }}>
                    {j.pos?.toFixed(1)}° · {j.torque?.toFixed(2)}Nm · {j.temp?.toFixed(0)}°C
                  </span>
                </JRow>
                <JRow style={{ marginTop: '3px' }}>
                  <span style={{ fontSize: '10px', color: theme.colors.textMuted, minWidth: '28px' }}>Pos</span>
                  <MicroBar>
                    <MicroFill pct={Math.abs(j.pos) / 1.8} error={j.error} warn={j.warn} />
                  </MicroBar>
                </JRow>
                <JRow>
                  <span style={{ fontSize: '10px', color: theme.colors.textMuted, minWidth: '28px' }}>Torq</span>
                  <MicroBar>
                    <MicroFill pct={(j.torque / 5) * 100} error={j.error} warn={j.warn} />
                  </MicroBar>
                </JRow>
              </JointCard>
            ))}
          </div>
        </Card>

        {/* Real-time Chart */}
        <Card>
          <Title>실시간 각도 차트</Title>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="48%">
              <LineChart data={chartData} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="time" tick={{ fontSize: 8 }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 8 }} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ fontSize: 10, padding: '2px 6px' }} />
                <Line dataKey="j1_pos" stroke={theme.colors.chartLine1} dot={false} strokeWidth={1.5} name="J1" />
                <Line dataKey="j2_pos" stroke={theme.colors.chartLine2} dot={false} strokeWidth={1.5} name="J2" />
                <Line dataKey="j3_pos" stroke={theme.colors.chartLine3} dot={false} strokeWidth={1.5} name="J3" />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ fontSize: '10px', color: theme.colors.textMuted, padding: '2px 4px' }}>Torque (Nm)</div>
            <ResponsiveContainer width="100%" height="44%">
              <LineChart data={chartData} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="time" tick={{ fontSize: 8 }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 8 }} tickLine={false} domain={[0, 4]} />
                <Tooltip contentStyle={{ fontSize: 10 }} />
                <ReferenceLine y={3.5} stroke={theme.colors.statusWarn} strokeDasharray="3 3" />
                <Line dataKey="j1_torque" stroke={theme.colors.chartLine1} dot={false} strokeWidth={1.5} name="J1" />
                <Line dataKey="j2_torque" stroke={theme.colors.chartLine2} dot={false} strokeWidth={1.5} name="J2" />
                <Line dataKey="j3_torque" stroke={theme.colors.chartLine3} dot={false} strokeWidth={1.5} name="J3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Target vs Actual */}
        <Card>
          <Title>목표 vs 실제 정확도</Title>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', overflow: 'auto', flex: 1 }}>
            {ACC.map(a => (
              <div key={a.joint} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: theme.colors.textSecondary }}>
                  <span>{a.joint}</span>
                  <span style={{ color: a.accuracy < 92 ? theme.colors.statusWarn : theme.colors.statusOk }}>
                    {a.accuracy}% · ±{a.error}°
                  </span>
                </div>
                <div style={{ height: '5px', background: theme.colors.bgDark, borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${a.accuracy}%`,
                    background: a.accuracy < 92 ? theme.colors.statusWarn : theme.colors.primary,
                    borderRadius: '3px'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Commands */}
        <Card>
          <Title>제어 명령 이력</Title>
          <CmdList>
            {CMDS.map((c, i) => (
              <CmdItem key={i} warn={c.warn}>
                <span style={{ color: theme.colors.textMuted }}>[{c.time}]</span> {c.cmd}
                {' '}<span style={{ color: c.warn ? theme.colors.statusWarn : theme.colors.statusOk }}>{c.status}</span>
              </CmdItem>
            ))}
          </CmdList>
          <div style={{ fontSize: '11px', padding: '4px', background: theme.colors.logWarn, borderRadius: '4px', color: theme.colors.statusWarn }}>
            ⚠️ {data.j3_temp?.toFixed(0)}°C — J3 motor temperature elevated
          </div>
        </Card>
      </Grid>
    </Wrap>
  )
}

import styled from 'styled-components'
import { theme } from '../../styles/theme'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { ROBOT_CONFIG } from '../../data/mockData'

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

const GaugeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
`

const GaugeLabel = styled.span`
  width: 72px;
  color: ${theme.colors.textSecondary};
  flex-shrink: 0;
`

const GaugeBar = styled.div`
  flex: 1;
  height: 6px;
  background: ${theme.colors.bgDark};
  border-radius: 3px;
  overflow: hidden;
`

const GaugeFill = styled.div`
  height: 100%;
  width: ${p => p.pct}%;
  background: ${p => p.pct > 80 ? theme.colors.statusError : p.pct > 65 ? theme.colors.statusWarn : theme.colors.primary};
  border-radius: 3px;
  transition: width 0.3s;
`

const GaugeVal = styled.span`
  min-width: 36px;
  text-align: right;
  font-weight: 600;
  font-size: 11px;
  color: ${p => p.hi ? theme.colors.statusError : p.warn ? theme.colors.statusWarn : theme.colors.primary};
`

const TempGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
`

const TempItem = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: ${theme.colors.textSecondary};
`

const TempDot = styled.span`
  font-size: 10px;
`

const TopicRow = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-family: 'Consolas', monospace;
  color: ${theme.colors.textSecondary};
  padding: 2px 0;
`

const StatusIcon = styled.span`
  font-size: 11px;
`

const Hz = styled.span`
  margin-left: auto;
  font-family: 'Consolas', monospace;
  color: ${theme.colors.textMuted};
`

const AlertItem = styled.div`
  font-size: 10px;
  padding: 3px 5px;
  border-left: 2px solid ${p => p.error ? theme.colors.statusError : theme.colors.statusWarn};
  background: ${p => p.error ? theme.colors.logError : theme.colors.logWarn};
  border-radius: 0 3px 3px 0;
  color: ${theme.colors.textSecondary};
  margin-bottom: 2px;
`

const ALERTS = [
  { time: '14:23:21', msg: 'CPU usage exceeded 80% threshold', error: true },
  { time: '14:23:15', msg: 'Joint 3 motor temperature approaching limit (55°C)', error: false },
  { time: '14:22:45', msg: 'Camera sensor connection lost', error: true },
  { time: '14:22:30', msg: 'Tactile sensor unresponsive (Finger 2, Sensor 3)', error: false },
  { time: '14:21:10', msg: 'Network latency spike detected (peak: 45ms)', error: false },
]

const TEMPS = [
  { loc: 'J1 Motor', temp: 38, status: '🟢' },
  { loc: 'J2 Motor', temp: 42, status: '🟡' },
  { loc: 'J3 Motor', temp: 55, status: '🔴' },
  { loc: 'J4 Motor', temp: 35, status: '🟢' },
  { loc: 'J5 Motor', temp: 40, status: '🟡' },
  { loc: 'J6 Motor', temp: 37, status: '🟢' },
  { loc: 'CPU', temp: 52, status: '🟡' },
  { loc: 'Battery', temp: 35, status: '🟢' },
]

export default function SystemStatusTab({ data, chartData }) {
  if (!data) return null

  const cpuHigh = data.cpu > 80

  return (
    <Wrap>
      {/* Left */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
        <Card style={{ flex: '0 0 auto' }}>
          <Title>시스템 리소스</Title>
          <GaugeRow>
            <GaugeLabel>CPU</GaugeLabel>
            <GaugeBar>
              <GaugeFill pct={data.cpu} />
            </GaugeBar>
            <GaugeVal hi={cpuHigh} warn={data.cpu > 65 && !cpuHigh}>{data.cpu?.toFixed(0)}%</GaugeVal>
          </GaugeRow>
          {cpuHigh && <div style={{ fontSize: '10px', color: theme.colors.statusError, marginTop: '-2px' }}>⚠️ Threshold exceeded (80%)</div>}
          <GaugeRow>
            <GaugeLabel>Memory</GaugeLabel>
            <GaugeBar>
              <GaugeFill pct={data.memory} />
            </GaugeBar>
            <GaugeVal>{data.memory?.toFixed(0)}%</GaugeVal>
          </GaugeRow>
          <GaugeRow>
            <GaugeLabel>Battery</GaugeLabel>
            <GaugeBar>
              <GaugeFill pct={87} />
            </GaugeBar>
            <GaugeVal>{data.battery_voltage?.toFixed(1)}V</GaugeVal>
          </GaugeRow>
          <GaugeRow>
            <GaugeLabel>Network</GaugeLabel>
            <GaugeBar>
              <GaugeFill pct={Math.min(100, data.network_latency * 2)} />
            </GaugeBar>
            <GaugeVal warn={data.network_latency > 30}>{data.network_latency?.toFixed(0)}ms</GaugeVal>
          </GaugeRow>
          <div style={{ height: '60px', marginTop: '2px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="time" tick={{ fontSize: 7 }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 7 }} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ fontSize: 9 }} />
                <ReferenceLine y={80} stroke={theme.colors.statusError} strokeDasharray="3 3" />
                <Line dataKey="cpu" stroke={theme.colors.chartLine2} dot={false} strokeWidth={1.5} name="CPU%" />
                <Line dataKey="memory" stroke={theme.colors.chartLine1} dot={false} strokeWidth={1.5} name="MEM%" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card style={{ flex: '0 0 auto' }}>
          <Title>온도 분포</Title>
          <TempGrid>
            {TEMPS.map(t => (
              <TempItem key={t.loc}>
                <TempDot>{t.status}</TempDot>
                <span>{t.loc}:</span>
                <span style={{ fontWeight: 600, color: t.temp > 50 ? theme.colors.statusError : t.temp > 42 ? theme.colors.statusWarn : theme.colors.statusOk }}>
                  {t.temp}°C
                </span>
              </TempItem>
            ))}
          </TempGrid>
        </Card>

        <Card style={{ flex: 1, minHeight: 0 }}>
          <Title>시스템 경고</Title>
          <div style={{ overflow: 'auto', flex: 1 }}>
            {ALERTS.map((a, i) => (
              <AlertItem key={i} error={a.error}>
                <span style={{ fontFamily: 'monospace' }}>[{a.time}]</span> {a.msg}
              </AlertItem>
            ))}
          </div>
        </Card>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
        <Card style={{ flex: '0 0 auto' }}>
          <Title>ROS 토픽 상태</Title>
          <div style={{ overflow: 'auto', maxHeight: '130px' }}>
            {ROBOT_CONFIG.activeTopics.map(t => (
              <TopicRow key={t.name}>
                <StatusIcon>
                  {t.status === 'ok' ? '✅' : t.status === 'warn' ? '⚠️' : '❌'}
                </StatusIcon>
                <span>{t.name}</span>
                <Hz>{t.hz != null ? (t.hz === 0 ? '0Hz' : `${t.hz}Hz`) : 'var'}</Hz>
              </TopicRow>
            ))}
          </div>
        </Card>

        <Card style={{ flex: '0 0 auto' }}>
          <Title>메시지 무결성</Title>
          {[
            { label: 'Dropped Messages', val: '23', pct: 0.02, warn: false },
            { label: 'Corrupted Packets', val: '1', pct: 0.01, warn: false },
            { label: 'Sequence Gaps', val: '5', pct: 0.04, warn: false },
            { label: 'Avg Delay', val: '12ms', pct: 12, warn: false },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '2px 4px', borderBottom: `1px solid ${theme.colors.borderLight}` }}>
              <span style={{ color: theme.colors.textSecondary }}>{s.label}</span>
              <span style={{ fontWeight: 600, color: theme.colors.text }}>{s.val}</span>
            </div>
          ))}
        </Card>

        <Card style={{ flex: '0 0 auto' }}>
          <Title>센서 상태</Title>
          {[
            { label: 'Joint Encoders', val: '6/6', ok: true },
            { label: 'Temp Sensors', val: '8/8', ok: true },
            { label: 'Pressure Sensors', val: '44/45', ok: false },
            { label: 'Tactile Sensors', val: '45/45', ok: true },
            { label: 'IMU', val: '0/1', ok: false, error: true },
            { label: 'Vision Sensors', val: '0/2', ok: false, error: true },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '2px 4px', borderBottom: `1px solid ${theme.colors.borderLight}` }}>
              <span style={{ color: theme.colors.textSecondary }}>{s.label}</span>
              <span style={{ fontWeight: 600, color: s.error ? theme.colors.statusError : s.ok ? theme.colors.statusOk : theme.colors.statusWarn }}>
                {s.error ? '❌' : s.ok ? '✅' : '⚠️'} {s.val}
              </span>
            </div>
          ))}
        </Card>

        <Card style={{ flex: 1, minHeight: 0 }}>
          <Title>시스템 진단</Title>
          {[
            { label: 'Disk Usage', val: '78%', sub: '45GB / 58GB', warn: true },
            { label: 'Swap', val: '12%', sub: '0.5GB / 4GB', warn: false },
            { label: 'Load Avg', val: '2.1', sub: '1.8, 1.5 (1/5/15m)', warn: false },
            { label: 'Uptime', val: '2d 14h 23m', sub: '', warn: false },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', padding: '3px 6px', background: theme.colors.surface, borderRadius: '4px', border: `1px solid ${theme.colors.borderLight}`, marginBottom: '3px' }}>
              <span style={{ color: theme.colors.textSecondary }}>{s.label}</span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 600, color: s.warn ? theme.colors.statusWarn : theme.colors.text }}>{s.val}</span>
                {s.sub && <span style={{ fontSize: '10px', color: theme.colors.textMuted, marginLeft: '4px' }}>{s.sub}</span>}
              </div>
            </div>
          ))}
        </Card>
      </div>
    </Wrap>
  )
}

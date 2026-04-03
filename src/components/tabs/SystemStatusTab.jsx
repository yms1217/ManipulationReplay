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

const GaugeRow = styled.div`display: flex; align-items: center; gap: 8px; font-size: 11px;`
const GLabel = styled.span`width: 70px; color: ${theme.colors.textSecondary}; flex-shrink: 0; font-size: 10px;`

const GBar = styled.div`
  flex: 1; height: 5px; background: ${theme.colors.bgDark}; border-radius: 3px; overflow: hidden;
`

const GFill = styled.div`
  height: 100%;
  width: ${p => p.pct}%;
  background: ${p => p.pct > 80 ? theme.colors.statusError : p.pct > 65 ? theme.colors.statusWarn : theme.colors.primary};
  border-radius: 3px;
  transition: width 0.3s;
`

const GVal = styled.span`
  min-width: 40px; text-align: right; font-weight: 600; font-size: 10px;
  color: ${p => p.hi ? theme.colors.statusError : p.warn ? theme.colors.statusWarn : theme.colors.primary};
`

const TempItem = styled.div`
  display: flex; align-items: center; gap: 5px; font-size: 10px;
  color: ${theme.colors.textSecondary}; padding: 1px 0;
`

const TopicRow = styled.div`
  display: flex; align-items: center; gap: 4px; font-size: 10px;
  font-family: 'Consolas', monospace; color: ${theme.colors.textSecondary}; padding: 1px 0;
`

const AlertItem = styled.div`
  font-size: 10px; padding: 3px 5px; margin-bottom: 2px;
  border-left: 2px solid ${p => p.error ? theme.colors.statusError : theme.colors.statusWarn};
  background: ${p => p.error ? theme.colors.logError : theme.colors.logWarn};
  border-radius: 0 3px 3px 0;
  color: ${theme.colors.textSecondary};
`

const StatusIcon = styled.span`font-size: 10px;`
const Hz = styled.span`margin-left: auto; color: ${theme.colors.textMuted};`

export default function SystemStatusTab({ data, chartData, config }) {
  if (!data) return null

  const cpuHigh = data.cpu > 80
  const activeTopics = config?.activeTopics ?? ROBOT_CONFIG.activeTopics

  // Build temp list from data
  const armTemps = []
  for (const pre of ['la', 'ra']) {
    const side = pre === 'la' ? 'L' : 'R'
    for (let i = 1; i <= 6; i++) {
      const temp = data[`${pre}_j${i}_temp`] ?? 38
      armTemps.push({
        loc: `${side}·J${i}`,
        temp,
        status: temp > 55 ? '🔴' : temp > 44 ? '🟡' : '🟢',
        color: temp > 55 ? theme.colors.statusError : temp > 44 ? theme.colors.statusWarn : theme.colors.statusOk,
      })
    }
  }
  // CPU temp
  armTemps.push({ loc: 'CPU', temp: data.cpu_temp ?? 52, status: (data.cpu_temp ?? 52) > 70 ? '🔴' : '🟡', color: theme.colors.statusWarn })

  return (
    <Wrap>
      {/* Left column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', overflowX: 'hidden' }}>
        <Card style={{ flex: '0 0 auto' }}>
          <Title>시스템 리소스</Title>
          <GaugeRow>
            <GLabel>CPU</GLabel>
            <GBar><GFill pct={data.cpu} /></GBar>
            <GVal hi={cpuHigh} warn={data.cpu > 65 && !cpuHigh}>{data.cpu?.toFixed(0)}%</GVal>
          </GaugeRow>
          {cpuHigh && <div style={{ fontSize: '10px', color: theme.colors.statusError, marginTop: '-2px' }}>⚠️ CPU 임계치 초과 (80%)</div>}
          <GaugeRow>
            <GLabel>Memory</GLabel>
            <GBar><GFill pct={data.memory} /></GBar>
            <GVal>{data.memory?.toFixed(0)}%</GVal>
          </GaugeRow>
          <GaugeRow>
            <GLabel>Battery</GLabel>
            <GBar><GFill pct={data.battery_percentage ?? 87} /></GBar>
            <GVal>{data.battery_voltage?.toFixed(1)}V</GVal>
          </GaugeRow>
          <GaugeRow>
            <GLabel>Network</GLabel>
            <GBar><GFill pct={Math.min(100, data.network_latency * 2)} /></GBar>
            <GVal warn={data.network_latency > 30}>{data.network_latency?.toFixed(0)}ms</GVal>
          </GaugeRow>
          <div style={{ height: '60px', marginTop: '2px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 2, right: 4, left: -22, bottom: 0 }}>
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
          <Title>시스템 경고</Title>
          {[
            { time: '14:23:21', msg: 'CPU usage exceeded 80% threshold', error: true },
            { time: '14:25:55', msg: '[LA] J3 motor temperature: 55°C (limit 60°C)', error: false },
            { time: '14:24:12', msg: '[RA] Gripper pressure sensor anomaly: finger 2', error: true },
            { time: '14:26:50', msg: 'Left hand tactile sensor unresponsive (F2, S3)', error: false },
            { time: '14:23:30', msg: 'Network latency spike: 45ms (threshold 20ms)', error: false },
            { time: '14:28:50', msg: '[RA] Grip force instability — auto-adjustment', error: true },
          ].map((a, i) => (
            <AlertItem key={i} error={a.error}>
              <span style={{ fontFamily: 'monospace' }}>[{a.time}]</span> {a.msg}
            </AlertItem>
          ))}
        </Card>

        <Card style={{ flex: '0 0 auto', minHeight: '140px' }}>
          <Title>온도 분포</Title>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
            {armTemps.map(t => (
              <TempItem key={t.loc}>
                <span>{t.status}</span>
                <span>{t.loc}:</span>
                <span style={{ fontWeight: 600, color: t.color }}>{t.temp.toFixed(0)}°C</span>
              </TempItem>
            ))}
          </div>
        </Card>
      </div>

      {/* Right column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', overflowX: 'hidden' }}>
        <Card style={{ flex: '0 0 auto' }}>
          <Title>ROS 토픽 상태</Title>
          <div style={{ overflow: 'visible' }}>
            {activeTopics.map(t => (
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
          <Title>센서 상태</Title>
          {[
            { label: 'LA Joint Encoders', val: '6/6', ok: true },
            { label: 'RA Joint Encoders', val: '6/6', ok: true },
            { label: 'LA Temp Sensors',   val: '6/6', ok: true },
            { label: 'RA Temp Sensors',   val: '6/6', ok: true },
            { label: 'LA Tactile (Hand)', val: '44/45', ok: false },
            { label: 'RA Pressure (Grip)',val: '2/2',   ok: true },
            { label: 'Wheel Encoders',    val: '2/2',   ok: true },
            { label: 'IMU / Vision',      val: '0/3',   ok: false, error: true },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', padding: '2px 4px', borderBottom: `1px solid ${theme.colors.borderLight}` }}>
              <span style={{ color: theme.colors.textSecondary }}>{s.label}</span>
              <span style={{ fontWeight: 600, color: s.error ? theme.colors.statusError : s.ok ? theme.colors.statusOk : theme.colors.statusWarn }}>
                {s.error ? '❌' : s.ok ? '✅' : '⚠️'} {s.val}
              </span>
            </div>
          ))}
        </Card>

        <Card style={{ flex: '0 0 auto', minHeight: '180px' }}>
          <Title>시스템 진단</Title>
          <div style={{ overflow: 'visible' }}>
            {[
              { label: 'Disk Usage',   val: '78%',        sub: '45GB / 58GB', warn: true },
              { label: 'Swap',         val: '12%',        sub: '0.5GB / 4GB', warn: false },
              { label: 'Load Avg',     val: '2.4',        sub: '2.1, 1.9 (1/5/15m)', warn: false },
              { label: 'Uptime',       val: '2d 14h 23m', sub: '', warn: false },
              { label: 'LA DOF',       val: '6',          sub: config?.leftArm?.eeLabel ?? '5-Finger Hand', warn: false },
              { label: 'RA DOF',       val: '6',          sub: config?.rightArm?.eeLabel ?? 'Parallel Jaw', warn: false },
              { label: 'Base Type',    val: config?.mobileBase?.type ?? 'Diff Drive', sub: `${config?.mobileBase?.wheelCount ?? 2} wheels`, warn: false },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', padding: '3px 6px', background: theme.colors.surface, borderRadius: '4px', border: `1px solid ${theme.colors.borderLight}`, marginBottom: '3px' }}>
                <span style={{ color: theme.colors.textSecondary }}>{s.label}</span>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 600, color: s.warn ? theme.colors.statusWarn : theme.colors.text }}>{s.val}</span>
                  {s.sub && <span style={{ fontSize: '9px', color: theme.colors.textMuted, marginLeft: '4px' }}>{s.sub}</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Wrap>
  )
}

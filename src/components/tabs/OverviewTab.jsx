import styled from 'styled-components'
import { theme } from '../../styles/theme'
import { ROBOT_CONFIG } from '../../data/mockData'

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  height: 100%;
  overflow: hidden;
`

const Card = styled.div`
  background: ${theme.colors.surfaceAlt};
  border: 1px solid ${theme.colors.borderLight};
  border-radius: 8px;
  padding: 10px 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const CardTitle = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${theme.colors.textMuted};
  padding-bottom: 4px;
  border-bottom: 1px solid ${theme.colors.borderLight};
`

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: ${theme.colors.text};
`

const StatusIcon = styled.span`
  font-size: 13px;
`

const Badge = styled.span`
  padding: 2px 7px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  background: ${p => p.ok ? '#E8F8F0' : p.warn ? '#FEF9E7' : p.error ? '#FDECEA' : theme.colors.bgDark};
  color: ${p => p.ok ? theme.colors.statusOk : p.warn ? theme.colors.statusWarn : p.error ? theme.colors.statusError : theme.colors.textSecondary};
  border: 1px solid ${p => p.ok ? '#B7DFCC' : p.warn ? '#F9E4A0' : p.error ? '#F5C0BA' : theme.colors.border};
`

const GaugeRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
`

const GaugeLabel = styled.div`
  display: flex;
  justify-content: space-between;
  color: ${theme.colors.textSecondary};
`

const GaugeBar = styled.div`
  height: 5px;
  background: ${theme.colors.bgDark};
  border-radius: 3px;
  overflow: hidden;
`

const GaugeFill = styled.div`
  height: 100%;
  width: ${p => p.pct}%;
  background: ${p => p.pct > 80 ? theme.colors.statusError : p.pct > 60 ? theme.colors.statusWarn : theme.colors.primary};
  border-radius: 3px;
  transition: width 0.3s;
`

const TopicList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: auto;
  flex: 1;
`

const TopicRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: ${theme.colors.textSecondary};
  font-family: 'Consolas', monospace;
`

const Dot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${p => p.status === 'ok' ? theme.colors.statusOk : p.status === 'warn' ? theme.colors.statusWarn : theme.colors.statusError};
`

const Hz = styled.span`
  margin-left: auto;
  color: ${theme.colors.textMuted};
`

const EventItem = styled.div`
  display: flex;
  gap: 6px;
  font-size: 11px;
  padding: 3px 0;
  border-bottom: 1px solid ${theme.colors.borderLight};
  &:last-child { border-bottom: none; }
`

const EventTime = styled.span`
  color: ${theme.colors.textMuted};
  font-family: monospace;
  flex-shrink: 0;
  font-size: 10px;
`

const EventMsg = styled.span`
  color: ${p => p.level === 'ERROR' ? theme.colors.statusError : p.level === 'WARN' ? theme.colors.statusWarn : theme.colors.text};
`

const EVENTS = [
  { time: '14:32:15', level: 'INFO', msg: 'Move command received → [45, -30, 90]' },
  { time: '14:32:16', level: 'INFO', msg: 'Joint motion started' },
  { time: '14:32:18', level: 'INFO', msg: 'Target position reached' },
  { time: '14:32:19', level: 'INFO', msg: 'Gripper close command' },
  { time: '14:32:20', level: 'ERROR', msg: 'Pressure sensor anomaly: finger 1' },
  { time: '14:32:21', level: 'WARN', msg: 'CPU usage spike: 89%' },
]

export default function OverviewTab({ data }) {
  if (!data) return null

  const j3hot = data.j3_temp > 50
  const cpuHigh = data.cpu > 80

  return (
    <Grid>
      {/* Status */}
      <Card>
        <CardTitle>로봇 현재 상태</CardTitle>
        <StatusRow>
          <StatusIcon>🔋</StatusIcon>
          <span>Battery:</span>
          <strong>{(data.battery_voltage).toFixed(1)}V</strong>
          <GaugeBar style={{ flex: 1 }}>
            <GaugeFill pct={87} />
          </GaugeBar>
          <Badge ok>87%</Badge>
        </StatusRow>
        <StatusRow>
          <StatusIcon>📡</StatusIcon>
          <span>Connection:</span>
          <Badge ok>Connected</Badge>
          <span style={{ fontSize: '11px', color: theme.colors.textMuted }}>{data.network_latency?.toFixed(0)}ms</span>
        </StatusRow>
        <StatusRow>
          <StatusIcon>⚙️</StatusIcon>
          <span>Mode:</span>
          <Badge ok>Auto Mode</Badge>
        </StatusRow>
        <div style={{ marginTop: '2px' }}>
          {['J1','J2','J3','J4','J5','J6'].map((j, i) => {
            const pos = [data.j1_pos, data.j2_pos, data.j3_pos, data.j4_pos, data.j5_pos, data.j6_pos][i]
            const torq = [data.j1_torque, data.j2_torque, data.j3_torque, data.j4_torque, data.j5_torque, data.j6_torque][i]
            const temp = [data.j1_temp, data.j2_temp, data.j3_temp, data.j1_temp, data.j2_temp, data.j3_temp][i]
            const isHot = j === 'J3' && j3hot
            return (
              <GaugeRow key={j}>
                <GaugeLabel>
                  <span style={{ color: isHot ? theme.colors.statusError : theme.colors.textSecondary }}>
                    {isHot ? '🔴' : '🟢'} {j}: {pos?.toFixed(1)}°
                  </span>
                  <span>{torq?.toFixed(2)}Nm · {temp?.toFixed(0)}°C</span>
                </GaugeLabel>
                <GaugeBar>
                  <GaugeFill pct={Math.abs(pos) / 1.8} />
                </GaugeBar>
              </GaugeRow>
            )
          })}
        </div>
        <StatusRow style={{ marginTop: '4px' }}>
          <StatusIcon>🤏</StatusIcon>
          <span>Gripper: {data.gripper_pos?.toFixed(1)}mm</span>
          <Badge ok>Open</Badge>
          <span style={{ fontSize: '11px', color: theme.colors.textMuted }}>{data.gripper_force?.toFixed(1)}N</span>
        </StatusRow>
        <StatusRow>
          <StatusIcon>🌡️</StatusIcon>
          <span>{j3hot ? '⚠️ J3: 55°C' : '42°C avg'}</span>
          {j3hot && <Badge warn>Approaching Limit</Badge>}
        </StatusRow>
      </Card>

      {/* Task Status */}
      <Card>
        <CardTitle>현재 작업 상태</CardTitle>
        <TopicList style={{ maxHeight: '90px' }}>
          {ROBOT_CONFIG.activeTopics.map(t => (
            <TopicRow key={t.name}>
              <Dot status={t.status} />
              <span>{t.name}</span>
              <Hz>{t.hz ? `${t.hz}Hz` : t.hz === 0 ? '0Hz' : 'var'}</Hz>
            </TopicRow>
          ))}
        </TopicList>
        <CardTitle style={{ marginTop: '4px' }}>최근 이벤트</CardTitle>
        <div style={{ overflow: 'auto', flex: 1 }}>
          {EVENTS.map((e, i) => (
            <EventItem key={i}>
              <EventTime>{e.time}</EventTime>
              <EventMsg level={e.level}>{e.level === 'ERROR' ? '❌' : e.level === 'WARN' ? '⚠️' : '●'} {e.msg}</EventMsg>
            </EventItem>
          ))}
        </div>
        <Card style={{ background: cpuHigh ? theme.colors.logWarn : theme.colors.logInfo, padding: '6px 8px' }}>
          <div style={{ fontSize: '11px', color: cpuHigh ? theme.colors.statusWarn : theme.colors.statusInfo, fontWeight: 600 }}>
            {cpuHigh ? '⚠️ CPU High: ' : '💻 CPU: '}{data.cpu?.toFixed(0)}%
            &nbsp;|&nbsp; Memory: {data.memory?.toFixed(0)}%
            &nbsp;|&nbsp; Power: {data.power_consumption?.toFixed(0)}W
          </div>
        </Card>
      </Card>
    </Grid>
  )
}

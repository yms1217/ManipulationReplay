import styled from 'styled-components'
import { theme } from '../../styles/theme'
import { ROBOT_CONFIG, ISSUES } from '../../data/mockData'

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
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 5px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: ${theme.colors.border}; border-radius: 2px; }
`

const CardTitle = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${theme.colors.textMuted};
  padding-bottom: 4px;
  border-bottom: 1px solid ${theme.colors.borderLight};
  flex-shrink: 0;
`

const ArmTitle = styled(CardTitle)`
  color: ${p => p.side === 'left' ? '#2C9E9E' : '#7B68EE'};
`

const Row = styled.div`display: flex; align-items: center; gap: 8px; font-size: 11px;`
const GaugeRow = styled.div`display: flex; flex-direction: column; gap: 2px; font-size: 10px;`
const GaugeLabel = styled.div`display: flex; justify-content: space-between; color: ${theme.colors.textSecondary};`

const GaugeBar = styled.div`
  height: 4px; background: ${theme.colors.bgDark}; border-radius: 2px; overflow: hidden;
`

const GaugeFill = styled.div`
  height: 100%; width: ${p => p.pct}%;
  background: ${p =>
    p.error ? theme.colors.statusError :
    p.warn ? theme.colors.statusWarn :
    p.side === 'right' ? '#7B68EE' : theme.colors.primary};
  border-radius: 2px; transition: width 0.3s;
`

const Badge = styled.span`
  padding: 1px 6px; border-radius: 8px; font-size: 10px; font-weight: 600;
  background: ${p => p.ok ? '#E8F8F0' : p.warn ? '#FEF9E7' : p.error ? '#FDECEA' : theme.colors.bgDark};
  color: ${p => p.ok ? theme.colors.statusOk : p.warn ? theme.colors.statusWarn : p.error ? theme.colors.statusError : theme.colors.textSecondary};
  border: 1px solid ${p => p.ok ? '#B7DFCC' : p.warn ? '#F9E4A0' : p.error ? '#F5C0BA' : theme.colors.border};
`

const TopicList = styled.div`
  display: flex; flex-direction: column; gap: 2px; overflow: auto; flex: 1; min-height: 0;
`

const TopicRow = styled.div`
  display: flex; align-items: center; gap: 5px; font-size: 10px;
  font-family: 'Consolas', monospace; color: ${theme.colors.textSecondary};
`

const Dot = styled.span`
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
  background: ${p => p.status === 'ok' ? theme.colors.statusOk : p.status === 'warn' ? theme.colors.statusWarn : theme.colors.statusError};
`

const Hz = styled.span`margin-left: auto; color: ${theme.colors.textMuted};`

const EventItem = styled.div`
  display: flex; gap: 6px; font-size: 10px; padding: 2px 0;
  border-bottom: 1px solid ${theme.colors.borderLight};
  &:last-child { border-bottom: none; }
`
const EventTime = styled.span`
  color: ${theme.colors.textMuted}; font-family: monospace; flex-shrink: 0;
`
const EventMsg = styled.span`
  color: ${p => p.level === 'ERROR' ? theme.colors.statusError : p.level === 'WARN' ? theme.colors.statusWarn : theme.colors.text};
`

// 최근 이벤트 (dual-arm context)
const RECENT_EVENTS = [
  { time: '14:22:12', level: 'WARN',  msg: '[LA] J2 velocity limit approach (85%)' },
  { time: '14:23:30', level: 'WARN',  msg: 'Network latency spike (45ms)' },
  { time: '14:24:12', level: 'ERROR', msg: '[RA] Gripper pressure anomaly: finger 2' },
  { time: '14:25:21', level: 'ERROR', msg: 'CPU spike: 89%' },
  { time: '14:25:55', level: 'WARN',  msg: '[LA] J3 motor 55°C — approaching limit' },
  { time: '14:28:00', level: 'INFO',  msg: '[LA] J2 recalibration completed' },
]

function ArmSection({ data, side }) {
  const pre = side === 'left' ? 'la' : 'ra'
  const joints = [1,2,3,4,5,6].map(i => ({
    name: `J${i}`,
    pos:  data[`${pre}_j${i}_pos`],
    torq: data[`${pre}_j${i}_torque`],
    temp: data[`${pre}_j${i}_temp`],
  }))
  const j3hot  = (joints[2].temp ?? 38) > 50
  const j2warn = (joints[1].torq ?? 0) > 2.3

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'visible' }}>
      <ArmTitle side={side}>{side === 'left' ? '◀ Left Arm' : 'Right Arm ▶'}</ArmTitle>
      {joints.map((j, i) => {
        const isHot  = i === 2 && j3hot
        const isWarn = i === 1 && j2warn
        return (
          <GaugeRow key={j.name}>
            <GaugeLabel>
              <span style={{ color: isHot ? theme.colors.statusError : isWarn ? theme.colors.statusWarn : theme.colors.textSecondary }}>
                {isHot ? '🔴' : isWarn ? '🟡' : '🟢'} {j.name}: {j.pos?.toFixed(1)}°
              </span>
              <span>{j.torq?.toFixed(2)}Nm · {j.temp?.toFixed(0)}°C</span>
            </GaugeLabel>
            <GaugeBar>
              <GaugeFill pct={Math.abs(j.pos ?? 0) / 1.8} error={isHot} warn={isWarn} side={side} />
            </GaugeBar>
          </GaugeRow>
        )
      })}
    </div>
  )
}

export default function OverviewTab({ data, chartData, config }) {
  if (!data) return null

  const cpuHigh = data.cpu > 80
  const activeTopics = config?.activeTopics ?? ROBOT_CONFIG.activeTopics

  return (
    <Grid>
      {/* Left: Robot status */}
      <Card>
        <CardTitle>시스템 상태</CardTitle>
        <Row>
          <span>🔋</span>
          <span>Battery: {data.battery_voltage?.toFixed(1)}V</span>
          <Badge ok={data.battery_percentage > 50} warn={data.battery_percentage <= 50 && data.battery_percentage > 20} error={data.battery_percentage <= 20}>
            {data.battery_percentage?.toFixed(0)}%
          </Badge>
        </Row>
        <Row>
          <span>📡</span>
          <span>Network:</span>
          <Badge ok={data.network_latency < 25} warn={data.network_latency >= 25}>
            {data.network_latency?.toFixed(0)}ms
          </Badge>
          <span style={{ fontSize: '11px', color: theme.colors.textMuted }}>latency</span>
        </Row>
        <Row>
          <span>💻</span>
          <span>CPU: {data.cpu?.toFixed(0)}%</span>
          {cpuHigh && <Badge error>High!</Badge>}
        </Row>
        <Row>
          <span>🛞</span>
          <span>Base: {data.base_vel_linear != null
            ? `${data.base_vel_linear?.toFixed(2)}m/s · ${data.base_heading?.toFixed(0)}°`
            : '—'}
          </span>
        </Row>

        <div style={{ marginTop: '2px', minHeight: '200px', display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'visible' }}>
          <ArmSection data={data} side="left" />
          <div style={{ height: '2px' }} />
          <ArmSection data={data} side="right" />
        </div>

        <div style={{
          marginTop: '2px', fontSize: '11px', padding: '4px 8px',
          background: cpuHigh ? theme.colors.logWarn : theme.colors.logInfo,
          borderRadius: '5px',
          color: cpuHigh ? theme.colors.statusWarn : theme.colors.statusInfo,
          fontWeight: 600, flexShrink: 0,
        }}>
          {cpuHigh ? '⚠️ CPU High: ' : '💻 CPU: '}{data.cpu?.toFixed(0)}%
          &nbsp;|&nbsp;Mem: {data.memory?.toFixed(0)}%
          &nbsp;|&nbsp;Power: {data.power_consumption?.toFixed(0)}W
        </div>
      </Card>

      {/* Right: Topics + EE + Recent Events */}
      <Card>
        <CardTitle>ROS 토픽 현황</CardTitle>
        <TopicList style={{ maxHeight: '90px' }}>
          {activeTopics.map(t => (
            <TopicRow key={t.name}>
              <Dot status={t.status} />
              <span>{t.name}</span>
              <Hz>{t.hz != null ? (t.hz === 0 ? '0Hz' : `${t.hz}Hz`) : 'var'}</Hz>
            </TopicRow>
          ))}
        </TopicList>

        <CardTitle style={{ marginTop: '4px', flexShrink: 0 }}>End-Effector</CardTitle>
        <div style={{ flexShrink: 0 }}>
          <Row style={{ marginBottom: '3px' }}>
            <span style={{ color: '#2C9E9E', fontWeight: 700, fontSize: '10px', minWidth: '28px' }}>LA</span>
            {data.la_ee_type === 'hand' ? (
              <>
                <Badge ok>✋ Hand</Badge>
                <span style={{ fontSize: '10px', color: theme.colors.textMuted }}>
                  {data.la_hand_stability?.toFixed(0)}% stable
                </span>
                {data.la_is_grasping && <Badge ok>Grasping</Badge>}
              </>
            ) : (
              <>
                <Badge ok>🤏 Gripper</Badge>
                <span style={{ fontSize: '10px', color: theme.colors.textMuted }}>
                  {data.la_gripper_pos?.toFixed(1)}mm
                </span>
              </>
            )}
          </Row>
          <Row>
            <span style={{ color: '#7B68EE', fontWeight: 700, fontSize: '10px', minWidth: '28px' }}>RA</span>
            {data.ra_ee_type === 'hand' ? (
              <>
                <Badge ok>✋ Hand</Badge>
                <span style={{ fontSize: '10px', color: theme.colors.textMuted }}>
                  {data.ra_hand_stability?.toFixed(0)}% stable
                </span>
              </>
            ) : (
              <>
                <Badge ok={data.ra_finger2_pressure > 1.5} error={data.ra_finger2_pressure < 1.2}>🤏 Gripper</Badge>
                <span style={{ fontSize: '10px', color: theme.colors.textMuted }}>
                  {data.ra_gripper_pos?.toFixed(1)}mm · {data.ra_gripper_force?.toFixed(1)}N
                </span>
                {data.ra_is_grasping && <Badge ok>Grasping</Badge>}
              </>
            )}
          </Row>
        </div>

        <CardTitle style={{ marginTop: '4px', flexShrink: 0 }}>최근 이벤트</CardTitle>
        <div style={{ overflow: 'auto', minHeight: '80px' }}>
          {RECENT_EVENTS.map((e, i) => (
            <EventItem key={i}>
              <EventTime>{e.time}</EventTime>
              <EventMsg level={e.level}>
                {e.level === 'ERROR' ? '❌' : e.level === 'WARN' ? '⚠️' : '●'} {e.msg}
              </EventMsg>
            </EventItem>
          ))}
        </div>
      </Card>
    </Grid>
  )
}

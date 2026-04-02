import styled from 'styled-components'
import { theme } from '../../styles/theme'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

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

const StatRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: ${theme.colors.textSecondary};
`

const BigVal = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: ${theme.colors.primary};
`

const GaugeRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const GaugeBar = styled.div`
  height: 8px;
  background: ${theme.colors.bgDark};
  border-radius: 4px;
  overflow: hidden;
`

const GaugeFill = styled.div`
  height: 100%;
  width: ${p => p.pct}%;
  background: ${p => p.warn ? theme.colors.statusWarn : p.error ? theme.colors.statusError : theme.colors.primary};
  border-radius: 4px;
  transition: width 0.3s;
`

const HeatmapRow = styled.div`
  display: flex;
  gap: 2px;
  align-items: center;
  font-size: 10px;
`

const HeatCell = styled.div`
  width: 14px;
  height: 14px;
  border-radius: 2px;
  background: ${p => {
    const v = p.val // 0-1
    if (v < 0.25) return '#27AE60'
    if (v < 0.5) return '#F1C40F'
    if (v < 0.75) return '#E67E22'
    return '#E74C3C'
  }};
`

const EventList = styled.div`
  overflow: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const EventItem = styled.div`
  font-size: 10px;
  padding: 3px 5px;
  background: ${p => p.error ? theme.colors.logError : p.warn ? theme.colors.logWarn : theme.colors.surface};
  border-left: 2px solid ${p => p.error ? theme.colors.statusError : p.warn ? theme.colors.statusWarn : theme.colors.borderLight};
  border-radius: 0 3px 3px 0;
  color: ${theme.colors.textSecondary};
`

const EVENTS = [
  { time: '14:32:19', msg: 'Close command received (target: 5.0N)', warn: false, error: false },
  { time: '14:32:20', msg: '⚠️ Pressure sensor anomaly on finger 2', warn: false, error: true },
  { time: '14:32:21', msg: 'Grip adjustment attempted', warn: true, error: false },
  { time: '14:32:22', msg: 'Stable grip achieved (4.8N)', warn: false, error: false },
  { time: '14:32:25', msg: 'Object detected — size: 25x15mm, 95% confidence', warn: false, error: false },
]

export default function GripperAnalysisTab({ data, chartData }) {
  if (!data) return null

  const f2anomaly = data.finger2_pressure < 2.0

  // Build heatmap data
  const f1cells = [0.2, 0.3, 0.4, 0.6, 0.65, 0.75, 0.9, 0.95]
  const f2cells = f2anomaly
    ? [0.2, 0.4, 0.6, 0.8, 0.9, 0.95, 0.98, 1.0]
    : [0.2, 0.3, 0.4, 0.55, 0.6, 0.7, 0.8, 0.85]

  return (
    <Wrap>
      {/* Left: Grasp State */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
        <Card style={{ flex: '0 0 auto' }}>
          <Title>파지 상태</Title>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '10px', color: theme.colors.textMuted }}>개방 거리</div>
              <BigVal>{data.gripper_pos?.toFixed(1)}</BigVal>
              <span style={{ fontSize: '11px', color: theme.colors.textMuted }}>mm / 50mm</span>
            </div>
            <div style={{ flex: 1 }}>
              <GaugeRow>
                <div style={{ fontSize: '10px', color: theme.colors.textMuted, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Finger 1: {data.finger1_pressure?.toFixed(1)}N</span>
                  <span style={{ color: theme.colors.statusOk }}>Normal</span>
                </div>
                <GaugeBar>
                  <GaugeFill pct={(data.finger1_pressure / 10) * 100} />
                </GaugeBar>
              </GaugeRow>
              <GaugeRow style={{ marginTop: '4px' }}>
                <div style={{ fontSize: '10px', color: theme.colors.textMuted, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Finger 2: {data.finger2_pressure?.toFixed(1)}N</span>
                  {f2anomaly
                    ? <span style={{ color: theme.colors.statusError }}>⚠️ Anomaly</span>
                    : <span style={{ color: theme.colors.statusOk }}>Normal</span>
                  }
                </div>
                <GaugeBar>
                  <GaugeFill pct={(data.finger2_pressure / 10) * 100} warn={f2anomaly} />
                </GaugeBar>
              </GaugeRow>
            </div>
          </div>
          <StatRow>
            <span>Object Detected:</span>
            <span style={{ color: theme.colors.statusOk }}>🟢 95% Confidence</span>
          </StatRow>
          <StatRow>
            <span>Est. Size:</span>
            <span>25mm × 15mm</span>
          </StatRow>
          <StatRow>
            <span>Force:</span>
            <span>{data.gripper_force?.toFixed(1)}N / 5.0N target</span>
          </StatRow>
        </Card>

        <Card style={{ flex: '0 0 auto' }}>
          <Title>압력 분포 히트맵</Title>
          <div style={{ fontSize: '10px', color: theme.colors.textMuted, marginBottom: '3px' }}>Finger 1 (Normal)</div>
          <HeatmapRow>
            {f1cells.map((v, i) => <HeatCell key={i} val={v} />)}
            <span style={{ marginLeft: '4px', color: theme.colors.textMuted }}>{data.finger1_pressure?.toFixed(1)}N</span>
          </HeatmapRow>
          <div style={{ fontSize: '10px', color: f2anomaly ? theme.colors.statusError : theme.colors.textMuted, marginTop: '4px', marginBottom: '3px' }}>
            Finger 2 {f2anomaly ? '⚠️ Uneven pressure' : '(Normal)'}
          </div>
          <HeatmapRow>
            {f2cells.map((v, i) => <HeatCell key={i} val={v} />)}
            <span style={{ marginLeft: '4px', color: theme.colors.textMuted }}>{data.finger2_pressure?.toFixed(1)}N</span>
          </HeatmapRow>
        </Card>

        <Card style={{ flex: 1, minHeight: 0 }}>
          <Title>그리퍼 이벤트</Title>
          <EventList>
            {EVENTS.map((e, i) => (
              <EventItem key={i} error={e.error} warn={e.warn}>
                <span style={{ fontFamily: 'monospace' }}>[{e.time}]</span> {e.msg}
              </EventItem>
            ))}
          </EventList>
        </Card>
      </div>

      {/* Right: Charts */}
      <Card>
        <Title>시계열 차트</Title>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '10px', color: theme.colors.textMuted }}>개방 거리 (mm)</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="45%">
              <AreaChart data={chartData} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="time" tick={{ fontSize: 8 }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 8 }} tickLine={false} domain={[0, 50]} />
                <Tooltip contentStyle={{ fontSize: 10 }} />
                <Area dataKey="gripper_pos" stroke={theme.colors.chartLine1} fill={theme.colors.chartLine1 + '20'} dot={false} strokeWidth={1.5} name="Opening (mm)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ fontSize: '10px', color: theme.colors.textMuted }}>압력 센서 (N)</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="45%">
              <LineChart data={chartData} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="time" tick={{ fontSize: 8 }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 8 }} tickLine={false} domain={[0, 8]} />
                <Tooltip contentStyle={{ fontSize: 10 }} />
                <ReferenceLine y={5} stroke={theme.colors.statusWarn} strokeDasharray="3 3" />
                <Line dataKey="finger1_pressure" stroke={theme.colors.chartLine1} dot={false} strokeWidth={1.5} name="Finger 1 (N)" />
                <Line dataKey="finger2_pressure" stroke={theme.colors.chartLine2} dot={false} strokeWidth={1.5} name="Finger 2 (N)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ padding: '4px 6px', background: theme.colors.logInfo, borderRadius: '4px', fontSize: '11px', color: theme.colors.statusInfo }}>
            💡 Finger 2 pressure instability detected · Recommended: sensor calibration
          </div>
        </div>
      </Card>
    </Wrap>
  )
}

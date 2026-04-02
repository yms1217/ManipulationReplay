import styled from 'styled-components'
import { theme } from '../../styles/theme'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'

const Wrap = styled.div`
  display: grid;
  grid-template-columns: 3fr 2fr;
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

const MetricRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const MetricLabel = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: ${theme.colors.textSecondary};
`

const ProgBar = styled.div`
  height: 6px;
  background: ${theme.colors.bgDark};
  border-radius: 3px;
  overflow: hidden;
`

const ProgFill = styled.div`
  height: 100%;
  width: ${p => p.pct}%;
  background: ${p => p.pct < 70 ? theme.colors.statusError : p.pct < 85 ? theme.colors.statusWarn : theme.colors.primary};
  border-radius: 3px;
  transition: width 0.3s;
`

const StatItem = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  padding: 3px 6px;
  background: ${theme.colors.surface};
  border-radius: 4px;
  border: 1px solid ${theme.colors.borderLight};
`

const PatternAlert = styled.div`
  padding: 6px 8px;
  background: ${theme.colors.logWarn};
  border-left: 3px solid ${theme.colors.statusWarn};
  border-radius: 0 4px 4px 0;
  font-size: 11px;
  color: ${theme.colors.textSecondary};
`

const ACCURACY = [
  { joint: 'J1', rms: 0.1, max: 0.5, pct: 98 },
  { joint: 'J2', rms: 0.8, max: 1.5, pct: 85 },
  { joint: 'J3', rms: 0.2, max: 0.8, pct: 96 },
  { joint: 'J4', rms: 0.3, max: 0.9, pct: 94 },
  { joint: 'J5', rms: 0.4, max: 1.0, pct: 92 },
  { joint: 'J6', rms: 0.1, max: 0.4, pct: 99 },
]

const ERR_FREQ = [
  { t: '14:20', errors: 0, warns: 1 },
  { t: '14:22', errors: 1, warns: 1 },
  { t: '14:24', errors: 1, warns: 2 },
  { t: '14:26', errors: 2, warns: 1 },
  { t: '14:28', errors: 0, warns: 1 },
  { t: '14:30', errors: 1, warns: 2 },
  { t: '14:32', errors: 0, warns: 0 },
]

export default function PerformanceTab({ data, chartData }) {
  if (!data) return null

  const pressureStability = data.grip_pressure_stability
  const gripPct = pressureStability

  return (
    <Wrap>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
        {/* Joint Accuracy */}
        <Card style={{ flex: '0 0 auto' }}>
          <Title>Joint 정확도 (RMS 오차)</Title>
          {ACCURACY.map(a => (
            <MetricRow key={a.joint}>
              <MetricLabel>
                <span>{a.joint}</span>
                <span style={{ color: a.pct < 90 ? theme.colors.statusWarn : theme.colors.statusOk }}>
                  {a.pct}% · RMS: {a.rms}° · Max: {a.max}°
                </span>
              </MetricLabel>
              <ProgBar>
                <ProgFill pct={a.pct} />
              </ProgBar>
            </MetricRow>
          ))}
        </Card>

        {/* Gripper & Power */}
        <Card style={{ flex: '0 0 auto' }}>
          <Title>그리퍼 & 전력 성능</Title>
          <MetricRow>
            <MetricLabel>
              <span>Grip Pressure Stability</span>
              <span style={{ color: gripPct < 80 ? theme.colors.statusWarn : theme.colors.statusOk }}>{gripPct?.toFixed(0)}%</span>
            </MetricLabel>
            <ProgBar>
              <ProgFill pct={gripPct} />
            </ProgBar>
          </MetricRow>
          <MetricRow>
            <MetricLabel>
              <span>Grip Success Rate</span>
              <span style={{ color: theme.colors.statusOk }}>95%</span>
            </MetricLabel>
            <ProgBar>
              <ProgFill pct={95} />
            </ProgBar>
          </MetricRow>
          <MetricRow>
            <MetricLabel>
              <span>Power Efficiency</span>
              <span style={{ color: theme.colors.statusOk }}>89%</span>
            </MetricLabel>
            <ProgBar>
              <ProgFill pct={89} />
            </ProgBar>
          </MetricRow>
          <div style={{ fontSize: '11px', color: theme.colors.textSecondary, marginTop: '2px' }}>
            Current Draw: {data.battery_current?.toFixed(1)}A &nbsp;|&nbsp; Power: {data.power_consumption?.toFixed(0)}W &nbsp;|&nbsp; Efficiency: 89%
          </div>
        </Card>

        {/* Error Frequency */}
        <Card style={{ flex: 1, minHeight: 0 }}>
          <Title>에러 빈도 (10분)</Title>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ERR_FREQ} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="t" tick={{ fontSize: 8 }} tickLine={false} />
                <YAxis tick={{ fontSize: 8 }} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 10 }} />
                <Bar dataKey="errors" fill={theme.colors.statusError} name="Errors" />
                <Bar dataKey="warns" fill={theme.colors.statusWarn} name="Warnings" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
        <Card style={{ flex: '0 0 auto' }}>
          <Title>세션 통계</Title>
          {[
            { label: 'Total Errors', val: '5', color: theme.colors.statusError },
            { label: 'Total Warnings', val: '8', color: theme.colors.statusWarn },
            { label: 'Avg Response Time', val: '0.15s', color: theme.colors.text },
            { label: 'Peak CPU', val: '89% @14:25', color: theme.colors.statusWarn },
            { label: 'Total Commands', val: '42', color: theme.colors.text },
            { label: 'Success Rate', val: '95.2%', color: theme.colors.statusOk },
          ].map((s, i) => (
            <StatItem key={i}>
              <span style={{ color: theme.colors.textSecondary }}>{s.label}</span>
              <span style={{ fontWeight: 600, color: s.color }}>{s.val}</span>
            </StatItem>
          ))}
        </Card>

        <Card style={{ flex: '0 0 auto' }}>
          <Title>감지된 패턴</Title>
          <PatternAlert>
            <div style={{ fontWeight: 600, color: theme.colors.statusWarn }}>⚠️ Recurring Issue Detected</div>
            <div style={{ marginTop: '3px' }}>Gripper pressure sensor instability</div>
            <div style={{ color: theme.colors.textMuted, marginTop: '2px' }}>Frequency: every 3-4 grip attempts</div>
            <div style={{ color: theme.colors.primary, marginTop: '2px' }}>→ Sensor calibration recommended</div>
          </PatternAlert>
          <PatternAlert style={{ background: theme.colors.logError, borderColor: theme.colors.statusError }}>
            <div style={{ fontWeight: 600, color: theme.colors.statusError }}>🔴 Temperature Trend</div>
            <div style={{ marginTop: '3px' }}>J3 motor temp rising (38→55°C)</div>
            <div style={{ color: theme.colors.primary, marginTop: '2px' }}>→ Thermal inspection needed</div>
          </PatternAlert>
        </Card>

        <Card style={{ flex: 1, minHeight: 0 }}>
          <Title>전체 성능 트렌드</Title>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.slice(-60)} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="time" tick={{ fontSize: 7 }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 7 }} tickLine={false} domain={[0, 120]} />
                <Tooltip contentStyle={{ fontSize: 9 }} />
                <ReferenceLine y={80} stroke={theme.colors.statusWarn} strokeDasharray="3 3" />
                <Line dataKey="cpu" stroke={theme.colors.chartLine2} dot={false} strokeWidth={1} name="CPU%" />
                <Line dataKey="power_consumption" stroke={theme.colors.chartLine3} dot={false} strokeWidth={1} name="Power(W)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ fontSize: '11px', padding: '4px 6px', background: theme.colors.logInfo, borderRadius: '4px', color: theme.colors.statusInfo }}>
            📈 Overall: 85% stable · Trend: ↗ Slight improvement
          </div>
        </Card>
      </div>
    </Wrap>
  )
}

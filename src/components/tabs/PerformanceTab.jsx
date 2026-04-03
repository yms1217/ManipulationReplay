import styled from 'styled-components'
import { theme } from '../../styles/theme'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

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

const MetricRow = styled.div`display: flex; flex-direction: column; gap: 2px;`

const MetricLabel = styled.div`
  display: flex; justify-content: space-between; font-size: 10px;
  color: ${theme.colors.textSecondary};
`

const ProgBar = styled.div`
  height: 5px; background: ${theme.colors.bgDark}; border-radius: 3px; overflow: hidden;
`

const ProgFill = styled.div`
  height: 100%; width: ${p => p.pct}%;
  background: ${p =>
    p.pct < 70 ? theme.colors.statusError :
    p.pct < 85 ? theme.colors.statusWarn :
    p.color ?? theme.colors.primary};
  border-radius: 3px; transition: width 0.3s;
`

const StatItem = styled.div`
  display: flex; justify-content: space-between; font-size: 10px; padding: 3px 6px;
  background: ${theme.colors.surface}; border-radius: 4px; border: 1px solid ${theme.colors.borderLight};
`

const PatternAlert = styled.div`
  padding: 5px 7px;
  background: ${theme.colors.logWarn};
  border-left: 3px solid ${theme.colors.statusWarn};
  border-radius: 0 4px 4px 0;
  font-size: 10px; color: ${theme.colors.textSecondary};
  margin-bottom: 3px;
`

const ArmRow = styled.div`
  display: grid; grid-template-columns: 40px 1fr 50px;
  align-items: center; gap: 6px; font-size: 10px;
`

const ArmLabel = styled.span`
  font-weight: 700;
  color: ${p => p.side === 'left' ? '#2C9E9E' : '#7B68EE'};
`

const ERR_FREQ = [
  { t: '0m',  la: 0, ra: 0 },
  { t: '2m',  la: 1, ra: 0 },
  { t: '4m',  la: 1, ra: 1 },
  { t: '6m',  la: 0, ra: 2 },
  { t: '8m',  la: 1, ra: 0 },
  { t: '10m', la: 0, ra: 1 },
]

export default function PerformanceTab({ data, chartData }) {
  if (!data) return null

  const laSucc = data.la_grip_success_rate ?? 93
  const raSucc = data.ra_grip_success_rate ?? 95
  const pressStab = data.grip_pressure_stability ?? 85

  const laAccuracy = [
    { j: 'J1', err: data.la_j1_error ?? 0.1,  pct: Math.max(0, 100 - (data.la_j1_error ?? 0.1) * 50) },
    { j: 'J2', err: data.la_j2_error ?? 0.8,  pct: Math.max(0, 100 - (data.la_j2_error ?? 0.8) * 50) },
    { j: 'J3', err: data.la_j3_error ?? 0.2,  pct: Math.max(0, 100 - (data.la_j3_error ?? 0.2) * 50) },
  ]
  const raAccuracy = [
    { j: 'J1', err: data.ra_j1_error ?? 0.12, pct: Math.max(0, 100 - (data.ra_j1_error ?? 0.12) * 50) },
    { j: 'J2', err: data.ra_j2_error ?? 0.7,  pct: Math.max(0, 100 - (data.ra_j2_error ?? 0.7) * 50) },
    { j: 'J3', err: data.ra_j3_error ?? 0.18, pct: Math.max(0, 100 - (data.ra_j3_error ?? 0.18) * 50) },
  ]

  return (
    <Wrap>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', overflowX: 'hidden' }}>
        {/* Joint Accuracy comparison */}
        <Card style={{ flex: '0 0 auto' }}>
          <Title>Dual-Arm 정확도 비교 (J1-J3)</Title>
          <div style={{ display: 'flex', gap: '12px' }}>
            {/* Left arm */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#2C9E9E', marginBottom: '4px' }}>◀ Left Arm</div>
              {laAccuracy.map(a => (
                <MetricRow key={a.j} style={{ marginBottom: '4px' }}>
                  <MetricLabel>
                    <span>{a.j}</span>
                    <span style={{ color: a.pct < 90 ? theme.colors.statusWarn : theme.colors.statusOk }}>
                      {a.pct.toFixed(0)}% · ±{a.err.toFixed(2)}°
                    </span>
                  </MetricLabel>
                  <ProgBar><ProgFill pct={a.pct} color="#2C9E9E" /></ProgBar>
                </MetricRow>
              ))}
            </div>
            {/* Right arm */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#7B68EE', marginBottom: '4px' }}>Right Arm ▶</div>
              {raAccuracy.map(a => (
                <MetricRow key={a.j} style={{ marginBottom: '4px' }}>
                  <MetricLabel>
                    <span>{a.j}</span>
                    <span style={{ color: a.pct < 90 ? theme.colors.statusWarn : theme.colors.statusOk }}>
                      {a.pct.toFixed(0)}% · ±{a.err.toFixed(2)}°
                    </span>
                  </MetricLabel>
                  <ProgBar><ProgFill pct={a.pct} color="#7B68EE" /></ProgBar>
                </MetricRow>
              ))}
            </div>
          </div>
        </Card>

        {/* EE performance */}
        <Card style={{ flex: '0 0 auto' }}>
          <Title>End-Effector 성능</Title>
          <ArmRow>
            <ArmLabel side="left">LA EE</ArmLabel>
            <ProgBar><ProgFill pct={laSucc} color="#2C9E9E" /></ProgBar>
            <span style={{ color: theme.colors.textSecondary, textAlign: 'right' }}>{laSucc.toFixed(0)}% succ</span>
          </ArmRow>
          <ArmRow>
            <ArmLabel side="right">RA EE</ArmLabel>
            <ProgBar><ProgFill pct={raSucc} color="#7B68EE" /></ProgBar>
            <span style={{ color: theme.colors.textSecondary, textAlign: 'right' }}>{raSucc.toFixed(0)}% succ</span>
          </ArmRow>
          <ArmRow>
            <span style={{ color: theme.colors.textMuted }}>Press</span>
            <ProgBar><ProgFill pct={pressStab} /></ProgBar>
            <span style={{ color: theme.colors.textSecondary, textAlign: 'right' }}>{pressStab.toFixed(0)}% stab</span>
          </ArmRow>
          <div style={{ fontSize: '10px', color: theme.colors.textSecondary, marginTop: '2px' }}>
            Power: {data.power_consumption?.toFixed(0)}W · Draw: {data.battery_current?.toFixed(1)}A
          </div>
        </Card>

        {/* Error frequency */}
        <Card style={{ flex: '0 0 auto', minHeight: '180px' }}>
          <Title>에러 빈도 — Dual Arm</Title>
          <div style={{ height: '150px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ERR_FREQ} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="t" tick={{ fontSize: 8 }} tickLine={false} />
                <YAxis tick={{ fontSize: 8 }} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 9 }} />
                <Bar dataKey="la" fill="#2C9E9E" name="Left Arm" />
                <Bar dataKey="ra" fill="#7B68EE" name="Right Arm" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', overflowX: 'hidden' }}>
        <Card style={{ flex: '0 0 auto' }}>
          <Title>세션 통계</Title>
          {[
            { label: 'LA Success Rate', val: `${laSucc.toFixed(0)}%`, color: theme.colors.statusOk },
            { label: 'RA Success Rate', val: `${raSucc.toFixed(0)}%`, color: theme.colors.statusOk },
            { label: 'Total Errors',    val: '5', color: theme.colors.statusError },
            { label: 'Total Warnings',  val: '8', color: theme.colors.statusWarn },
            { label: 'Peak CPU',        val: '89%', color: theme.colors.statusWarn },
            { label: 'Avg Response',    val: '0.15s', color: theme.colors.text },
            { label: 'Power (avg)',      val: `${data.power_consumption?.toFixed(0)}W`, color: theme.colors.text },
          ].map((s, i) => (
            <StatItem key={i}>
              <span style={{ color: theme.colors.textSecondary }}>{s.label}</span>
              <span style={{ fontWeight: 600, color: s.color }}>{s.val}</span>
            </StatItem>
          ))}
        </Card>

        <Card style={{ flex: '0 0 auto' }}>
          <Title>감지된 이슈 패턴</Title>
          <PatternAlert>
            <div style={{ fontWeight: 600, color: theme.colors.statusWarn }}>⚠️ RA Gripper 불안정</div>
            <div style={{ marginTop: '2px' }}>Pressure sensor 주기적 이상</div>
            <div style={{ color: theme.colors.primary, marginTop: '2px' }}>→ 센서 캘리브레이션 권장</div>
          </PatternAlert>
          <PatternAlert style={{ background: theme.colors.logError, borderColor: theme.colors.statusError }}>
            <div style={{ fontWeight: 600, color: theme.colors.statusError }}>🔴 LA J3 온도 상승</div>
            <div style={{ marginTop: '2px' }}>38°C → 55°C 지속 상승</div>
            <div style={{ color: theme.colors.primary, marginTop: '2px' }}>→ 열 점검 필요</div>
          </PatternAlert>
        </Card>

        <Card style={{ flex: '0 0 auto', minHeight: '180px' }}>
          <Title>성능 추이</Title>
          <div style={{ height: '140px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 2, right: 4, left: -22, bottom: 0 }}>
                <XAxis dataKey="time" tick={{ fontSize: 7 }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 7 }} tickLine={false} domain={[0, 120]} />
                <Tooltip contentStyle={{ fontSize: 9 }} />
                <ReferenceLine y={80} stroke={theme.colors.statusWarn} strokeDasharray="3 3" />
                <Line dataKey="cpu" stroke={theme.colors.chartLine2} dot={false} strokeWidth={1} name="CPU%" />
                <Line dataKey="la_j3_temp" stroke="#2C9E9E" dot={false} strokeWidth={1} strokeOpacity={0.7} name="LA J3°C" />
                <Line dataKey="ra_j3_temp" stroke="#7B68EE" dot={false} strokeWidth={1} strokeOpacity={0.7} name="RA J3°C" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ fontSize: '10px', padding: '3px 6px', background: theme.colors.logInfo, borderRadius: '4px', color: theme.colors.statusInfo }}>
            📈 Dual-Arm Overall: 88% stable
          </div>
        </Card>
      </div>
    </Wrap>
  )
}

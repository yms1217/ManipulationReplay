import { useState } from 'react'
import styled from 'styled-components'
import { theme } from '../styles/theme'
import OverviewTab      from './tabs/OverviewTab'
import ArmAnalysisTab   from './tabs/ArmAnalysisTab'
import EndEffectorTab   from './tabs/EndEffectorTab'
import SystemStatusTab  from './tabs/SystemStatusTab'
import PerformanceTab   from './tabs/PerformanceTab'

const Panel = styled.div`
  width: 100%;
  height: 100%;
  background: ${theme.colors.surface};
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  box-shadow: ${theme.shadow.sm};
  border: 1px solid ${theme.colors.border};
  overflow: hidden;
`

const TabBar = styled.div`
  display: flex;
  border-bottom: 2px solid ${theme.colors.border};
  background: ${theme.colors.bg};
  flex-shrink: 0;
  overflow-x: auto;
  &::-webkit-scrollbar { height: 3px; }
  &::-webkit-scrollbar-thumb { background: ${theme.colors.border}; border-radius: 2px; }
`

const Tab = styled.button`
  padding: 0 13px;
  height: 36px;
  border: none;
  background: transparent;
  color: ${p => p.active ? theme.colors.primary : theme.colors.tabInactive};
  font-size: 12px;
  font-weight: ${p => p.active ? 700 : 500};
  cursor: pointer;
  white-space: nowrap;
  position: relative;
  border-bottom: 2px solid ${p => p.active ? theme.colors.primary : 'transparent'};
  margin-bottom: -2px;
  transition: color 0.15s;
  display: flex;
  align-items: center;
  gap: 5px;
  &:hover { color: ${theme.colors.primary}; }
`

const AlertDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${p => p.error ? theme.colors.statusError : theme.colors.statusWarn};
  flex-shrink: 0;
`

const Content = styled.div`
  flex: 1;
  overflow: hidden;
  padding: 10px;
  min-height: 0;
`

export default function AnalysisPanel({ data, chartData, config }) {
  const [activeTab, setActiveTab] = useState('overview')

  const laJ3Hot   = data && (data.la_j3_temp > 50)
  const laJ2Warn  = data && (data.la_j2_torque > 2.3)
  const raGripErr = data && (data.ra_finger2_pressure != null && data.ra_finger2_pressure < 1.2)
  const hasSysErr = data && (data.cpu > 80 || data.network_latency > 30)
  const hasArmErr = laJ3Hot || laJ2Warn

  const tabs = [
    { id: 'overview',    label: 'Overview',    icon: '📊', alert: null },
    { id: 'left_arm',    label: 'Left Arm',    icon: '◀🦾', alert: hasArmErr ? 'error' : null },
    { id: 'right_arm',   label: 'Right Arm',   icon: '🦾▶', alert: raGripErr ? 'error' : null },
    { id: 'endeffector', label: 'End-Effector',icon: '🤌',  alert: raGripErr ? 'error' : null },
    { id: 'system',      label: 'System',      icon: '🖥️', alert: hasSysErr ? 'error' : null },
    { id: 'performance', label: 'Performance', icon: '📈', alert: null },
  ]

  return (
    <Panel>
      <TabBar>
        {tabs.map(t => (
          <Tab key={t.id} active={activeTab === t.id} onClick={() => setActiveTab(t.id)}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
            {t.alert && <AlertDot error={t.alert === 'error'} />}
          </Tab>
        ))}
      </TabBar>
      <Content>
        {activeTab === 'overview'    && <OverviewTab     data={data} chartData={chartData} config={config} />}
        {activeTab === 'left_arm'    && <ArmAnalysisTab  data={data} chartData={chartData} side="left" />}
        {activeTab === 'right_arm'   && <ArmAnalysisTab  data={data} chartData={chartData} side="right" />}
        {activeTab === 'endeffector' && <EndEffectorTab  data={data} chartData={chartData} config={config} />}
        {activeTab === 'system'      && <SystemStatusTab data={data} chartData={chartData} config={config} />}
        {activeTab === 'performance' && <PerformanceTab  data={data} chartData={chartData} />}
      </Content>
    </Panel>
  )
}

import { useState } from 'react'
import styled from 'styled-components'
import { theme } from '../styles/theme'
import OverviewTab from './tabs/OverviewTab'
import ArmAnalysisTab from './tabs/ArmAnalysisTab'
import GripperAnalysisTab from './tabs/GripperAnalysisTab'
import HandAnalysisTab from './tabs/HandAnalysisTab'
import SystemStatusTab from './tabs/SystemStatusTab'
import PerformanceTab from './tabs/PerformanceTab'

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
  padding: 0 14px;
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

  // Derive alert dots from live data
  const hasArmError   = data && (data.j3_temp > 55 || data.j2_torque > 2.5)
  const hasGripError  = data && data.finger2_pressure < 1.5
  const hasHandWarn   = data && data.j2_torque > 2.0
  const hasSysError   = data && (data.cpu > 80 || data.network_latency > 30)

  const tabs = [
    { id: 'overview',     label: 'Overview',     icon: '📊', alert: null },
    { id: 'arm',          label: 'Arm Analysis', icon: '🦾', alert: hasArmError ? 'error' : null },
    { id: 'gripper',      label: 'Gripper',      icon: '🤏', alert: hasGripError ? 'error' : null },
    { id: 'hand',         label: 'Hand',         icon: '✋', alert: hasHandWarn ? 'warn' : null },
    { id: 'system',       label: 'System',       icon: '🖥️', alert: hasSysError ? 'error' : null },
    { id: 'performance',  label: 'Performance',  icon: '📈', alert: null },
  ]

  return (
    <Panel>
      <TabBar>
        {tabs.map(t => (
          <Tab
            key={t.id}
            active={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
            {t.alert && <AlertDot error={t.alert === 'error'} />}
          </Tab>
        ))}
      </TabBar>
      <Content>
        {activeTab === 'overview'    && <OverviewTab     data={data} chartData={chartData} config={config} />}
        {activeTab === 'arm'         && <ArmAnalysisTab  data={data} chartData={chartData} />}
        {activeTab === 'gripper'     && <GripperAnalysisTab data={data} chartData={chartData} />}
        {activeTab === 'hand'        && <HandAnalysisTab data={data} chartData={chartData} />}
        {activeTab === 'system'      && <SystemStatusTab data={data} chartData={chartData} config={config} />}
        {activeTab === 'performance' && <PerformanceTab  data={data} chartData={chartData} />}
      </Content>
    </Panel>
  )
}

import styled from 'styled-components'
import { theme } from '../styles/theme'

const HeaderBar = styled.header`
  height: 8vh;
  min-height: 52px;
  background: linear-gradient(135deg, ${theme.colors.header} 0%, ${theme.colors.primaryDark} 100%);
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  flex-shrink: 0;
  position: relative;
  z-index: 100;
`

const RobotIcon = styled.div`
  width: 34px;
  height: 34px;
  background: rgba(255,255,255,0.15);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  border: 1px solid rgba(255,255,255,0.25);
  flex-shrink: 0;
`

const InfoBlock = styled.div`
  display: flex;
  flex-direction: column;
`

const RobotId = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.3px;
`

const RobotMeta = styled.span`
  font-size: 10px;
  color: rgba(255,255,255,0.65);
  margin-top: 1px;
  white-space: nowrap;
`

const Divider = styled.div`
  width: 1px;
  height: 24px;
  background: rgba(255,255,255,0.2);
  flex-shrink: 0;
`

const StatusBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 20px;
  padding: 3px 10px;
  font-size: 11px;
  color: rgba(255,255,255,0.88);
  white-space: nowrap;
  flex-shrink: 0;
`

const StatusDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${p => p.color ?? '#4CD9C0'};
  box-shadow: 0 0 5px ${p => p.color ?? '#4CD9C0'};
  flex-shrink: 0;
`

const Spacer = styled.div`flex: 1;`

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`

const Btn = styled.button`
  height: 30px;
  padding: 0 12px;
  border-radius: 5px;
  border: 1px solid rgba(255,255,255,0.28);
  background: ${p => p.primary ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'};
  color: #fff;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  transition: background 0.15s;
  flex-shrink: 0;
  &:hover { background: rgba(255,255,255,0.28); }
`

const LogBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(76,217,192,0.15);
  border: 1px solid rgba(76,217,192,0.4);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 11px;
  color: rgba(255,255,255,0.9);
  max-width: 260px;
  overflow: hidden;
`

const LogName = styled.span`
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'Consolas', monospace;
  font-size: 10px;
`

export default function Header({ config, bagInfo, logName, onS3Click, onLoadNew }) {
  const robotId   = config?.robotId    ?? 'MR-001'
  const model     = config?.model      ?? 'Manipulation Bot v2.1'
  const gripper   = config?.gripperType ?? 'Parallel Jaw'
  const hand      = config?.handType   ?? '5-Finger Anthropomorphic'

  const hasLog    = !!bagInfo
  const duration  = bagInfo
    ? `${Math.floor(bagInfo.duration / 60).toString().padStart(2,'0')}:${Math.floor(bagInfo.duration % 60).toString().padStart(2,'0')}`
    : null

  const startLabel = bagInfo
    ? new Date(bagInfo.startTime).toLocaleString('ko-KR', {
        month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit'
      })
    : null

  return (
    <HeaderBar>
      <RobotIcon>🤖</RobotIcon>
      <InfoBlock>
        <RobotId>Robot ID: {robotId}</RobotId>
        <RobotMeta>{model} · {gripper} · {hand}</RobotMeta>
      </InfoBlock>

      {hasLog && (
        <>
          <Divider />
          <LogBadge>
            📦 <LogName title={logName}>{logName}</LogName>
            <span style={{ color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>{duration}</span>
          </LogBadge>
          <StatusBadge>
            <StatusDot />
            {bagInfo.messageCount?.toLocaleString()} msgs
          </StatusBadge>
          {startLabel && (
            <StatusBadge>
              🕐 {startLabel}
            </StatusBadge>
          )}
        </>
      )}

      {!hasLog && (
        <>
          <Divider />
          <StatusBadge>
            <StatusDot color="#F39C12" />
            로그 미로드
          </StatusBadge>
        </>
      )}

      <Spacer />

      <Controls>
        <Btn onClick={onS3Click}>☁️ S3 연결</Btn>
        <Btn primary onClick={onLoadNew}>📂 로그 로드</Btn>
      </Controls>
    </HeaderBar>
  )
}

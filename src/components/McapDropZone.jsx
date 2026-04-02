/**
 * McapDropZone — Drag-and-drop or file picker for local MCAP files.
 * Shown on the main canvas when no log is loaded.
 */
import { useCallback, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { theme } from '../styles/theme'

const float = keyframes`
  0%,100% { transform: translateY(0px) }
  50%      { transform: translateY(-8px) }
`

const pulse = keyframes`
  0%,100% { box-shadow: 0 0 0 0 ${theme.colors.primary}40 }
  50%      { box-shadow: 0 0 0 16px transparent }
`

const Zone = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 8px;
  border: 2px dashed ${p => p.dragging ? theme.colors.primary : theme.colors.border};
  background: ${p => p.dragging
    ? `linear-gradient(135deg, ${theme.colors.primary}08, ${theme.colors.accent}08)`
    : theme.colors.bg};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  animation: ${p => p.dragging ? pulse : 'none'} 1s ease infinite;
  &:hover { border-color: ${theme.colors.primaryLight}; }
`

const Icon = styled.div`
  font-size: 42px;
  animation: ${float} 3s ease-in-out infinite;
`

const Title = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${theme.colors.text};
`

const Sub = styled.div`
  font-size: 12px;
  color: ${theme.colors.textMuted};
  text-align: center;
  line-height: 1.6;
`

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 200px;
  font-size: 11px;
  color: ${theme.colors.textMuted};
  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${theme.colors.border};
  }
`

const BtnRow = styled.div`
  display: flex;
  gap: 8px;
`

const Btn = styled.button`
  height: 34px;
  padding: 0 18px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid ${p => p.primary ? theme.colors.primary : theme.colors.border};
  background: ${p => p.primary ? theme.colors.primary : theme.colors.surface};
  color: ${p => p.primary ? '#fff' : theme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s;
  &:hover {
    background: ${p => p.primary ? theme.colors.primaryDark : theme.colors.bgDark};
    transform: translateY(-1px);
  }
`

const HiddenInput = styled.input`
  display: none;
`

export default function McapDropZone({ onFileSelect, onS3Click, onSampleClick }) {
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback(e => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file?.name.endsWith('.mcap')) onFileSelect(file)
  }, [onFileSelect])

  const handleDragOver = e => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)

  const handleFileChange = e => {
    const file = e.target.files?.[0]
    if (file) onFileSelect(file)
    e.target.value = ''
  }

  const openPicker = () => document.getElementById('mcap-file-input').click()

  return (
    <Zone
      dragging={dragging}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={openPicker}
    >
      <HiddenInput
        id="mcap-file-input"
        type="file"
        accept=".mcap"
        onChange={handleFileChange}
      />

      <Icon>🤖</Icon>
      <Title>Manipulation Replay</Title>
      <Sub>
        MCAP 로그 파일을 드래그하거나<br />
        아래 버튼으로 로드하세요
      </Sub>

      <BtnRow onClick={e => e.stopPropagation()}>
        <Btn primary onClick={openPicker}>
          📂 로컬 파일
        </Btn>
        <Btn onClick={onS3Click}>
          ☁️ AWS S3
        </Btn>
        <Btn onClick={onSampleClick}>
          🧪 샘플 로드
        </Btn>
      </BtnRow>

      <Divider>지원 형식</Divider>

      <Sub style={{ fontSize: '11px' }}>
        MCAP (json encoding) · /joint_states · /gripper_state · /hand_state<br />
        /tactile_sensors · /system_monitor · /manipulation_events · /rosout
      </Sub>
    </Zone>
  )
}

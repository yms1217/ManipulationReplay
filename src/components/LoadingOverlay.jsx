import styled, { keyframes } from 'styled-components'
import { theme } from '../styles/theme'

const fadeIn = keyframes`from { opacity: 0 } to { opacity: 1 }`
const spin   = keyframes`from { transform: rotate(0deg) } to { transform: rotate(360deg) }`
const pulse  = keyframes`0%,100% { opacity: 1 } 50% { opacity: 0.5 }`

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(10, 28, 40, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: ${fadeIn} 0.2s ease;
  backdrop-filter: blur(4px);
`

const Box = styled.div`
  background: ${theme.colors.surface};
  border-radius: 14px;
  padding: 32px 40px;
  min-width: 340px;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.35);
  border: 1px solid ${theme.colors.borderLight};
`

const Spinner = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 3px solid ${theme.colors.bgDark};
  border-top-color: ${theme.colors.primary};
  animation: ${spin} 0.8s linear infinite;
`

const Title = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${theme.colors.text};
`

const SubLabel = styled.div`
  font-size: 12px;
  color: ${theme.colors.textSecondary};
  text-align: center;
  animation: ${pulse} 1.8s ease infinite;
`

const BarWrap = styled.div`
  width: 100%;
  height: 6px;
  background: ${theme.colors.bgDark};
  border-radius: 3px;
  overflow: hidden;
`

const Bar = styled.div`
  height: 100%;
  width: ${p => p.pct}%;
  background: linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.accent});
  border-radius: 3px;
  transition: width 0.3s ease;
`

const PctLabel = styled.div`
  font-size: 11px;
  color: ${theme.colors.textMuted};
  font-variant-numeric: tabular-nums;
`

export default function LoadingOverlay({ label = 'Loading…', subLabel, progress = null }) {
  return (
    <Backdrop>
      <Box>
        <Spinner />
        <Title>{label}</Title>
        {subLabel && <SubLabel>{subLabel}</SubLabel>}
        {progress !== null && (
          <>
            <BarWrap><Bar pct={progress} /></BarWrap>
            <PctLabel>{progress}%</PctLabel>
          </>
        )}
      </Box>
    </Backdrop>
  )
}

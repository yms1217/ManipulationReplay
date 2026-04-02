import { useRef, useCallback } from 'react'
import styled from 'styled-components'
import { theme } from '../styles/theme'

const Panel = styled.div`
  width: 100%;
  height: 100%;
  background: ${theme.colors.surface};
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: ${theme.shadow.sm};
  border: 1px solid ${theme.colors.border};
`

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const CtrlBtn = styled.button`
  width: ${p => p.size || 32}px;
  height: ${p => p.size || 32}px;
  border-radius: 50%;
  border: 2px solid ${p => p.active ? theme.colors.primary : theme.colors.border};
  background: ${p => p.active ? theme.colors.primary : theme.colors.surface};
  color: ${p => p.active ? '#fff' : theme.colors.text};
  font-size: ${p => p.big ? '16px' : '13px'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
  &:hover {
    border-color: ${theme.colors.primary};
    background: ${p => p.active ? theme.colors.primaryDark : theme.colors.bgDark};
  }
`

const SpeedLabel = styled.span`
  font-size: 11px;
  color: ${theme.colors.textSecondary};
  white-space: nowrap;
`

const SpeedSlider = styled.input`
  flex: 1;
  accent-color: ${theme.colors.primary};
  height: 4px;
  cursor: pointer;
`

const SpeedVal = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${theme.colors.primary};
  min-width: 34px;
`

const TimelineWrap = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const TimeRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: ${theme.colors.textSecondary};
`

const TimelineContainer = styled.div`
  position: relative;
  height: 20px;
  display: flex;
  align-items: center;
`

const TimelineTrack = styled.div`
  position: absolute;
  left: 0; right: 0;
  height: 6px;
  background: ${theme.colors.bgDark};
  border-radius: 3px;
  cursor: pointer;
`

const TimelineProgress = styled.div`
  position: absolute;
  left: 0;
  height: 6px;
  background: linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.accent});
  border-radius: 3px;
  width: ${p => p.pct}%;
  pointer-events: none;
`

const TimelineThumb = styled.div`
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: ${theme.colors.primary};
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.25);
  left: calc(${p => p.pct}% - 7px);
  top: 50%;
  transform: translateY(-50%);
  cursor: grab;
  z-index: 2;
  &:active { cursor: grabbing; }
`

const IssueMarker = styled.div`
  position: absolute;
  left: calc(${p => p.pct}% - 5px);
  top: 50%;
  transform: translateY(-50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${p => p.level === 'ERROR' ? theme.colors.statusError : theme.colors.statusWarn};
  border: 1.5px solid #fff;
  cursor: pointer;
  z-index: 1;
`

const IssueBtns = styled.div`
  display: flex;
  gap: 6px;
`

const IssueBtn = styled.button`
  flex: 1;
  height: 26px;
  border-radius: 5px;
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors.surfaceAlt};
  color: ${theme.colors.textSecondary};
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  &:hover { background: ${theme.colors.bgDark}; color: ${theme.colors.primary}; }
`

const IssueCount = styled.span`
  font-size: 10px;
  color: ${theme.colors.textMuted};
`

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = Math.floor(secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function ReplayControls({
  currentTime, isPlaying, playbackRate, setPlaybackRate,
  play, pause, stop, seekTo,
  prevIssue, nextIssue,
  issues = [], totalDuration,
}) {
  const pct = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0
  const trackRef = useRef(null)
  const dragging = useRef(false)

  const posToTime = useCallback((clientX) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return 0
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * totalDuration
  }, [totalDuration])

  const handleMouseDown = useCallback((e) => {
    dragging.current = true
    seekTo(posToTime(e.clientX))
  }, [posToTime, seekTo])

  const handleMouseMove = useCallback((e) => {
    if (!dragging.current) return
    seekTo(posToTime(e.clientX))
  }, [posToTime, seekTo])

  const handleMouseUp = useCallback(() => { dragging.current = false }, [])

  const errorCount = issues.filter(i => i.level === 'ERROR').length
  const warnCount  = issues.filter(i => i.level === 'WARN').length

  return (
    <Panel
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <Row>
        <CtrlBtn onClick={() => seekTo(0)} title="처음으로">⏮</CtrlBtn>
        <CtrlBtn size={36} big active={isPlaying} onClick={() => isPlaying ? pause() : play()}>
          {isPlaying ? '⏸' : '▶'}
        </CtrlBtn>
        <CtrlBtn onClick={stop} title="정지">⏹</CtrlBtn>

        <SpeedLabel>속도:</SpeedLabel>
        <SpeedSlider
          type="range" min={0.1} max={10} step={0.1}
          value={playbackRate}
          onChange={e => setPlaybackRate(+e.target.value)}
        />
        <SpeedVal>{playbackRate.toFixed(1)}x</SpeedVal>
      </Row>

      <TimelineWrap>
        <TimelineContainer>
          <TimelineTrack ref={trackRef} onMouseDown={handleMouseDown}>
            <TimelineProgress pct={pct} />
            {issues.map((issue, i) => (
              <IssueMarker
                key={i}
                pct={(issue.t / totalDuration) * 100}
                level={issue.level}
                title={`${issue.time} [${issue.level}] ${issue.component}: ${issue.message}`}
                onClick={e => { e.stopPropagation(); seekTo(issue.t) }}
              />
            ))}
          </TimelineTrack>
          <TimelineThumb pct={pct} onMouseDown={handleMouseDown} />
        </TimelineContainer>
        <TimeRow>
          <span style={{ fontFamily: 'monospace' }}>{formatTime(currentTime)}</span>
          <IssueCount>
            {errorCount > 0 && <span style={{ color: theme.colors.statusError }}>⬤ {errorCount}err</span>}
            {warnCount  > 0 && <span style={{ color: theme.colors.statusWarn,  marginLeft: 4 }}>⬤ {warnCount}warn</span>}
          </IssueCount>
          <span style={{ fontFamily: 'monospace' }}>{formatTime(totalDuration)}</span>
        </TimeRow>
      </TimelineWrap>

      <IssueBtns>
        <IssueBtn onClick={prevIssue}>◀ 이전 이슈</IssueBtn>
        <IssueBtn onClick={nextIssue}>다음 이슈 ▶</IssueBtn>
      </IssueBtns>
    </Panel>
  )
}

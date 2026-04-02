import { useState, useCallback, useRef } from 'react'
import styled, { ThemeProvider, createGlobalStyle } from 'styled-components'
import { theme } from './styles/theme'
import { useReplay } from './hooks/useReplay'
import { parseMcap } from './utils/mcapParser'
import { downloadMcapFile, loadSampleMcap } from './services/s3Service'

import Header          from './components/Header'
import RobotVisualization from './components/RobotVisualization'
import ReplayControls  from './components/ReplayControls'
import AnalysisPanel   from './components/AnalysisPanel'
import LogEntries      from './components/LogEntries'
import LoadingOverlay  from './components/LoadingOverlay'
import S3Browser       from './components/S3Browser'
import McapDropZone    from './components/McapDropZone'

// ── global styles ─────────────────────────────────────────────────────────────

const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { width: 100%; height: 100%; overflow: hidden; }
  body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Noto Sans KR', sans-serif;
    background: ${theme.colors.bg};
    color: ${theme.colors.text};
    font-size: 13px;
    line-height: 1.4;
  }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${theme.colors.border}; border-radius: 3px; }
`

// ── layout ────────────────────────────────────────────────────────────────────

const Layout = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${theme.colors.bg};
`

const Main = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px;
  flex: 1 1 0;
  min-height: 0;
  /* main = 72vh, log = 20vh, header = 8vh → flex handles it */
  max-height: calc(100vh - 8vh - 20vh - 8px);
`

const LeftPanel = styled.div`
  width: 50%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`

const VizWrap = styled.div`
  flex: 3;
  min-height: 0;
`

const CtrlWrap = styled.div`
  flex: 1;
  min-height: 0;
`

const RightPanel = styled.div`
  width: 50%;
  min-width: 0;
`

const LogWrap = styled.div`
  height: 20vh;
  min-height: 120px;
  padding: 0 8px 8px;
  flex-shrink: 0;
`

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  // MCAP parsed data (null = mock mode)
  const [logData,  setLogData]  = useState(null)
  const [logName,  setLogName]  = useState(null)

  // UI state
  const [loading,  setLoading]  = useState(null)   // { label, subLabel, progress }
  const [showS3,   setShowS3]   = useState(false)
  const [showDrop, setShowDrop] = useState(false)   // force-show drop zone

  const fileInputRef = useRef(null)

  // ── replay hook ─────────────────────────────────────────────────────────
  const replay = useReplay(logData)

  // ── MCAP loading pipeline ────────────────────────────────────────────────

  async function processBuffer(buffer, name) {
    setShowDrop(false)
    setLoading({ label: 'MCAP 파싱 중…', subLabel: name, progress: 5 })
    try {
      const parsed = await parseMcap(buffer, (pct, label) => {
        setLoading({ label: 'MCAP 파싱 중…', subLabel: label, progress: pct })
      })
      setLogData(parsed)
      setLogName(name)
    } catch (err) {
      alert(`파싱 오류: ${err.message}`)
      console.error(err)
    } finally {
      setLoading(null)
    }
  }

  // local file
  const handleLocalFile = useCallback(async (file) => {
    setLoading({ label: '파일 읽는 중…', subLabel: file.name, progress: null })
    const buffer = await file.arrayBuffer()
    await processBuffer(buffer, file.name)
  }, [])

  // S3 file selected from browser
  const handleS3Load = useCallback(async ({ cfg, key, name }) => {
    setShowS3(false)
    setLoading({ label: 'S3에서 다운로드 중…', subLabel: name, progress: 0 })
    try {
      const buffer = await downloadMcapFile(cfg, key, pct => {
        setLoading(prev => ({ ...prev, progress: pct }))
      })
      await processBuffer(buffer, name)
    } catch (err) {
      setLoading(null)
      alert(`S3 다운로드 오류: ${err.message}`)
    }
  }, [])

  // sample
  const handleSampleLoad = useCallback(async () => {
    setShowDrop(false)
    setLoading({ label: '샘플 로그 로드 중…', subLabel: 'sample-log.mcap', progress: 0 })
    try {
      const buffer = await loadSampleMcap(pct => {
        setLoading(prev => ({ ...prev, progress: pct }))
      })
      await processBuffer(buffer, 'sample-log.mcap')
    } catch (err) {
      setLoading(null)
      alert(`샘플 로드 실패: ${err.message}\n'pnpm generate-sample' 명령으로 샘플을 먼저 생성하세요.`)
    }
  }, [])

  // open local file picker (from header button or drop zone)
  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileInputChange = useCallback(e => {
    const file = e.target.files?.[0]
    if (file) handleLocalFile(file)
    e.target.value = ''
  }, [handleLocalFile])

  // show drop zone (or file picker) when user clicks "로그 로드"
  const handleLoadNew = useCallback(() => {
    setShowDrop(true)
  }, [])

  // ── render ────────────────────────────────────────────────────────────────

  const hasLog = !!logData

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".mcap"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* Loading overlay */}
      {loading && (
        <LoadingOverlay
          label={loading.label}
          subLabel={loading.subLabel}
          progress={loading.progress}
        />
      )}

      {/* S3 browser modal */}
      {showS3 && (
        <S3Browser
          onLoad={handleS3Load}
          onClose={() => setShowS3(false)}
        />
      )}

      <Layout>
        <Header
          config={logData?.config}
          bagInfo={logData?.bagInfo}
          logName={logName}
          onS3Click={() => setShowS3(true)}
          onLoadNew={handleLoadNew}
        />

        <Main>
          <LeftPanel>
            <VizWrap>
              {!hasLog && !loading && showDrop ? (
                <McapDropZone
                  onFileSelect={handleLocalFile}
                  onS3Click={() => { setShowDrop(false); setShowS3(true) }}
                  onSampleClick={handleSampleLoad}
                />
              ) : (
                <RobotVisualization data={replay.currentData} />
              )}
            </VizWrap>
            <CtrlWrap>
              <ReplayControls
                currentTime={replay.currentTime}
                isPlaying={replay.isPlaying}
                playbackRate={replay.playbackRate}
                setPlaybackRate={replay.setPlaybackRate}
                play={replay.play}
                pause={replay.pause}
                stop={replay.stop}
                seekTo={replay.seekTo}
                prevIssue={replay.prevIssue}
                nextIssue={replay.nextIssue}
                issues={replay.issues}
                totalDuration={replay.totalDuration}
              />
            </CtrlWrap>
          </LeftPanel>

          <RightPanel>
            {!hasLog && !loading && showDrop ? (
              // Show nothing in right panel while drop zone is open
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: theme.colors.textMuted, fontSize: '13px',
                background: theme.colors.surface, borderRadius: '8px',
                border: `1px solid ${theme.colors.border}`,
              }}>
                로그를 로드하면 분석 패널이 표시됩니다
              </div>
            ) : (
              <AnalysisPanel
                data={replay.currentData}
                chartData={replay.chartData}
                config={logData?.config}
              />
            )}
          </RightPanel>
        </Main>

        <LogWrap>
          <LogEntries
            currentTime={replay.currentTime}
            seekTo={replay.seekTo}
            logEntries={replay.logEntries}
          />
        </LogWrap>
      </Layout>

      {/* Initial state: no log loaded → show drop zone in viz area */}
      {/* This is handled above via showDrop state — on first load trigger it */}
      {!hasLog && !loading && !showDrop && (
        // Auto-open drop zone on first render
        <AutoOpenDropZone onOpen={() => setShowDrop(true)} />
      )}
    </ThemeProvider>
  )
}

// Tiny effect-only component to trigger drop zone on mount without changing layout
function AutoOpenDropZone({ onOpen }) {
  const called = useRef(false)
  if (!called.current) {
    called.current = true
    // micro-task so we don't setState during render
    Promise.resolve().then(onOpen)
  }
  return null
}

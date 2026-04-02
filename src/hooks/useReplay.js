/**
 * useReplay — core playback state hook
 *
 * Works in two modes:
 *   1. Mock mode  (logData = null) — uses generated mock time-series
 *   2. MCAP mode  (logData = ParsedLog from mcapParser) — uses real data
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { generateTimeSeriesData, generateLogEntries, ISSUES as MOCK_ISSUES, TOTAL_DURATION as MOCK_DURATION } from '../data/mockData'
import { getDataAtTime, getChartWindow } from '../utils/mcapParser'

const CHART_WINDOW = 60   // number of timeSeries points to show in chart

// ── mock data (lazy initialised once) ────────────────────────────────────────
let _mockTs   = null
let _mockLogs = null

function getMockTs()   { if (!_mockTs)   _mockTs   = generateTimeSeriesData(); return _mockTs }
function getMockLogs() { if (!_mockLogs) _mockLogs = generateLogEntries();     return _mockLogs }

// ── hook ──────────────────────────────────────────────────────────────────────

export function useReplay(logData = null) {
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying,   setIsPlaying]   = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)

  const rafRef     = useRef(null)
  const lastTickRef = useRef(null)

  // ── derived from logData or mock ─────────────────────────────────────────
  const timeSeries   = logData?.timeSeries   ?? getMockTs()
  const logEntries   = logData?.logEntries   ?? getMockLogs()
  const issues       = logData?.issues       ?? MOCK_ISSUES
  const totalDuration = logData?.totalDuration ?? MOCK_DURATION

  // reset playback whenever a new log is loaded
  useEffect(() => {
    setCurrentTime(0)
    setIsPlaying(false)
  }, [logData])

  // ── animation loop ────────────────────────────────────────────────────────
  const tick = useCallback((now) => {
    if (lastTickRef.current != null) {
      const delta = (now - lastTickRef.current) / 1000
      setCurrentTime(prev => {
        const next = prev + delta * playbackRate
        if (next >= totalDuration) {
          setIsPlaying(false)
          return totalDuration
        }
        return next
      })
    }
    lastTickRef.current = now
    rafRef.current = requestAnimationFrame(tick)
  }, [playbackRate, totalDuration])

  useEffect(() => {
    if (isPlaying) {
      lastTickRef.current = null
      rafRef.current = requestAnimationFrame(tick)
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [isPlaying, tick])

  // ── keyboard shortcut: Space = play/pause ────────────────────────────────
  useEffect(() => {
    const handler = e => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault()
        setIsPlaying(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── controls ──────────────────────────────────────────────────────────────
  const play   = useCallback(() => setIsPlaying(true), [])
  const pause  = useCallback(() => setIsPlaying(false), [])
  const stop   = useCallback(() => { setIsPlaying(false); setCurrentTime(0) }, [])
  const seekTo = useCallback(t => setCurrentTime(Math.max(0, Math.min(totalDuration, t))), [totalDuration])

  const prevIssue = useCallback(() => {
    const prev = [...issues].reverse().find(i => i.t < currentTime - 0.5)
    if (prev) seekTo(prev.t)
  }, [issues, currentTime, seekTo])

  const nextIssue = useCallback(() => {
    const next = issues.find(i => i.t > currentTime + 0.5)
    if (next) seekTo(next.t)
  }, [issues, currentTime, seekTo])

  // ── derived data ──────────────────────────────────────────────────────────
  const currentData = useMemo(
    () => getDataAtTime(timeSeries, currentTime),
    [timeSeries, currentTime]
  )

  const chartData = useMemo(
    () => getChartWindow(timeSeries, currentTime, CHART_WINDOW),
    [timeSeries, currentTime]
  )

  return {
    currentTime,
    isPlaying,
    playbackRate,
    setPlaybackRate,
    play,
    pause,
    stop,
    seekTo,
    prevIssue,
    nextIssue,
    currentData,
    chartData,
    totalDuration,
    logEntries,
    issues,
  }
}

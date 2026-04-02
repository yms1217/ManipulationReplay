import { useRef, useEffect } from 'react'
import styled from 'styled-components'
import { theme } from '../styles/theme'

const Container = styled.div`
  width: 100%;
  height: 100%;
  background: #0D1B2A;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
`

const Canvas = styled.canvas`
  width: 100%;
  height: 100%;
  display: block;
`

const Overlay = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const JointBadge = styled.div`
  background: rgba(13, 27, 42, 0.85);
  border: 1px solid ${p => p.error ? theme.colors.statusError : p.warn ? theme.colors.statusWarn : 'rgba(44,158,158,0.5)'};
  border-radius: 4px;
  padding: 2px 7px;
  font-size: 10px;
  color: ${p => p.error ? theme.colors.statusError : p.warn ? theme.colors.statusWarn : 'rgba(255,255,255,0.8)'};
  display: flex;
  align-items: center;
  gap: 4px;
`

const Label = styled.div`
  position: absolute;
  bottom: 8px;
  right: 8px;
  font-size: 10px;
  color: rgba(255,255,255,0.35);
`

const EEPos = styled.div`
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(13,27,42,0.85);
  border: 1px solid rgba(44,158,158,0.3);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 10px;
  color: rgba(255,255,255,0.7);
  line-height: 1.6;
`

// Draw a stylized 6-DOF robot arm on canvas
function drawRobot(ctx, w, h, data) {
  ctx.clearRect(0, 0, w, h)

  // Background grid
  ctx.strokeStyle = 'rgba(44,158,158,0.06)'
  ctx.lineWidth = 1
  for (let x = 0; x < w; x += 30) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
  }
  for (let y = 0; y < h; y += 30) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
  }

  // Coordinate origin glow
  ctx.shadowBlur = 20
  ctx.shadowColor = 'rgba(44,158,158,0.3)'
  ctx.fillStyle = 'rgba(44,158,158,0.08)'
  ctx.beginPath()
  ctx.arc(w * 0.5, h * 0.85, 60, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  const joints = [
    { x: w * 0.5, y: h * 0.85, label: 'BASE' },
    null, null, null, null, null, null
  ]

  // Compute joint positions from angles
  const d2r = a => a * Math.PI / 180
  const angles = [data.j1_pos, data.j2_pos, data.j3_pos, data.j4_pos, data.j5_pos]
  const segs = [h * 0.15, h * 0.15, h * 0.12, h * 0.10, h * 0.08]

  let cx = w * 0.5
  let cy = h * 0.85
  let angle = -Math.PI / 2 // Start pointing up

  const pts = [{ x: cx, y: cy }]
  const temps = [data.j1_temp, data.j2_temp, data.j3_temp, data.j1_temp, data.j2_temp]

  for (let i = 0; i < angles.length; i++) {
    angle += d2r(angles[i] * 0.4)
    cx += Math.cos(angle) * segs[i]
    cy += Math.sin(angle) * segs[i]
    pts.push({ x: cx, y: cy })
  }

  // Draw arm shadow/glow
  for (let i = 0; i < pts.length - 1; i++) {
    const temp = temps[i] || 38
    const isHot = temp > 50
    const isWarm = temp > 42
    const color = isHot ? '#E74C3C' : isWarm ? '#F39C12' : '#2C9E9E'
    ctx.shadowBlur = 12
    ctx.shadowColor = color + '60'
    ctx.strokeStyle = color + '40'
    ctx.lineWidth = 10
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(pts[i].x, pts[i].y)
    ctx.lineTo(pts[i + 1].x, pts[i + 1].y)
    ctx.stroke()
  }

  // Draw arm segments
  for (let i = 0; i < pts.length - 1; i++) {
    const temp = temps[i] || 38
    const isHot = temp > 50
    const isWarm = temp > 42
    const color = isHot ? '#E74C3C' : isWarm ? '#F39C12' : '#2C9E9E'
    ctx.shadowBlur = 4
    ctx.shadowColor = color
    ctx.strokeStyle = color
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(pts[i].x, pts[i].y)
    ctx.lineTo(pts[i + 1].x, pts[i + 1].y)
    ctx.stroke()
  }

  ctx.shadowBlur = 0

  // Draw joint circles
  const jointLabels = ['J1', 'J2', 'J3', 'J4', 'J5', 'EE']
  for (let i = 0; i < pts.length; i++) {
    const temp = (temps[i - 1] || 38)
    const isHot = i > 0 && temp > 50
    const isWarm = i > 0 && temp > 42
    const color = isHot ? '#E74C3C' : isWarm ? '#F39C12' : '#3DBFBF'
    const r = i === 0 ? 10 : i === pts.length - 1 ? 6 : 7
    ctx.fillStyle = '#0D1B2A'
    ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, r, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 2.5
    ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, r, 0, Math.PI * 2); ctx.stroke()
    if (isHot) {
      ctx.fillStyle = '#E74C3C'
      ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, 3, 0, Math.PI * 2); ctx.fill()
    }
    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = '9px monospace'
    ctx.fillText(jointLabels[i] || '', pts[i].x + 8, pts[i].y - 6)
  }

  // Draw gripper at end effector
  const ee = pts[pts.length - 1]
  const gOpen = data.gripper_pos / 50 // 0-1 normalized
  const gAngle = angle + Math.PI / 2

  const f1x = ee.x + Math.cos(gAngle) * 10 * gOpen
  const f1y = ee.y + Math.sin(gAngle) * 10 * gOpen
  const f2x = ee.x - Math.cos(gAngle) * 10 * gOpen
  const f2y = ee.y - Math.sin(gAngle) * 10 * gOpen

  ctx.strokeStyle = '#4CD9C0'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'

  // Finger 1
  ctx.beginPath()
  ctx.moveTo(ee.x, ee.y)
  ctx.lineTo(f1x + Math.cos(angle) * 12, f1y + Math.sin(angle) * 12)
  ctx.stroke()

  // Finger 2
  ctx.beginPath()
  ctx.moveTo(ee.x, ee.y)
  ctx.lineTo(f2x + Math.cos(angle) * 12, f2y + Math.sin(angle) * 12)
  ctx.stroke()

  // Base platform
  ctx.fillStyle = 'rgba(44,158,158,0.15)'
  ctx.strokeStyle = '#2C9E9E'
  ctx.lineWidth = 2
  const bx = w * 0.5
  const by = h * 0.85
  ctx.beginPath()
  ctx.ellipse(bx, by + 5, 32, 8, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}

export default function RobotVisualization({ data }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    drawRobot(ctx, rect.width, rect.height, data)
  }, [data])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => {
      const ctx = canvas.getContext('2d')
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
      if (data) drawRobot(ctx, rect.width, rect.height, data)
    })
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [data])

  const j3hot = data && data.j3_temp > 50
  const j2warn = data && data.j2_torque > 2.2

  return (
    <Container>
      <Canvas ref={canvasRef} />
      <Overlay>
        {['J1','J2','J3','J4','J5','J6'].map((j, i) => {
          const pos = [data?.j1_pos, data?.j2_pos, data?.j3_pos, data?.j4_pos, data?.j5_pos, data?.j6_pos][i]
          const torque = [data?.j1_torque, data?.j2_torque, data?.j3_torque, data?.j4_torque, data?.j5_torque, data?.j6_torque][i]
          const temp = [data?.j1_temp, data?.j2_temp, data?.j3_temp, data?.j1_temp, data?.j2_temp, data?.j3_temp][i]
          const isError = j === 'J3' && j3hot
          const isWarn = j === 'J2' && j2warn
          return (
            <JointBadge key={j} error={isError} warn={isWarn}>
              {isError ? '🔴' : isWarn ? '🟡' : '🟢'} {j}: {pos?.toFixed(1)}° | {torque?.toFixed(2)}Nm
            </JointBadge>
          )
        })}
      </Overlay>
      {data && (
        <EEPos>
          <div>EE Position</div>
          <div>X: 0.50m  Y: 0.20m  Z: 0.82m</div>
          <div>Gripper: {data.gripper_pos?.toFixed(1)}mm</div>
        </EEPos>
      )}
      <Label>3D Robot Visualization</Label>
    </Container>
  )
}

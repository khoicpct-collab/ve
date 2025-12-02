import React, { useRef, useEffect, useState } from 'react'
import FlowBrush from './FlowBrush'
import GIF from 'gif.js.browser'

// Simple particle simulator: CPU-based, small counts for demo purposes
export default function FlowSim(){
  const canvasRef = useRef(null)
  const imgRef = useRef(new Image())
  const [bgSrc, setBgSrc] = useState(null)
  const [regions, setRegions] = useState([]) // polygons: {points: [{x,y}], id}
  const [drawingRegion, setDrawingRegion] = useState(null)
  const [brushSegments, setBrushSegments] = useState([]) // segments: {x1,y1,x2,y2,dx,dy}
  const particlesRef = useRef([])
  const animRef = useRef(null)
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState('Tải ảnh nền để bắt đầu. Vẽ vùng bằng click, double-click để đóng.')

  useEffect(()=>{
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    function resize(){ // match CSS size to canvas pixels
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * devicePixelRatio
      canvas.height = rect.height * devicePixelRatio
      ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0)
      draw()
    }
    window.addEventListener('resize', resize)
    resize()
    return ()=> window.removeEventListener('resize', resize)
  },[])

  useEffect(()=>{
    draw()
  },[bgSrc, regions, brushSegments])

  function handleBgChange(e){
    const f = e.target.files && e.target.files[0]
    if(!f) return
    const url = URL.createObjectURL(f)
    imgRef.current.onload = ()=> {
      setBgSrc(url)
      draw()
    }
    imgRef.current.src = url
  }

  function toCanvasCoords(clientX, clientY){
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left)
    const y = (clientY - rect.top)
    return {x,y}
  }

  function handleCanvasClick(e){
    // add point to drawing region if in drawing mode
    if(drawingRegion!==null){
      const p = toCanvasCoords(e.clientX, e.clientY)
      setDrawingRegion(prev=> ({ ...prev, points: [...prev.points, p] }))
    }
  }

  function handleCanvasDblClick(e){
    if(drawingRegion && drawingRegion.points.length >= 3){
      const newRegion = { id: Date.now(), points: drawingRegion.points }
      setRegions(prev=> [...prev, newRegion])
      setDrawingRegion(null)
      setStatus('Đã lưu vùng. Bạn có thể thêm vùng khác hoặc bắt đầu mô phỏng.')
    }
  }

  function startRegionDraw(){
    setDrawingRegion({ points: [] })
    setStatus('Đang vẽ vùng: Click để thêm điểm. Double-click để đóng vùng.')
  }

  function clearRegions(){
    setRegions([])
    particlesRef.current = []
    setStatus('Đã xóa vùng.')
  }

  // --- Particle system ---
  function initParticles(){
    particlesRef.current = []
    const particleCountPerRegion = 150 // small for demo
    regions.forEach((region, ri)=>{
      // compute bbox to sample inside
      const xs = region.points.map(p=>p.x)
      const ys = region.points.map(p=>p.y)
      const minX = Math.min(...xs), maxX = Math.max(...xs)
      const minY = Math.min(...ys), maxY = Math.max(...ys)
      let tries=0, created=0
      while(created < particleCountPerRegion && tries < particleCountPerRegion*10){
        const x = minX + Math.random()*(maxX-minX)
        const y = minY + Math.random()*(maxY-minY)
        if(pointInPolygon({x,y}, region.points)){
          particlesRef.current.push({x,y,regionIndex:ri, size: 6+Math.random()*8, vx:0, vy:0})
          created++
        }
        tries++
      }
    })
  }

  function pointInPolygon(point, vs) {
    var x = point.x, y = point.y
    var inside = false
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i].x, yi = vs[i].y
        var xj = vs[j].x, yj = vs[j].y
        var intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
        if (intersect) inside = !inside
    }
    return inside
  }

  function nearestBrushDirection(x,y){
    let best = null, bestDist=999999
    brushSegments.forEach(seg=>{
      // distance to segment (x1,y1)-(x2,y2)
      const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1
      const l2 = dx*dx + dy*dy
      let t = 0
      if(l2>0){
        t = ((x-seg.x1)*dx + (y-seg.y1)*dy)/l2
        t = Math.max(0, Math.min(1, t))
      }
      const projx = seg.x1 + t*dx, projy = seg.y1 + t*dy
      const dist = Math.hypot(x-projx, y-projy)
      if(dist < bestDist){
        bestDist = dist
        best = seg
      }
    })
    if(best && bestDist < 80) return {dx: best.dx, dy: best.dy}
    // default downward small vector
    return {dx:0, dy:0.6}
  }

  function updateParticles(){
    const dt = 1/60
    particlesRef.current.forEach(p=>{
      const dir = nearestBrushDirection(p.x, p.y)
      // simple velocity blend
      p.vx = p.vx*0.9 + dir.dx*2.0
      p.vy = p.vy*0.9 + dir.dy*2.0 + 0.5 // gravity
      p.x += p.vx * dt * 60
      p.y += p.vy * dt * 60
      // if outside region, respawn inside its region
      const region = regions[p.regionIndex]
      if(!region || !pointInPolygon({x:p.x,y:p.y}, region.points)){
        // respawn
        const bboxXs = region ? region.points.map(pp=>pp.x) : [50,200]
        const bboxYs = region ? region.points.map(pp=>pp.y) : [50,200]
        const minX = Math.min(...bboxXs), maxX = Math.max(...bboxXs)
        const minY = Math.min(...bboxYs), maxY = Math.max(...bboxYs)
        let x=0,y=0,tries=0
        while(tries<200){
          x = minX + Math.random()*(maxX-minX)
          y = minY + Math.random()*(maxY-minY)
          if(pointInPolygon({x,y}, region.points)) break
          tries++
        }
        p.x = x; p.y = y; p.vx=0; p.vy=0
      }
    })
  }

  function draw(){
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0,0,canvas.width,canvas.height)
    // draw bg
    if(bgSrc && imgRef.current.complete){
      // fit image into canvas preserving aspect
      const iw = imgRef.current.width, ih = imgRef.current.height
      const cw = canvas.width, ch = canvas.height
      const ar = iw/ih
      let dw = cw, dh = ch
      if(cw/ch > ar){ dh = cw / ar } else { dw = ch * ar }
      // center
      const ox = (cw - dw)/2, oy = (ch - dh)/2
      ctx.drawImage(imgRef.current, ox, oy, dw, dh)
    } else {
      // placeholder
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0,0,canvas.width,canvas.height)
      ctx.fillStyle = '#94a3b8'
      ctx.fillText('Tải ảnh nền để bắt đầu', 20, 30)
    }

    // draw regions
    regions.forEach((region,ri)=>{
      ctx.beginPath()
      region.points.forEach((p,i)=> i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y))
      ctx.closePath()
      ctx.strokeStyle='#f97316'; ctx.lineWidth=2
      ctx.stroke()
      ctx.globalAlpha = 0.06
      ctx.fillStyle = '#f97316'
      ctx.fill()
      ctx.globalAlpha = 1.0
    })

    // draw drawing region
    if(drawingRegion){
      const pts = drawingRegion.points
      if(pts.length>0){
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
        for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x, pts[i].y)
        ctx.strokeStyle='rgba(255,0,0,0.7)'; ctx.setLineDash([6,4]); ctx.lineWidth=2; ctx.stroke(); ctx.setLineDash([])
      }
    }

    // draw brush segments (direction arrows)
    brushSegments.forEach(seg=>{
      ctx.beginPath(); ctx.moveTo(seg.x1,seg.y1); ctx.lineTo(seg.x2,seg.y2)
      ctx.strokeStyle = '#06b6d4'; ctx.lineWidth=3; ctx.stroke()
      // arrow head
      const angle = Math.atan2(seg.y2-seg.y1, seg.x2-seg.x1)
      const ah = 8
      ctx.beginPath()
      ctx.moveTo(seg.x2,seg.y2)
      ctx.lineTo(seg.x2 - Math.cos(angle-0.4)*ah, seg.y2 - Math.sin(angle-0.4)*ah)
      ctx.lineTo(seg.x2 - Math.cos(angle+0.4)*ah, seg.y2 - Math.sin(angle+0.4)*ah)
      ctx.closePath(); ctx.fillStyle='#06b6d4'; ctx.fill()
    })

    // draw particles
    particlesRef.current.forEach(p=>{
      ctx.beginPath(); ctx.fillStyle='#fde68a'; ctx.arc(p.x,p.y,p.size*0.12,0,Math.PI*2); ctx.fill()
    })
  }

  useEffect(()=>{
    let last = performance.now()
    function frame(t){
      if(running){
        const now = performance.now()
        const dt = now-last
        last = now
        updateParticles()
      }
      draw()
      animRef.current = requestAnimationFrame(frame)
    }
    animRef.current = requestAnimationFrame(frame)
    return ()=> cancelAnimationFrame(animRef.current)
  },[running, regions, brushSegments, bgSrc])

  // --- Brush handlers (simple segments from FlowBrush child) ---
  function onAddBrushSegment(seg){
    setBrushSegments(prev=>[...prev, seg])
  }
  function onClearBrush(){ setBrushSegments([]) }

  // --- Controls ---
  function handleStartSim(){
    if(regions.length===0){ setStatus('Cần ít nhất 1 vùng để mô phỏng.'); return }
    initParticles()
    setRunning(true)
    setStatus('Đang mô phỏng...')
  }
  function handleStopSim(){ setRunning(false); setStatus('Tạm dừng mô phỏng.') }

  // --- GIF Export ---
  function exportGif(){
    const canvas = canvasRef.current
    const gif = new GIF({ workers:2, quality:10, width: canvas.width, height: canvas.height })
    const durationFrames = 150 // 5s @30fps ~ keep small for demo
    let frames=0
    const captureLoop = ()=>{
      // step simulation a bit for each frame
      for(let i=0;i<3;i++) updateParticles()
      draw()
      gif.addFrame(canvas, {copy:true, delay: 33})
      frames++
      if(frames < durationFrames) requestAnimationFrame(captureLoop)
      else {
        gif.on('finished', function(blob){
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a'); a.href = url; a.download = 'flow_sim.gif'; a.click()
          URL.revokeObjectURL(url)
          setStatus('Hoàn thành xuất GIF.')
        })
        gif.render()
      }
    }
    setStatus('Đang tạo GIF...')
    captureLoop()
  }

  return (
    <div style={{display:'flex',gap:16,width:'100%'}}>
      <div className="left">
        <div className="controls">
          <div className="group">
            <label>1) Ảnh nền (PNG/JPG/GIF)</label><br/>
            <input type="file" accept="image/*" onChange={handleBgChange} />
            <div className="info">Kéo thả ảnh nền, hệ thống sẽ fit tự động.</div>
          </div>

          <div className="group">
            <label>2) Vùng mô phỏng</label><br/>
            <button className="btn" onClick={startRegionDraw}>+ Thêm Vùng</button>
            <button className="btn" onClick={clearRegions} style={{background:'#ef4444'}}>Xóa Vùng</button>
            <div className="info">Click để thêm đỉnh; double-click để đóng vùng.</div>
          </div>

          <div className="group">
            <label>3) Brush hướng</label><br/>
            <FlowBrush onAddSegment={onAddBrushSegment} onClear={onClearBrush} />
            <div className="info">Kéo để vẽ hướng (độ ảnh hưởng ~80px).</div>
          </div>

          <div className="group">
            <label>4) Điều khiển mô phỏng</label><br/>
            <button className="btn" onClick={handleStartSim}>Bắt đầu</button>
            <button className="btn" onClick={handleStopSim} style={{background:'#f59e0b'}}>Dừng</button>
            <button className="btn" onClick={exportGif} style={{background:'#6b21a8'}}>Tạo GIF</button>
            <div className="info">{status}</div>
          </div>
        </div>
      </div>

      <div className="right">
        <div className="canvas-wrap">
          <canvas ref={canvasRef} onClick={handleCanvasClick} onDoubleClick={handleCanvasDblClick} />
        </div>
      </div>
    </div>
  )
}

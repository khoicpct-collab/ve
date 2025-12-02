import React, { useRef, useEffect } from 'react'

// Simple UI that listens to mouse on document and reports segments to parent.
// Click 'Start Drawing' then drag on canvas area to make segments.
export default function FlowBrush({ onAddSegment=()=>{}, onClear=()=>{} }){
  const drawing = useRef(false)
  const start = useRef(null)

  useEffect(()=>{
    function onDown(e){
      // only left button
      if(e.button !== 0) return
      drawing.current = true
      start.current = {x: e.clientX, y: e.clientY}
    }
    function onUp(e){
      if(!drawing.current) return
      drawing.current = false
      const a = start.current, b = {x: e.clientX, y: e.clientY}
      if(!a) return
      // translate client coords into page coords; parent will compute local coords
      const seg = { x1: a.x - getCanvasOffset().left, y1: a.y - getCanvasOffset().top,
                    x2: b.x - getCanvasOffset().left, y2: b.y - getCanvasOffset().top }
      // compute normalized direction
      const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1
      const len = Math.hypot(dx,dy) || 1
      seg.dx = dx/len; seg.dy = dy/len
      onAddSegment(seg)
      start.current = null
    }
    function getCanvasOffset(){
      const canvas = document.querySelector('canvas')
      return canvas ? canvas.getBoundingClientRect() : {left:0,top:0}
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    return ()=>{
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
    }
  },[onAddSegment])

  return (
    <div style={{marginTop:8}}>
      <button className="btn" onClick={()=>alert('Để vẽ: nhấn giữ chuột trên vùng canvas và kéo để tạo vector hướng. Hoàn tất bằng nhả chuột.')}>Hướng dẫn vẽ</button>
      <button className="btn" onClick={()=>{ if(confirm('Xóa tất cả hướng?')) onClear() }} style={{background:'#ef4444'}}>Xóa</button>
    </div>
  )
}

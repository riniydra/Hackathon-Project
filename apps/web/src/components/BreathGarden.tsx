"use client";
import { useEffect, useRef } from "react";

export default function BreathGarden() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const c = ref.current!; const ctx = c.getContext("2d")!;
    let t=0, raf=0;
    function draw() {
      t+=0.02;
      c.width = c.clientWidth; c.height = 220;
      ctx.clearRect(0,0,c.width,c.height);
      // soft background
      ctx.fillStyle = "#eef7f5"; ctx.fillRect(0,0,c.width,c.height);
      // breathing circle
      const centerX = c.width/2, centerY = c.height/2;
      const r = 40 + Math.sin(t)*20;
      ctx.beginPath(); ctx.arc(centerX, centerY, Math.max(10,r), 0, Math.PI*2);
      ctx.fillStyle = "#9ad1c6"; ctx.fill();
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return ()=> cancelAnimationFrame(raf);
  },[]);
  return <canvas ref={ref} style={{width:"100%", height:220, borderRadius:12}}/>;
}

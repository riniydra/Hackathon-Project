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
      // soft gradient background
      const bg = ctx.createLinearGradient(0,0,c.width,c.height);
      bg.addColorStop(0, "#ecfeff");
      bg.addColorStop(1, "#eff6ff");
      ctx.fillStyle = bg; ctx.fillRect(0,0,c.width,c.height);
      // breathing circle
      const centerX = c.width/2, centerY = c.height/2;
      const r = 40 + Math.sin(t)*20;
      ctx.beginPath(); ctx.arc(centerX, centerY, Math.max(10,r), 0, Math.PI*2);
      const circle = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, Math.max(30,r));
      circle.addColorStop(0, "#a7f3d0");
      circle.addColorStop(1, "#34d399");
      ctx.fillStyle = circle; ctx.fill();
      // gentle rings
      for(let i=1;i<=3;i++){
        ctx.beginPath();
        ctx.arc(centerX, centerY, Math.max(10,r) + i*14, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(52,211,153,${0.15 - i*0.04})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return ()=> cancelAnimationFrame(raf);
  },[]);
  return <canvas ref={ref} style={{width:"100%", height:220, borderRadius:12}}/>;
}

"use client";
import { useEffect, useRef } from "react";
import { tokens, getCSSVar } from "@/lib/tokens";

export default function BreathGarden() {
  const ref = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const c = ref.current!; 
    const ctx = c.getContext("2d")!;
    let t = 0, raf = 0;
    
    function draw() {
      t += 0.02;
      c.width = c.clientWidth; 
      c.height = 220;
      ctx.clearRect(0, 0, c.width, c.height);
      
      // Get theme-aware colors
      const bgColor = getCSSVar('--bg-game') || '#eef7f5';
      const circleColor = getCSSVar('--color-primary-400') || '#2dd4bf';
      
      // Soft background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, c.width, c.height);
      
      // Breathing circle
      const centerX = c.width / 2;
      const centerY = c.height / 2;
      const r = 40 + Math.sin(t) * 20;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.max(10, r), 0, Math.PI * 2);
      ctx.fillStyle = circleColor;
      ctx.fill();
      
      raf = requestAnimationFrame(draw);
    }
    
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  
  return (
    <canvas 
      ref={ref} 
      style={{
        width: "100%", 
        height: 220, 
        borderRadius: tokens.radius.xl
      }}
    />
  );
}

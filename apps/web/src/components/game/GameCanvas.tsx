"use client";
import { useEffect, useRef } from "react";
import { useUIState } from "@/components/shell/UIStateProvider";

// Simple Pokemon-like tile background with a placeholder player dot
export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const { menuOpen, hidden, uiMode } = useUIState();

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    let running = true;
    let raf = 0;
    let t = 0;
    const tile = 32;
    let playerX = 10 * tile;
    let playerY = 8 * tile;
    const speed = 120; // px per second

    function resize() {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawTile(x: number, y: number, color: string) {
      ctx.fillStyle = color;
      ctx.fillRect(x * tile, y * tile, tile, tile);
    }

    function draw() {
      if (!running) return;
      t += 0.016;

      // basic movement
      const dt = 0.016;
      const keys = keysRef.current;
      const left = keys["arrowleft"] || keys["a"]; const right = keys["arrowright"] || keys["d"];
      const up = keys["arrowup"] || keys["w"]; const down = keys["arrowdown"] || keys["s"];
      if (left) playerX -= speed * dt;
      if (right) playerX += speed * dt;
      if (up) playerY -= speed * dt;
      if (down) playerY += speed * dt;

      // clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // subtle gradient sky/ground
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#a7f3d0");
      grad.addColorStop(1, "#86efac");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // draw a simple map of grass/dirt/water tiles
      const cols = Math.ceil(w / tile) + 2;
      const rows = Math.ceil(h / tile) + 2;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const noise = Math.sin((x + t) * 0.2) * Math.cos((y - t) * 0.2);
          const v = (noise + 1) / 2;
          const isWater = v > 0.8;
          const isPath = v < 0.2;
          if (isWater) drawTile(x, y, "#60a5fa");
          else if (isPath) drawTile(x, y, "#fcd34d");
          else drawTile(x, y, (x + y) % 2 === 0 ? "#a7f3d0" : "#93eabf");
        }
      }

      // player circle with gentle bob
      const px = playerX + Math.sin(t * 2) * 2;
      const py = playerY + Math.cos(t * 2) * 2;
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fillStyle = "#dc2626";
      ctx.fill();

      raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Keyboard listeners always mounted; act only when game is active (no overlays) at event time
  const allowInputRef = useRef(false);
  useEffect(() => {
    allowInputRef.current = hidden === "visible" && !menuOpen && uiMode === "game";
  }, [menuOpen, hidden, uiMode]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!allowInputRef.current) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || (target as any).isContentEditable)) return;
      const k = (e.key || "").toLowerCase();
      if (["arrowleft","arrowright","arrowup","arrowdown","w","a","s","d"].includes(k)) {
        keysRef.current[k] = true;
        e.preventDefault();
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (!allowInputRef.current) return;
      const k = (e.key || "").toLowerCase();
      if (["arrowleft","arrowright","arrowup","arrowdown","w","a","s","d"].includes(k)) {
        keysRef.current[k] = false;
        e.preventDefault();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      aria-hidden
    />
  );
}




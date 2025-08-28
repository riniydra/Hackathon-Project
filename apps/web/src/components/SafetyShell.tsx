"use client";
import { useEffect } from "react";

export default function SafetyShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const cmdDot = (e.metaKey || e.ctrlKey) && e.key === ".";
      const esc = e.key === "Escape";
      if (cmdDot || esc) {
        // quick exit: navigate to neutral page
        window.location.href = "https://www.weather.com/"; // placeholder boss screen
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return <div style={{maxWidth:720, margin:"24px auto", padding:"0 16px"}}>{children}</div>;
}

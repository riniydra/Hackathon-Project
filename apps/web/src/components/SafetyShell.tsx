"use client";
import { useEffect } from "react";

export default function SafetyShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const cmdDot = (e.metaKey || e.ctrlKey) && e.key === ".";
      if (cmdDot) {
        // quick exit: navigate to neutral page
        window.location.href = "https://www.weather.com/"; // placeholder boss screen
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return <div style={{width:"100%", height:"100%"}}>{children}</div>;
}

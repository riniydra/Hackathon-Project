"use client";
import { useEffect } from "react";

export default function SafetyShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Soft background to create a calm, polished feel
    const previousBackground = document.body.style.background;
    const previousBackgroundColor = document.body.style.backgroundColor;
    document.body.style.background = "radial-gradient(1200px 800px at 10% 0%, #f0f9ff 0%, #f8fafc 40%, #ffffff 100%)";
    document.body.style.backgroundColor = "#ffffff";

    function handler(e: KeyboardEvent) {
      const cmdDot = (e.metaKey || e.ctrlKey) && e.key === ".";
      const esc = e.key === "Escape";
      if (cmdDot || esc) {
        // quick exit: navigate to neutral page
        window.location.href = "https://www.weather.com/"; // placeholder boss screen
      }
    }
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.background = previousBackground;
      document.body.style.backgroundColor = previousBackgroundColor;
    };
  }, []);

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 8,
          right: 8,
          background: "rgba(17,24,39,0.75)",
          color: "#fff",
          padding: "6px 10px",
          borderRadius: 8,
          fontSize: 12,
          letterSpacing: 0.2,
          boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          zIndex: 50
        }}
      >
        Press Esc or ⌘+. to Quick Hide
      </div>
      <div style={{maxWidth: 920, margin: "28px auto 40px", padding: "0 16px"}}>{children}</div>
    </>
  );
}

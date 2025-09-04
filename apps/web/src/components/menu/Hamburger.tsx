"use client";
import { useUIState } from "@/components/shell/UIStateProvider";

export default function Hamburger() {
  const { menuOpen, setMenuOpen, showGame } = useUIState();
  return (
    <button
      aria-label="Menu"
      onClick={() => setMenuOpen(!menuOpen)}
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        width: 40,
        height: 40,
        borderRadius: 8,
        border: "1px solid rgba(0,0,0,.1)",
        background: "rgba(255,255,255,.85)",
        backdropFilter: "blur(6px)",
        display: "grid",
        placeItems: "center",
        cursor: "pointer"
      }}
    >
      <div style={{display:"grid", gap:4}}>
        <span style={{display:"block", width:18, height:2, background:"#111", borderRadius:1}}/>
        <span style={{display:"block", width:18, height:2, background:"#111", borderRadius:1}}/>
        <span style={{display:"block", width:18, height:2, background:"#111", borderRadius:1}}/>
      </div>
    </button>
  );
}




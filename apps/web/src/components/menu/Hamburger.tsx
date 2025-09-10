"use client";
import { useUIState } from "@/components/shell/UIStateProvider";
import { tokens } from "@/lib/tokens";

export default function Hamburger() {
  const { menuOpen, setMenuOpen, showGame } = useUIState();
  return (
    <button
      aria-label="Menu"
      onClick={() => setMenuOpen(!menuOpen)}
      style={{
        position: "absolute",
        top: tokens.space(3),
        right: tokens.space(3),
        width: tokens.space(10),
        height: tokens.space(10),
        borderRadius: tokens.radius.lg,
        border: `1px solid ${tokens.border.subtle}`,
        background: tokens.bg.surfaceOverlayBlur,
        backdropFilter: `blur(${tokens.blur.md})`,
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        transition: tokens.transition.fast,
        boxShadow: tokens.shadow.sm
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = tokens.bg.secondaryHover;
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = tokens.bg.surfaceOverlayBlur;
      }}
    >
      <div style={{display:"grid", gap: tokens.space(1)}}>
        <span style={{
          display:"block", 
          width: tokens.space('4.5'), 
          height: tokens.space('0.5'), 
          background: tokens.text.primary, 
          borderRadius: tokens.radius.sm,
          transition: tokens.transition.fast
        }}/>
        <span style={{
          display:"block", 
          width: tokens.space('4.5'), 
          height: tokens.space('0.5'), 
          background: tokens.text.primary, 
          borderRadius: tokens.radius.sm,
          transition: tokens.transition.fast
        }}/>
        <span style={{
          display:"block", 
          width: tokens.space('4.5'), 
          height: tokens.space('0.5'), 
          background: tokens.text.primary, 
          borderRadius: tokens.radius.sm,
          transition: tokens.transition.fast
        }}/>
      </div>
    </button>
  );
}




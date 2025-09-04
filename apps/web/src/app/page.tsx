"use client";
import { useEffect } from "react";
import SafetyShell from "@/components/SafetyShell";
import { UIStateProvider } from "@/components/shell/UIStateProvider";
import GameCanvas from "@/components/game/GameCanvas";
import Hamburger from "@/components/menu/Hamburger";
import OverlayPanel from "@/components/menu/OverlayPanel";
import HiddenOverlay from "@/components/ui/HiddenOverlay";
import PinPromptModal from "@/components/ui/PinPromptModal";

export default function Home() {
  // keep mount for potential future hydration steps
  useEffect(()=>{},[]);

  return (
    <SafetyShell>
      <UIStateProvider>
        <div style={{position:"fixed", inset:0}}>
          <GameCanvas />
          <Hamburger />
          <OverlayPanel />
          <HiddenOverlay />
          <PinPromptModal />
        </div>
      </UIStateProvider>
    </SafetyShell>
  );
}

"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type ActiveTab = "journal" | "risk" | "security" | "design";
type HiddenState = "visible" | "hidden" | "pin";

interface UIStateContextValue {
  menuOpen: boolean;
  activeTab: ActiveTab;
  hidden: HiddenState;
  uiMode: "game" | "overlay";
  setMenuOpen: (open: boolean) => void;
  openTab: (tab: ActiveTab) => void;
  setHidden: (state: HiddenState) => void;
  showGame: () => void;
  showJournaling: () => void;
}

const UIStateContext = createContext<UIStateContextValue | null>(null);

export function UIStateProvider({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("journal");
  const [hidden, setHidden] = useState<HiddenState>("visible");
  const [uiMode, setUiMode] = useState<"game" | "overlay">("game");

  const openTab = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    setMenuOpen(true);
    setUiMode("overlay");
    setHidden("visible");
  }, []);

  const showGame = useCallback(() => {
    setUiMode("game");
    setMenuOpen(false);
  }, []);

  const showJournaling = useCallback(() => openTab("journal"), [openTab]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const key = typeof (e as any)?.key === "string" ? (e as any).key.toLowerCase() : "";
      const isEsc = key === "escape";
      const isCmdDot = (e.metaKey || e.ctrlKey) && key === ".";
      const isJ = (e.metaKey || e.ctrlKey) && key === "j";
      const isO = (e.metaKey || e.ctrlKey) && key === "o";

      if (isCmdDot) {
        window.location.href = "https://www.weather.com/";
        return;
      }

      if (isJ) {
        e.preventDefault();
        openTab("journal");
        return;
      }

      if (isO) {
        e.preventDefault();
        showGame();
        return;
      }

      if (isEsc) {
        e.preventDefault();
        setMenuOpen(false);
        setUiMode("game");
        setHidden(prev => (prev === "visible" ? "hidden" : prev === "hidden" ? "pin" : "pin"));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openTab, showGame]);

  const value = useMemo(() => ({
    menuOpen,
    activeTab,
    hidden,
    uiMode,
    setMenuOpen,
    openTab,
    setHidden,
    showGame,
    showJournaling,
  }), [menuOpen, activeTab, hidden, uiMode, openTab, showGame]);

  return <UIStateContext.Provider value={value}>{children}</UIStateContext.Provider>;
}

export function useUIState() {
  const ctx = useContext(UIStateContext);
  if (!ctx) throw new Error("useUIState must be used within UIStateProvider");
  return ctx;
}




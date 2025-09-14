"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { me } from "@/lib/api";

type ActiveTab = "journal" | "chat" | "risk" | "security";
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
  const [authed, setAuthed] = useState<boolean>(false);

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
    // Check auth status once on mount
    (async () => {
      try {
        const who = await me();
        setAuthed(!!who?.user_id && who.user_id !== "demo");
      } catch {
        setAuthed(false);
      }
    })();

    async function onKeyDown(e: KeyboardEvent) {
      const key = typeof (e as any)?.key === "string" ? (e as any).key.toLowerCase() : "";
      const isEsc = key === "escape";
      const isCmdDot = (e.metaKey || e.ctrlKey) && key === ".";
      const isJ = (e.metaKey || e.ctrlKey) && key === "j";
      const isC = (e.metaKey || e.ctrlKey) && key === "c";
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

      if (isC) {
        e.preventDefault();
        openTab("chat");
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
        // Re-check auth at the moment of ESC to reflect recent logins
        let isAuthed = authed;
        if (!isAuthed) {
          try {
            const who = await me();
            isAuthed = !!who?.user_id && who.user_id !== "demo";
            setAuthed(isAuthed);
          } catch {
            isAuthed = false;
          }
        }

        if (isAuthed) {
          setHidden(prev => (prev === "visible" ? "hidden" : prev === "hidden" ? "pin" : "pin"));
        } else {
          // For unsigned users, toggle only between visible/hidden; do not show PIN prompt
          setHidden(prev => (prev === "visible" ? "hidden" : "visible"));
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openTab, showGame, authed]);

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




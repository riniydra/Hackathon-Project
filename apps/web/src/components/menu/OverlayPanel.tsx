"use client";
import { useEffect, useState, useRef } from "react";
import { useUIState } from "@/components/shell/UIStateProvider";
import InsightsPanel from "@/components/InsightsPanel";
import AuthPanel from "@/components/AuthPanel";
import PinSetup from "@/components/security/PinSetup";
import JournalModal from "@/components/JournalModal";
import { listJournals, createJournal, me } from "@/lib/api";

interface JournalItem { id:number; user_id:string; created_at:string; text:string }

export default function OverlayPanel() {
  const { menuOpen, setMenuOpen, activeTab, openTab, showGame } = useUIState();
  const [journalOpen, setJournalOpen] = useState(false);
  const [journals, setJournals] = useState<JournalItem[]>([]);
  const [jLoading, setJLoading] = useState(false);
  const [jError, setJError] = useState<string|undefined>();
  const [authed, setAuthed] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);

  async function loadJournals() {
    setJLoading(true); setJError(undefined);
    try {
      const data = await listJournals();
      setJournals(data || []);
    } catch (e:any) {
      setJError("Failed to load journals");
    } finally {
      setJLoading(false);
    }
  }

  // Handle keyboard events for modal
  useEffect(() => {
    if (!menuOpen) return;
    
    function handleKeyDown(e: KeyboardEvent) {
      // ESC to close - but only if it's not Cmd/Ctrl+. (SafetyShell shortcut)
      if (e.key === 'Escape' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        setMenuOpen(false);
        return;
      }
      
      // Tab key trapping
      if (e.key === 'Tab') {
        const focusableElements = overlayRef.current?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
        );
        
        if (!focusableElements || focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
        
        if (e.shiftKey) {
          // Shift+Tab: if we're on first element, go to last
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: if we're on last element, go to first
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    
    // Focus first element when modal opens
    setTimeout(() => {
      const firstFocusable = overlayRef.current?.querySelector(
        'button:not([disabled]), [href], input:not([disabled])'
      ) as HTMLElement;
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }, 100);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen, setMenuOpen]);
  
  useEffect(() => {
    async function ensureAuthAndLoad() {
      try {
        const who = await me();
        const isAuthed = !!who?.user_id && who.user_id !== "demo";
        setAuthed(isAuthed);
        if (menuOpen && activeTab === "journal" && isAuthed) {
          await loadJournals();
        } else if (!isAuthed) {
          setJournals([]);
        }
      } catch {
        setAuthed(false);
        setJournals([]);
      }
    }
    if (menuOpen && activeTab === "journal") {
      ensureAuthAndLoad();
    }
  }, [menuOpen, activeTab]);

  async function handleSave(text: string) {
    try {
      if (!authed) return;
      await createJournal(text);
      setJournalOpen(false);
      await loadJournals();
    } catch (e:any) {
      setJError(e?.response?.data?.detail || "Failed to save journal");
    }
  }

  if (!menuOpen) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="overlay-title"
      onClick={() => setMenuOpen(false)}
      style={{ position:"absolute", inset:0, display:"grid", justifyContent:"end" }}
    >
      <div
        ref={overlayRef}
        className="focus-trap"
        onClick={e=>e.stopPropagation()}
        style={{
          width: 420,
          height: "100%",
          background:"var(--color-overlay-background)",
          backdropFilter: "blur(8px)",
          borderLeft: "1px solid var(--color-border)",
          display:"grid",
          gridTemplateRows:"auto 1fr auto",
          boxShadow:"var(--shadow-lg)"
        }}
      >
        <div id="overlay-title" style={{display:"flex", gap:"var(--spacing-sm)", padding:"var(--spacing-md)"}}>
          <Tab label="Journaling" active={activeTab==="journal"} onClick={()=>openTab("journal")} />
          <Tab label="Risk Score" active={activeTab==="risk"} onClick={()=>openTab("risk")} />
          <Tab label="Login" active={activeTab==="security"} onClick={()=>openTab("security")} />
        </div>

        <div style={{overflow:"auto", padding:"var(--spacing-md)"}}>
          {activeTab === "journal" && (
            <div style={{display:"grid", gap:"var(--spacing-md)"}}>
              <button onClick={()=> authed && setJournalOpen(true)} disabled={!authed} style={{padding:"var(--spacing-sm) var(--spacing-md)", opacity: authed? 1: .6, border:"1px solid var(--color-button-border)", borderRadius:"var(--border-radius-sm)", backgroundColor:"var(--color-button-background)"}}>New Journal</button>
              <p style={{color:"var(--color-text-secondary)"}}>Toggle to Game (O) • Quick Hide (Esc)</p>
              {!authed && (
                <div style={{color:"var(--color-text-secondary)"}}>Log in to create journals and view your list.</div>
              )}
              {authed && jLoading && <div style={{color:"var(--color-text-secondary)"}}>Loading journals…</div>}
              {authed && jError && <div style={{color:"var(--color-text-error)"}}>{jError}</div>}
              {authed && !jLoading && journals.length > 0 && (
                <ul style={{listStyle:"none", padding:0, margin:0, display:"grid", gap:"var(--spacing-sm)"}}>
                  {journals.map(j => (
                    <li key={j.id} style={{background:"var(--color-background-muted)", padding:"var(--spacing-sm)", borderRadius:"var(--border-radius-md)"}}>
                      <div style={{fontSize:12, color:"var(--color-text-secondary)"}}>{new Date(j.created_at).toLocaleString()}</div>
                      <div>{j.text}</div>
                    </li>
                  ))}
                </ul>
              )}
              {authed && !jLoading && journals.length === 0 && (
                <div style={{color:"var(--color-text-secondary)"}}>No journals yet. Create your first one.</div>
              )}
              <JournalModal open={journalOpen} onClose={()=>setJournalOpen(false)} onSave={handleSave} />
            </div>
          )}
          {activeTab === "risk" && (
            <div><InsightsPanel /></div>
          )}
          {activeTab === "security" && (
            <div style={{display:"grid", gap:"var(--spacing-md)"}}>
              <AuthPanel />
              <PinSetup />
            </div>
          )}
        </div>

        <div style={{display:"flex", justifyContent:"space-between", padding:"var(--spacing-md)", borderTop:"1px solid var(--color-border)"}}>
          <button ref={firstFocusableRef} onClick={showGame}>Toggle to Game</button>
          <button ref={lastFocusableRef} onClick={()=>setMenuOpen(false)}>Close</button>
        </div>
      </div>
    </div>
  );
}

function Tab({ label, active, onClick }: { label:string; active:boolean; onClick:()=>void }) {
  return (
    <button onClick={onClick} aria-pressed={active}
      style={{
        padding:"var(--spacing-sm) var(--spacing-md)",
        borderRadius:"var(--border-radius-md)",
        border: active? "1px solid var(--color-tab-active-border)" : "1px solid var(--color-tab-inactive-border)",
        background: active? "var(--color-tab-active)" : "var(--color-tab-inactive)"
      }}
    >{label}</button>
  );
}



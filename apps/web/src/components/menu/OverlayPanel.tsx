"use client";
import { useEffect, useState } from "react";
import { useUIState } from "@/components/shell/UIStateProvider";
import InsightsPanel from "@/components/InsightsPanel";
import AuthPanel from "@/components/AuthPanel";
import PinSetup from "@/components/security/PinSetup";
import JournalModal from "@/components/JournalModal";
import ChatPanel from "@/components/ChatPanel";
import { listJournals, createJournal, me } from "@/lib/api";
import { colors, radii, shadow } from "@/components/theme/tokens";

interface JournalItem { id:number; user_id:string; created_at:string; text:string }

export default function OverlayPanel() {
  const { menuOpen, setMenuOpen, activeTab, openTab, showGame } = useUIState();
  const [journalOpen, setJournalOpen] = useState(false);
  const [journals, setJournals] = useState<JournalItem[]>([]);
  const [jLoading, setJLoading] = useState(false);
  const [jError, setJError] = useState<string|undefined>();
  const [authed, setAuthed] = useState(false);

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
      // Trigger a risk refresh so Insights updates immediately after journal save
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("risk:refresh"));
      }
    } catch (e:any) {
      setJError(e?.response?.data?.detail || "Failed to save journal");
    }
  }

  if (!menuOpen) return null;
  return (
    <div
      role="dialog"
      aria-modal
      onClick={() => setMenuOpen(false)}
      style={{ position:"absolute", inset:0, display:"grid", placeItems:"center" }}
    >
      <div
        onClick={e=>e.stopPropagation()}
        style={{
          width: "80vw",
          height: "80vh",
          background: `linear-gradient(180deg, ${colors.modalTop} 60%, ${colors.modalBottom})`,
          backdropFilter: "blur(8px)",
          border: `1px solid ${colors.border}`,
          borderRadius: radii.lg,
          display:"grid",
          gridTemplateRows:"auto 1fr auto",
          boxShadow: shadow.modal,
          overflow:"hidden"
        }}
      >
        <div style={{display:"flex", gap:8, padding:12}}>
          <Tab label="Journaling" active={activeTab==="journal"} onClick={()=>openTab("journal")} />
          <Tab label="Chat" active={activeTab==="chat"} onClick={()=>openTab("chat")} />
          <Tab label="Risk Score" active={activeTab==="risk"} onClick={()=>openTab("risk")} />
          <Tab label="Login" active={activeTab==="security"} onClick={()=>openTab("security")} />
        </div>

        <div style={{overflow:"auto", padding:16, background:'#ffffffcc'}}>
          {activeTab === "journal" && (
            <div style={{display:"grid", gap:12}}>
              <button onClick={()=> authed && setJournalOpen(true)} disabled={!authed} style={{padding:"8px 12px", opacity: authed? 1: .6}}>New Journal</button>
              <p style={{opacity:.7}}>Toggle to Game (O) • Quick Hide (Esc)</p>
              {!authed && (
                <div style={{opacity:.7}}>Log in to create journals and view your list.</div>
              )}
              {authed && jLoading && <div style={{opacity:.7}}>Loading journals…</div>}
              {authed && jError && <div style={{color:"crimson"}}>{jError}</div>}
              {authed && !jLoading && journals.length > 0 && (
                <ul style={{listStyle:"none", padding:0, margin:0, display:"grid", gap:8}}>
                  {journals.map(j => (
                    <li key={j.id} style={{background: colors.cardBg, padding:12, borderRadius: radii.md, border:`1px solid ${colors.border}`}}>
                      <div style={{fontSize:12, opacity:.7}}>{new Date(j.created_at).toLocaleString()}</div>
                      <div>{j.text}</div>
                    </li>
                  ))}
                </ul>
              )}
              {authed && !jLoading && journals.length === 0 && (
                <div style={{opacity:.7}}>No journals yet. Create your first one.</div>
              )}
              <JournalModal open={journalOpen} onClose={()=>setJournalOpen(false)} onSave={handleSave} />
            </div>
          )}
          {activeTab === "chat" && (
            <div style={{height: "100%", display: "grid"}}>
              <ChatPanel />
            </div>
          )}
          {activeTab === "risk" && (
            <div><InsightsPanel /></div>
          )}
          {activeTab === "security" && (
            <div style={{display:"grid", gap:12}}>
              <AuthPanel />
              <PinSetup />
            </div>
          )}
        </div>

        <div style={{display:"flex", justifyContent:"space-between", padding:12, borderTop:`1px solid ${colors.border}`, background:"rgba(255,255,255,0.6)"}}>
          <button onClick={showGame} style={{border:`1px solid ${colors.border}`, padding:"6px 10px", borderRadius:radii.md, background:"#fff", color: colors.slateText}}>Toggle to Game</button>
          <button onClick={()=>setMenuOpen(false)} style={{border:`1px solid ${colors.border}`, padding:"6px 10px", borderRadius:radii.md, background:"#fff", color: colors.slateText}}>Close</button>
        </div>
      </div>
    </div>
  );
}

function Tab({ label, active, onClick }: { label:string; active:boolean; onClick:()=>void }) {
  return (
    <button onClick={onClick} aria-pressed={active}
      style={{
        padding:"8px 14px",
        borderRadius: radii.pill,
        border: active? `1px solid ${colors.sky}` : `1px solid ${colors.border}`,
        background: active? colors.skyLight : "#fff",
        color: colors.slateText
      }}
    >{label}</button>
  );
}



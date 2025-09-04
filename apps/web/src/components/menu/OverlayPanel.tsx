"use client";
import { useEffect, useState } from "react";
import { useUIState } from "@/components/shell/UIStateProvider";
import InsightsPanel from "@/components/InsightsPanel";
import AuthPanel from "@/components/AuthPanel";
import PinSetup from "@/components/security/PinSetup";
import JournalModal from "@/components/JournalModal";
import { listJournals, createJournal } from "@/lib/api";

interface JournalItem { id:number; user_id:string; created_at:string; text:string }

export default function OverlayPanel() {
  const { menuOpen, setMenuOpen, activeTab, openTab, showGame } = useUIState();
  const [journalOpen, setJournalOpen] = useState(false);
  const [journals, setJournals] = useState<JournalItem[]>([]);
  const [jLoading, setJLoading] = useState(false);
  const [jError, setJError] = useState<string|undefined>();

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
    if (menuOpen && activeTab === "journal") {
      loadJournals();
    }
  }, [menuOpen, activeTab]);

  async function handleSave(text: string) {
    try {
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
      aria-modal
      onClick={() => setMenuOpen(false)}
      style={{ position:"absolute", inset:0, display:"grid", justifyContent:"end" }}
    >
      <div
        onClick={e=>e.stopPropagation()}
        style={{
          width: 420,
          height: "100%",
          background:"rgba(255,255,255,.96)",
          backdropFilter: "blur(8px)",
          borderLeft: "1px solid #e5e7eb",
          display:"grid",
          gridTemplateRows:"auto 1fr auto",
          boxShadow:"-8px 0 24px rgba(0,0,0,.1)"
        }}
      >
        <div style={{display:"flex", gap:8, padding:12}}>
          <Tab label="Journaling" active={activeTab==="journal"} onClick={()=>openTab("journal")} />
          <Tab label="Risk Score" active={activeTab==="risk"} onClick={()=>openTab("risk")} />
          <Tab label="Login" active={activeTab==="security"} onClick={()=>openTab("security")} />
        </div>

        <div style={{overflow:"auto", padding:12}}>
          {activeTab === "journal" && (
            <div style={{display:"grid", gap:12}}>
              <button onClick={()=>setJournalOpen(true)} style={{padding:"8px 12px"}}>New Journal</button>
              <p style={{opacity:.7}}>Toggle to Game (O) • Quick Hide (Esc)</p>
              {jLoading && <div style={{opacity:.7}}>Loading journals…</div>}
              {jError && <div style={{color:"crimson"}}>{jError}</div>}
              {!jLoading && journals.length > 0 && (
                <ul style={{listStyle:"none", padding:0, margin:0, display:"grid", gap:8}}>
                  {journals.map(j => (
                    <li key={j.id} style={{background:"#f5f5f5", padding:8, borderRadius:8}}>
                      <div style={{fontSize:12, opacity:.7}}>{new Date(j.created_at).toLocaleString()}</div>
                      <div>{j.text}</div>
                    </li>
                  ))}
                </ul>
              )}
              {!jLoading && journals.length === 0 && (
                <div style={{opacity:.7}}>No journals yet. Create your first one.</div>
              )}
              <JournalModal open={journalOpen} onClose={()=>setJournalOpen(false)} onSave={handleSave} />
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

        <div style={{display:"flex", justifyContent:"space-between", padding:12, borderTop:"1px solid #e5e7eb"}}>
          <button onClick={showGame}>Toggle to Game</button>
          <button onClick={()=>setMenuOpen(false)}>Close</button>
        </div>
      </div>
    </div>
  );
}

function Tab({ label, active, onClick }: { label:string; active:boolean; onClick:()=>void }) {
  return (
    <button onClick={onClick} aria-pressed={active}
      style={{
        padding:"8px 12px",
        borderRadius:8,
        border: active? "1px solid #93c5fd" : "1px solid #e5e7eb",
        background: active? "#eff6ff" : "#fff"
      }}
    >{label}</button>
  );
}



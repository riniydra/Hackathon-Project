"use client";
import { useEffect, useState, useRef } from "react";
import { listJournals, createJournal, me } from "@/lib/api";
import SafetyShell from "@/components/SafetyShell";
import JournalModal from "@/components/JournalModal";
import BreathGarden from "@/components/BreathGarden";
import AuthPanel from "@/components/AuthPanel";
import InsightsPanel, { InsightsPanelRef } from "@/components/InsightsPanel";

export default function Home() {
  const [items, setItems] = useState<{id:number;text:string}[]>([]);
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const insightsRef = useRef<InsightsPanelRef>(null);

  async function refresh() {
    const who = await me();
    const isAuthed = !!who?.user_id && who.user_id !== "demo";
    setAuthed(isAuthed);
    
    if (isAuthed) {
      const data = await listJournals();
      setItems(data.map((d:any)=>({id:d.id, text:d.text})));
      // Refresh risk data when user authentication changes
      await insightsRef.current?.refreshRiskData();
    } else {
      setItems([]); // Clear journals when not authenticated
    }
  }
  useEffect(()=>{ refresh(); },[]);

  async function save(text: string) {
    await createJournal(text);
    setOpen(false);
    await refresh(); // This will also refresh risk data
  }

  return (
    <SafetyShell>
      <div style={{textAlign:"center", margin:"12px 0 20px"}}>
        <h1 style={{
          margin: 0,
          fontSize: 36,
          letterSpacing: -0.5,
          lineHeight: 1.2
        }}>{process.env.NEXT_PUBLIC_APP_NAME}</h1>
        <p style={{opacity:.65, marginTop: 6}}>A calm place to breathe, write, and chat.</p>
      </div>

      <div style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 6px 16px rgba(2,6,23,0.06)"
      }}>
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 8}}>
          <h3 style={{margin:0}}>Breath Garden</h3>
          <span style={{fontSize:12, opacity:.6}}>Follow the circle</span>
        </div>
        <BreathGarden />
      </div>

      <div style={{margin:"24px 0"}}>
        <AuthPanel onAuth={refresh} />
      </div>

      {authed && (
        <>
          <h3 style={{marginBottom: 8}}>Recent Journals</h3>
          <ul style={{listStyle:"none", padding: 0, margin: 0}}>
            {items.map(i=> (
              <li key={i.id} style={{
                marginBottom:10,
                background:"#ffffff",
                padding:12,
                borderRadius:12,
                border:"1px solid #e5e7eb",
                boxShadow:"0 4px 12px rgba(2,6,23,0.05)"
              }}>{i.text}</li>
            ))}
          </ul>
          
          <div style={{margin:"16px 0"}}>
            <button onClick={()=>setOpen(true)} style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid #0ea5e9",
              background: "linear-gradient(180deg, #38bdf8, #0ea5e9)",
              color: "#fff",
              boxShadow: "0 6px 16px rgba(14,165,233,0.35)"
            }}>New Journal</button>
          </div>
          <JournalModal open={open} onClose={()=>setOpen(false)} onSave={save} />

          <div style={{
            margin:"32px 0",
            padding:"24px",
            border:"1px solid #e5e7eb",
            borderRadius:16,
            background: "#ffffff",
            boxShadow: "0 8px 20px rgba(2,6,23,0.06)"
          }}>
            <InsightsPanel ref={insightsRef} />
          </div>
        </>
      )}

      {!authed && (
        <p style={{opacity:.7, textAlign:"center"}}>Log in to create journals and view insights.</p>
      )}
    </SafetyShell>
  );
}

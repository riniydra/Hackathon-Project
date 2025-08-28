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
      <h1>{process.env.NEXT_PUBLIC_APP_NAME}</h1>
      <p style={{opacity:.7}}>A calm place to breathe, write, and chat.</p>

      <h3>Breath Garden</h3>
      <BreathGarden />

      <div style={{margin:"24px 0"}}>
        <AuthPanel onAuth={refresh} />
      </div>

      {authed && (
        <>
          <h3>Recent Journals</h3>
          <ul>{items.map(i=> <li key={i.id} style={{marginBottom:8, background:"#f5f5f5", padding:8, borderRadius:8}}>{i.text}</li>)}</ul>
          
          <div style={{margin:"16px 0"}}><button onClick={()=>setOpen(true)}>New Journal</button></div>
          <JournalModal open={open} onClose={()=>setOpen(false)} onSave={save} />

          <div style={{margin:"32px 0", padding:"24px", border:"1px solid #e5e7eb", borderRadius:12}}>
            <InsightsPanel ref={insightsRef} />
          </div>
        </>
      )}

      {!authed && (
        <p style={{opacity:.7}}>Log in to create journals and view insights.</p>
      )}
    </SafetyShell>
  );
}

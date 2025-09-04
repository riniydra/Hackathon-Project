"use client";
import { useState, useEffect } from "react";

export default function JournalModal({
  open, onClose, onSave
}: { open:boolean; onClose:()=>void; onSave:(text:string)=>void }) {
  const [text, setText] = useState("");
  useEffect(()=>{ if(open) setText(""); },[open]);
  if(!open) return null;
  return (
    <div onClick={onClose}
      style={{position:"fixed", inset:0, background:"rgba(2,6,23,.55)", display:"grid", placeItems:"center", backdropFilter:"blur(2px)"}}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:"#fff", padding:16, borderRadius:16, width:"min(720px, 92vw)", boxShadow:"0 20px 60px rgba(2,6,23,0.25)"}}>
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8}}>
          <h3 style={{margin:0}}>New Journal</h3>
          <button onClick={onClose} style={{border:"1px solid #e5e7eb", background:"#f9fafb", borderRadius:8, padding:"4px 8px"}}>Close</button>
        </div>
        <textarea value={text} onChange={e=>setText(e.target.value)} rows={8}
          style={{width:"100%", padding:12, borderRadius:12, border:"1px solid #e5e7eb", background:"#ffffff"}}/>
        <div style={{display:"flex", gap:8, marginTop:10, justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"8px 12px", borderRadius:10, border:"1px solid #e5e7eb", background:"#f9fafb"}}>Cancel</button>
          <button onClick={()=>onSave(text)} disabled={!text.trim()} style={{
            padding:"8px 14px", borderRadius:10,
            border:"1px solid #0ea5e9", background:"linear-gradient(180deg, #38bdf8, #0ea5e9)", color:"#fff",
            boxShadow:"0 8px 18px rgba(14,165,233,0.25)", opacity: !text.trim()? .6 : 1
          }}>Save</button>
        </div>
        <p style={{fontSize:12, opacity:.7, marginTop:10}}>
          Tip: Press Esc or ⌘+. to quickly switch away.
        </p>
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";

export default function JournalModal({
  open, onClose, onSave
}: { open:boolean; onClose:()=>void; onSave:(text:string)=>void }) {
  const [title, setTitle] = useState("");
  const [mood, setMood] = useState(3);
  const [tags, setTags] = useState("");
  const [text, setText] = useState("");
  useEffect(()=>{ if(open){ setTitle(""); setMood(3); setTags(""); setText(""); } },[open]);
  if(!open) return null;
  return (
    <div onClick={onClose}
      style={{position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"grid", placeItems:"center"}}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:"#fff", padding:16, borderRadius:12, width:"min(600px, 92vw)"}}>
        <h3>New Journal</h3>
        <input placeholder="Title (optional)" value={title} onChange={e=>setTitle(e.target.value)} style={{width:"100%", marginBottom:8}}/>
        <label style={{fontSize:12, opacity:.7}}>Mood: {mood}
          <input type="range" min={1} max={5} value={mood} onChange={e=>setMood(Number(e.target.value))} style={{width:"100%"}} />
        </label>
        <input placeholder="Tags comma-separated (optional)" value={tags} onChange={e=>setTags(e.target.value)} style={{width:"100%", margin:"8px 0"}}/>
        <textarea value={text} onChange={e=>setText(e.target.value)} rows={6} style={{width:"100%"}}/>
        <div style={{display:"flex", gap:8, marginTop:8}}>
          <button onClick={()=>{
            const payload = `${title ? `[${title}] `: ""}${text}${tags.trim()? `\n\n#tags: ${tags}`: ""}\n\n[mood:${mood}]`;
            onSave(payload);
          }} disabled={!text.trim()}>Save</button>
          <button onClick={onClose}>Cancel</button>
        </div>
        <p style={{fontSize:12, opacity:.7, marginTop:8}}>
          Tip: Press Esc or ⌘+. anytime to quickly switch away.
        </p>
      </div>
    </div>
  );
}

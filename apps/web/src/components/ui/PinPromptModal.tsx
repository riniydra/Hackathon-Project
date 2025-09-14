"use client";
import { useEffect, useState } from "react";
import { useUIState } from "@/components/shell/UIStateProvider";
import { verifyPin } from "@/lib/api";

export default function PinPromptModal() {
  const { hidden, setHidden } = useUIState();
  const [pin, setPin] = useState("");

  useEffect(()=>{ if(hidden!=="pin") setPin(""); },[hidden]);
  if (hidden !== "pin") return null;

  async function attemptVerify(code: string) {
    try {
      const res = await verifyPin(code);
      if (res?.duress) {
        window.location.reload();
      } else {
        setHidden("visible");
      }
    } catch (e) {
      setPin("");
    }
  }

  function press(n: number) {
    const next = (pin + String(n)).slice(0, 6); // allow up to 6 digits
    setPin(next);
  }

  return (
    <div style={{position:"absolute", inset:0, display:"grid", placeItems:"center"}}>
      <div style={{
        padding:24,
        borderRadius:16,
        background:"rgba(15,23,42,.8)",
        color:"#fff",
        width:"min(420px, 92vw)",
        boxShadow:"0 10px 30px rgba(0,0,0,.35)"
      }}>
        <h2 style={{marginTop:0}}>Enter PIN</h2>
        <div style={{letterSpacing:8, fontSize:24, background:"rgba(255,255,255,.1)", padding:"8px 12px", borderRadius:8, marginBottom:12}}>
          {pin.replace(/./g, "•")}
        </div>
        <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:8}}>
          {[1,2,3,4,5,6,7,8,9].map(n=> (
            <Key key={n} label={String(n)} onClick={()=>press(n)} />
          ))}
          <div />
          <Key label="0" onClick={()=>press(0)} />
          <Key label="←" onClick={()=> setPin(p=>p.slice(0,-1))} />
        </div>
        <div style={{display:"flex", gap:8, marginTop:12, justifyContent:"flex-end"}}>
          <button onClick={()=>setPin("")} style={{padding:"8px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,.3)", background:"transparent", color:"#fff"}}>Clear</button>
          <button onClick={()=>attemptVerify(pin)} disabled={pin.length < 4} style={{padding:"8px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,.3)", background:"#fff", color:"#111", opacity: pin.length<4? .6:1}}>Verify</button>
        </div>
      </div>
    </div>
  );
}

function Key({ label, onClick }: { label:string; onClick:()=>void }) {
  return (
    <button onClick={onClick} style={{
      padding:"12px 0",
      borderRadius:10,
      background:"rgba(255,255,255,.15)",
      border:"1px solid rgba(255,255,255,.2)",
      color:"#fff",
      fontSize:20
    }}>{label}</button>
  );
}



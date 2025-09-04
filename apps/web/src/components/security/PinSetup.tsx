"use client";
import { useState } from "react";
import { setPin } from "@/lib/api";

export default function PinSetup() {
  const [pin, setPinLocal] = useState("");
  const [duress, setDuress] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    setMsg(null);
    try {
      await setPin(pin, duress || undefined);
      setMsg("PIN updated");
      setPinLocal(""); setDuress("");
    } catch (e:any) {
      setMsg(e?.response?.data?.detail || "Failed to set PIN");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{display:"grid", gap:8}}>
      <h4 style={{margin:"8px 0"}}>PIN & Duress PIN</h4>
      <input type="password" inputMode="numeric" placeholder="4-6 digit PIN" value={pin} onChange={e=>setPinLocal(e.target.value.replace(/\D/g, ""))} />
      <input type="password" inputMode="numeric" placeholder="Optional duress PIN" value={duress} onChange={e=>setDuress(e.target.value.replace(/\D/g, ""))} />
      <div style={{display:"flex", gap:8}}>
        <button onClick={save} disabled={loading || pin.length < 4}>{loading?"...":"Save"}</button>
        {msg && <span style={{opacity:.7}}>{msg}</span>}
      </div>
      <p style={{fontSize:12, opacity:.7}}>Duress PIN logs into a safe decoy mode.</p>
    </div>
  );
}





"use client";
import { useState } from "react";
import { setPin } from "@/lib/api";

export default function PinSetup() {
  const [pin, setPinLocal] = useState("");
  const [duress, setDuress] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const samePins = pin.length >= 4 && duress.length >= 4 && pin === duress;

  async function save() {
    setLoading(true);
    setMsg(null);
    try {
      if (samePins) {
        setMsg("Duress PIN must be different from your PIN");
        return;
      }
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
      <h4 style={{margin:"8px 0"}}>Security PINs</h4>
      <label style={{display:"grid", gap:4}}>
        <span style={{fontSize:12, opacity:.8}}>PIN (4–6 digits)</span>
        <input type="password" inputMode="numeric" placeholder="Enter PIN" value={pin} onChange={e=>setPinLocal(e.target.value.replace(/\D/g, ""))} />
        <span style={{fontSize:12, opacity:.7}}>Use this to unhide and access your real data.</span>
      </label>
      <label style={{display:"grid", gap:4}}>
        <span style={{fontSize:12, opacity:.8}}>Duress PIN (optional)</span>
        <input type="password" inputMode="numeric" placeholder="Enter duress PIN" value={duress} onChange={e=>setDuress(e.target.value.replace(/\D/g, ""))} />
        <span style={{fontSize:12, opacity:.7}}>Entering this opens a safe decoy account. Keep it different from your PIN.</span>
      </label>
      {samePins && <div style={{color:"#b91c1c", fontSize:12}}>Duress PIN cannot be the same as your main PIN.</div>}
      <div style={{display:"flex", gap:8, alignItems:"center"}}>
        <button onClick={save} disabled={loading || pin.length < 4 || samePins}>{loading?"...":"Save"}</button>
        {msg && <span style={{opacity:.7}}>{msg}</span>}
      </div>
    </div>
  );
}





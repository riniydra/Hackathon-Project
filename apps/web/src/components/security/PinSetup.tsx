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
    <div style={{display:"grid", gap:10}}>
      <h4 style={{margin:"8px 0"}}>Security PINs</h4>
      <label style={{display:"grid", gap:6}}>
        <span style={{fontSize:12, opacity:.8}}>Primary PIN (4–6 digits)</span>
        <input
          type="password"
          inputMode="numeric"
          placeholder="e.g. 4829"
          value={pin}
          onChange={e=>setPinLocal(e.target.value.replace(/\D/g, ""))}
          style={{
            padding:"10px 12px",
            borderRadius:8,
            border:"1px solid #2563eb",
            background:"#eff6ff",
            color:"#111"
          }}
        />
        <span style={{fontSize:12, opacity:.75}}>Used to unhide the app and return to your real account.</span>
      </label>
      <label style={{display:"grid", gap:6}}>
        <span style={{fontSize:12, opacity:.8}}>Duress PIN (optional, 4–6 digits)</span>
        <input
          type="password"
          inputMode="numeric"
          placeholder="e.g. 6501"
          value={duress}
          onChange={e=>setDuress(e.target.value.replace(/\D/g, ""))}
          style={{
            padding:"10px 12px",
            borderRadius:8,
            border:"1px solid #f59e0b",
            background:"#fff7ed",
            color:"#111"
          }}
        />
        <span style={{fontSize:12, opacity:.75}}>If someone is watching, this opens a safe decoy account. Do not reuse your Primary PIN.</span>
      </label>
      {samePins && <div style={{color:"#b91c1c", fontSize:12}}>Duress PIN cannot be the same as your main PIN.</div>}
      <div style={{display:"flex", gap:8, alignItems:"center"}}>
        <button onClick={save} disabled={loading || pin.length < 4 || samePins}>{loading?"...":"Save"}</button>
        {msg && <span style={{opacity:.7}}>{msg}</span>}
      </div>
    </div>
  );
}





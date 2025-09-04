"use client";
import { useState } from "react";
import { signup, login, setPin } from "@/lib/api";

export default function OnboardingWizard({ open, onClose }: { open:boolean; onClose:()=>void }) {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPinLocal] = useState("");
  const [duressPin, setDuressPin] = useState("");
  const [gender, setGender] = useState<string>("");
  const [relationship, setRelationship] = useState<string>("");
  const [children, setChildren] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|undefined>();

  if (!open) return null;

  async function next() {
    try {
      setError(undefined);
      setLoading(true);
      if (step === 1) {
        await signup(email, password);
        await login(email, password);
      }
      if (step === 2) {
        await setPin(pin, duressPin || undefined);
      }
      setStep(s => s + 1);
    } catch (e:any) {
      setError(e?.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function done() {
    onClose();
  }

  return (
    <div onClick={onClose} style={{position:"absolute", inset:0, display:"grid", placeItems:"center", background:"rgba(0,0,0,.5)"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff", width:"min(620px, 92vw)", borderRadius:12, padding:16}}>
        {step === 0 && (
          <section>
            <h2>Welcome</h2>
            <p>This app overlays a calming 2D game. You can hide everything with Esc and return with your PIN.</p>
            <div style={{display:"flex", justifyContent:"end", gap:8}}>
              <button onClick={()=>setStep(1)}>Get started</button>
            </div>
          </section>
        )}
        {step === 1 && (
          <section style={{display:"grid", gap:8}}>
            <h2>Create account</h2>
            <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
            <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
            {error && <div style={{color:"crimson"}}>{error}</div>}
            <div style={{display:"flex", justifyContent:"space-between"}}>
              <button onClick={onClose}>Cancel</button>
              <button onClick={next} disabled={loading || !email || !password}>{loading?"...":"Continue"}</button>
            </div>
          </section>
        )}
        {step === 2 && (
          <section style={{display:"grid", gap:8}}>
            <h2>Create PIN</h2>
            <input type="password" placeholder="4-6 digits" value={pin} onChange={e=>setPinLocal(e.target.value.replace(/\D/g,""))} />
            <input type="password" placeholder="Optional duress PIN" value={duressPin} onChange={e=>setDuressPin(e.target.value.replace(/\D/g,""))} />
            <div style={{display:"flex", justifyContent:"space-between"}}>
              <button onClick={()=>setStep(1)}>Back</button>
              <button onClick={next} disabled={loading || pin.length < 4}>{loading?"...":"Continue"}</button>
            </div>
          </section>
        )}
        {step === 3 && (
          <section style={{display:"grid", gap:8}}>
            <h2>About you (optional)</h2>
            <input placeholder="Gender (optional)" value={gender} onChange={e=>setGender(e.target.value)} />
            <input placeholder="Relationship status (optional)" value={relationship} onChange={e=>setRelationship(e.target.value)} />
            <input placeholder="Number of children (optional)" value={children} onChange={e=>setChildren(e.target.value)} />
            <div style={{display:"flex", justifyContent:"space-between"}}>
              <button onClick={()=>setStep(2)}>Back</button>
              <button onClick={next} disabled={loading}>{loading?"...":"Continue"}</button>
            </div>
          </section>
        )}
        {step === 4 && (
          <section style={{display:"grid", gap:8}}>
            <h2>Data consent</h2>
            <p>Choose if your journals can be analyzed to generate insights. You can change this later.</p>
            <div style={{display:"flex", justifyContent:"end", gap:8}}>
              <button onClick={done}>Done</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}




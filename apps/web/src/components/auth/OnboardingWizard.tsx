"use client";
import { useEffect, useState } from "react";
import { signup, login, setPin, updateProfile } from "@/lib/api";

export default function OnboardingWizard({ open, onClose, initialStep = 0 }: { open:boolean; onClose:()=>void; initialStep?: number }) {
  const [step, setStep] = useState(initialStep);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPinLocal] = useState("");
  const [duressPin, setDuressPin] = useState("");
  const [gender, setGender] = useState<string>("");
  const [relationship, setRelationship] = useState<string>("");
  const [children, setChildren] = useState<string>("");
  // Extended profile
  const [age, setAge] = useState<string>("");
  const [housing, setHousing] = useState<string>("");
  const [support, setSupport] = useState<string>("");
  const [defConf, setDefConf] = useState<string>("");
  const [defShare, setDefShare] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|undefined>();

  useEffect(() => {
    if (open) setStep(initialStep);
  }, [open, initialStep]);

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
      if (step === 3) {
        await updateProfile({
          gender: gender || null,
          relationship_status: relationship || null,
          num_children: children ? Number(children) : null,
          age: age ? Number(age) : null,
          victim_housing: housing || null,
          has_trusted_support: support ? support === "yes" : null,
          default_confidentiality: defConf || null,
          default_share_with: defShare || null,
        });
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
    <div onClick={onClose} style={{position:"fixed", inset:0, display:"grid", placeItems:"center", background:"rgba(0,0,0,.5)"}}>
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
            <input placeholder="Age (optional)" value={age} onChange={e=>setAge(e.target.value.replace(/\D/g, ""))} />
            <select value={housing} onChange={e=>setHousing(e.target.value)}>
              <option value="">Housing (optional)</option>
              <option value="stable">Stable</option>
              <option value="with_abuser">With abuser</option>
              <option value="shelter">Shelter</option>
              <option value="friends">Friends</option>
              <option value="unknown">Unknown</option>
            </select>
            <select value={support} onChange={e=>setSupport(e.target.value)}>
              <option value="">Trusted support? (optional)</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
            <select value={defConf} onChange={e=>setDefConf(e.target.value)}>
              <option value="">Default Confidentiality</option>
              <option value="private">Private</option>
              <option value="advocate_only">Advocate only</option>
              <option value="share_with_attorney">Share with attorney</option>
            </select>
            <select value={defShare} onChange={e=>setDefShare(e.target.value)}>
              <option value="">Default Share With</option>
              <option value="nobody">Nobody</option>
              <option value="advocate">Advocate</option>
              <option value="attorney">Attorney</option>
            </select>
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




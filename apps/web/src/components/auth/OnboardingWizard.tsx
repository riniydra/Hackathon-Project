"use client";
import { useEffect, useMemo, useState } from "react";
import { signup, login, setPin, updateProfile } from "@/lib/api";

export default function OnboardingWizard({ open, onClose, initialStep = 0 }: { open:boolean; onClose:()=>void; initialStep?: number }) {
  const [step, setStep] = useState(initialStep);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|undefined>();

  // Account
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // PIN
  const [pin, setPinLocal] = useState("");
  const [duressPin, setDuressPin] = useState("");
  // Profile
  const [gender, setGender] = useState<string>("");
  const [relationship, setRelationship] = useState<string>("");
  const [children, setChildren] = useState<string>("");
  const [age, setAge] = useState<string>("");
  const [housing, setHousing] = useState<string>("");
  const [support, setSupport] = useState<string>("");
  const [defConf, setDefConf] = useState<string>("");
  const [defShare, setDefShare] = useState<string>("");

  useEffect(() => {
    if (open) setStep(initialStep);
  }, [open, initialStep]);

  if (!open) return null;

  const steps = useMemo(() => [
    { key: 0, label: "Welcome" },
    { key: 1, label: "Account" },
    { key: 2, label: "PIN" },
    { key: 3, label: "Profile" },
    { key: 4, label: "Finish" },
  ], []);

  const emailValid = /.+@.+\..+/.test(email);
  const passwordValid = password.length >= 8;
  const pinValid = pin.length >= 4 && pin.length <= 6;
  const duressValid = duressPin === "" || (duressPin.length >= 4 && duressPin.length <= 6);
  const ageValid = age === "" || (+age >= 13 && +age <= 120);
  const childrenValid = children === "" || (+children >= 0 && Number.isFinite(+children));

  const canContinue = () => {
    if (step === 1) return emailValid && passwordValid;
    if (step === 2) return pinValid && duressValid;
    return true;
  };

  async function next() {
    try {
      setError(undefined);
      setLoading(true);
      if (step === 1) {
        if (!emailValid || !passwordValid) return; 
        await signup(email, password);
        await login(email, password);
      }
      if (step === 2) {
        if (!pinValid || !duressValid) return;
        await setPin(pin, duressPin || undefined);
      }
      if (step === 3) {
        if (!ageValid || !childrenValid) {
          setError("Please fix invalid profile fields");
        } else {
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
      }
      setStep(s => s + 1);
    } catch (e:any) {
      setError(e?.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function back() {
    setError(undefined);
    setStep(s => Math.max(0, s - 1));
  }

  function done() {
    onClose();
  }

  return (
    <div
      onClick={onClose}
      style={{ position:"fixed", inset:0, display:"grid", placeItems:"center", background:"rgba(0,0,0,.5)", zIndex:10000, backdropFilter:"blur(2px)" }}
      role="dialog" aria-modal="true" aria-labelledby="onboarding-title"
    >
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", width:"min(720px, 96vw)", borderRadius:16, padding:20, zIndex:10001, boxShadow:"0 10px 30px rgba(0,0,0,.2)" }}>
        {/* Stepper */}
        <div style={{display:"grid", gridTemplateColumns:`repeat(${steps.length}, 1fr)`, gap:8, alignItems:"center", marginBottom:16}}>
          {steps.map((s, i) => (
            <div key={s.key} style={{display:"grid", justifyItems:"center", gap:6}} aria-current={i===step}>
              <div style={{width:28, height:28, borderRadius:14, background:i<=step?"#0ea5e9":"#e5e7eb", color:i<=step?"#fff":"#111", display:"grid", placeItems:"center", fontWeight:"bold"}}>{i+1}</div>
              <div style={{fontSize:12, opacity:i<=step?1:.6}}>{s.label}</div>
            </div>
          ))}
        </div>

        {step === 0 && (
          <section>
            <h2 id="onboarding-title" style={{marginTop:0}}>Welcome</h2>
            <p>This safe space overlays a calming game. Press Esc to hide quickly; your PIN brings it back.</p>
            <div style={{display:"flex", justifyContent:"flex-end", gap:8}}>
              <button onClick={()=>setStep(1)} style={{padding:"8px 14px"}}>Get started</button>
            </div>
          </section>
        )}

        {step === 1 && (
          <section style={{display:"grid", gap:10}}>
            <h2 id="onboarding-title" style={{marginTop:0}}>Create account</h2>
            <label style={{display:"grid", gap:4}}>
              <span style={{fontSize:12, opacity:.8}}>Email</span>
              <input aria-invalid={!emailValid} aria-required type="email" placeholder="you@example.org" value={email} onChange={e=>setEmail(e.target.value)} />
            </label>
            <label style={{display:"grid", gap:4}}>
              <span style={{fontSize:12, opacity:.8}}>Password (min 8)</span>
              <input aria-invalid={!passwordValid} aria-required type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} />
            </label>
            {error && <div role="alert" style={{color:"#b91c1c", fontSize:12}}>{error}</div>}
            <div style={{display:"flex", justifyContent:"space-between"}}>
              <button onClick={onClose} disabled={loading}>Cancel</button>
              <button onClick={next} disabled={loading || !canContinue()}>{loading?"…":"Continue"}</button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section style={{display:"grid", gap:10}}>
            <h2 id="onboarding-title" style={{marginTop:0}}>Create PIN</h2>
            <label style={{display:"grid", gap:4}}>
              <span style={{fontSize:12, opacity:.8}}>PIN (4–6 digits)</span>
              <input inputMode="numeric" aria-invalid={!pinValid} placeholder="1234" value={pin} onChange={e=>setPinLocal(e.target.value.replace(/\D/g, ""))} />
            </label>
            <label style={{display:"grid", gap:4}}>
              <span style={{fontSize:12, opacity:.8}}>Duress PIN (optional)</span>
              <input inputMode="numeric" aria-invalid={!duressValid} placeholder="Optional" value={duressPin} onChange={e=>setDuressPin(e.target.value.replace(/\D/g, ""))} />
            </label>
            {error && <div role="alert" style={{color:"#b91c1c", fontSize:12}}>{error}</div>}
            <div style={{display:"flex", justifyContent:"space-between"}}>
              <button onClick={back} disabled={loading}>Back</button>
              <button onClick={next} disabled={loading || !canContinue()}>{loading?"…":"Continue"}</button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section style={{display:"grid", gap:10}}>
            <h2 id="onboarding-title" style={{marginTop:0}}>About you (optional)</h2>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
              <label style={{display:"grid", gap:4}}>
                <span style={{fontSize:12, opacity:.8}}>Gender</span>
                <input value={gender} onChange={e=>setGender(e.target.value)} />
              </label>
              <label style={{display:"grid", gap:4}}>
                <span style={{fontSize:12, opacity:.8}}>Relationship</span>
                <input value={relationship} onChange={e=>setRelationship(e.target.value)} />
              </label>
              <label style={{display:"grid", gap:4}}>
                <span style={{fontSize:12, opacity:.8}}>Children</span>
                <input inputMode="numeric" aria-invalid={!childrenValid} value={children} onChange={e=>setChildren(e.target.value.replace(/[^\d]/g, ""))} />
              </label>
              <label style={{display:"grid", gap:4}}>
                <span style={{fontSize:12, opacity:.8}}>Age</span>
                <input inputMode="numeric" aria-invalid={!ageValid} value={age} onChange={e=>setAge(e.target.value.replace(/[^\d]/g, ""))} />
              </label>
              <label style={{display:"grid", gap:4}}>
                <span style={{fontSize:12, opacity:.8}}>Housing</span>
                <select value={housing} onChange={e=>setHousing(e.target.value)}>
                  <option value="">—</option>
                  <option value="stable">Stable</option>
                  <option value="with_abuser">With abuser</option>
                  <option value="shelter">Shelter</option>
                  <option value="friends">Friends</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>
              <label style={{display:"grid", gap:4}}>
                <span style={{fontSize:12, opacity:.8}}>Trusted support?</span>
                <select value={support} onChange={e=>setSupport(e.target.value)}>
                  <option value="">—</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label style={{display:"grid", gap:4}}>
                <span style={{fontSize:12, opacity:.8}}>Default confidentiality</span>
                <select value={defConf} onChange={e=>setDefConf(e.target.value)}>
                  <option value="">—</option>
                  <option value="private">Private</option>
                  <option value="advocate_only">Advocate only</option>
                  <option value="share_with_attorney">Share with attorney</option>
                </select>
              </label>
              <label style={{display:"grid", gap:4}}>
                <span style={{fontSize:12, opacity:.8}}>Default share with</span>
                <select value={defShare} onChange={e=>setDefShare(e.target.value)}>
                  <option value="">—</option>
                  <option value="nobody">Nobody</option>
                  <option value="advocate">Advocate</option>
                  <option value="attorney">Attorney</option>
                </select>
              </label>
            </div>
            {error && <div role="alert" style={{color:"#b91c1c", fontSize:12}}>{error}</div>}
            <div style={{display:"flex", justifyContent:"space-between"}}>
              <button onClick={back} disabled={loading}>Back</button>
              <button onClick={next} disabled={loading}>{loading?"…":"Continue"}</button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section style={{display:"grid", gap:10}}>
            <h2 id="onboarding-title" style={{marginTop:0}}>You’re all set</h2>
            <p>Your preferences are saved. You can update them anytime in the profile tab.</p>
            <div style={{display:"flex", justifyContent:"flex-end", gap:8}}>
              <button onClick={done}>Close</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}




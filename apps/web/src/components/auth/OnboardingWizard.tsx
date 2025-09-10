"use client";
import { useState } from "react";
import { signup, login, setPin, updateProfile, ProfileData } from "@/lib/api";

export default function OnboardingWizard({ open, onClose }: { open:boolean; onClose:()=>void }) {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPinLocal] = useState("");
  const [duressPin, setDuressPin] = useState("");
  
  // Profile fields
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [relationship, setRelationship] = useState<string>("");
  const [housing, setHousing] = useState<string>("");
  const [trustedSupport, setTrustedSupport] = useState<string>("");
  const [confidentiality, setConfidentiality] = useState<string>("private");
  const [shareWith, setShareWith] = useState<string>("");
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
      if (step === 3) {
        const profileData: ProfileData = {
          age: age ? Number(age) : null,
          gender: gender || null,
          relationship_status: relationship || null,
          victim_housing: housing || null,
          has_trusted_support: trustedSupport ? trustedSupport === "yes" : null,
          default_confidentiality: confidentiality || null,
          default_share_with: shareWith || null,
          num_children: children ? Number(children) : null,
        };
        await updateProfile(profileData);
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
          <section style={{display:"grid", gap:12}}>
            <h2>About you (optional)</h2>
            <p style={{fontSize:"0.9em", color:"#666"}}>This information helps us provide more personalized support. All fields are optional and can be updated later.</p>
            
            <div style={{display:"grid", gap:8}}>
              <input 
                type="number" 
                placeholder="Age (optional)" 
                value={age} 
                onChange={e=>setAge(e.target.value)}
                min="13" max="120"
              />
              
              <select value={gender} onChange={e=>setGender(e.target.value)} style={{padding:"8px"}}>
                <option value="">Gender (optional)</option>
                <option value="woman">Woman</option>
                <option value="man">Man</option>
                <option value="non-binary">Non-binary</option>
                <option value="prefer not to say">Prefer not to say</option>
                <option value="other">Other</option>
              </select>
              
              <select value={relationship} onChange={e=>setRelationship(e.target.value)} style={{padding:"8px"}}>
                <option value="">Relationship status (optional)</option>
                <option value="single">Single</option>
                <option value="dating">Dating</option>
                <option value="married">Married</option>
                <option value="separated">Separated</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
                <option value="it's complicated">It's complicated</option>
              </select>
              
              <select value={housing} onChange={e=>setHousing(e.target.value)} style={{padding:"8px"}}>
                <option value="">Housing situation (optional)</option>
                <option value="safe">Safe housing</option>
                <option value="with_abuser">Living with abuser</option>
                <option value="transitional">Transitional housing</option>
                <option value="temporary">Temporary housing</option>
                <option value="homeless">Homeless</option>
                <option value="unknown">Prefer not to say</option>
              </select>
              
              <select value={trustedSupport} onChange={e=>setTrustedSupport(e.target.value)} style={{padding:"8px"}}>
                <option value="">Do you have trusted support? (optional)</option>
                <option value="yes">Yes, I have people I can trust</option>
                <option value="no">No, I feel isolated</option>
                <option value="unsure">I'm not sure</option>
              </select>
              
              <input 
                type="number" 
                placeholder="Number of children (optional)" 
                value={children} 
                onChange={e=>setChildren(e.target.value)}
                min="0" max="20"
              />
            </div>
            
            <div style={{display:"flex", justifyContent:"space-between"}}>
              <button onClick={()=>setStep(2)}>Back</button>
              <button onClick={next} disabled={loading}>{loading?"...":"Continue"}</button>
            </div>
          </section>
        )}
        {step === 4 && (
          <section style={{display:"grid", gap:12}}>
            <h2>Privacy preferences</h2>
            <p style={{fontSize:"0.9em", color:"#666"}}>Set your default privacy settings. You can override these for individual conversations.</p>
            
            <div style={{display:"grid", gap:8}}>
              <label style={{display:"grid", gap:4}}>
                <span>Default confidentiality level:</span>
                <select value={confidentiality} onChange={e=>setConfidentiality(e.target.value)} style={{padding:"8px"}}>
                  <option value="private">Private (data stays on device when possible)</option>
                  <option value="shared">Shared (anonymized insights may be used)</option>
                  <option value="anonymous">Anonymous (fully anonymized)</option>
                </select>
              </label>
              
              <label style={{display:"grid", gap:4}}>
                <span>Default sharing (optional):</span>
                <input 
                  placeholder="e.g., trusted friend, counselor (optional)" 
                  value={shareWith} 
                  onChange={e=>setShareWith(e.target.value)}
                  style={{padding:"8px"}}
                />
                <small style={{color:"#666"}}>This is just a note for your reference</small>
              </label>
            </div>
            
            <div style={{background:"#f9f9f9", padding:12, borderRadius:8, fontSize:"0.85em", color:"#555"}}>
              <strong>Privacy Notice:</strong> Your data is encrypted and you control what gets shared. 
              You can change these settings anytime and override them for specific conversations.
            </div>
            
            <div style={{display:"flex", justifyContent:"space-between"}}>
              <button onClick={()=>setStep(3)}>Back</button>
              <button onClick={next} disabled={loading}>{loading?"...":"Continue"}</button>
            </div>
          </section>
        )}
        {step === 5 && (
          <section style={{display:"grid", gap:8}}>
            <h2>Welcome!</h2>
            <p>Your profile has been set up. You can access the app through the game interface and update your settings anytime.</p>
            <div style={{display:"flex", justifyContent:"end", gap:8}}>
              <button onClick={done}>Get Started</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}




"use client";
import { useEffect, useState } from "react";
import { me, signup, login, logout } from "@/lib/api";
import OnboardingWizard from "@/components/auth/OnboardingWizard";

export default function AuthPanel({ onAuth }: { onAuth?: () => void }) {
  const [status, setStatus] = useState<{ok:boolean; user_id?:string}|null>(null);
  const [mode, setMode] = useState<"login"|"signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|undefined>();
  const [onboardOpen, setOnboardOpen] = useState(false);

  async function refresh() {
    try {
      const r = await me();
      setStatus(r);
    } catch (e) {
      setStatus(null);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function handleSubmit() {
    setLoading(true); setError(undefined);
    try {
      if (mode === "signup") {
        await signup(email, password);
        setOnboardOpen(true);
      } else {
        await login(email, password);
      }
      await refresh();
      onAuth?.();
    } catch (e:any) {
      // Better error handling for validation errors
      if (e?.response?.status === 422) {
        const validationErrors = e.response.data?.detail;
        if (Array.isArray(validationErrors)) {
          setError(validationErrors.map((err: any) => err.msg).join(", "));
        } else {
          setError("Validation error: " + JSON.stringify(validationErrors));
        }
      } else {
        setError(e?.response?.data?.detail || "Auth failed");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    await refresh();
    onAuth?.(); // Notify parent component of auth state change
  }

  const authed = status?.ok && status.user_id && status.user_id !== "demo";

  return (
    <>
      {authed ? (
        <div style={{display:"flex", gap:8, alignItems:"center"}}>
          <span style={{opacity:.7}}>Signed in as {status!.user_id}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <div style={{display:"grid", gap:8, maxWidth:360}}>
          <div style={{display:"flex", gap:8}}>
            <button onClick={()=>setMode("login")} disabled={mode==="login"}>Login</button>
            <button onClick={()=>setMode("signup")} disabled={mode==="signup"}>Sign up</button>
          </div>
          <input type="email" placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input type="password" placeholder="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <button onClick={handleSubmit} disabled={loading || !email || !password}>{loading?"...":"Submit"}</button>
          {error && <div style={{color:"crimson"}}>{error}</div>}
          <div style={{fontSize:12, opacity:.7}}>New users: use Sign up, then Login</div>
        </div>
      )}
      <OnboardingWizard open={onboardOpen} onClose={()=>setOnboardOpen(false)} />
    </>
  );
}

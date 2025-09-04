"use client";
import { useEffect, useState } from "react";
import { me, signup, login, logout } from "@/lib/api";

export default function AuthPanel({ onAuth }: { onAuth?: () => void }) {
  const [status, setStatus] = useState<{ok:boolean; user_id?:string}|null>(null);
  const [mode, setMode] = useState<"login"|"signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|undefined>();

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
      if (mode === "signup") await signup(email, password);
      else await login(email, password);
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

  if (status?.ok && status.user_id && status.user_id !== "demo") {
    return (
      <div style={{
        display:"flex", gap:12, alignItems:"center",
        padding: 12,
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        background: "#ffffff",
        boxShadow: "0 6px 16px rgba(2,6,23,0.06)"
      }}>
        <span style={{opacity:.75}}>Signed in as {status.user_id}</span>
        <button onClick={handleLogout} style={{
          padding: "6px 10px",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          background: "#f9fafb"
        }}>Logout</button>
      </div>
    );
  }

  return (
    <div style={{
      display:"grid", gap:10, maxWidth:380,
      background: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: 16,
      padding: 16,
      boxShadow: "0 8px 18px rgba(2,6,23,0.06)"
    }}>
      <div style={{display:"flex", gap:8, background:"#f3f4f6", padding:4, borderRadius:10}}>
        <button onClick={()=>setMode("login")} disabled={mode==="login"} style={{
          flex:1,
          padding: "8px 10px",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          background: mode==="login"?"#ffffff":"#f9fafb",
          boxShadow: mode==="login"?"0 4px 10px rgba(2,6,23,0.06)":"none"
        }}>Login</button>
        <button onClick={()=>setMode("signup")} disabled={mode==="signup"} style={{
          flex:1,
          padding: "8px 10px",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          background: mode==="signup"?"#ffffff":"#f9fafb",
          boxShadow: mode==="signup"?"0 4px 10px rgba(2,6,23,0.06)":"none"
        }}>Sign up</button>
      </div>
      <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          background: "#ffffff"
        }}
      />
      <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          background: "#ffffff"
        }}
      />
      <button onClick={handleSubmit} disabled={loading || !email || !password} style={{
        padding: "10px 14px",
        borderRadius: 10,
        border: "1px solid #10b981",
        background: "linear-gradient(180deg, #34d399, #10b981)",
        color: "#fff",
        boxShadow: "0 8px 18px rgba(16,185,129,0.25)"
      }}>{loading?"Signing...":"Continue"}</button>
      {error && <div style={{color:"#dc2626", background:"#fef2f2", padding:8, borderRadius:8}}>{error}</div>}
      <div style={{fontSize:12, opacity:.7}}>New users: use Sign up, then Login</div>
    </div>
  );
}

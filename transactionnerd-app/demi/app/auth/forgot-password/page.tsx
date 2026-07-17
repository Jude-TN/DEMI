"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/api/auth/callback?next=/auth/reset-password` });
    setSent(true); setLoading(false);
  }

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px 16px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)", backgroundSize:"48px 48px", pointerEvents:"none" }} />
      <div style={{ position:"relative", width:"100%", maxWidth:420, background:"var(--panel)", border:"1px solid var(--bdrs)", borderRadius:12, overflow:"hidden" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"15px 20px" }}>
          <div style={{ width:30, height:30, background:"var(--teal)", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:"#0a1412", fontFamily:"monospace" }}>D</div>
          <div><div style={{ fontSize:14, fontWeight:700 }}>DEMI</div><div style={{ fontSize:8, color:"var(--teal)", fontFamily:"monospace", letterSpacing:1 }}>TC PLATFORM</div></div>
        </div>
        <hr style={{ border:"none", borderTop:"1px solid var(--bdr)", margin:0 }} />
        <div style={{ padding:"26px 22px 20px" }}>
          {sent ? (
            <>
              <div style={{ fontSize:20, marginBottom:10 }}>📬</div>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>Check your email</div>
              <p style={{ fontSize:12, color:"var(--muted)", lineHeight:1.6, marginBottom:16 }}>We sent a password reset link to <strong style={{ color:"var(--teal)" }}>{email}</strong>.</p>
              <Link href="/auth/login" style={{ color:"var(--teal)", textDecoration:"none", fontSize:12 }}>← Back to sign in</Link>
            </>
          ) : (
            <>
              <h1 style={{ fontSize:21, fontWeight:700, marginBottom:8 }}>Reset password</h1>
              <p style={{ fontSize:12, color:"var(--muted)", lineHeight:1.6, marginBottom:22 }}>Enter your email and we'll send you a reset link.</p>
              <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  <label style={{ fontSize:11, fontWeight:600, color:"var(--muted)" }}>Email</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <button type="submit" disabled={loading} style={{ background:"var(--teal)", color:"#0a1412", border:"none", borderRadius:6, padding:"10px 0", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>
              <p style={{ marginTop:14, fontSize:11, color:"var(--muted)", textAlign:"center" as const }}>
                <Link href="/auth/login" style={{ color:"var(--teal)", textDecoration:"none" }}>← Back to sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

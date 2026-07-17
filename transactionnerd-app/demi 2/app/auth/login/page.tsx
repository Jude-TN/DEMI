"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email,setEmail]=useState(""); const [pw,setPw]=useState(""); const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);
  const router=useRouter(); const supabase=createClient();
  async function submit(e:React.FormEvent){e.preventDefault();setErr("");setLoading(true);
    const {data,error}=await supabase.auth.signInWithPassword({email,password:pw});
    if(error||!data.user){setErr("Incorrect email or password.");setLoading(false);return;}
    const {data:p}=await supabase.from("users").select("role").eq("id",data.user.id).single();
    router.push(p?.role==="agent"?"/portal":"/dashboard");router.refresh();}
  return(
    <div style={S.root}><div style={S.grid} aria-hidden="true"/>
      <div style={S.card}>
        <Logo/>
        <hr style={S.hr}/>
        <div style={S.body}>
          <h1 style={S.h1}>Sign in</h1>
          <p style={S.p}>TCs and agents use the same login — you'll land in the right workspace automatically.</p>
          <form onSubmit={submit} style={S.form}>
            <div style={S.field}><label style={S.lbl}>Email</label><input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></div>
            <div style={S.field}>
              <div style={{display:"flex",justifyContent:"space-between"}}><label style={S.lbl}>Password</label><Link href="/auth/forgot-password" style={S.link}>Forgot password?</Link></div>
              <input type="password" required autoComplete="current-password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••"/>
            </div>
            {err&&<div style={S.err}>{err}</div>}
            <button type="submit" disabled={loading} style={{...S.btn,opacity:loading?.7:1}}>{loading?"Signing in…":"Sign in"}</button>
          </form>
          <p style={S.foot}>New agent? <Link href="/auth/register" style={S.link}>Create an account</Link></p>
        </div>
        <hr style={S.hr}/>
        <div style={S.footer}>TransactionNerd.com · Florida-licensed TCs · SSL encrypted</div>
      </div>
    </div>
  );
}

function Logo(){return(
  <div style={{display:"flex",alignItems:"center",gap:10,padding:"15px 20px"}}>
    <div style={{width:30,height:30,background:"var(--teal)",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#0a1412",fontFamily:"monospace"}}>D</div>
    <div><div style={{fontSize:14,fontWeight:700,letterSpacing:-.2}}>DEMI</div><div style={{fontSize:8,color:"var(--teal)",fontFamily:"monospace",letterSpacing:1}}>TC PLATFORM</div></div>
    <div style={{marginLeft:"auto",width:7,height:7,borderRadius:"50%",background:"var(--teal)",boxShadow:"0 0 6px var(--teal)"}}/>
  </div>
);}

const S:Record<string,React.CSSProperties>={
  root:{minHeight:"100vh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px 16px",position:"relative",overflow:"hidden"},
  grid:{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)",backgroundSize:"48px 48px",pointerEvents:"none"},
  card:{position:"relative",width:"100%",maxWidth:420,background:"var(--panel)",border:"1px solid var(--bdrs)",borderRadius:12,overflow:"hidden"},
  hr:{border:"none",borderTop:"1px solid var(--bdr)",margin:0},
  body:{padding:"26px 22px 20px"},
  h1:{fontSize:21,fontWeight:700,letterSpacing:-.3,marginBottom:8},
  p:{fontSize:12,color:"var(--muted)",lineHeight:1.6,marginBottom:22},
  form:{display:"flex",flexDirection:"column",gap:15},
  field:{display:"flex",flexDirection:"column",gap:5},
  lbl:{fontSize:11,fontWeight:600,color:"var(--muted)"},
  link:{fontSize:11,color:"var(--teal)",textDecoration:"none"},
  err:{fontSize:11,color:"var(--rose)",background:"var(--rose-d)",border:"1px solid var(--rose-b)",borderRadius:6,padding:"7px 11px"},
  btn:{background:"var(--teal)",color:"#0a1412",border:"none",borderRadius:6,padding:"10px 0",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginTop:4},
  foot:{marginTop:15,fontSize:11,color:"var(--muted)",textAlign:"center" as const},
  footer:{padding:"11px 20px",textAlign:"center" as const,fontSize:9,color:"var(--dim)",fontFamily:"monospace"},
};

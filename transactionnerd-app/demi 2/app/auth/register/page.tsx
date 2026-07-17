"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Role = "agent" | "tc";

export default function RegisterPage() {
  const [role,setRole]=useState<Role|null>(null);
  const [form,setForm]=useState({firstName:"",lastName:"",email:"",pw:"",confirm:"",license:"",tcCompany:""});
  const [err,setErr]=useState(""); const [loading,setLoading]=useState(false); const [done,setDone]=useState(false);
  const supabase=createClient();
  function set(k:string){return(e:React.ChangeEvent<HTMLInputElement>)=>setForm(p=>({...p,[k]:e.target.value}));}

  async function submit(e:React.FormEvent){
    e.preventDefault();if(!role)return;
    if(form.pw!==form.confirm){setErr("Passwords don't match.");return;}
    if(form.pw.length<8){setErr("Password must be at least 8 characters.");return;}
    setLoading(true);setErr("");
    const {data,error}=await supabase.auth.signUp({email:form.email,password:form.pw});
    if(error||!data.user){setErr(error?.message??"Sign up failed.");setLoading(false);return;}
    await supabase.from("users").insert({id:data.user.id,email:form.email,full_name:`${form.firstName} ${form.lastName}`,role,license_number:form.license||null,tc_company:form.tcCompany||null});
    setDone(true);setLoading(false);
  }

  if(done)return(
    <div style={S.root}><div style={S.grid} aria-hidden="true"/>
      <div style={S.card}><Logo/><hr style={S.hr}/>
        <div style={{...S.body,textAlign:"center" as const}}>
          <div style={{fontSize:32,marginBottom:12}}>✅</div>
          <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Check your email</div>
          <p style={S.p}>Confirmation link sent to <strong style={{color:"var(--teal)"}}>{form.email}</strong>. Click it to activate your account and access DEMI.</p>
          <Link href="/auth/login" style={{color:"var(--teal)",textDecoration:"none",fontSize:12}}>Sign in →</Link>
        </div>
        <hr style={S.hr}/><div style={S.footer}>DEMI — demi-ten.vercel.app</div>
      </div>
    </div>
  );

  if(!role)return(
    <div style={S.root}><div style={S.grid} aria-hidden="true"/>
      <div style={{...S.card,maxWidth:480}}>
        <Logo/><hr style={S.hr}/>
        <div style={S.body}>
          <h1 style={S.h1}>Create an account</h1>
          <p style={S.p}>Tell us your role — this sets up your workspace and permissions.</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            <div onClick={()=>setRole("agent")} style={{background:"var(--card)",border:"1px solid var(--bdrs)",borderRadius:8,padding:"18px 16px",cursor:"pointer",textAlign:"center" as const}}>
              <div style={{fontSize:28,marginBottom:8}}>🏡</div>
              <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>I'm a Realtor</div>
              <div style={{fontSize:11,color:"var(--muted)"}}>Submit deals and track transactions with your TC</div>
            </div>
            <div onClick={()=>setRole("tc")} style={{background:"var(--card)",border:"1px solid var(--bdrs)",borderRadius:8,padding:"18px 16px",cursor:"pointer",textAlign:"center" as const}}>
              <div style={{fontSize:28,marginBottom:8}}>📋</div>
              <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>I'm a TC</div>
              <div style={{fontSize:11,color:"var(--muted)"}}>Manage files, tasks, and docs across multiple teams</div>
            </div>
          </div>
          <p style={{...S.p,textAlign:"center" as const,marginBottom:0}}>Already have an account? <Link href="/auth/login" style={{color:"var(--teal)",textDecoration:"none"}}>Sign in</Link></p>
        </div>
      </div>
    </div>
  );

  return(
    <div style={S.root}><div style={S.grid} aria-hidden="true"/>
      <div style={{...S.card,maxWidth:460,marginTop:24}}>
        <Logo/><hr style={S.hr}/>
        <div style={S.body}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <button onClick={()=>setRole(null)} style={{background:"none",border:"none",color:"var(--teal)",fontSize:11,cursor:"pointer",padding:0}}>← Back</button>
            <span style={{fontSize:12,color:"var(--muted)"}}>Signing up as {role==="tc"?"Transaction Coordinator":"Realtor"}</span>
          </div>
          <h1 style={S.h1}>Create your account</h1>
          <form onSubmit={submit} style={{...S.form}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={S.field}><label style={S.lbl}>First name</label><input required value={form.firstName} onChange={set("firstName")} placeholder="Jude"/></div>
              <div style={S.field}><label style={S.lbl}>Last name</label><input required value={form.lastName} onChange={set("lastName")} placeholder="Paul"/></div>
            </div>
            <div style={S.field}><label style={S.lbl}>Email</label><input type="email" required value={form.email} onChange={set("email")} placeholder="you@brokerage.com"/></div>
            {role==="tc"&&<div style={S.field}><label style={S.lbl}>TC company name</label><input value={form.tcCompany} onChange={set("tcCompany")} placeholder="TransactionNerd.com"/></div>}
            <div style={S.field}><label style={S.lbl}>FL license number</label><input value={form.license} onChange={set("license")} placeholder="SL3XXXXXX"/></div>
            <hr style={{border:"none",borderTop:"1px solid var(--bdr)"}}/>
            <div style={S.field}><label style={S.lbl}>Password</label><input type="password" required autoComplete="new-password" value={form.pw} onChange={set("pw")} placeholder="Min. 8 characters"/></div>
            <div style={S.field}><label style={S.lbl}>Confirm password</label><input type="password" required autoComplete="new-password" value={form.confirm} onChange={set("confirm")} placeholder="Repeat password"/></div>
            {err&&<div style={S.err}>{err}</div>}
            <button type="submit" disabled={loading} style={{...S.btn,opacity:loading?.7:1}}>{loading?"Creating account…":"Create account"}</button>
          </form>
          <p style={S.foot}>Already have an account? <Link href="/auth/login" style={{color:"var(--teal)",textDecoration:"none"}}>Sign in</Link></p>
        </div>
        <hr style={S.hr}/><div style={S.footer}>{role==="tc"?"TC accounts — join teams via invite or search":"Agent portal access only"}</div>
      </div>
    </div>
  );
}

function Logo(){return(<div style={{display:"flex",alignItems:"center",gap:10,padding:"15px 20px"}}><div style={{width:30,height:30,background:"var(--teal)",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#0a1412",fontFamily:"monospace"}}>D</div><div><div style={{fontSize:14,fontWeight:700}}>DEMI</div><div style={{fontSize:8,color:"var(--teal)",fontFamily:"monospace",letterSpacing:1}}>TC PLATFORM</div></div><div style={{marginLeft:"auto",width:7,height:7,borderRadius:"50%",background:"var(--teal)"}}/></div>);}

const S:Record<string,React.CSSProperties>={
  root:{minHeight:"100vh",background:"var(--bg)",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"28px 16px 60px",position:"relative",overflow:"hidden"},
  grid:{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)",backgroundSize:"48px 48px",pointerEvents:"none"},
  card:{position:"relative",width:"100%",maxWidth:420,background:"var(--panel)",border:"1px solid var(--bdrs)",borderRadius:12,overflow:"hidden"},
  hr:{border:"none",borderTop:"1px solid var(--bdr)",margin:0},
  body:{padding:"24px 22px 20px"},
  h1:{fontSize:20,fontWeight:700,letterSpacing:-.3,marginBottom:8},
  p:{fontSize:12,color:"var(--muted)",lineHeight:1.6,marginBottom:20},
  form:{display:"flex",flexDirection:"column",gap:13},
  field:{display:"flex",flexDirection:"column",gap:5},
  lbl:{fontSize:11,fontWeight:600,color:"var(--muted)"},
  err:{fontSize:11,color:"var(--rose)",background:"var(--rose-d)",border:"1px solid var(--rose-b)",borderRadius:6,padding:"7px 11px"},
  btn:{background:"var(--teal)",color:"#0a1412",border:"none",borderRadius:6,padding:"10px 0",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginTop:4},
  foot:{marginTop:14,fontSize:11,color:"var(--muted)",textAlign:"center" as const},
  footer:{padding:"11px 20px",textAlign:"center" as const,fontSize:9,color:"var(--dim)",fontFamily:"monospace"},
};

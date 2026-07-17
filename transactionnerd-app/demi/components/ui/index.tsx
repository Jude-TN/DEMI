"use client";
import React from "react";
import type { UserRole } from "@/types";
import { capacityStatus, capacityColor, capacityLabel } from "@/lib/utils/capacity";
import type { TCCapacityResponse } from "@/types";

// ── Btn ───────────────────────────────────────────────────────────────────────
type V = "primary"|"ghost"|"danger"|"subtle";
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?:V; size?:"sm"|"md"; loading?: boolean }
export function Btn({variant="ghost",size="md",loading,children,style,...props}:BtnProps){
  const base:React.CSSProperties={display:"inline-flex",alignItems:"center",gap:5,borderRadius:6,fontWeight:600,cursor:"pointer",border:"none",fontFamily:"inherit",transition:"opacity .15s",whiteSpace:"nowrap",padding:size==="sm"?"4px 10px":"7px 14px",fontSize:size==="sm"?11:12,opacity:loading||props.disabled?.8:1};
  const V:Record<V,React.CSSProperties>={primary:{background:"var(--teal)",color:"#0a1412"},ghost:{background:"transparent",color:"var(--muted)",border:"1px solid var(--bdrs)"},danger:{background:"var(--rose-d)",color:"var(--rose)",border:"1px solid var(--rose-b)"},subtle:{background:"var(--card)",color:"var(--muted)",border:"1px solid var(--bdr)"}};
  return <button disabled={loading||props.disabled} style={{...base,...V[variant],...style}} {...props}>{loading&&<Spinner size={11}/>}{children}</button>;
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({size=16,color="var(--teal)"}:{size?:number;color?:string}){
  if(typeof document!=="undefined"&&!document.getElementById("demi-spin")){const s=document.createElement("style");s.id="demi-spin";s.textContent="@keyframes demi-spin{to{transform:rotate(360deg)}}";document.head.appendChild(s);}
  return <span style={{display:"inline-block",width:size,height:size,border:`2px solid rgba(255,255,255,.12)`,borderTopColor:color,borderRadius:"50%",animation:"demi-spin .7s linear infinite",flexShrink:0}}/>;
}

// ── Tag ───────────────────────────────────────────────────────────────────────
type C="teal"|"amber"|"rose"|"blue"|"muted"|"purple";
const CC:Record<C,[string,string]>={teal:["var(--teal-d)","var(--teal)"],amber:["var(--amber-d)","var(--amber)"],rose:["var(--rose-d)","var(--rose)"],blue:["var(--blue-d)","var(--blue)"],muted:["rgba(255,255,255,.05)","var(--muted)"],purple:["var(--purple-d)","var(--purple)"]};
export function Tag({label,color="teal",size=9}:{label:string;color?:C;size?:number}){
  const [bg,fg]=CC[color];
  return <span style={{display:"inline-flex",alignItems:"center",fontSize:size,fontWeight:700,fontFamily:"monospace",letterSpacing:.3,background:bg,color:fg,padding:"2px 6px",borderRadius:4,whiteSpace:"nowrap"}}>{label}</span>;
}

// ── StageTag ──────────────────────────────────────────────────────────────────
import type { DealStage } from "@/types";
const STAGE:Record<DealStage,[string,C]>={lead:["Lead","muted"],listing:["Listing","blue"],under_contract:["Under Contract","teal"],clear_to_close:["Clear to Close","amber"],closed:["Closed","teal"]};
export function StageTag({stage}:{stage:DealStage}){const[l,c]=STAGE[stage];return <Tag label={l} color={c}/>;}

// ── RoleBadge ─────────────────────────────────────────────────────────────────
export function RoleBadge({role}:{role:UserRole}){return <Tag label={role==="tc"?"TC":role.charAt(0).toUpperCase()+role.slice(1)} color={role==="admin"?"rose":role==="tc"?"teal":"blue"}/>;}

// ── Avatar ────────────────────────────────────────────────────────────────────
const AVC:Record<string,[string,string]>={CR:["var(--teal-d)","var(--teal)"],AM:["var(--amber-d)","var(--amber)"],JP:["var(--teal-d)","var(--teal)"]};
function initials(n:string){return n.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();}
export function Avatar({name,size=28,url}:{name:string;size?:number;url?:string|null}){
  const i=initials(name);
  const[bg,fg]=AVC[i]??["var(--teal-d)","var(--teal)"];
  if(url)return <img src={url} alt={name} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>;
  return <div style={{width:size,height:size,borderRadius:"50%",background:bg,border:`1.5px solid ${fg}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.32,fontWeight:700,color:fg,fontFamily:"monospace",flexShrink:0}}>{i}</div>;
}

// ── Progress bar ──────────────────────────────────────────────────────────────
export function ProgressBar({pct,height=4,color="var(--teal)"}:{pct:number;height?:number;color?:string}){
  return <div style={{background:"rgba(255,255,255,.06)",borderRadius:3,height,overflow:"hidden"}}><div style={{width:`${Math.min(Math.max(pct,0),100)}%`,height,background:color,borderRadius:3,transition:"width .3s"}}/></div>;
}

// ── Capacity bar (spec-defined colors) ───────────────────────────────────────
export function CapacityBar({total,cap,showLabel=true}:{total:number;cap:number;showLabel?:boolean}){
  const pct=cap>0?(total/cap)*100:0;
  const status=capacityStatus(total,cap);
  const color=capacityColor(status);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:3}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:9,color:"var(--muted)",fontFamily:"monospace"}}>{total}/{cap}</span>
        {showLabel&&<Tag label={capacityLabel(status)} color={status==="at_cap"?"rose":status==="near"?"amber":"teal"} size={8}/>}
      </div>
      <div style={{background:"rgba(255,255,255,.06)",borderRadius:3,height:5,overflow:"hidden"}}>
        <div style={{width:`${Math.min(pct,100)}%`,height:5,background:color,borderRadius:3,transition:"width .3s"}}/>
      </div>
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────
export function StatCard({label,value,sub,subColor="var(--teal)"}:{label:string;value:string|number;sub?:string;subColor?:string}){
  return(
    <div style={{background:"var(--card)",border:"1px solid var(--bdr)",borderRadius:8,padding:"10px 13px"}}>
      <div style={{fontSize:9,color:"var(--muted)",marginBottom:3}}>{label}</div>
      <div style={{fontSize:20,fontWeight:700,fontFamily:"monospace",lineHeight:1.1}}>{value}</div>
      {sub&&<div style={{fontSize:9,color:subColor,marginTop:2}}>{sub}</div>}
    </div>
  );
}

// ── SectionLabel ──────────────────────────────────────────────────────────────
export function SectionLabel({children}:{children:React.ReactNode}){
  return <div style={{fontSize:9,fontWeight:700,letterSpacing:.8,textTransform:"uppercase",color:"var(--muted)",fontFamily:"monospace",marginBottom:6}}>{children}</div>;
}

// ── Empty ─────────────────────────────────────────────────────────────────────
export function Empty({icon="📭",title,sub}:{icon?:string;title:string;sub?:string}){
  return <div style={{textAlign:"center",padding:"48px 24px"}}><div style={{fontSize:32,marginBottom:12}}>{icon}</div><div style={{fontSize:14,fontWeight:500,marginBottom:6}}>{title}</div>{sub&&<div style={{fontSize:12,color:"var(--muted)"}}>{sub}</div>}</div>;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({open,onClose,title,children,width=480}:{open:boolean;onClose:()=>void;title:string;children:React.ReactNode;width?:number}){
  if(!open)return null;
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"var(--panel)",border:"1px solid var(--bdrs)",borderRadius:12,width,maxWidth:"100%",maxHeight:"90vh",overflow:"auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",borderBottom:"1px solid var(--bdr)"}}>
          <span style={{fontSize:14,fontWeight:600}}>{title}</span>
          <button onClick={onClose} style={{background:"none",border:"none",color:"var(--muted)",fontSize:18,cursor:"pointer",lineHeight:1}}>×</button>
        </div>
        <div style={{padding:18}}>{children}</div>
      </div>
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────
export function Field({label,children,required}:{label:string;children:React.ReactNode;required?:boolean}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      <label style={{fontSize:11,fontWeight:600,color:"var(--muted)",letterSpacing:.2}}>{label}{required&&<span style={{color:"var(--rose)",marginLeft:3}}>*</span>}</label>
      {children}
    </div>
  );
}

// ── ErrorBanner ───────────────────────────────────────────────────────────────
export function ErrorBanner({msg}:{msg:string}){
  if(!msg)return null;
  return <div style={{fontSize:11,color:"var(--rose)",background:"var(--rose-d)",border:"1px solid var(--rose-b)",borderRadius:6,padding:"8px 12px"}}>{msg}</div>;
}

// ── TC Picker Card (for deal intake form) ─────────────────────────────────────
export function TCPickerCard({tc,selected,onClick}:{tc:TCCapacityResponse;selected:boolean;onClick:()=>void}){
  const status=capacityStatus(tc.total_files,tc.cap);
  return(
    <div onClick={onClick} style={{background:selected?"var(--teal-d)":"var(--card)",border:`1px solid ${selected?"var(--teal-b)":"var(--bdr)"}`,borderRadius:7,padding:"9px 11px",cursor:"pointer",transition:"background .1s"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        <Avatar name={tc.full_name} size={24}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:11,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tc.full_name}</div>
          {tc.tc_company&&<div style={{fontSize:9,color:"var(--muted)"}}>{tc.tc_company}</div>}
        </div>
        {tc.is_recommended&&<Tag label={tc.reason==="fallback"?"Fallback":"Suggested"} color={tc.reason==="fallback"?"amber":"teal"} size={8}/>}
      </div>
      <CapacityBar total={tc.total_files} cap={tc.cap}/>
    </div>
  );
}

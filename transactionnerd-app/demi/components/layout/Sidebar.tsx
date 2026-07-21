"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types";
import { Avatar } from "@/components/ui";

export interface NavItem { href:string; icon:string; label:string; badge?:number|null; badgeColor?:string; }

interface Props { user:User; nav:NavItem[]; section2?:NavItem[]; section3?:NavItem[]; section1Label?:string; section2Label?:string; section3Label?:string; unreadCount?:number; }

export default function Sidebar({user,nav,section2,section3,section1Label="Workspace",section2Label="Reporting",section3Label="Admin",unreadCount}:Props){
  const pathname=usePathname();
  const router=useRouter();
  const supabase=createClient();

  async function signOut(){await supabase.auth.signOut();router.push("/auth/login");router.refresh();}

  function active(href:string){return href==="/dashboard"||href==="/portal"?pathname===href:pathname.startsWith(href);}

  return(
    <nav style={{width:196,minWidth:196,background:"var(--sb)",borderRight:"1px solid var(--bdr)",display:"flex",flexDirection:"column",height:"100vh",position:"sticky",top:0}}>
      <div style={{padding:"13px 12px 11px",borderBottom:"1px solid var(--bdr)",display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:27,height:27,background:"var(--teal)",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#0a1412",fontFamily:"monospace",flexShrink:0}}>D</div>
        <div><div style={{fontSize:13,fontWeight:700,letterSpacing:-.2}}>DEMI</div><div style={{fontSize:8,color:"var(--teal)",fontFamily:"monospace",letterSpacing:.5}}>TC PLATFORM</div></div>
        <div style={{marginLeft:"auto",width:7,height:7,borderRadius:"50%",background:"var(--teal)",boxShadow:"0 0 6px var(--teal)"}}/>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"7px 5px"}}>
        <NavSection label={section1Label}/>
        {nav.map(item=><NavLink key={item.href} item={item} active={active(item.href)} badge={item.label==="Notifications"?unreadCount:item.badge}/>)}
        {section2&&section2.length>0&&<><NavSection label={section2Label}/>{section2.map(item=><NavLink key={item.href} item={item} active={active(item.href)}/>)}</>}
        {section3&&section3.length>0&&<><NavSection label={section3Label}/>{section3.map(item=><NavLink key={item.href} item={item} active={active(item.href)}/>)}</>}
      </div>
      <div style={{padding:"7px 9px",borderTop:"1px solid var(--bdr)"}}>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
          <Avatar name={user.full_name} size={24} url={user.avatar_url}/>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:11,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.full_name}</div><div style={{fontSize:9,color:"var(--muted)",textTransform:"capitalize"}}>{user.role==="tc"?"Transaction Coordinator":user.role}</div></div>
        </div>
        <button onClick={signOut} style={{width:"100%",background:"transparent",border:"1px solid var(--bdr)",borderRadius:5,padding:"4px 0",fontSize:10,color:"var(--dim)",cursor:"pointer",fontFamily:"inherit"}}>Sign out</button>
      </div>
    </nav>
  );
}

function NavSection({label}:{label:string}){return <div style={{fontSize:8,fontWeight:700,color:"#3A4050",letterSpacing:.8,textTransform:"uppercase",padding:"8px 7px 3px",fontFamily:"monospace"}}>{label}</div>;}

function NavLink({item,active,badge}:{item:NavItem;active:boolean;badge?:number|null}){
  return(
    <Link href={item.href}>
      <div style={{display:"flex",alignItems:"center",gap:7,padding:"5px 7px",borderRadius:5,fontSize:11,color:active?"var(--teal)":"var(--muted)",background:active?"var(--teal-d)":"transparent",marginBottom:1}}>
        <span style={{fontSize:13,opacity:active?1:.7}}>{item.icon}</span>
        <span style={{fontWeight:active?600:400,flex:1}}>{item.label}</span>
        {badge!=null&&badge>0&&<span style={{fontSize:9,fontWeight:700,fontFamily:"monospace",background:item.badgeColor??"var(--teal)",color:item.badgeColor==="var(--rose)"?"#fff":"#0a1412",padding:"1px 5px",borderRadius:9}}>{badge}</span>}
      </div>
    </Link>
  );
}

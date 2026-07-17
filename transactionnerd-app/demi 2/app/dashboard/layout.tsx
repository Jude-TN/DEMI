import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/layout/Sidebar";

const NAV=[{href:"/dashboard",icon:"▦",label:"Dashboard"},{href:"/pipeline",icon:"⬛",label:"Pipeline"},{href:"/deals",icon:"📋",label:"All deals"},{href:"/notifications",icon:"🔔",label:"Notifications"},];
const NAV2=[{href:"/contacts",icon:"👥",label:"Contacts"},{href:"/agents",icon:"🏡",label:"Agents"},{href:"/reports",icon:"📊",label:"Reports"},{href:"/settings",icon:"⚙",label:"Settings"},];

export default async function DashboardLayout({children}:{children:React.ReactNode}){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/auth/login");
  const {data:profile}=await supabase.from("users").select("*").eq("id",user.id).single();
  if(!profile||profile.role==="agent")redirect("/portal");
  const {count}=await supabase.from("notifications").select("id",{count:"exact",head:true}).eq("user_id",user.id).is("read_at",null);
  return(
    <div style={{display:"flex",height:"100vh",overflow:"hidden"}}>
      <Sidebar user={profile} nav={NAV} section2={NAV2} section2Label="Reporting & Admin" unreadCount={count??0}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>{children}</div>
    </div>
  );
}

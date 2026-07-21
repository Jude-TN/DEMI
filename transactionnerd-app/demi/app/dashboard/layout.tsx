import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/layout/Sidebar";

const NAV=[{href:"/dashboard/pipeline",icon:"🗂️",label:"Transactions"},{href:"/dashboard/inbox",icon:"📥",label:"Inbox"},{href:"/dashboard/documents",icon:"📄",label:"Documents"},{href:"/dashboard/tasks",icon:"✅",label:"Tasks"},{href:"/dashboard/calendar",icon:"📅",label:"Calendar"},];
const NAV2=[{href:"/dashboard/reports",icon:"📊",label:"Analytics"},{href:"/dashboard/contacts",icon:"👥",label:"Clients"},{href:"/dashboard/agents",icon:"🏡",label:"Agents"},];
const NAV3=[{href:"/dashboard/settings",icon:"⚙️",label:"Settings"},];

export default async function DashboardLayout({children}:{children:React.ReactNode}){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/auth/login");
  const {data:profile}=await supabase.from("users").select("*").eq("id",user.id).single();
  if(!profile||profile.role==="agent")redirect("/portal");
  const {count}=await supabase.from("notifications").select("id",{count:"exact",head:true}).eq("user_id",user.id).is("read_at",null);
  return(
    <div style={{display:"flex",height:"100vh",overflow:"hidden"}}>
      <Sidebar user={profile} nav={NAV} section2={NAV2} section3={NAV3} section1Label="Workspace" section2Label="Reporting" section3Label="Admin" unreadCount={count??0}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>{children}</div>
    </div>
  );
}

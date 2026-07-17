import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/layout/Sidebar";

const NAV = [
  { href: "/portal",         icon: "▦", label: "My deals" },
  { href: "/portal/notifications", icon: "🔔", label: "Notifications" },
];
const NAV2 = [
  { href: "/portal/account", icon: "⚙", label: "Account" },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/auth/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", authUser.id).single();
  if (!profile || profile.role !== "agent") redirect("/dashboard");

  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", authUser.id).eq("read", false);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar
        user={profile}
        nav={NAV}
        section1Label="Agent portal"
        section2={NAV2}
        section2Label="Account"
        unreadCount={count ?? 0}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

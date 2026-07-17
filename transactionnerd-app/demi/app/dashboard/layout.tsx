import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/layout/Sidebar";

const NAV = [
  { href: "/dashboard", icon: "▦", label: "Dashboard" },
  { href: "/dashboard/pipeline", icon: "⬛", label: "Pipeline" },
  { href: "/dashboard/deals", icon: "📋", label: "All deals" },
  { href: "/dashboard/notifications", icon: "🔔", label: "Notifications" },
];
const NAV2 = [
  { href: "/dashboard/contacts", icon: "👥", label: "Contacts" },
  { href: "/dashboard/agents", icon: "🏡", label: "Agents" },
  { href: "/dashboard/reports", icon: "📊", label: "Reports" },
  { href: "/dashboard/settings", icon: "⚙", label: "Settings" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (!profile || profile.role === "agent") redirect("/portal");

  // Unread notification count
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", authUser.id)
    .eq("read", false);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar
        user={profile}
        nav={NAV}
        section2={NAV2}
        section2Label="Reporting & Admin"
        unreadCount={count ?? 0}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types";
import { Avatar } from "@/components/ui";

interface NavItem {
  href: string;
  icon: string;
  label: string;
  badge?: number | null;
  badgeColor?: string;
}

interface SidebarProps {
  user: User;
  nav: NavItem[];
  section2?: NavItem[];
  section2Label?: string;
  section1Label?: string;
  unreadCount?: number;
}

export default function Sidebar({ user, nav, section2, section2Label, section1Label = "Workspace", unreadCount }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/dashboard" || href === "/portal") return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <nav style={{
      width: 200, minWidth: 200, background: "var(--sb)",
      borderRight: "1px solid var(--bdr)", display: "flex",
      flexDirection: "column", height: "100vh", position: "sticky", top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "14px 12px 12px", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 28, height: 28, background: "var(--teal)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#0a1412", fontFamily: "monospace", flexShrink: 0 }}>D</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.3 }}>DEMI</div>
          <div style={{ fontSize: 8, color: "var(--teal)", fontFamily: "monospace", letterSpacing: 0.5 }}>TC PLATFORM</div>
        </div>
        <div style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: "50%", background: "var(--teal)", boxShadow: "0 0 6px var(--teal)" }} />
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 6px" }}>
        <div style={{ fontSize: 8, fontWeight: 700, color: "#3A4050", letterSpacing: 0.8, textTransform: "uppercase", padding: "0 6px 4px", fontFamily: "monospace", marginBottom: 2 }}>
          {section1Label}
        </div>
        {nav.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} unreadOverride={item.label === "Notifications" ? unreadCount : undefined} />
        ))}

        {section2 && section2.length > 0 && (
          <>
            <div style={{ fontSize: 8, fontWeight: 700, color: "#3A4050", letterSpacing: 0.8, textTransform: "uppercase", padding: "10px 6px 4px", fontFamily: "monospace" }}>
              {section2Label ?? "Reporting"}
            </div>
            {section2.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} />
            ))}
          </>
        )}
      </div>

      {/* User footer */}
      <div style={{ padding: "8px 10px", borderTop: "1px solid var(--bdr)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
          <Avatar name={user.full_name} size={26} url={user.avatar_url} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.full_name}</div>
            <div style={{ fontSize: 9, color: "var(--muted)", textTransform: "capitalize" }}>{user.role === "tc" ? "Transaction Coordinator" : user.role}</div>
          </div>
        </div>
        <button
          onClick={signOut}
          style={{ width: "100%", background: "transparent", border: "1px solid var(--bdr)", borderRadius: 5, padding: "5px 0", fontSize: 11, color: "var(--dim)", cursor: "pointer", fontFamily: "inherit" }}
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}

function NavLink({ item, active, unreadOverride }: { item: NavItem; active: boolean; unreadOverride?: number }) {
  const badge = unreadOverride ?? item.badge;
  return (
    <Link href={item.href} style={{ textDecoration: "none" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "5px 7px", borderRadius: 5, fontSize: 11,
        color: active ? "var(--teal)" : "var(--muted)",
        background: active ? "var(--teal-d)" : "transparent",
        marginBottom: 1, transition: "background .1s",
      }}>
        <span style={{ fontSize: 13, opacity: active ? 1 : 0.7 }}>{item.icon}</span>
        <span style={{ fontWeight: active ? 600 : 400, flex: 1 }}>{item.label}</span>
        {badge != null && badge > 0 && (
          <span style={{
            fontSize: 9, fontWeight: 700, fontFamily: "monospace",
            background: item.badgeColor ?? "var(--teal)",
            color: item.badgeColor === "var(--rose)" ? "#fff" : item.badgeColor === "var(--amber)" ? "#1a1000" : "#0a1412",
            padding: "1px 5px", borderRadius: 9,
          }}>{badge}</span>
        )}
      </div>
    </Link>
  );
}

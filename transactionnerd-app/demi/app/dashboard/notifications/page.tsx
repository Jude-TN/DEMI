"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Topbar from "@/components/layout/Topbar";
import { Btn } from "@/components/ui";
import type { Notification } from "@/types";
import { formatDate } from "@/lib/utils/dates";

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const supabase = createClient();

  useEffect(() => {
    load();
    const channel = supabase.channel("notifs")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(50);
    setNotifs(data ?? []);
  }

  async function markAllRead() {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("notifications").update({ read: true }).eq("user_id", user!.id).eq("read", false);
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  }

  async function markRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  const unread = notifs.filter(n => !n.read).length;

  return (
    <>
      <Topbar
        title={`Notifications${unread > 0 ? ` (${unread})` : ""}`}
        actions={unread > 0 ? <Btn size="sm" variant="ghost" onClick={markAllRead}>Mark all read</Btn> : undefined}
      />
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {notifs.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)", fontSize: 13 }}>
            🔔 No notifications yet
          </div>
        )}
        {notifs.map(n => (
          <div
            key={n.id}
            onClick={() => markRead(n.id)}
            style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "11px 13px", marginBottom: 6,
              background: n.read ? "var(--panel)" : "var(--teal-d)",
              border: `1px solid ${n.read ? "var(--bdr)" : "var(--teal-b)"}`,
              borderRadius: 8, cursor: n.deal_id ? "pointer" : "default",
            }}
          >
            {!n.read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--teal)", flexShrink: 0, marginTop: 4 }} />}
            {n.read && <div style={{ width: 7, flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: n.read ? 400 : 600, color: "var(--text)", marginBottom: 2 }}>{n.title}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>{n.body}</div>
              {n.deal_id && (
                <Link href={`/dashboard/deals/${n.deal_id}`} onClick={e => e.stopPropagation()} style={{ fontSize: 10, color: "var(--teal)", textDecoration: "none", marginTop: 4, display: "inline-block" }}>
                  View deal →
                </Link>
              )}
            </div>
            <span style={{ fontSize: 9, color: "var(--dim)", fontFamily: "monospace", whiteSpace: "nowrap", flexShrink: 0 }}>
              {formatDate(n.created_at, "MMM d 'at' h:mm a")}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Btn } from "@/components/ui";
import Topbar from "@/components/layout/Topbar";
import type { Notification } from "@/types";
import { formatDate } from "@/lib/utils/dates";

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const supabase = createClient();

  useEffect(() => {
    load();
    const channel = supabase.channel("notifs-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function load() {
    const res = await fetch("/api/notifications");
    if (res.ok) setNotifs(await res.json());
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "PATCH" });
    setNotifs(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  }

  const unread = notifs.filter(n => !n.read_at).length;

  return (
    <>
      <Topbar
        title={`Notifications${unread > 0 ? ` (${unread})` : ""}`}
        actions={unread > 0 ? <Btn size="sm" variant="ghost" onClick={markAllRead}>Mark all read</Btn> : undefined}
      />
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {notifs.length === 0 && <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)", fontSize: 13 }}>🔔 No notifications yet</div>}
        {notifs.map(n => (
          <div
            key={n.id}
            onClick={() => !n.read_at && markRead(n.id)}
            style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 13px", marginBottom: 6, background: n.read_at ? "var(--panel)" : "var(--teal-d)", border: `1px solid ${n.read_at ? "var(--bdr)" : "var(--teal-b)"}`, borderRadius: 8, cursor: n.read_at ? "default" : "pointer" }}
          >
            {!n.read_at && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--teal)", flexShrink: 0, marginTop: 4 }} />}
            {n.read_at && <div style={{ width: 7, flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: n.read_at ? 400 : 600, marginBottom: 2 }}>{n.title}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>{n.body}</div>
              {n.deep_link && (
                <Link href={n.deep_link} onClick={e => e.stopPropagation()} style={{ fontSize: 10, color: "var(--teal)", marginTop: 4, display: "inline-block" }}>
                  View →
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

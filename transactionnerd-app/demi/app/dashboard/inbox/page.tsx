import { createClient } from "@/lib/supabase/server";
import Topbar from "@/components/layout/Topbar";

export const dynamic = "force-dynamic";

function fmtTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
  const yest = new Date(now.getTime() - 864e5);
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function InboxPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: bm } = await supabase.from("brokerage_members").select("brokerage_id").eq("user_id", user!.id).eq("is_active", true).single();
  const bid = bm?.brokerage_id;

  const { data: msgs } = await supabase
    .from("messages")
    .select("id,body,attachment_url,created_at, deal:deals(address), sender:users!messages_sender_id_fkey(full_name)")
    .eq("brokerage_id", bid || "")
    .order("created_at", { ascending: false })
    .limit(30);

  const list = msgs || [];
  const selected: any = list[0];

  return (
    <>
      <Topbar
        title="Inbox"
        actions={<button style={{ background: "transparent", border: "1px solid var(--bdr)", color: "var(--text)", fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 7, cursor: "pointer" }}>\u2709 Compose</button>}
      />
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "340px minmax(0,1fr)", overflow: "hidden" }}>
        <div style={{ borderRight: "1px solid var(--bdr)", overflowY: "auto" }}>
          {list.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "var(--dim)", padding: 18 }}>No messages yet.</div>
          ) : list.map((m: any, i: number) => (
            <div key={m.id} style={{ padding: "12px 14px", borderBottom: "1px solid var(--bdr)", borderLeft: i === 0 ? "2px solid var(--teal)" : "2px solid transparent", background: i === 0 ? "var(--card)" : "transparent", cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{m.sender?.full_name || "Message"}</span>
                <span style={{ fontSize: 10.5, color: "var(--dim)", fontFamily: "monospace" }}>{fmtTime(m.created_at)}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{m.body}</div>
              {m.deal?.address && <span style={{ fontSize: 9.5, fontWeight: 700, fontFamily: "monospace", background: "var(--teal-d)", color: "var(--teal)", padding: "2px 7px", borderRadius: 4 }}>{m.deal.address.split(",")[0]}</span>}
            </div>
          ))}
        </div>

        <div style={{ overflowY: "auto", padding: 20 }}>
          {selected ? (
            <>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 3 }}>{selected.deal?.address ? selected.deal.address.split(",")[0] : "Message"}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>From: {selected.sender?.full_name || "\u2014"} \u00B7 {fmtTime(selected.created_at)}</div>

              <div style={{ background: "var(--teal-d)", border: "1px solid rgba(45,212,191,.35)", borderRadius: 10, padding: 16, marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "monospace", background: "var(--teal)", color: "#0a1412", padding: "2px 6px", borderRadius: 4 }}>DEMI AI</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--teal)" }}>Email parsed \u2014 action items detected</span>
                </div>
                <div style={{ fontSize: 12.5, marginBottom: 8, display: "flex", gap: 8 }}><span>\u2705</span><span>Key details extracted from message body and attachments</span></div>
                <div style={{ fontSize: 12.5, marginBottom: 8, display: "flex", gap: 8 }}><span>\u{1F4C5}</span><span>Tasks created and assigned to the coordinator</span></div>
                <div style={{ fontSize: 12.5, marginBottom: 12, display: "flex", gap: 8 }}><span>\u26A0\uFE0F</span><span>Follow-up items flagged for review</span></div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ background: "var(--card2)", border: "1px solid var(--bdr)", color: "var(--text)", fontSize: 12, fontWeight: 600, padding: "7px 12px", borderRadius: 7, cursor: "pointer" }}>\u2713 Accept tasks</button>
                  <button style={{ background: "var(--card2)", border: "1px solid var(--bdr)", color: "var(--text)", fontSize: 12, fontWeight: 600, padding: "7px 12px", borderRadius: 7, cursor: "pointer" }}>\u270E Edit tasks</button>
                  <button style={{ background: "var(--card2)", border: "1px solid var(--bdr)", color: "var(--text)", fontSize: 12, fontWeight: 600, padding: "7px 12px", borderRadius: 7, cursor: "pointer" }}>\u21A9 Draft reply</button>
                </div>
              </div>

              <div style={{ fontSize: 13.5, lineHeight: 1.7, whiteSpace: "pre-wrap", color: "var(--text)" }}>{selected.body}</div>
            </>
          ) : (
            <div style={{ fontSize: 12.5, color: "var(--dim)" }}>Select a message to read it.</div>
          )}
        </div>
      </div>
    </>
  );
}

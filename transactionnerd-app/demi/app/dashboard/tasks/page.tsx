import { createClient } from "@/lib/supabase/server";
import Topbar from "@/components/layout/Topbar";
import { todayISO, in7ISO } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";

function prioTag(p: string) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    high: { bg: "rgba(244,63,94,.15)", fg: "var(--rose)", label: "HIGH" },
    medium: { bg: "rgba(234,179,8,.15)", fg: "#eab308", label: "MED" },
    low: { bg: "rgba(148,163,184,.15)", fg: "var(--muted)", label: "LOW" },
  };
  return map[p] || map.medium;
}

function fmtDue(d: string | null, today: string) {
  if (!d) return "";
  if (d === today) return "Today";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: bm } = await supabase.from("brokerage_members").select("brokerage_id").eq("user_id", user!.id).eq("is_active", true).single();
  const bid = bm?.brokerage_id;

  const today = todayISO();
  const in7 = in7ISO();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id,label,due_date,priority,status,deal_id, deal:deals(address)")
    .eq("brokerage_id", bid || "")
    .eq("status", "open")
    .order("due_date", { ascending: true });

  const all = tasks || [];
  const overdue = all.filter((t: any) => t.due_date && t.due_date < today);
  const dueToday = all.filter((t: any) => t.due_date === today);
  const thisWeek = all.filter((t: any) => t.due_date && t.due_date > today && t.due_date <= in7);

  const groups = [
    { icon: "\u26A0\uFE0F", title: "OVERDUE", color: "var(--rose)", items: overdue },
    { icon: "\u23F0", title: "DUE TODAY", color: "#eab308", items: dueToday },
    { icon: "\u{1F4C5}", title: "THIS WEEK", color: "var(--muted)", items: thisWeek },
  ];

  const aiSuggestions = [
    { title: "Confirm rate lock expiry with First Horizon", sub: "From commitment letter email" },
    { title: "Send thank-you to seller's agent", sub: "Post-close suggestion" },
    { title: "Schedule post-closing follow-up with buyer", sub: "DEMI relationship suggestion" },
  ];

  return (
    <>
      <Topbar
        title="Tasks"
        actions={<button style={{ background: "transparent", border: "1px solid var(--bdr)", color: "var(--text)", fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 7, cursor: "pointer" }}>+ Add Task</button>}
      />
      <div style={{ flex: 1, overflowY: "auto", padding: 18, display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 18, alignItems: "start" }}>
        <div>
          {groups.map((g) => (
            <div key={g.title} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8, fontSize: 11, fontWeight: 700, letterSpacing: .5, fontFamily: "monospace", color: g.color, textTransform: "uppercase" }}>
                <span>{g.icon}</span>{g.title} ({g.items.length})
              </div>
              {g.items.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--dim)", padding: "8px 4px" }}>Nothing here.</div>
              ) : g.items.map((t: any) => {
                const tag = prioTag(t.priority);
                return (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--card)", border: "1px solid var(--bdr)", borderRadius: 8, padding: "12px 14px", marginBottom: 7 }}>
                    <input type="checkbox" style={{ width: 15, height: 15, accentColor: "var(--teal)" }} />
                    <span style={{ flex: 1, fontSize: 13 }}>{t.label}{t.deal?.address ? " \u2014 " + t.deal.address : ""}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", background: tag.bg, color: tag.fg, padding: "2px 7px", borderRadius: 5 }}>{tag.label}</span>
                    <span style={{ fontSize: 11, color: t.due_date && t.due_date < today ? "var(--rose)" : "var(--muted)", minWidth: 42, textAlign: "right" }}>{fmtDue(t.due_date, today)}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ background: "var(--teal-d)", border: "1px solid rgba(45,212,191,.35)", borderRadius: 10, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "monospace", background: "var(--teal)", color: "#0a1412", padding: "2px 6px", borderRadius: 4 }}>DEMI AI</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--teal)" }}>{aiSuggestions.length} tasks suggested from emails</span>
          </div>
          {aiSuggestions.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 11 }}>
              <span style={{ fontSize: 13 }}>\u2728</span>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{s.title}</div>
                <div style={{ fontSize: 10.5, color: "var(--muted)", fontFamily: "monospace" }}>{s.sub}</div>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button style={{ flex: 1, background: "var(--teal)", color: "#0a1412", border: "none", fontSize: 12, fontWeight: 700, padding: "8px 0", borderRadius: 7, cursor: "pointer" }}>Add all tasks</button>
            <button style={{ flex: 1, background: "transparent", color: "var(--text)", border: "1px solid var(--bdr)", fontSize: 12, fontWeight: 600, padding: "8px 0", borderRadius: 7, cursor: "pointer" }}>Review</button>
          </div>
        </div>
      </div>
    </>
  );
}

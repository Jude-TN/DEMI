import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { StatCard, Tag, StageTag, Avatar, ProgressBar } from "@/components/ui";
import type { Deal, Task } from "@/types";
import { formatDate, daysUntil, isOverdue } from "@/lib/utils/dates";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("users").select("brokerage_id, role, full_name").eq("id", user!.id).single();
  const bid = profile?.brokerage_id;

  // Stats
  const { count: activeCount } = await supabase.from("deals").select("id", { count: "exact", head: true })
    .eq("brokerage_id", bid).in("stage", ["under_contract", "clear_to_close", "listing", "lead"]);

  const today = new Date().toISOString().split("T")[0];
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const { count: closingSoon } = await supabase.from("deals").select("id", { count: "exact", head: true })
    .eq("brokerage_id", bid).gte("close_date", today).lte("close_date", in7).in("stage", ["under_contract", "clear_to_close"]);

  const { count: closedMonth } = await supabase.from("deals").select("id", { count: "exact", head: true })
    .eq("brokerage_id", bid).eq("stage", "closed").gte("closed_at", new Date(Date.now() - 30 * 86400000).toISOString());

  // Overdue tasks
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const { data: overdueTasks } = await supabase
    .from("tasks")
    .select("*, deals(address, id), users!tasks_assignee_id_fkey(full_name, avatar_url)")
    .eq("brokerage_id", bid).eq("status", "open").lt("due_date", today)
    .order("due_date", { ascending: true }).limit(5) as any;

  const { count: overdueCount } = await supabase.from("tasks").select("id", { count: "exact", head: true })
    .eq("brokerage_id", bid).eq("status", "open").lt("due_date", today);

  // Closing soon deals
  const { data: closingDeals } = await supabase
    .from("deals")
    .select("*, agent:users!deals_agent_id_fkey(full_name, avatar_url), tc:users!deals_tc_id_fkey(full_name, avatar_url)")
    .eq("brokerage_id", bid).gte("close_date", today).lte("close_date", in7)
    .in("stage", ["under_contract", "clear_to_close"])
    .order("close_date", { ascending: true }).limit(5) as any;

  // Task completion for progress
  async function getProgress(dealId: string) {
    const { count: total } = await supabase.from("tasks").select("id", { count: "exact", head: true }).eq("deal_id", dealId);
    const { count: done } = await supabase.from("tasks").select("id", { count: "exact", head: true }).eq("deal_id", dealId).eq("status", "completed");
    return total ? Math.round(((done ?? 0) / total) * 100) : 0;
  }

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ padding: "14px 16px" }}>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
          <StatCard label="Active deals" value={activeCount ?? 0} sub="Currently in pipeline" />
          <StatCard label="Closing this week" value={closingSoon ?? 0} sub={closingSoon ? "⚠ Review now" : "On track"} subColor={closingSoon ? "var(--amber)" : "var(--teal)"} />
          <StatCard label="Overdue tasks" value={overdueCount ?? 0} sub={overdueCount ? "Action needed" : "All on time"} subColor={overdueCount ? "var(--rose)" : "var(--teal)"} />
          <StatCard label="Closed (30d)" value={closedMonth ?? 0} sub="Completed transactions" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

          {/* Overdue tasks */}
          <div style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>⚠️ Overdue tasks</span>
              <Link href="/dashboard/deals" style={{ fontSize: 11, color: "var(--teal)", textDecoration: "none" }}>View all →</Link>
            </div>
            <div style={{ padding: "8px 0" }}>
              {(!overdueTasks || overdueTasks.length === 0) && (
                <div style={{ padding: "24px 14px", textAlign: "center", fontSize: 12, color: "var(--muted)" }}>✅ No overdue tasks</div>
              )}
              {overdueTasks?.map((t: any) => (
                <Link key={t.id} href={`/dashboard/deals/${t.deal_id}`} style={{ textDecoration: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", borderBottom: "1px solid var(--bdr)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text)", marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.label}</div>
                      <div style={{ fontSize: 10, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.deals?.address}</div>
                    </div>
                    <span style={{ fontSize: 9, color: "var(--rose)", fontFamily: "monospace", whiteSpace: "nowrap" }}>{formatDate(t.due_date)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Closing soon */}
          <div style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>📅 Closing this week</span>
              <Link href="/dashboard/pipeline" style={{ fontSize: 11, color: "var(--teal)", textDecoration: "none" }}>Pipeline →</Link>
            </div>
            <div style={{ padding: "8px 0" }}>
              {(!closingDeals || closingDeals.length === 0) && (
                <div style={{ padding: "24px 14px", textAlign: "center", fontSize: 12, color: "var(--muted)" }}>No closings this week</div>
              )}
              {closingDeals?.map(async (deal: any) => {
                const pct = await getProgress(deal.id);
                const days = daysUntil(deal.close_date);
                return (
                  <Link key={deal.id} href={`/dashboard/deals/${deal.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--bdr)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deal.address}</div>
                        </div>
                        <StageTag stage={deal.stage} />
                        <span style={{ fontSize: 9, color: days <= 2 ? "var(--rose)" : "var(--amber)", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                          {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ flex: 1 }}><ProgressBar pct={pct} /></div>
                        <span style={{ fontSize: 9, color: "var(--teal)", fontFamily: "monospace" }}>{pct}%</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ marginTop: 12, background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 10 }}>Quick actions</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/dashboard/deals/new" style={{ textDecoration: "none" }}>
              <div style={{ background: "var(--teal)", color: "#0a1412", borderRadius: 6, padding: "7px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ New deal</div>
            </Link>
            <Link href="/dashboard/pipeline" style={{ textDecoration: "none" }}>
              <div style={{ background: "var(--card)", border: "1px solid var(--bdrs)", color: "var(--muted)", borderRadius: 6, padding: "7px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>View pipeline</div>
            </Link>
            <Link href="/dashboard/contacts" style={{ textDecoration: "none" }}>
              <div style={{ background: "var(--card)", border: "1px solid var(--bdrs)", color: "var(--muted)", borderRadius: 6, padding: "7px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Contacts</div>
            </Link>
            <Link href="/dashboard/reports" style={{ textDecoration: "none" }}>
              <div style={{ background: "var(--card)", border: "1px solid var(--bdrs)", color: "var(--muted)", borderRadius: 6, padding: "7px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Reports</div>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

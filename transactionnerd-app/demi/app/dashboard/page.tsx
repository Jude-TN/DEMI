import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { StatCard, StageTag, ProgressBar, Tag } from "@/components/ui";
import { formatShort, daysUntil, todayISO, in7ISO } from "@/lib/utils/dates";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("users").select("brokerage_id,role,full_name").eq("id", user!.id).single();

  // Role-aware scoping
  const isAdmin = profile?.role === "admin";
  const today = todayISO();
  const in7 = in7ISO();

  let dealsQ = supabase.from("deals").select("id", { count: "exact", head: true }).is("archived_at", null).is("closed_at", null);
  let closingQ = supabase.from("deals").select("id", { count: "exact", head: true }).gte("close_date", today).lte("close_date", in7).is("closed_at", null).is("archived_at", null);
  let closedQ = supabase.from("deals").select("id", { count: "exact", head: true }).eq("stage", "closed").gte("closed_at", new Date(Date.now() - 30 * 86400000).toISOString());
  let overdueQ = supabase.from("tasks").select("id", { count: "exact", head: true }).lt("due_date", today).is("completed_at", null);

  // TC — only see assigned
  if (profile?.role === "tc") {
    dealsQ = dealsQ.eq("tc_id", user!.id);
    closingQ = closingQ.eq("tc_id", user!.id);
    closedQ = closedQ.eq("tc_id", user!.id);
  }

  const [{ count: activeCount }, { count: closingSoonCount }, { count: closedMonthCount }, { count: overdueCount }] =
    await Promise.all([dealsQ, closingQ, closedQ, overdueQ]);

  // Overdue tasks detail
  let overdueTasksQ = supabase.from("tasks")
    .select("id,label,deal_id,assignee_id,deals(id,address,tc_id,agent_id),assignee:users!tasks_assignee_id_fkey(full_name,avatar_url)")
    .lt("due_date", today).is("completed_at", null).order("due_date", { ascending: true }).limit(6) as any;
  const { data: overdueTasks } = await overdueTasksQ;

  // Closing soon deals detail
  const { data: closingDeals } = await supabase.from("deals")
    .select("id,address,stage,close_date,tc:users!deals_tc_id_fkey(full_name,avatar_url)")
    .gte("close_date", today).lte("close_date", in7).is("closed_at", null).is("archived_at", null)
    .order("close_date", { ascending: true }).limit(6) as any;

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ padding: "14px 16px" }}>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
          <StatCard label="Active deals" value={activeCount ?? 0} sub="In pipeline" />
          <StatCard label="Closing this week" value={closingSoonCount ?? 0} sub={closingSoonCount ? "⚠ Review now" : "All on track"} subColor={closingSoonCount ? "var(--amber)" : "var(--teal)"} />
          <StatCard label="Overdue tasks" value={overdueCount ?? 0} sub={overdueCount ? "Action needed" : "All on time"} subColor={overdueCount ? "var(--rose)" : "var(--teal)"} />
          <StatCard label="Closed (30d)" value={closedMonthCount ?? 0} sub="Completed transactions" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>

          {/* Overdue tasks */}
          <div style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "9px 13px", borderBottom: "1px solid var(--bdr)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>⚠️ Overdue tasks</span>
              <Link href="/deals" style={{ fontSize: 10, color: "var(--teal)" }}>All deals →</Link>
            </div>
            {(!overdueTasks || overdueTasks.length === 0) && <div style={{ padding: "24px 13px", textAlign: "center", fontSize: 12, color: "var(--muted)" }}>✅ No overdue tasks</div>}
            {overdueTasks?.map((t: any) => (
              <Link key={t.id} href={`/deals/${t.deal_id}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 13px", borderBottom: "1px solid var(--bdr)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.label}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.deals?.address}</div>
                </div>
                <span style={{ fontSize: 9, color: "var(--rose)", fontFamily: "monospace", whiteSpace: "nowrap" }}>{formatShort(t.due_date)}</span>
              </Link>
            ))}
          </div>

          {/* Closing soon */}
          <div style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "9px 13px", borderBottom: "1px solid var(--bdr)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>📅 Closing this week</span>
              <Link href="/pipeline" style={{ fontSize: 10, color: "var(--teal)" }}>Pipeline →</Link>
            </div>
            {(!closingDeals || closingDeals.length === 0) && <div style={{ padding: "24px 13px", textAlign: "center", fontSize: 12, color: "var(--muted)" }}>No closings this week</div>}
            {closingDeals?.map(async (deal: any) => {
              const { count: total } = await supabase.from("tasks").select("id", { count: "exact", head: true }).eq("deal_id", deal.id);
              const { count: done } = await supabase.from("tasks").select("id", { count: "exact", head: true }).eq("deal_id", deal.id).not("completed_at", "is", null);
              const pct = total ? Math.round(((done ?? 0) / total) * 100) : 0;
              const days = daysUntil(deal.close_date);
              return (
                <Link key={deal.id} href={`/deals/${deal.id}`} style={{ display: "block", padding: "8px 13px", borderBottom: "1px solid var(--bdr)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                    <div style={{ flex: 1, fontSize: 11, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deal.address}</div>
                    <StageTag stage={deal.stage} />
                    <span style={{ fontSize: 9, color: days <= 2 ? "var(--rose)" : "var(--amber)", fontFamily: "monospace", whiteSpace: "nowrap" }}>{days === 0 ? "Today" : `${days}d`}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <div style={{ flex: 1 }}><ProgressBar pct={pct} /></div>
                    <span style={{ fontSize: 9, color: "var(--teal)", fontFamily: "monospace" }}>{pct}%</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, padding: "11px 13px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 9 }}>Quick actions</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {[{href:"/deals/new",label:"+ New deal",primary:true},{href:"/pipeline",label:"Pipeline"},{href:"/deals",label:"All deals"},{href:"/contacts",label:"Contacts"},{href:"/reports",label:"Reports"}].map(a=>(
              <Link key={a.href} href={a.href}>
                <div style={{background:a.primary?"var(--teal)":"var(--card)",color:a.primary?"#0a1412":"var(--muted)",border:a.primary?"none":"1px solid var(--bdrs)",borderRadius:6,padding:"6px 12px",fontSize:11,fontWeight:600,cursor:"pointer"}}>{a.label}</div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

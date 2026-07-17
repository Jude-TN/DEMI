import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/ui";
import Topbar from "@/components/layout/Topbar";

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("users").select("brokerage_id").eq("id", user!.id).single();
  const bid = profile?.brokerage_id;

  const now = new Date();
  const ago30 = new Date(now.getTime() - 30 * 86400000).toISOString();
  const ago90 = new Date(now.getTime() - 90 * 86400000).toISOString();
  const ytdStart = new Date(now.getFullYear(), 0, 1).toISOString();

  const { count: closed30 } = await supabase.from("deals").select("id", { count: "exact", head: true }).eq("brokerage_id", bid).eq("stage", "closed").gte("closed_at", ago30);
  const { count: closed90 } = await supabase.from("deals").select("id", { count: "exact", head: true }).eq("brokerage_id", bid).eq("stage", "closed").gte("closed_at", ago90);
  const { count: closedYtd } = await supabase.from("deals").select("id", { count: "exact", head: true }).eq("brokerage_id", bid).eq("stage", "closed").gte("closed_at", ytdStart);
  const { count: active } = await supabase.from("deals").select("id", { count: "exact", head: true }).eq("brokerage_id", bid).in("stage", ["lead", "listing", "under_contract", "clear_to_close"]);
  const { count: overdueTasks } = await supabase.from("tasks").select("id", { count: "exact", head: true }).eq("brokerage_id", bid).eq("status", "open").lt("due_date", now.toISOString().split("T")[0]);

  // Closed by month (last 6 months)
  const closedByMonth: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = d.toISOString();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
    const { count } = await supabase.from("deals").select("id", { count: "exact", head: true })
      .eq("brokerage_id", bid).eq("stage", "closed").gte("closed_at", start).lt("closed_at", end);
    closedByMonth.push({ month: d.toLocaleString("default", { month: "short" }), count: count ?? 0 });
  }

  const maxBar = Math.max(...closedByMonth.map(m => m.count), 1);

  // TC performance
  const { data: tcs } = await supabase.from("users").select("*").eq("brokerage_id", bid).eq("role", "tc");
  const tcStats = await Promise.all((tcs ?? []).map(async (tc: any) => {
    const { count: active } = await supabase.from("deals").select("id", { count: "exact", head: true }).eq("tc_id", tc.id).in("stage", ["under_contract", "clear_to_close"]);
    const { count: closed } = await supabase.from("deals").select("id", { count: "exact", head: true }).eq("tc_id", tc.id).eq("stage", "closed").gte("closed_at", ago30);
    return { tc, active: active ?? 0, closed: closed ?? 0 };
  }));

  return (
    <>
      <Topbar title="Reports" />
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 14 }}>
          <StatCard label="Closed (30d)"  value={closed30 ?? 0} sub="Last 30 days" />
          <StatCard label="Closed (90d)"  value={closed90 ?? 0} sub="Last quarter" />
          <StatCard label="Closed (YTD)"  value={closedYtd ?? 0} sub="This year" />
          <StatCard label="Active deals"  value={active ?? 0} sub="In pipeline" />
          <StatCard label="Overdue tasks" value={overdueTasks ?? 0} sub={overdueTasks ? "Need attention" : "All on time"} subColor={overdueTasks ? "var(--amber)" : "var(--teal)"} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Bar chart */}
          <div style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12 }}>Transactions closed — last 6 months</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
              {closedByMonth.map(({ month, count }) => (
                <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontSize: 9, fontFamily: "monospace", color: "var(--muted)" }}>{count}</div>
                  <div style={{ width: "100%", borderRadius: "3px 3px 0 0", background: `var(--teal${count === Math.max(...closedByMonth.map(m => m.count)) && count > 0 ? "" : "-d"})`, height: `${Math.max((count / maxBar) * 80, count > 0 ? 8 : 2)}px`, transition: "height .3s" }} />
                  <div style={{ fontSize: 9, color: "var(--dim)", fontFamily: "monospace" }}>{month}</div>
                </div>
              ))}
            </div>
          </div>

          {/* TC performance */}
          <div style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12 }}>TC performance</div>
            <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "monospace", marginBottom: 8 }}>Active files</div>
            {tcStats.map(({ tc, active, closed }) => (
              <div key={tc.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: "var(--text)", width: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tc.full_name.split(" ")[0]} {tc.full_name.split(" ")[1]?.[0]}.</span>
                <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 2, height: 6 }}>
                  <div style={{ width: `${Math.min((active / 10) * 100, 100)}%`, height: 6, background: "var(--teal)", borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--muted)", width: 20, textAlign: "right" }}>{active}</span>
              </div>
            ))}
            <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "monospace", margin: "12px 0 8px" }}>Closed (30d)</div>
            {tcStats.map(({ tc, closed }) => (
              <div key={tc.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: "var(--text)", width: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tc.full_name.split(" ")[0]} {tc.full_name.split(" ")[1]?.[0]}.</span>
                <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 2, height: 6 }}>
                  <div style={{ width: `${Math.min((closed / Math.max(...tcStats.map(t => t.closed), 1)) * 100, 100)}%`, height: 6, background: "var(--teal)", borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--muted)", width: 20, textAlign: "right" }}>{closed}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/ui";
import Topbar from "@/components/layout/Topbar";
import { ago30ISO, ytdISO, todayISO } from "@/lib/utils/dates";

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: bm } = await supabase.from("brokerage_members").select("brokerage_id").eq("user_id", user!.id).eq("is_active", true).single();
  const bid = bm?.brokerage_id;

  const [
    { count: active },
    { count: closed30 },
    { count: closedYtd },
    { count: overdue },
  ] = await Promise.all([
    supabase.from("deals").select("id",{count:"exact",head:true}).eq("brokerage_id",bid!).is("closed_at",null).is("archived_at",null),
    supabase.from("deals").select("id",{count:"exact",head:true}).eq("brokerage_id",bid!).eq("stage","closed").gte("closed_at",ago30ISO()),
    supabase.from("deals").select("id",{count:"exact",head:true}).eq("brokerage_id",bid!).eq("stage","closed").gte("closed_at",ytdISO()),
    supabase.from("tasks").select("id",{count:"exact",head:true}).lt("due_date",todayISO()).is("completed_at",null),
  ]);

  // Monthly closes for bar chart (last 6 months)
  const months: { label: string; count: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = d.toISOString();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
    const { count } = await supabase.from("deals").select("id",{count:"exact",head:true}).eq("brokerage_id",bid!).eq("stage","closed").gte("closed_at",start).lt("closed_at",end);
    months.push({ label: d.toLocaleString("default",{month:"short"}), count: count ?? 0 });
  }
  const maxBar = Math.max(...months.map(m => m.count), 1);

  // TC performance
  const { data: tcs } = await supabase.from("brokerage_members").select("users(id,full_name)").eq("brokerage_id",bid!).eq("role","tc").eq("is_active",true) as any;
  const tcStats = await Promise.all((tcs ?? []).map(async (m: any) => {
    const tc = m.users;
    const { count: active } = await supabase.from("deals").select("id",{count:"exact",head:true}).eq("tc_id",tc.id).is("closed_at",null).is("archived_at",null);
    const { count: closed } = await supabase.from("deals").select("id",{count:"exact",head:true}).eq("tc_id",tc.id).eq("stage","closed").gte("closed_at",ago30ISO());
    return { name: tc.full_name as string, active: active ?? 0, closed: closed ?? 0 };
  }));
  const maxActive = Math.max(...tcStats.map(t => t.active), 1);
  const maxClosed = Math.max(...tcStats.map(t => t.closed), 1);

  return (
    <>
      <Topbar title="Reports" />
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
          <StatCard label="Active deals" value={active ?? 0} sub="In pipeline" />
          <StatCard label="Closed (30d)" value={closed30 ?? 0} sub="Last 30 days" />
          <StatCard label="Closed (YTD)" value={closedYtd ?? 0} sub="This year" />
          <StatCard label="Overdue tasks" value={overdue ?? 0} sub={overdue ? "Need attention" : "All on time"} subColor={overdue ? "var(--amber)" : "var(--teal)"} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

          {/* Bar chart */}
          <div style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 14 }}>Transactions closed — last 6 months</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
              {months.map(({ label, count }, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontSize: 9, fontFamily: "monospace", color: "var(--muted)" }}>{count || ""}</div>
                  <div style={{ width: "100%", borderRadius: "3px 3px 0 0", background: i === months.length - 1 ? "var(--teal)" : "var(--teal-d)", height: `${Math.max((count / maxBar) * 80, count > 0 ? 6 : 2)}px`, transition: "height .3s" }} />
                  <div style={{ fontSize: 9, color: "var(--dim)", fontFamily: "monospace" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* TC performance */}
          <div style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12 }}>TC performance</div>
            {tcStats.length === 0 && <div style={{ fontSize: 12, color: "var(--muted)" }}>No TCs in this brokerage yet.</div>}
            <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "monospace", marginBottom: 8 }}>Active files</div>
            {tcStats.map(tc => (
              <div key={tc.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "var(--text)", width: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tc.name}</span>
                <div style={{ flex: 1, background: "rgba(255,255,255,.05)", borderRadius: 2, height: 6 }}><div style={{ width: `${(tc.active / maxActive) * 100}%`, height: 6, background: "var(--teal)", borderRadius: 2 }} /></div>
                <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--muted)", width: 22, textAlign: "right" as const }}>{tc.active}</span>
              </div>
            ))}
            <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "monospace", margin: "12px 0 8px" }}>Closed (30d)</div>
            {tcStats.map(tc => (
              <div key={tc.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "var(--text)", width: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tc.name}</span>
                <div style={{ flex: 1, background: "rgba(255,255,255,.05)", borderRadius: 2, height: 6 }}><div style={{ width: `${maxClosed > 0 ? (tc.closed / maxClosed) * 100 : 0}%`, height: 6, background: "var(--teal)", borderRadius: 2 }} /></div>
                <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--muted)", width: 22, textAlign: "right" as const }}>{tc.closed}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

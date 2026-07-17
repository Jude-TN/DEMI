import { createClient } from "@/lib/supabase/server";
import { Avatar, Tag, RoleBadge, CapacityBar } from "@/components/ui";
import Topbar from "@/components/layout/Topbar";
import { getTCCapacity } from "@/lib/utils/capacity";
import { ago30ISO, ytdISO } from "@/lib/utils/dates";

export default async function AgentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: bm } = await supabase.from("brokerage_members").select("brokerage_id").eq("user_id", user!.id).eq("is_active", true).single();
  const bid = bm?.brokerage_id;

  const { data: members } = await supabase.from("brokerage_members")
    .select("role,user:users(*)")
    .eq("brokerage_id", bid!)
    .eq("is_active", true) as any;

  const agents = (members ?? []).filter((m: any) => m.role === "agent" || m.role === "admin");
  const tcs = (members ?? []).filter((m: any) => m.role === "tc");

  const agentStats = await Promise.all(agents.map(async (m: any) => {
    const { count: active } = await supabase.from("deals").select("id", { count: "exact", head: true }).eq("agent_id", m.user.id).is("closed_at", null).is("archived_at", null);
    const { count: closed30 } = await supabase.from("deals").select("id", { count: "exact", head: true }).eq("agent_id", m.user.id).eq("stage", "closed").gte("closed_at", ago30ISO());
    const { count: ytd } = await supabase.from("deals").select("id", { count: "exact", head: true }).eq("agent_id", m.user.id).eq("stage", "closed").gte("closed_at", ytdISO());
    return { user: m.user, role: m.role, active: active ?? 0, closed30: closed30 ?? 0, ytd: ytd ?? 0 };
  }));

  const tcStats = await Promise.all(tcs.map(async (m: any) => {
    // Note: getTCCapacity called with requester=user.id so breakdown will be null (privacy rule)
    const cap = await getTCCapacity(supabase, m.user.id, user!.id);
    const { count: overdue } = await supabase.from("tasks").select("id", { count: "exact", head: true })
      .eq("assignee_id", m.user.id).lt("due_date", new Date().toISOString().split("T")[0]).is("completed_at", null);
    return { user: m.user, cap, overdue: overdue ?? 0 };
  }));

  const topAgent = [...agentStats].sort((a, b) => b.closed30 - a.closed30)[0];

  return (
    <>
      <Topbar title="Agents & TCs" />
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>

        {/* Top agent banner */}
        {topAgent && topAgent.closed30 > 0 && (
          <div style={{ background: "var(--teal-d)", border: "1px solid var(--teal-b)", borderRadius: 8, padding: "8px 13px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>⭐</span>
            <span style={{ fontSize: 11, color: "var(--teal)", fontWeight: 500 }}>Top agent this month: <strong>{topAgent.user.full_name}</strong> — {topAgent.closed30} transaction{topAgent.closed30 !== 1 ? "s" : ""}</span>
          </div>
        )}

        {/* Agents */}
        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>Agents</div>
        {agentStats.map(({ user: u, role, active, closed30, ytd }) => (
          <div key={u.id} style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, padding: "10px 13px", display: "flex", alignItems: "center", gap: 12, marginBottom: 7 }}>
            <Avatar name={u.full_name} size={36} url={u.avatar_url} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{u.full_name}</div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>{u.license_number ? `License: ${u.license_number}` : u.email}</div>
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              {[{v:active,l:"active"},{v:closed30,l:"closed 30d"},{v:ytd,l:"YTD"}].map(({v,l})=>(
                <div key={l} style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:700,fontFamily:"monospace"}}>{v}</div><div style={{fontSize:9,color:"var(--muted)"}}>{l}</div></div>
              ))}
              <RoleBadge role={role} />
            </div>
          </div>
        ))}

        {/* TC Roster */}
        <div style={{ fontSize: 11, fontWeight: 600, margin: "16px 0 8px" }}>Transaction coordinators</div>
        <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 8 }}>Global capacity shown — total files across all teams they work with.</div>
        {tcStats.map(({ user: u, cap, overdue }) => (
          <div key={u.id} style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, padding: "10px 13px", marginBottom: 7 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <Avatar name={u.full_name} size={36} url={u.avatar_url} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{u.full_name}</div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>{u.tc_company ?? u.email}</div>
              </div>
              {overdue > 0 && <Tag label={`${overdue} overdue`} color="rose" />}
              <Tag label="TC" color="teal" />
            </div>
            <CapacityBar total={cap.total_files} cap={cap.cap} />
            <div style={{ fontSize: 9, color: "var(--dim)", marginTop: 4, fontFamily: "monospace" }}>
              {cap.available} file{cap.available !== 1 ? "s" : ""} available · Breakdown visible to TC only
            </div>
          </div>
        ))}

      </div>
    </>
  );
}

import { createClient } from "@/lib/supabase/server";
import { Avatar, Tag } from "@/components/ui";
import Topbar from "@/components/layout/Topbar";
import type { User } from "@/types";

export default async function AgentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("users").select("brokerage_id").eq("id", user!.id).single();
  const bid = profile?.brokerage_id;

  const { data: agents } = await supabase
    .from("users")
    .select("*")
    .eq("brokerage_id", bid)
    .in("role", ["agent", "admin"])
    .order("full_name");

  // For each agent get deal counts
  const agentStats = await Promise.all((agents ?? []).map(async (agent: User) => {
    const { count: active } = await supabase.from("deals").select("id", { count: "exact", head: true })
      .eq("agent_id", agent.id).in("stage", ["lead", "listing", "under_contract", "clear_to_close"]);
    const { count: closed } = await supabase.from("deals").select("id", { count: "exact", head: true })
      .eq("agent_id", agent.id).eq("stage", "closed")
      .gte("closed_at", new Date(Date.now() - 30 * 86400000).toISOString());
    const { count: ytd } = await supabase.from("deals").select("id", { count: "exact", head: true })
      .eq("agent_id", agent.id).eq("stage", "closed")
      .gte("closed_at", new Date(new Date().getFullYear(), 0, 1).toISOString());
    return { agent, active: active ?? 0, closed30d: closed ?? 0, ytd: ytd ?? 0 };
  }));

  const top = [...agentStats].sort((a, b) => b.closed30d - a.closed30d)[0];

  return (
    <>
      <Topbar title="Agents" />
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {top && top.closed30d > 0 && (
          <div style={{ background: "var(--teal-d)", border: "1px solid var(--teal-b)", borderRadius: 8, padding: "9px 13px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>⭐</span>
            <span style={{ fontSize: 11, color: "var(--teal)", fontWeight: 500 }}>
              Top referring agent this month: <strong>{top.agent.full_name}</strong> — {top.closed30d} transaction{top.closed30d !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {agentStats.map(({ agent, active, closed30d, ytd }) => (
          <div key={agent.id} style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, padding: "10px 13px", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <Avatar name={agent.full_name} size={38} url={agent.avatar_url} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{agent.full_name}</div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>
                {agent.license_number ? `License: ${agent.license_number}` : "No license on file"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace" }}>{active}</div>
                <div style={{ fontSize: 9, color: "var(--muted)" }}>active</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace" }}>{closed30d}</div>
                <div style={{ fontSize: 9, color: "var(--muted)" }}>closed 30d</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace" }}>{ytd}</div>
                <div style={{ fontSize: 9, color: "var(--muted)" }}>closed YTD</div>
              </div>
              <Tag label={agent.role.toUpperCase()} color={agent.role === "admin" ? "rose" : "blue"} />
            </div>
          </div>
        ))}

        {agentStats.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)", fontSize: 13 }}>
            No agents yet. Add team members in Settings → Team members.
          </div>
        )}
      </div>
    </>
  );
}

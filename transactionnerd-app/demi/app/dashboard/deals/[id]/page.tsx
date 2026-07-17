import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { StageTag, Tag, Avatar, ProgressBar, Btn } from "@/components/ui";
import { formatDate, formatDateShort, daysUntil } from "@/lib/utils/dates";
import DealTabs from "./DealTabs";

export default async function DealDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: deal } = await supabase
    .from("deals")
    .select("*, agent:users!deals_agent_id_fkey(*), tc:users!deals_tc_id_fkey(*)")
    .eq("id", params.id)
    .single() as any;

  if (!deal) notFound();

  const { count: total } = await supabase.from("tasks").select("id", { count: "exact", head: true }).eq("deal_id", deal.id);
  const { count: done } = await supabase.from("tasks").select("id", { count: "exact", head: true }).eq("deal_id", deal.id).eq("status", "completed");
  const pct = total ? Math.round(((done ?? 0) / total) * 100) : 0;
  const days = daysUntil(deal.close_date);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Back + header */}
      <div style={{ padding: "10px 16px 0" }}>
        <Link href="/dashboard/deals" style={{ fontSize: 11, color: "var(--teal)", textDecoration: "none" }}>← All deals</Link>
      </div>

      {/* Deal header card */}
      <div style={{ margin: "8px 16px 0", background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
              <span style={{ fontSize: 9, fontFamily: "monospace", color: "var(--dim)" }}>{deal.mls_number ?? "No MLS"}</span>
              <StageTag stage={deal.stage} />
              <Tag label={deal.side.toUpperCase()} color="muted" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2, color: "var(--text)" }}>{deal.address}{deal.unit ? ` #${deal.unit}` : ""}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              {deal.tc ? <>TC: <span style={{ color: "var(--text)" }}>{deal.tc.full_name}</span></> : "No TC assigned"}
              {deal.agent && <> &nbsp;·&nbsp; Agent: <span style={{ color: "var(--text)" }}>{deal.agent.full_name}</span></>}
              {deal.close_date && <> &nbsp;·&nbsp; Closing <span style={{ color: days <= 5 ? "var(--rose)" : "var(--text)" }}>{formatDateShort(deal.close_date)}</span></>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
            <Link href={`/dashboard/deals/${deal.id}/edit`} style={{ textDecoration: "none" }}>
              <div style={{ background: "var(--card)", border: "1px solid var(--bdrs)", color: "var(--muted)", borderRadius: 6, padding: "5px 11px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✏ Edit</div>
            </Link>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: "var(--muted)" }}>Closing progress</span>
            <span style={{ fontSize: 9, fontFamily: "monospace", color: "var(--teal)" }}>{pct}%</span>
          </div>
          <ProgressBar pct={pct} height={5} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ flex: 1, overflow: "hidden", margin: "10px 16px 14px" }}>
        <DealTabs dealId={deal.id} deal={deal} />
      </div>
    </div>
  );
}

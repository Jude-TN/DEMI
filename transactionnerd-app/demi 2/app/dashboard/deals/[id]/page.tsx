import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { StageTag, Tag, Avatar, ProgressBar } from "@/components/ui";
import { formatDate, formatShort, daysUntil } from "@/lib/utils/dates";
import DealTabs from "./DealTabs";

export default async function DealDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: deal } = await supabase
    .from("deals")
    .select("*, agent:users!deals_agent_id_fkey(*), tc:users!deals_tc_id_fkey(*), brokerage:brokerages(*)")
    .eq("id", params.id)
    .single() as any;

  if (!deal) notFound();

  const { count: total } = await supabase.from("tasks").select("id", { count: "exact", head: true }).eq("deal_id", deal.id);
  const { count: done } = await supabase.from("tasks").select("id", { count: "exact", head: true }).eq("deal_id", deal.id).not("completed_at", "is", null);
  const pct = total ? Math.round(((done ?? 0) / total) * 100) : 0;
  const days = daysUntil(deal.close_date);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Breadcrumb + header */}
      <div style={{ padding: "8px 16px 0", flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>
          <Link href="/dashboard/deals" style={{ color: "var(--teal)" }}>All deals</Link>
          {" "}→ {deal.address}
        </div>
      </div>

      {/* Deal header card */}
      <div style={{ margin: "0 16px 10px", background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, padding: "12px 14px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 5 }}>
              {deal.mls_number && <span style={{ fontSize: 9, fontFamily: "monospace", color: "var(--dim)" }}>{deal.mls_number}</span>}
              <StageTag stage={deal.stage} />
              <Tag label={deal.side.toUpperCase()} color="muted" />
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4, lineHeight: 1.2 }}>
              {deal.address}{deal.city ? `, ${deal.city}` : ""}
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {deal.tc && (
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Avatar name={deal.tc.full_name} size={18} url={deal.tc.avatar_url} />
                  <span style={{ fontSize: 10, color: "var(--muted)" }}>TC: <span style={{ color: "var(--text)" }}>{deal.tc.full_name}</span></span>
                </div>
              )}
              {deal.agent && (
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Avatar name={deal.agent.full_name} size={18} url={deal.agent.avatar_url} />
                  <span style={{ fontSize: 10, color: "var(--muted)" }}>Agent: <span style={{ color: "var(--text)" }}>{deal.agent.full_name}</span></span>
                </div>
              )}
              {deal.sale_price && <span style={{ fontSize: 10, color: "var(--muted)" }}>Price: <span style={{ color: "var(--text)", fontFamily: "monospace" }}>${Number(deal.sale_price).toLocaleString()}</span></span>}
              {deal.close_date && <span style={{ fontSize: 10, color: days <= 3 ? "var(--rose)" : days <= 7 ? "var(--amber)" : "var(--muted)" }}>
                Closing: <span style={{ fontFamily: "monospace" }}>{formatDate(deal.close_date, "MMM d, yyyy")}</span>
                {days >= 0 && days <= 14 && <span style={{ marginLeft: 4 }}>({days === 0 ? "today" : `${days}d`})</span>}
              </span>}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: "var(--muted)" }}>Closing progress — {done ?? 0}/{total ?? 0} tasks</span>
            <span style={{ fontSize: 9, fontFamily: "monospace", color: "var(--teal)" }}>{pct}%</span>
          </div>
          <ProgressBar pct={pct} height={5} />
        </div>
      </div>

      {/* 6-tab workspace */}
      <div style={{ flex: 1, overflow: "hidden", margin: "0 16px 14px" }}>
        <DealTabs deal={deal} />
      </div>
    </div>
  );
}

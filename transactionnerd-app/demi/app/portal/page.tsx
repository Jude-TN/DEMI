import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { StageTag, Tag, StatCard, ProgressBar } from "@/components/ui";
import Topbar from "@/components/layout/Topbar";
import { formatDateShort, daysUntil } from "@/lib/utils/dates";

export default async function PortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("users").select("*").eq("id", user!.id).single();

  const { data: deals } = await supabase
    .from("deals")
    .select("*, tc:users!deals_tc_id_fkey(full_name, avatar_url, phone, email)")
    .eq("agent_id", user!.id)
    .neq("stage", "cancelled")
    .order("close_date", { ascending: true, nullsFirst: false }) as any;

  const active = (deals ?? []).filter((d: any) => !["closed", "cancelled"].includes(d.stage));
  const closed = (deals ?? []).filter((d: any) => d.stage === "closed");

  // Subscription badge
  const SUB_LABELS: Record<string, string> = { "elite": "Elite Subscriber", "pro": "Pro Subscriber" };

  // Task progress per deal
  async function getProgress(dealId: string) {
    const { count: total } = await supabase.from("tasks").select("id", { count: "exact", head: true }).eq("deal_id", dealId);
    const { count: done } = await supabase.from("tasks").select("id", { count: "exact", head: true }).eq("deal_id", dealId).eq("status", "completed");
    return total ? Math.round(((done ?? 0) / total) * 100) : 0;
  }

  return (
    <>
      <Topbar
        title="My deals"
        actions={
          <Link href="/portal/new" style={{ textDecoration: "none" }}>
            <div style={{ background: "var(--teal)", color: "#0a1412", borderRadius: 6, padding: "6px 13px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>⬆ Submit a contract</div>
          </Link>
        }
      />
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
          <StatCard label="Active deals" value={active.length} sub="In progress" />
          <StatCard label="Closed (90d)" value={closed.filter((d: any) => d.closed_at && new Date(d.closed_at) > new Date(Date.now() - 90 * 86400000)).length} sub="Last quarter" />
          <StatCard label="Total transactions" value={(deals ?? []).length} sub="With TransactionNerd" />
          <div style={{ background: "var(--amber-d)", border: "1px solid var(--amber-b)", borderRadius: 8, padding: "10px 13px" }}>
            <div style={{ fontSize: 9, color: "var(--amber)", marginBottom: 3 }}>Subscription</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--amber)" }}>Elite</div>
            <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 2 }}>$350 per C2C · $35 offers</div>
          </div>
        </div>

        {/* Active deals */}
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Active transactions</div>
        {active.length === 0 && (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
            No active deals. <Link href="/portal/new" style={{ color: "var(--teal)" }}>Submit a contract →</Link>
          </div>
        )}
        {await Promise.all(active.map(async (deal: any) => {
          const pct = await getProgress(deal.id);
          const days = daysUntil(deal.close_date);
          const pulse = days <= 5 ? "var(--rose)" : days <= 14 ? "var(--amber)" : "transparent";
          return (
            <Link key={deal.id} href={`/portal/deals/${deal.id}`} style={{ textDecoration: "none" }}>
              <div style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderLeft: `2px solid ${pulse}`, borderRadius: 8, padding: "11px 14px", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 8, fontFamily: "monospace", color: "var(--dim)" }}>{deal.mls_number ?? "—"}</span>
                      <StageTag stage={deal.stage} />
                      <Tag label={deal.side.toUpperCase()} color="muted" />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{deal.address}</div>
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>
                      TC: <span style={{ color: "var(--text)" }}>{deal.tc?.full_name ?? "Unassigned"}</span>
                      {deal.sale_price && <> &nbsp;·&nbsp; <span style={{ fontFamily: "monospace" }}>${Number(deal.sale_price).toLocaleString()}</span></>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {deal.close_date && <>
                      <div style={{ fontSize: 11, fontWeight: 600, fontFamily: "monospace", color: days <= 5 ? "var(--rose)" : days <= 14 ? "var(--amber)" : "var(--muted)" }}>{formatDateShort(deal.close_date)}</div>
                      <div style={{ fontSize: 9, color: "var(--dim)" }}>{days === 0 ? "Closing today" : days < 0 ? `${Math.abs(days)}d ago` : `${days}d away`}</div>
                    </>}
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 9, color: "var(--muted)" }}>Closing progress</span>
                    <span style={{ fontSize: 9, fontFamily: "monospace", color: "var(--teal)" }}>{pct}%</span>
                  </div>
                  <ProgressBar pct={pct} />
                </div>
              </div>
            </Link>
          );
        }))}

        {/* Closed */}
        {closed.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", margin: "16px 0 8px" }}>Closed</div>
            {closed.slice(0, 5).map((deal: any) => (
              <Link key={deal.id} href={`/portal/deals/${deal.id}`} style={{ textDecoration: "none" }}>
                <div style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, padding: "9px 14px", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>{deal.address}</div>
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>{formatDateShort(deal.closed_at)} · {deal.tc?.full_name ?? "—"}</div>
                  </div>
                  <Tag label="Closed" color="teal" />
                  {deal.sale_price && <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--muted)" }}>${Number(deal.sale_price).toLocaleString()}</div>}
                </div>
              </Link>
            ))}
          </>
        )}
      </div>
    </>
  );
}

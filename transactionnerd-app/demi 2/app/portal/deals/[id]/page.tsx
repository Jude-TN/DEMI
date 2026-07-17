import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { StageTag, Tag, Avatar, ProgressBar } from "@/components/ui";
import { formatDate, formatShort, daysUntil } from "@/lib/utils/dates";

export default async function PortalDealPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: deal } = await supabase.from("deals")
    .select("*, tc:users!deals_tc_id_fkey(*), brokerage:brokerages(*)")
    .eq("id", params.id)
    .eq("agent_id", user!.id) // agents can only view their own
    .single() as any;

  if (!deal) notFound();

  const { count: total } = await supabase.from("tasks").select("id",{count:"exact",head:true}).eq("deal_id",deal.id);
  const { count: done } = await supabase.from("tasks").select("id",{count:"exact",head:true}).eq("deal_id",deal.id).not("completed_at","is",null);
  const { data: tasks } = await supabase.from("tasks").select("*, assignee:users!tasks_assignee_id_fkey(full_name)").eq("deal_id",deal.id).order("sort_order");
  const { data: docs } = await supabase.from("documents").select("*").eq("deal_id",deal.id).order("created_at",{ascending:false});
  const pct = total ? Math.round(((done ?? 0) / total) * 100) : 0;
  const days = daysUntil(deal.close_date);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>
        <Link href="/portal" style={{ color: "var(--teal)" }}>My deals</Link> → {deal.address}
      </div>

      {/* Header */}
      <div style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
          <StageTag stage={deal.stage} />
          <Tag label={deal.side.toUpperCase()} color="muted" />
          {deal.mls_number && <span style={{ fontSize: 9, fontFamily: "monospace", color: "var(--dim)" }}>MLS {deal.mls_number}</span>}
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{deal.address}</div>
        {deal.sale_price && <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Sale price: <span style={{ color: "var(--text)", fontFamily: "monospace" }}>${Number(deal.sale_price).toLocaleString()}</span></div>}
        <div style={{ display: "flex", justify: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 9, color: "var(--muted)" }}>Closing progress — {done ?? 0}/{total ?? 0} tasks</span>
          <span style={{ fontSize: 9, fontFamily: "monospace", color: "var(--teal)" }}>{pct}%</span>
        </div>
        <ProgressBar pct={pct} height={5} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 12, alignItems: "start" }}>
        {/* Tasks (read-only) */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>Closing checklist</div>
          {(tasks ?? []).length === 0 && <div style={{ fontSize: 12, color: "var(--muted)", padding: "20px 0" }}>No tasks yet</div>}
          {(tasks ?? []).map((t: any) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 5, padding: "7px 9px", marginBottom: 4 }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${t.completed_at ? "var(--teal)" : "var(--bdrs)"}`, background: t.completed_at ? "var(--teal)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#0a1412", flexShrink: 0 }}>
                {t.completed_at && "✓"}
              </div>
              <span style={{ flex: 1, fontSize: 11, color: t.completed_at ? "var(--dim)" : "var(--text)", textDecoration: t.completed_at ? "line-through" : "none" }}>{t.label}</span>
              {t.due_date && <span style={{ fontSize: 9, fontFamily: "monospace", color: "var(--dim)", whiteSpace: "nowrap" }}>{formatShort(t.due_date)}</span>}
            </div>
          ))}

          {/* Documents */}
          <div style={{ fontSize: 11, fontWeight: 600, margin: "16px 0 8px" }}>Documents</div>
          {(docs ?? []).length === 0 && <div style={{ fontSize: 12, color: "var(--muted)" }}>No documents yet</div>}
          {(docs ?? []).map((d: any) => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 5, padding: "7px 9px", marginBottom: 4 }}>
              <span style={{ fontSize: 14 }}>{d.status === "missing" ? "🚫" : "📄"}</span>
              <span style={{ flex: 1, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
              <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: d.status === "executed" ? "var(--teal-d)" : d.status === "missing" ? "var(--rose-d)" : "var(--card)", color: d.status === "executed" ? "var(--teal)" : d.status === "missing" ? "var(--rose)" : "var(--muted)", fontFamily: "monospace", fontWeight: 700 }}>{d.status}</span>
            </div>
          ))}
        </div>

        {/* Sidebar: TC info + key dates */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {deal.tc && (
            <div style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, padding: "11px 13px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--dim)", letterSpacing: .6, textTransform: "uppercase" as const, fontFamily: "monospace", marginBottom: 9 }}>Your TC</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Avatar name={deal.tc.full_name} size={32} url={deal.tc.avatar_url} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{deal.tc.full_name}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)" }}>{deal.tc.tc_company ?? "Transaction Coordinator"}</div>
                </div>
              </div>
              {deal.tc.email && <a href={`mailto:${deal.tc.email}`} style={{ display: "block", fontSize: 11, color: "var(--teal)", marginBottom: 4 }}>{deal.tc.email}</a>}
              {deal.tc.phone && <div style={{ fontSize: 11, color: "var(--muted)" }}>{deal.tc.phone}</div>}
            </div>
          )}
          <div style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, padding: "11px 13px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--dim)", letterSpacing: .6, textTransform: "uppercase" as const, fontFamily: "monospace", marginBottom: 9 }}>Key dates</div>
            {[
              { label: "Effective date", value: deal.effective_date },
              { label: "Close date", value: deal.close_date },
            ].map(({ label, value }) => (
              <div key={label} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9, color: "var(--muted)" }}>{label}</div>
                <div style={{ fontSize: 12, fontWeight: 500, fontFamily: "monospace" }}>{value ? formatDate(value, "MMM d, yyyy") : "—"}</div>
              </div>
            ))}
            {deal.close_date && days >= 0 && (
              <div style={{ fontSize: 11, color: days <= 3 ? "var(--rose)" : days <= 7 ? "var(--amber)" : "var(--teal)", marginTop: 4 }}>
                {days === 0 ? "Closing today" : `${days} day${days !== 1 ? "s" : ""} until closing`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

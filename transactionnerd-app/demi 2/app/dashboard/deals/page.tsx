"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { StageTag, Tag, Avatar } from "@/components/ui";
import Topbar from "@/components/layout/Topbar";
import type { Deal, DealStage } from "@/types";
import { formatShort, daysUntil } from "@/lib/utils/dates";

const STAGE_PILLS: { key: DealStage | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "lead", label: "Lead" },
  { key: "listing", label: "Listing" },
  { key: "under_contract", label: "Under Contract" },
  { key: "clear_to_close", label: "Clear to Close" },
  { key: "closed", label: "Closed" },
];

export default function DealsPage() {
  const [deals, setDeals] = useState<(Deal & { agent?: any; tc?: any })[]>([]);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<DealStage | "all">("all");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("deals")
      .select("*, agent:users!deals_agent_id_fkey(id,full_name,avatar_url), tc:users!deals_tc_id_fkey(id,full_name,avatar_url)")
      .is("archived_at", null)
      .order("created_at", { ascending: false });
    if (stage !== "all") q = q.eq("stage", stage);
    const { data } = await q;
    setDeals(data ?? []);
    setLoading(false);
  }, [supabase, stage]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? deals.filter(d =>
        d.address.toLowerCase().includes(search.toLowerCase()) ||
        d.city.toLowerCase().includes(search.toLowerCase()) ||
        d.mls_number?.toLowerCase().includes(search.toLowerCase()))
    : deals;

  return (
    <>
      <Topbar
        title="All deals"
        search={{ placeholder: "Search address or MLS…", value: search, onChange: setSearch }}
        actions={
          <Link href="/dashboard/deals/new">
            <div style={{ background: "var(--teal)", color: "#0a1412", borderRadius: 6, padding: "6px 13px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>+ New deal</div>
          </Link>
        }
      />
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px" }}>
        {/* Stage pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {STAGE_PILLS.map(p => (
            <button key={p.key} onClick={() => setStage(p.key)}
              style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 500, border: "1px solid var(--bdrs)", cursor: "pointer", fontFamily: "inherit", background: stage === p.key ? "var(--teal-d)" : "transparent", color: stage === p.key ? "var(--teal)" : "var(--muted)", borderColor: stage === p.key ? "var(--teal-b)" : "var(--bdrs)" }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(200px,2fr) 130px 110px 110px 90px 100px", padding: "7px 13px", borderBottom: "1px solid var(--bdr)" }}>
            {["Property", "Stage", "TC", "Agent", "Close date", "Price"].map(h => (
              <div key={h} style={{ fontSize: 9, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.6 }}>{h}</div>
            ))}
          </div>

          {loading && <div style={{ padding: "32px", textAlign: "center", color: "var(--muted)", fontSize: 12 }}>Loading…</div>}
          {!loading && filtered.length === 0 && <div style={{ padding: "48px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No deals found</div>}

          {filtered.map(deal => {
            const days = daysUntil(deal.close_date);
            return (
              <Link key={deal.id} href={`/dashboard/deals/${deal.id}`}>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(200px,2fr) 130px 110px 110px 90px 100px", padding: "9px 13px", borderBottom: "1px solid var(--bdr)", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deal.address}</div>
                    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                      {deal.mls_number && <span style={{ fontSize: 9, color: "var(--dim)", fontFamily: "monospace" }}>MLS {deal.mls_number}</span>}
                      <Tag label={deal.side.toUpperCase()} color="muted" size={8} />
                    </div>
                  </div>
                  <StageTag stage={deal.stage} />
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {deal.tc ? <><Avatar name={deal.tc.full_name} size={18} url={deal.tc.avatar_url} /><span style={{ fontSize: 10, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deal.tc.full_name.split(" ")[0]}</span></> : <span style={{ fontSize: 10, color: "var(--dim)" }}>—</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {deal.agent ? <><Avatar name={deal.agent.full_name} size={18} url={deal.agent.avatar_url} /><span style={{ fontSize: 10, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deal.agent.full_name.split(" ")[0]}</span></> : <span style={{ fontSize: 10, color: "var(--dim)" }}>—</span>}
                  </div>
                  <span style={{ fontSize: 10, fontFamily: "monospace", color: deal.close_date && days <= 3 ? "var(--rose)" : "var(--muted)" }}>
                    {deal.close_date ? formatShort(deal.close_date) : "—"}
                  </span>
                  <span style={{ fontSize: 10, fontFamily: "monospace" }}>
                    {deal.sale_price ? `$${Number(deal.sale_price).toLocaleString()}` : "—"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

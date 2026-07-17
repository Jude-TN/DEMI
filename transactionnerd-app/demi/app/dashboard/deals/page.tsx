"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { StageTag, Tag, Avatar, Btn } from "@/components/ui";
import Topbar from "@/components/layout/Topbar";
import type { Deal, DealStage, DealSide } from "@/types";
import { formatDateShort, daysUntil } from "@/lib/utils/dates";

export default function DealsPage() {
  const [deals, setDeals] = useState<(Deal & { agent?: any; tc?: any })[]>([]);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<DealStage | "all">("all");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("users").select("brokerage_id").eq("id", user!.id).single();
    let q = supabase.from("deals")
      .select("*, agent:users!deals_agent_id_fkey(full_name,avatar_url), tc:users!deals_tc_id_fkey(full_name,avatar_url)")
      .eq("brokerage_id", profile!.brokerage_id)
      .order("created_at", { ascending: false });
    if (stageFilter !== "all") q = q.eq("stage", stageFilter);
    const { data } = await q;
    setDeals(data ?? []);
    setLoading(false);
  }, [supabase, stageFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? deals.filter(d => d.address.toLowerCase().includes(search.toLowerCase()) || d.mls_number?.toLowerCase().includes(search.toLowerCase()))
    : deals;

  const STAGES = ["all", "lead", "listing", "under_contract", "clear_to_close", "closed", "cancelled"] as const;
  const STAGE_LABELS: Record<string, string> = {
    all: "All", lead: "Lead", listing: "Listing", under_contract: "Under Contract",
    clear_to_close: "CTC", closed: "Closed", cancelled: "Cancelled",
  };

  return (
    <>
      <Topbar
        title="All deals"
        search={{ placeholder: "Search by address or MLS…", value: search, onChange: setSearch }}
        actions={
          <Link href="/dashboard/deals/new" style={{ textDecoration: "none" }}>
            <div style={{ background: "var(--teal)", color: "#0a1412", borderRadius: 6, padding: "6px 13px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ New deal</div>
          </Link>
        }
      />
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {/* Stage filter pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {STAGES.map(s => (
            <button
              key={s}
              onClick={() => setStageFilter(s as DealStage | "all")}
              style={{
                padding: "4px 11px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                border: "1px solid var(--bdrs)", cursor: "pointer", fontFamily: "inherit",
                background: stageFilter === s ? "var(--teal-d)" : "transparent",
                color: stageFilter === s ? "var(--teal)" : "var(--muted)",
                borderColor: stageFilter === s ? "var(--teal-b)" : "var(--bdrs)",
              }}
            >{STAGE_LABELS[s]}</button>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 100px 100px 100px 80px", gap: 0, padding: "8px 14px", borderBottom: "1px solid var(--bdr)" }}>
            {["Property", "Stage", "TC", "Agent", "Close date", "Price"].map(h => (
              <div key={h} style={{ fontSize: 9, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.6 }}>{h}</div>
            ))}
          </div>
          {loading && <div style={{ padding: "24px", textAlign: "center", color: "var(--muted)", fontSize: 12 }}>Loading…</div>}
          {!loading && filtered.length === 0 && <div style={{ padding: "36px", textAlign: "center", color: "var(--muted)", fontSize: 12 }}>No deals found</div>}
          {!loading && filtered.map(deal => {
            const days = daysUntil(deal.close_date);
            return (
              <Link key={deal.id} href={`/dashboard/deals/${deal.id}`} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 100px 100px 100px 80px",
                  gap: 0, padding: "9px 14px", borderBottom: "1px solid var(--bdr)",
                  alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", marginBottom: 1 }}>{deal.address}</div>
                    {deal.mls_number && <div style={{ fontSize: 10, color: "var(--dim)", fontFamily: "monospace" }}>MLS {deal.mls_number}</div>}
                  </div>
                  <StageTag stage={deal.stage} />
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {deal.tc ? <><Avatar name={deal.tc.full_name} size={18} url={deal.tc.avatar_url} /><span style={{ fontSize: 10, color: "var(--muted)" }}>{deal.tc.full_name.split(" ")[0]}</span></> : <span style={{ fontSize: 10, color: "var(--dim)" }}>Unassigned</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {deal.agent ? <><Avatar name={deal.agent.full_name} size={18} url={deal.agent.avatar_url} /><span style={{ fontSize: 10, color: "var(--muted)" }}>{deal.agent.full_name.split(" ")[0]}</span></> : <span style={{ fontSize: 10, color: "var(--dim)" }}>—</span>}
                  </div>
                  <div style={{ fontSize: 10, fontFamily: "monospace", color: deal.close_date && days <= 3 ? "var(--rose)" : "var(--muted)" }}>
                    {deal.close_date ? formatDateShort(deal.close_date) : "—"}
                  </div>
                  <div style={{ fontSize: 10, fontFamily: "monospace", color: "var(--text)" }}>
                    {deal.sale_price ? `$${deal.sale_price.toLocaleString()}` : "—"}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

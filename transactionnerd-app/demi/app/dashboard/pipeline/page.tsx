"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { StageTag, Tag, Avatar, ProgressBar } from "@/components/ui";
import Topbar from "@/components/layout/Topbar";
import Link from "next/link";
import type { Deal, DealStage } from "@/types";
import { formatDateShort, daysUntil } from "@/lib/utils/dates";

const STAGES: { key: DealStage; label: string }[] = [
  { key: "lead",           label: "Lead" },
  { key: "listing",        label: "Listing" },
  { key: "under_contract", label: "Under Contract" },
  { key: "clear_to_close", label: "Clear to Close" },
  { key: "closed",         label: "Closed" },
];

const PULSE: Partial<Record<DealStage, string>> = {
  clear_to_close: "var(--amber)",
  closed:         "var(--teal)",
};

export default function PipelinePage() {
  const [deals, setDeals] = useState<(Deal & { agent?: any; tc?: any })[]>([]);
  const [search, setSearch] = useState("");
  const [brokId, setBrokId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("users").select("brokerage_id").eq("id", user.id).single();
    if (!profile?.brokerage_id) return;
    setBrokId(profile.brokerage_id);
    const { data } = await supabase
      .from("deals")
      .select("*, agent:users!deals_agent_id_fkey(full_name,avatar_url), tc:users!deals_tc_id_fkey(full_name,avatar_url)")
      .eq("brokerage_id", profile.brokerage_id)
      .neq("stage", "cancelled")
      .order("close_date", { ascending: true, nullsFirst: false });
    setDeals(data ?? []);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function moveStage(dealId: string, newStage: DealStage) {
    const update: any = { stage: newStage };
    if (newStage === "closed") update.closed_at = new Date().toISOString();
    await supabase.from("deals").update(update).eq("id", dealId);
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage, ...(newStage === "closed" ? { closed_at: new Date().toISOString() } : {}) } : d));
  }

  const filtered = search
    ? deals.filter(d => d.address.toLowerCase().includes(search.toLowerCase()) || d.mls_number?.includes(search))
    : deals;

  return (
    <>
      <Topbar
        title="Pipeline"
        search={{ placeholder: "Search deals…", value: search, onChange: setSearch }}
        actions={
          <Link href="/dashboard/deals/new" style={{ textDecoration: "none" }}>
            <div style={{ background: "var(--teal)", color: "#0a1412", borderRadius: 6, padding: "6px 13px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>+ New deal</div>
          </Link>
        }
      />
      <div style={{ flex: 1, overflowX: "auto", padding: "12px 14px" }}>
        <div style={{ display: "flex", gap: 10, minWidth: 900 }}>
          {STAGES.map(stage => {
            const col = filtered.filter(d => d.stage === stage.key);
            return (
              <div
                key={stage.key}
                style={{ flex: 1, minWidth: 180, background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, overflow: "hidden" }}
                onDragOver={e => { e.preventDefault(); }}
                onDrop={e => { e.preventDefault(); if (dragging) moveStage(dragging, stage.key); setDragging(null); }}
              >
                <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)" }}>{stage.label}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "monospace", background: "rgba(255,255,255,0.06)", color: "var(--muted)", padding: "1px 5px", borderRadius: 8 }}>{col.length}</span>
                </div>
                <div style={{ padding: 6, minHeight: 100 }}>
                  {col.map(deal => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      onDragStart={() => setDragging(deal.id)}
                      onDragEnd={() => setDragging(null)}
                    />
                  ))}
                  {col.length === 0 && (
                    <div style={{ padding: "16px 8px", textAlign: "center", fontSize: 11, color: "var(--dim)" }}>Drop here</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function DealCard({ deal, onDragStart, onDragEnd }: { deal: Deal & { agent?: any; tc?: any }; onDragStart: () => void; onDragEnd: () => void }) {
  const days = daysUntil(deal.close_date);
  const pulse = PULSE[deal.stage] ??
    (deal.close_date && days <= 5 ? "var(--rose)" : "transparent");

  return (
    <Link href={`/dashboard/deals/${deal.id}`} style={{ textDecoration: "none" }}>
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        style={{
          background: "var(--card)", border: "1px solid var(--bdr)",
          borderLeft: `2px solid ${pulse}`,
          borderRadius: 5, padding: "7px 8px", marginBottom: 5, cursor: "grab",
        }}
      >
        <div style={{ fontSize: 8, fontFamily: "monospace", color: "var(--dim)", marginBottom: 2 }}>
          {deal.mls_number ?? "—"}
        </div>
        <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text)", marginBottom: 4, lineHeight: 1.3 }}>
          {deal.address}
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 5 }}>
          <Tag label={deal.side.toUpperCase()} color="muted" size={8} />
          {deal.sale_price && (
            <Tag label={`$${Math.round(deal.sale_price / 1000)}k`} color="teal" size={8} />
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {deal.tc && <Avatar name={deal.tc.full_name} size={14} url={deal.tc.avatar_url} />}
            {deal.tc && <span style={{ fontSize: 9, color: "var(--muted)" }}>{deal.tc.full_name.split(" ")[0]}</span>}
          </div>
          {deal.close_date && (
            <span style={{ fontSize: 9, color: days <= 5 ? "var(--rose)" : "var(--dim)", fontFamily: "monospace" }}>
              {formatDateShort(deal.close_date)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

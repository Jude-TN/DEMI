"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { StageTag, Tag, Avatar, ProgressBar, Modal, Btn } from "@/components/ui";
import Topbar from "@/components/layout/Topbar";
import type { Deal, DealStage } from "@/types";
import { formatShort, daysUntil } from "@/lib/utils/dates";

const STAGES: { key: DealStage; label: string; color: string }[] = [
  { key: "lead",           label: "Lead",            color: "var(--muted)" },
  { key: "listing",        label: "Listing",         color: "var(--blue)" },
  { key: "under_contract", label: "Under Contract",  color: "var(--teal)" },
  { key: "clear_to_close", label: "Clear to Close",  color: "var(--amber)" },
  { key: "closed",         label: "Closed",          color: "var(--teal)" },
];

export default function PipelinePage() {
  const [deals, setDeals] = useState<(Deal & { agent?: any; tc?: any })[]>([]);
  const [search, setSearch] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ dealId: string; from: DealStage; to: DealStage } | null>(null);
  const [moving, setMoving] = useState(false);
  const [taskWarning, setTaskWarning] = useState(0);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data } = await supabase.from("deals")
      .select("*, agent:users!deals_agent_id_fkey(id,full_name,avatar_url), tc:users!deals_tc_id_fkey(id,full_name,avatar_url)")
      .is("archived_at", null)
      .order("close_date", { ascending: true, nullsFirst: false });
    setDeals(data ?? []);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function initiateMove(dealId: string, newStage: DealStage) {
    const deal = deals.find(d => d.id === dealId);
    if (!deal || deal.stage === newStage) return;

    // Check for incomplete tasks before confirming
    const { count } = await supabase.from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("deal_id", dealId)
      .is("completed_at", null);

    setTaskWarning(count ?? 0);
    setConfirm({ dealId, from: deal.stage, to: newStage });
  }

  async function confirmMove() {
    if (!confirm) return;
    setMoving(true);
    const update: any = { stage: confirm.to };
    if (confirm.to === "closed") update.closed_at = new Date().toISOString();
    await fetch(`/api/deals/${confirm.dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    setDeals(prev => prev.map(d => d.id === confirm.dealId ? { ...d, stage: confirm.to } : d));
    setConfirm(null);
    setMoving(false);
  }

  const filtered = search
    ? deals.filter(d => d.address.toLowerCase().includes(search.toLowerCase()) || d.mls_number?.includes(search))
    : deals;

  const STAGE_LABELS: Record<DealStage, string> = { lead: "Lead", listing: "Listing", under_contract: "Under Contract", clear_to_close: "Clear to Close", closed: "Closed" };

  return (
    <>
      <Topbar
        title="Pipeline"
        search={{ placeholder: "Search deals…", value: search, onChange: setSearch }}
        actions={
          <Link href="/dashboard/deals/new">
            <div style={{ background: "var(--teal)", color: "#0a1412", borderRadius: 6, padding: "6px 13px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>+ New deal</div>
          </Link>
        }
      />
      <div style={{ flex: 1, overflowX: "auto", overflowY: "hidden", padding: "12px 14px" }}>
        <div style={{ display: "flex", gap: 10, height: "100%", minWidth: 900 }}>
          {STAGES.map(stage => {
            const col = filtered.filter(d => d.stage === stage.key);
            return (
              <div
                key={stage.key}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); if (dragging) initiateMove(dragging, stage.key); setDragging(null); }}
                style={{ flex: 1, minWidth: 170, background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, display: "flex", flexDirection: "column", overflow: "hidden" }}
              >
                <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: stage.color }}>{stage.label}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "monospace", background: "rgba(255,255,255,0.06)", color: "var(--muted)", padding: "1px 5px", borderRadius: 8 }}>{col.length}</span>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: 6 }}>
                  {col.map(deal => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      onDragStart={() => setDragging(deal.id)}
                      onDragEnd={() => setDragging(null)}
                    />
                  ))}
                  {col.length === 0 && (
                    <div style={{ padding: "20px 8px", textAlign: "center", fontSize: 10, color: "var(--dim)" }}>Drop here</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage change confirm modal */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Move deal" width={400}>
        {confirm && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 13, color: "var(--text)" }}>
              Move <strong>{deals.find(d => d.id === confirm.dealId)?.address}</strong> from{" "}
              <strong>{STAGE_LABELS[confirm.from]}</strong> to <strong>{STAGE_LABELS[confirm.to]}</strong>?
            </p>
            {taskWarning > 0 && (
              <div style={{ background: "var(--amber-d)", border: "1px solid var(--amber-b)", borderRadius: 6, padding: "9px 12px", fontSize: 12, color: "var(--amber)" }}>
                ⚠️ {taskWarning} incomplete task{taskWarning !== 1 ? "s" : ""} on this deal. You can still move it — tasks won't be auto-completed.
              </div>
            )}
            {confirm.to === "closed" && (
              <div style={{ background: "var(--teal-d)", border: "1px solid var(--teal-b)", borderRadius: 6, padding: "9px 12px", fontSize: 12, color: "var(--teal)" }}>
                🎉 Moving to Closed will archive the deal and notify all parties.
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="primary" onClick={confirmMove} loading={moving}>Confirm move</Btn>
              <Btn variant="ghost" onClick={() => setConfirm(null)}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function DealCard({ deal, onDragStart, onDragEnd }: { deal: Deal & { agent?: any; tc?: any }; onDragStart: () => void; onDragEnd: () => void }) {
  const days = daysUntil(deal.close_date);
  const pulse = days <= 3 ? "var(--rose)" : days <= 7 ? "var(--amber)" : deal.stage === "closed" ? "var(--teal)" : "transparent";

  return (
    <Link href={`/dashboard/deals/${deal.id}`}>
      <div
        draggable
        onDragStart={e => { e.stopPropagation(); onDragStart(); }}
        onDragEnd={onDragEnd}
        onClick={e => e.stopPropagation()}
        style={{ background: "var(--card)", border: "1px solid var(--bdr)", borderLeft: `2px solid ${pulse}`, borderRadius: 5, padding: "7px 8px", marginBottom: 5, cursor: "grab" }}
      >
        <div style={{ fontSize: 8, fontFamily: "monospace", color: "var(--dim)", marginBottom: 2 }}>{deal.mls_number ?? "—"}</div>
        <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, lineHeight: 1.3 }}>{deal.address}</div>
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 5 }}>
          <Tag label={deal.side.toUpperCase()} color="muted" size={8} />
          {deal.sale_price && <Tag label={`${Number(deal.sale_price).toLocaleString("en-US")}`} color="teal" size={8} />}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {deal.tc && <Avatar name={deal.tc.full_name} size={14} url={deal.tc.avatar_url} />}
            {deal.tc && <span style={{ fontSize: 9, color: "var(--muted)" }}>{deal.tc.full_name.split(" ")[0]}</span>}
          </div>
          {deal.close_date && (
            <span style={{ fontSize: 9, color: days <= 3 ? "var(--rose)" : days <= 7 ? "var(--amber)" : "var(--dim)", fontFamily: "monospace" }}>
              {formatShort(deal.close_date)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

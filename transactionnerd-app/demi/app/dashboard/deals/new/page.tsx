"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Btn, Field, TCPickerCard, ErrorBanner, Tag } from "@/components/ui";
import Topbar from "@/components/layout/Topbar";
import type { TCCapacityResponse, ChecklistTemplate } from "@/types";
import { createClient } from "@/lib/supabase/client";

export default function NewDealPage() {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tcs, setTcs] = useState<TCCapacityResponse[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    address: "", city: "", mls_number: "", sale_price: "",
    side: "buyer", stage: "under_contract",
    close_date: "", effective_date: "",
    tc_id: "", checklist_template_id: "", notes: "",
  });

  useEffect(() => {
    async function boot() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMyId(user.id);

      // Load available TCs (with capacity)
      const res = await fetch("/api/tc/available");
      if (res.ok) {
        const data: TCCapacityResponse[] = await res.json();
        setTcs(data);
      }

      // Load checklist templates
      const { data: tmpls } = await supabase.from("checklist_templates")
        .select("*")
        .order("name");
      setTemplates(tmpls ?? []);

      // Pre-select TC via routing suggest
      const suggestRes = await fetch(`/api/routing-rules/suggest/${user.id}`);
      if (suggestRes.ok) {
        const suggested = await suggestRes.json();
        if (suggested?.user_id) setForm(f => ({ ...f, tc_id: suggested.user_id }));
      }

      // Auto-select default template matching buyer side
      const buyerDefault = (tmpls ?? []).find((t: any) => t.side === "buyer" && t.is_default);
      if (buyerDefault) setForm(f => ({ ...f, checklist_template_id: buyerDefault.id }));
    }
    boot();
  }, []);

  // Update template suggestion when side changes
  useEffect(() => {
    if (!templates.length) return;
    const match = templates.find(t => (t.side === form.side || t.side === null) && t.is_default);
    if (match) setForm(f => ({ ...f, checklist_template_id: match.id }));
  }, [form.side, templates]);

  function set(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.address) { setError("Address is required."); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, agent_id: myId, sale_price: form.sale_price ? parseFloat(form.sale_price.replace(/,/g, "")) : null }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed to create deal."); setSaving(false); return; }
    const deal = await res.json();
    router.push(`/dashboard/deals/${deal.id}`);
  }

  const selectedTC = tcs.find(t => t.user_id === form.tc_id);
  const filteredTmpls = templates.filter(t => !t.side || t.side === form.side || t.side === "dual");

  return (
    <>
      <Topbar title="New deal" backHref="/dashboard/deals" backLabel="All deals" />
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        <form onSubmit={submit}>
          <div style={{ maxWidth: 800, display: "grid", gridTemplateColumns: "1fr 320px", gap: 12, alignItems: "start" }}>

            {/* Left column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Panel title="Property">
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  <Field label="Address" required><input value={form.address} onChange={set("address")} placeholder="4821 Chestnut Ave" required /></Field>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 8 }}>
                    <Field label="City"><input value={form.city} onChange={set("city")} placeholder="Naples" /></Field>
                    <Field label="MLS #"><input value={form.mls_number} onChange={set("mls_number")} placeholder="A11421" /></Field>
                  </div>
                </div>
              </Panel>

              <Panel title="Transaction details">
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <Field label="Side"><select value={form.side} onChange={set("side")}><option value="buyer">Buyer</option><option value="seller">Seller</option><option value="dual">Dual</option></select></Field>
                    <Field label="Stage"><select value={form.stage} onChange={set("stage")}><option value="lead">Lead</option><option value="listing">Listing</option><option value="under_contract">Under Contract</option><option value="clear_to_close">Clear to Close</option></select></Field>
                    <Field label="Sale price"><input value={form.sale_price} onChange={set("sale_price")} placeholder="485,000" /></Field>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <Field label="Effective date"><input type="date" value={form.effective_date} onChange={set("effective_date")} /></Field>
                    <Field label="Close date"><input type="date" value={form.close_date} onChange={set("close_date")} /></Field>
                  </div>
                </div>
              </Panel>

              <Panel title="Notes">
                <textarea value={form.notes} onChange={set("notes")} rows={3} placeholder="Special instructions or context…" />
              </Panel>

              <ErrorBanner msg={error} />
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="primary" type="submit" loading={saving}>Create deal</Btn>
                <Btn variant="ghost" type="button" onClick={() => router.back()}>Cancel</Btn>
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Panel title="Assign TC">
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 8 }}>
                  TCs sorted by available capacity. Green = available, amber = near cap, red = at cap.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {tcs.length === 0 && <div style={{ fontSize: 11, color: "var(--dim)" }}>No TCs connected to your team yet.</div>}
                  {tcs.map(tc => (
                    <TCPickerCard key={tc.user_id} tc={tc} selected={form.tc_id === tc.user_id} onClick={() => setForm(f => ({ ...f, tc_id: tc.user_id }))} />
                  ))}
                  <button type="button" onClick={() => setForm(f => ({ ...f, tc_id: "" }))} style={{ fontSize: 10, color: "var(--dim)", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const, padding: "4px 0" }}>
                    ✕ Clear TC selection (assign later)
                  </button>
                </div>
              </Panel>

              <Panel title="Checklist template">
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div onClick={() => setForm(f => ({ ...f, checklist_template_id: "" }))} style={{ background: !form.checklist_template_id ? "var(--teal-d)" : "var(--card)", border: `1px solid ${!form.checklist_template_id ? "var(--teal-b)" : "var(--bdr)"}`, borderRadius: 6, padding: "7px 10px", cursor: "pointer", fontSize: 11, color: "var(--muted)" }}>
                    No template
                  </div>
                  {filteredTmpls.map(t => (
                    <div key={t.id} onClick={() => setForm(f => ({ ...f, checklist_template_id: t.id }))} style={{ background: form.checklist_template_id === t.id ? "var(--teal-d)" : "var(--card)", border: `1px solid ${form.checklist_template_id === t.id ? "var(--teal-b)" : "var(--bdr)"}`, borderRadius: 6, padding: "7px 10px", cursor: "pointer" }}>
                      <div style={{ fontSize: 11, fontWeight: 500 }}>{t.name}</div>
                      {t.is_default && <Tag label="Default" color="teal" size={8} />}
                    </div>
                  ))}
                  {form.checklist_template_id && form.effective_date && (
                    <div style={{ fontSize: 10, color: "var(--sage)", marginTop: 2 }}>✓ Tasks will be auto-generated from the effective date</div>
                  )}
                </div>
              </Panel>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "9px 13px", borderBottom: "1px solid var(--bdr)", fontSize: 12, fontWeight: 600 }}>{title}</div>
      <div style={{ padding: "12px 13px" }}>{children}</div>
    </div>
  );
}

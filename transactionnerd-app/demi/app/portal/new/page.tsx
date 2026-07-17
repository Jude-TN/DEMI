"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Btn, Field, TCPickerCard } from "@/components/ui";
import Topbar from "@/components/layout/Topbar";
import type { TCCapacityResponse } from "@/types";

const SERVICES = [
  { key: "c2c", label: "Contract to Close", price: "$350", full: "$500", elite: true, desc: "Full coordination from executed contract through closing" },
  { key: "listing", label: "Listing Coordination", price: "$250", desc: "MLS input, disclosures, and listing setup" },
  { key: "offer", label: "Write an Offer", price: "$35", full: "$75", elite: true, desc: "Offer preparation and submission" },
];

export default function PortalNewPage() {
  const router = useRouter();
  const [service, setService] = useState("c2c");
  const [tcs, setTcs] = useState<TCCapacityResponse[]>([]);
  const [selectedTC, setSelectedTC] = useState<string | null>(null);
  const [form, setForm] = useState({ address: "", city: "", mls_number: "", sale_price: "", side: "buyer", close_date: "", effective_date: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/tc/available").then(r => r.ok ? r.json() : []).then((data: TCCapacityResponse[]) => {
      setTcs(data);
      // Auto-suggest the recommended TC
      const suggested = data.find(t => t.is_recommended);
      if (suggested) setSelectedTC(suggested.user_id);
    });
  }, []);

  function set(k: string) { return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.address) { setError("Address is required."); return; }
    if (!selectedTC) { setError("Please select a TC."); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, tc_id: selectedTC, sale_price: form.sale_price ? parseFloat(form.sale_price.replace(/,/g, "")) : null }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed to submit."); setSaving(false); return; }
    const deal = await res.json();
    router.push(`/portal/deals/${deal.id}`);
  }

  const svc = SERVICES.find(s => s.key === service);

  return (
    <>
      <Topbar title="Submit a contract" backHref="/portal" backLabel="My deals" />
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        <form onSubmit={submit}>
          <div style={{ maxWidth: 780, display: "grid", gridTemplateColumns: "1fr 280px", gap: 12, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

              {/* Elite banner */}
              <div style={{ background: "var(--amber-d)", border: "1px solid var(--amber-b)", borderRadius: 7, padding: "9px 13px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>⭐</span>
                <span style={{ fontSize: 11, color: "var(--amber)", fontWeight: 500 }}>Elite subscriber discount applied — save $150 on Contract to Close</span>
              </div>

              {/* Service selection */}
              <Panel title="Service">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                  {SERVICES.map(s => (
                    <div key={s.key} onClick={() => setService(s.key)}
                      style={{ background: service === s.key ? "var(--teal-d)" : "var(--card)", border: `1px solid ${service === s.key ? "var(--teal-b)" : "var(--bdr)"}`, borderRadius: 7, padding: "10px 11px", cursor: "pointer" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "monospace", color: service === s.key ? "var(--teal)" : "var(--text)" }}>{s.price}</div>
                      {s.full && <div style={{ fontSize: 9, fontFamily: "monospace", color: "var(--dim)", textDecoration: "line-through" }}>{s.full}</div>}
                      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4, lineHeight: 1.4 }}>{s.desc}</div>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* Property */}
              <Panel title="Property">
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  <Field label="Address" required><input value={form.address} onChange={set("address")} placeholder="4821 Chestnut Ave" required /></Field>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 8 }}>
                    <Field label="City"><input value={form.city} onChange={set("city")} placeholder="Naples" /></Field>
                    <Field label="MLS #"><input value={form.mls_number} onChange={set("mls_number")} /></Field>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <Field label="Side"><select value={form.side} onChange={set("side")}><option value="buyer">Buyer</option><option value="seller">Seller</option><option value="dual">Dual</option></select></Field>
                    <Field label="Sale price"><input value={form.sale_price} onChange={set("sale_price")} placeholder="485,000" /></Field>
                    <Field label="Close date"><input type="date" value={form.close_date} onChange={set("close_date")} /></Field>
                  </div>
                </div>
              </Panel>

              {/* Notes */}
              <Panel title="Special instructions">
                <textarea value={form.notes} onChange={set("notes")} rows={3} placeholder="Anything your TC should know…" />
              </Panel>

              {error && <div style={{ fontSize: 11, color: "var(--rose)", background: "var(--rose-d)", border: "1px solid var(--rose-b)", borderRadius: 6, padding: "8px 12px" }}>{error}</div>}

              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="primary" type="submit" loading={saving}>Submit transaction</Btn>
                <Btn variant="ghost" type="button" onClick={() => router.back()}>Cancel</Btn>
              </div>
            </div>

            {/* Right: TC picker + summary */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Panel title="Select your TC">
                {tcs.length === 0 && <div style={{ fontSize: 11, color: "var(--dim)" }}>No TCs available. Contact TransactionNerd.com.</div>}
                {tcs.map(tc => (
                  <TCPickerCard key={tc.user_id} tc={tc} selected={selectedTC === tc.user_id} onClick={() => setSelectedTC(tc.user_id)} />
                ))}
              </Panel>

              <Panel title="Order summary">
                <div style={{ borderBottom: "1px solid var(--bdr)", paddingBottom: 9, marginBottom: 9 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 5 }}>
                    <span style={{ color: "var(--muted)" }}>{svc?.label}</span>
                    <span style={{ fontFamily: "monospace" }}>{svc?.full ?? svc?.price}</span>
                  </div>
                  {svc?.full && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: "var(--teal)" }}>Elite discount</span>
                      <span style={{ fontFamily: "monospace", color: "var(--teal)" }}>-${parseInt(svc.full.replace(/\D/g, "")) - parseInt(svc.price.replace(/\D/g, ""))}</span>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700 }}>
                  <span>Total</span>
                  <span style={{ fontFamily: "monospace", color: "var(--teal)" }}>{svc?.price}</span>
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

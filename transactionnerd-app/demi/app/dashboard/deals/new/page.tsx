"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Btn, Field } from "@/components/ui";
import Topbar from "@/components/layout/Topbar";
import type { User, DealStage, DealSide, ChecklistTemplate } from "@/types";

export default function NewDealPage() {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tcs, setTcs] = useState<User[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [brokId, setBrokId] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

  const [form, setForm] = useState({
    address: "", unit: "", city: "", state: "FL", zip: "",
    sale_price: "", close_date: "", effective_date: "",
    side: "buyer" as DealSide, stage: "under_contract" as DealStage,
    agent_id: "", tc_id: "", mls_number: "", notes: "",
    template_id: "",
  });

  useEffect(() => {
    async function boot() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMyId(user.id);
      const { data: profile } = await supabase.from("users").select("brokerage_id, role").eq("id", user.id).single();
      if (!profile?.brokerage_id) return;
      setBrokId(profile.brokerage_id);
      const { data: members } = await supabase.from("users").select("*").eq("brokerage_id", profile.brokerage_id);
      setTcs((members ?? []).filter((u: User) => u.role === "tc" || u.role === "admin"));
      setAgents((members ?? []).filter((u: User) => u.role === "agent" || u.role === "admin"));
      const { data: tmpl } = await supabase.from("checklist_templates").select("*").eq("brokerage_id", profile.brokerage_id);
      setTemplates(tmpl ?? []);
      // Pre-select default TC and agent
      const defaultTc = (members ?? []).find((u: User) => u.role === "tc");
      const me = members?.find((u: User) => u.id === user.id);
      setForm(f => ({
        ...f,
        tc_id: defaultTc?.id ?? "",
        agent_id: me?.role === "agent" ? me.id : "",
      }));
    }
    boot();
  }, [supabase]);

  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.address || !brokId) { setError("Address is required."); return; }
    setSaving(true); setError("");

    const { data: deal, error: dealErr } = await supabase.from("deals").insert({
      brokerage_id: brokId,
      address: form.address, unit: form.unit || null,
      city: form.city, state: form.state, zip: form.zip,
      sale_price: form.sale_price ? parseFloat(form.sale_price.replace(/,/g, "")) : null,
      close_date: form.close_date || null,
      effective_date: form.effective_date || null,
      side: form.side, stage: form.stage,
      agent_id: form.agent_id || null,
      tc_id: form.tc_id || null,
      mls_number: form.mls_number || null,
      notes: form.notes || null,
    }).select().single();

    if (dealErr || !deal) { setError(dealErr?.message ?? "Failed to create deal."); setSaving(false); return; }

    // Generate checklist from template
    if (form.template_id) {
      const { data: steps } = await supabase
        .from("checklist_template_steps")
        .select("*")
        .eq("template_id", form.template_id)
        .order("sort_order");

      if (steps && steps.length > 0) {
        const effectiveDate = form.effective_date ? new Date(form.effective_date) : new Date();
        const tasks = steps.map((step: any, i: number) => {
          let dueDate: string | null = null;
          if (step.days_from_effective != null) {
            const d = new Date(effectiveDate);
            d.setDate(d.getDate() + step.days_from_effective);
            dueDate = d.toISOString().split("T")[0];
          }
          return {
            deal_id: deal.id, brokerage_id: brokId,
            label: step.label,
            assignee_id: step.assignee_role === "tc" ? (form.tc_id || null) : step.assignee_role === "agent" ? (form.agent_id || null) : null,
            due_date: dueDate, sort_order: i, status: "open", priority: "medium",
          };
        });
        await supabase.from("tasks").insert(tasks);
      }
    }

    // Log timeline event
    await supabase.from("timeline_events").insert({
      deal_id: deal.id, brokerage_id: brokId,
      event_type: "deal_opened", description: "Deal opened",
      user_id: myId,
    });

    // Notify assigned TC
    if (form.tc_id) {
      await supabase.from("notifications").insert({
        user_id: form.tc_id, brokerage_id: brokId,
        deal_id: deal.id, title: "New deal assigned",
        body: `You've been assigned to ${form.address}`,
        channel: "in_app",
      });
    }

    router.push(`/dashboard/deals/${deal.id}`);
  }

  return (
    <>
      <Topbar title="New deal" />
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        <form onSubmit={handleSubmit}>
          <div style={{ maxWidth: 680, display: "flex", flexDirection: "column", gap: 14 }}>

            <div style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 14, color: "var(--text)" }}>Property</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Field label="Address" required>
                  <input value={form.address} onChange={set("address")} placeholder="4821 Chestnut Ave" required />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 10 }}>
                  <Field label="City"><input value={form.city} onChange={set("city")} placeholder="Naples" /></Field>
                  <Field label="Zip"><input value={form.zip} onChange={set("zip")} placeholder="34119" /></Field>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label="MLS number"><input value={form.mls_number} onChange={set("mls_number")} placeholder="A11421904" /></Field>
                  <Field label="Unit / Suite"><input value={form.unit} onChange={set("unit")} placeholder="#803" /></Field>
                </div>
              </div>
            </div>

            <div style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 14 }}>Transaction details</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <Field label="Side">
                    <select value={form.side} onChange={set("side")}>
                      <option value="buyer">Buyer</option>
                      <option value="seller">Seller</option>
                      <option value="dual">Dual</option>
                    </select>
                  </Field>
                  <Field label="Stage">
                    <select value={form.stage} onChange={set("stage")}>
                      <option value="lead">Lead</option>
                      <option value="listing">Listing</option>
                      <option value="under_contract">Under Contract</option>
                      <option value="clear_to_close">Clear to Close</option>
                    </select>
                  </Field>
                  <Field label="Sale price">
                    <input value={form.sale_price} onChange={set("sale_price")} placeholder="485,000" />
                  </Field>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label="Effective date"><input type="date" value={form.effective_date} onChange={set("effective_date")} /></Field>
                  <Field label="Close date"><input type="date" value={form.close_date} onChange={set("close_date")} /></Field>
                </div>
              </div>
            </div>

            <div style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 14 }}>Assigned team</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Transaction coordinator">
                  <select value={form.tc_id} onChange={set("tc_id")}>
                    <option value="">— Unassigned —</option>
                    {tcs.map(tc => <option key={tc.id} value={tc.id}>{tc.full_name}</option>)}
                  </select>
                </Field>
                <Field label="Agent">
                  <select value={form.agent_id} onChange={set("agent_id")}>
                    <option value="">— Unassigned —</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                  </select>
                </Field>
              </div>
            </div>

            <div style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 14 }}>Checklist template</div>
              <Field label="Auto-generate tasks from template">
                <select value={form.template_id} onChange={set("template_id")}>
                  <option value="">— No template —</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
              {form.template_id && (
                <div style={{ marginTop: 8, fontSize: 11, color: "var(--sage)" }}>
                  ✓ Tasks will be auto-generated based on the effective date
                </div>
              )}
            </div>

            <Field label="Notes">
              <textarea value={form.notes} onChange={set("notes")} rows={3} placeholder="Any special instructions or context…" />
            </Field>

            {error && <div style={{ fontSize: 12, color: "var(--rose)", background: "var(--rose-d)", border: "1px solid var(--rose-b)", borderRadius: 6, padding: "8px 12px" }}>{error}</div>}

            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="primary" type="submit" loading={saving}>Create deal</Btn>
              <Btn variant="ghost" type="button" onClick={() => router.back()}>Cancel</Btn>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

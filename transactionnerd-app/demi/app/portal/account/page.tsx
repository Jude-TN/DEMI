"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Btn, Field, Tag } from "@/components/ui";
import Topbar from "@/components/layout/Topbar";

export default function PortalAccountPage() {
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({ full_name: "", phone: "", license_number: "" });
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: p } = await supabase.from("users").select("*").eq("id", user!.id).single();
      setProfile(p);
      setForm({ full_name: p?.full_name ?? "", phone: p?.phone ?? "", license_number: p?.license_number ?? "" });
    }
    load();
  }, []);

  async function save() {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("users").update(form).eq("id", user!.id);
    setSaved(true); setTimeout(() => setSaved(false), 3000);
  }

  const PRICING = [
    { label: "Contract to Close", standard: "$500", elite: "$350", pro: "$350" },
    { label: "Listing Coordination", standard: "$250", elite: "$250", pro: "$250" },
    { label: "Write an Offer", standard: "$75", elite: "$35", pro: "$35" },
    { label: "Saturday Support", standard: "N/A", elite: "$250/mo", pro: "$250/mo" },
    { label: "Mobile Notary", standard: "$150", elite: "$150", pro: "$150" },
  ];

  return (
    <>
      <Topbar title="Account" />
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        <div style={{ maxWidth: 580, display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Subscription */}
          <div style={{ background: "var(--amber-d)", border: "1px solid var(--amber-b)", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>⭐</span>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--amber)" }}>Elite Subscriber</div>
              <Tag label="$600/month" color="amber" />
            </div>
            <div style={{ fontSize: 11, color: "var(--text)", lineHeight: 1.6 }}>
              Elite subscribers get discounted TC rates on Contract to Close ($350 vs $500) and Write an Offer ($35 vs $75), plus priority scheduling and Saturday support access.
            </div>
          </div>

          {/* Profile */}
          <div style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "9px 13px", borderBottom: "1px solid var(--bdr)", fontSize: 12, fontWeight: 600 }}>Profile</div>
            <div style={{ padding: "12px 13px", display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="Full name"><input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} /></Field>
              <Field label="Phone"><input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></Field>
              <Field label="FL license number"><input value={form.license_number} onChange={e => setForm(p => ({ ...p, license_number: e.target.value }))} /></Field>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Btn variant="primary" onClick={save}>Save profile</Btn>
                {saved && <span style={{ fontSize: 11, color: "var(--teal)" }}>✓ Saved</span>}
              </div>
            </div>
          </div>

          {/* Pricing table */}
          <div style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "9px 13px", borderBottom: "1px solid var(--bdr)", fontSize: 12, fontWeight: 600 }}>Your pricing</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead><tr>
                <th style={{ textAlign: "left", padding: "7px 13px", borderBottom: "1px solid var(--bdr)", fontSize: 9, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: .6 }}>Service</th>
                <th style={{ textAlign: "right", padding: "7px 13px", borderBottom: "1px solid var(--bdr)", fontSize: 9, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase" as const }}>Standard</th>
                <th style={{ textAlign: "right", padding: "7px 13px", borderBottom: "1px solid var(--bdr)", fontSize: 9, color: "var(--amber)", fontWeight: 700, textTransform: "uppercase" as const }}>Your price</th>
              </tr></thead>
              <tbody>
                {PRICING.map(row => (
                  <tr key={row.label}>
                    <td style={{ padding: "8px 13px", borderBottom: "1px solid var(--bdr)", color: "var(--text)" }}>{row.label}</td>
                    <td style={{ padding: "8px 13px", borderBottom: "1px solid var(--bdr)", color: "var(--muted)", textAlign: "right", fontFamily: "monospace", textDecoration: "line-through" }}>{row.standard}</td>
                    <td style={{ padding: "8px 13px", borderBottom: "1px solid var(--bdr)", color: "var(--amber)", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{row.elite}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </>
  );
}

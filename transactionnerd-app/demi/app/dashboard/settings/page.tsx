"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, Btn, Field, Tag, RoleBadge } from "@/components/ui";
import Topbar from "@/components/layout/Topbar";
import type { User, Brokerage } from "@/types";

type Tab = "profile" | "team" | "integrations" | "billing";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");
  const TABS: { key: Tab; label: string }[] = [
    { key: "profile",      label: "Brokerage profile" },
    { key: "team",         label: "Team members" },
    { key: "integrations", label: "Integrations" },
    { key: "billing",      label: "Billing" },
  ];

  return (
    <>
      <Topbar title="Settings" />
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        {/* Side nav */}
        <div style={{ width: 180, minWidth: 180, borderRight: "1px solid var(--bdr)", padding: "10px 8px" }}>
          {TABS.map(t => (
            <div key={t.key} onClick={() => setTab(t.key)} style={{ padding: "7px 9px", borderRadius: 5, fontSize: 12, color: tab === t.key ? "var(--teal)" : "var(--muted)", background: tab === t.key ? "var(--teal-d)" : "transparent", cursor: "pointer", marginBottom: 1 }}>
              {t.label}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {tab === "profile"      && <BrokerageProfile />}
          {tab === "team"         && <TeamMembers />}
          {tab === "integrations" && <Integrations />}
          {tab === "billing"      && <Billing />}
        </div>
      </div>
    </>
  );
}

// ── Brokerage profile ─────────────────────────────────────────────────────────
function BrokerageProfile() {
  const [form, setForm] = useState({ name: "", team_name: "", license_number: "", primary_market: "", timezone: "America/New_York" });
  const [saved, setSaved] = useState(false);
  const [brokId, setBrokId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("users").select("brokerage_id").eq("id", user!.id).single();
      if (!profile?.brokerage_id) return;
      setBrokId(profile.brokerage_id);
      const { data: brok } = await supabase.from("brokerages").select("*").eq("id", profile.brokerage_id).single();
      if (brok) setForm({ name: brok.name ?? "", team_name: brok.team_name ?? "", license_number: brok.license_number ?? "", primary_market: brok.primary_market ?? "", timezone: brok.timezone ?? "America/New_York" });
    }
    load();
  }, []);

  async function save() {
    if (!brokId) return;
    await supabase.from("brokerages").update(form).eq("id", brokId);
    setSaved(true); setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div style={{ maxWidth: 500 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Brokerage profile</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Brokerage name" required><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></Field>
        <Field label="Team name"><input value={form.team_name} onChange={e => setForm(p => ({ ...p, team_name: e.target.value }))} /></Field>
        <Field label="License number"><input value={form.license_number} onChange={e => setForm(p => ({ ...p, license_number: e.target.value }))} /></Field>
        <Field label="Primary market"><input value={form.primary_market} onChange={e => setForm(p => ({ ...p, primary_market: e.target.value }))} placeholder="Southwest Florida" /></Field>
        <Field label="Timezone">
          <select value={form.timezone} onChange={e => setForm(p => ({ ...p, timezone: e.target.value }))}>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
          </select>
        </Field>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Btn variant="primary" onClick={save}>Save changes</Btn>
          {saved && <span style={{ fontSize: 11, color: "var(--teal)" }}>✓ Saved</span>}
        </div>
      </div>
    </div>
  );
}

// ── Team members ──────────────────────────────────────────────────────────────
function TeamMembers() {
  const [members, setMembers] = useState<User[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"tc" | "agent">("agent");
  const [inviting, setInviting] = useState(false);
  const [msg, setMsg] = useState("");
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("users").select("brokerage_id").eq("id", user!.id).single();
      const { data } = await supabase.from("users").select("*").eq("brokerage_id", profile!.brokerage_id).order("full_name");
      setMembers(data ?? []);
    }
    load();
  }, []);

  async function invite() {
    if (!email) return;
    setInviting(true); setMsg("");
    try {
      const res = await fetch("/api/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role }) });
      if (res.ok) setMsg(`Invite sent to ${email}`);
      else setMsg("Failed to send invite. Check Supabase email settings.");
    } catch { setMsg("Network error."); }
    setInviting(false); setEmail("");
  }

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Team members</div>

      {/* Invite */}
      <div style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Invite new member</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "end" }}>
          <Field label="Email address"><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="carlos@example.com" /></Field>
          <Field label="Role">
            <select value={role} onChange={e => setRole(e.target.value as "tc" | "agent")} style={{ width: 120 }}>
              <option value="agent">Agent</option>
              <option value="tc">TC</option>
            </select>
          </Field>
          <Btn variant="primary" onClick={invite} loading={inviting} style={{ marginBottom: 1 }}>Send invite</Btn>
        </div>
        {msg && <div style={{ fontSize: 11, color: "var(--teal)", marginTop: 8 }}>{msg}</div>}
      </div>

      {/* Member list */}
      {members.map(m => (
        <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, marginBottom: 6 }}>
          <Avatar name={m.full_name} size={32} url={m.avatar_url} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500 }}>{m.full_name}</div>
            <div style={{ fontSize: 10, color: "var(--muted)" }}>{m.email}</div>
          </div>
          <RoleBadge role={m.role} />
        </div>
      ))}
    </div>
  );
}

// ── Integrations ──────────────────────────────────────────────────────────────
function Integrations() {
  const CONNECTED = [
    { icon: "🔗", name: "Follow Up Boss", desc: "Sync contacts, push closed deal tags, trigger sequences", status: "connected" },
    { icon: "📋", name: "Dotloop",         desc: "Deep-link loops from document view, sync executed status", status: "connected" },
    { icon: "✍️", name: "DocuSign",        desc: "Send envelopes, track signature status, pull executed docs", status: "connected" },
    { icon: "⚡", name: "Zapier",          desc: "Trigger and receive webhooks for custom automations", status: "connected" },
  ];
  const PLANNED = [
    { icon: "☁️", name: "SkySlope",        desc: "Compliance file sync, brokerage review workflow", status: "priority" },
    { icon: "📧", name: "Gmail / Outlook", desc: "Sync deal emails, send from DEMI via connected inbox", status: "planned" },
    { icon: "📅", name: "Google Calendar", desc: "Sync key dates to agent calendars, closing reminders", status: "planned" },
    { icon: "💳", name: "Stripe",          desc: "Subscription management, usage-based billing, invoicing", status: "internal" },
  ];

  const STATUS_COLORS: Record<string, [string, string]> = {
    connected: ["var(--teal-d)", "var(--teal)"],
    priority:  ["var(--rose-d)", "var(--rose)"],
    planned:   ["var(--amber-d)", "var(--amber)"],
    internal:  ["rgba(255,255,255,0.05)", "var(--muted)"],
  };
  const STATUS_LABELS: Record<string, string> = { connected: "Connected", priority: "Priority v2", planned: "Planned", internal: "Internal" };

  function IntItem({ icon, name, desc, status }: { icon: string; name: string; desc: string; status: string }) {
    const [bg, fg] = STATUS_COLORS[status];
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, marginBottom: 6 }}>
        <div style={{ width: 32, height: 32, borderRadius: 7, background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500 }}>{name}</div>
          <div style={{ fontSize: 10, color: "var(--muted)" }}>{desc}</div>
        </div>
        <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "monospace", background: bg, color: fg, padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap" }}>{STATUS_LABELS[status]}</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Integrations</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--dim)", letterSpacing: 0.6, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 10 }}>Connected at launch</div>
          {CONNECTED.map(i => <IntItem key={i.name} {...i} />)}
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--dim)", letterSpacing: 0.6, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 10 }}>Roadmap</div>
          {PLANNED.map(i => <IntItem key={i.name} {...i} />)}
        </div>
      </div>
    </div>
  );
}

// ── Billing ───────────────────────────────────────────────────────────────────
function Billing() {
  const TIERS = [
    { name: "Starter", price: "$49", period: "/month · up to 1 agent + 1 TC", features: ["Up to 20 active deals", "Buyer + seller checklists", "Document tracking", "Timeline + messages", "1 integration (FUB or Dotloop)", "Email notifications"] },
    { name: "Pro", price: "$149", period: "/month · up to 5 agents + 2 TCs", features: ["Unlimited active deals", "Custom checklist templates", "All integrations", "Reports + CSV export", "Email + notification rules", "Priority support"], featured: true },
    { name: "Team", price: "$349", period: "/month · unlimited seats", features: ["Everything in Pro", "SkySlope integration", "Gmail / Outlook sync", "White-label email templates", "Dedicated onboarding", "Admin analytics", "API access"] },
  ];
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Billing & plans</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {TIERS.map(tier => (
          <div key={tier.name} style={{ background: "var(--panel)", border: `1px solid ${tier.featured ? "var(--teal)" : "var(--bdr)"}`, borderRadius: 10, padding: "16px" }}>
            {tier.featured && <div style={{ fontSize: 9, background: "var(--teal-d)", color: "var(--teal)", padding: "2px 8px", borderRadius: 20, display: "inline-block", marginBottom: 8, fontWeight: 600 }}>Most popular</div>}
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{tier.name}</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>{tier.price}</div>
            <div style={{ fontSize: 10, color: "var(--dim)", marginBottom: 12 }}>{tier.period}</div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
              {tier.features.map(f => <li key={f} style={{ fontSize: 11, color: "var(--muted)", display: "flex", gap: 6 }}><span style={{ color: "var(--teal)" }}>·</span>{f}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

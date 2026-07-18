"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, Btn, Field, Tag, RoleBadge, CapacityBar } from "@/components/ui";
import Topbar from "@/components/layout/Topbar";
import type { User, Brokerage, TCCapacityResponse, TCRoutingRule } from "@/types";

type Tab = "profile" | "team" | "routing" | "integrations" | "billing";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");
  const TABS: { key: Tab; label: string }[] = [
    { key: "profile", label: "Brokerage profile" },
    { key: "team", label: "Team members" },
    { key: "routing", label: "TC routing rules" },
    { key: "integrations", label: "Integrations" },
    { key: "billing", label: "Billing" },
  ];
  return (
    <>
      <Topbar title="Settings" />
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        <div style={{ width: 180, minWidth: 180, borderRight: "1px solid var(--bdr)", padding: "10px 8px" }}>
          {TABS.map(t => <div key={t.key} onClick={() => setTab(t.key)} style={{ padding: "7px 9px", borderRadius: 5, fontSize: 12, color: tab === t.key ? "var(--teal)" : "var(--muted)", background: tab === t.key ? "var(--teal-d)" : "transparent", cursor: "pointer", marginBottom: 1 }}>{t.label}</div>)}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {tab === "profile" && <BrokerageProfile />}
          {tab === "team" && <TeamMembers />}
          {tab === "routing" && <RoutingRules />}
          {tab === "integrations" && <Integrations />}
          {tab === "billing" && <Billing />}
        </div>
      </div>
    </>
  );
}

function BrokerageProfile() {
  const [form, setForm] = useState({ name: "", team_name: "", license_number: "", primary_market: "", timezone: "America/New_York" });
  const [saved, setSaved] = useState(false);
  const [brokId, setBrokId] = useState<string | null>(null);
  const supabase = createClient();
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: bm } = await supabase.from("brokerage_members").select("brokerage_id,brokerages(*)").eq("user_id", user!.id).eq("is_active", true).single() as any;
      if (!bm?.brokerage_id) return;
      setBrokId(bm.brokerage_id);
      const b = bm.brokerages;
      setForm({ name: b.name ?? "", team_name: b.team_name ?? "", license_number: b.license_number ?? "", primary_market: b.primary_market ?? "", timezone: b.timezone ?? "America/New_York" });
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
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <Field label="Brokerage name" required><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></Field>
        <Field label="Team name"><input value={form.team_name} onChange={e => setForm(p => ({ ...p, team_name: e.target.value }))} placeholder="Jude Paul Group" /></Field>
        <Field label="License number"><input value={form.license_number} onChange={e => setForm(p => ({ ...p, license_number: e.target.value }))} /></Field>
        <Field label="Primary market"><input value={form.primary_market} onChange={e => setForm(p => ({ ...p, primary_market: e.target.value }))} placeholder="Southwest Florida" /></Field>
        <Field label="Timezone"><select value={form.timezone} onChange={e => setForm(p => ({ ...p, timezone: e.target.value }))}><option value="America/New_York">Eastern</option><option value="America/Chicago">Central</option><option value="America/Denver">Mountain</option><option value="America/Los_Angeles">Pacific</option></select></Field>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Btn variant="primary" onClick={save}>Save changes</Btn>
          {saved && <span style={{ fontSize: 11, color: "var(--teal)" }}>✓ Saved</span>}
        </div>
      </div>
    </div>
  );
}

function TeamMembers() {
  const [members, setMembers] = useState<any[]>([]);
  const [email, setEmail] = useState(""); const [role, setRole] = useState<"tc"|"agent">("agent");
  const [inviting, setInviting] = useState(false); const [msg, setMsg] = useState("");
  const supabase = createClient();
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: bm } = await supabase.from("brokerage_members").select("brokerage_id").eq("user_id", user!.id).eq("is_active", true).single();
      const { data } = await supabase.from("brokerage_members").select("role,users(*)").eq("brokerage_id", bm!.brokerage_id).eq("is_active", true) as any;
      setMembers(data ?? []);
    }
    load();
  }, []);
  async function invite() {
    if (!email) return;
    setInviting(true); setMsg("");
    const res = await fetch("/api/invites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role }) });
    setMsg(res.ok ? `Invite sent to ${email}` : "Failed to send invite.");
    setInviting(false); setEmail("");
  }
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Team members</div>
      <div style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Invite new member</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "end" }}>
          <Field label="Email"><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="carlos@example.com" /></Field>
          <Field label="Role"><select value={role} onChange={e => setRole(e.target.value as "tc"|"agent")} style={{ width: 110 }}><option value="agent">Agent</option><option value="tc">TC</option></select></Field>
          <Btn variant="primary" onClick={invite} loading={inviting} style={{ marginBottom: 1 }}>Send invite</Btn>
        </div>
        {msg && <div style={{ fontSize: 11, color: "var(--teal)", marginTop: 8 }}>{msg}</div>}
      </div>
      {members.map((m: any) => (
        <div key={m.users?.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, marginBottom: 6 }}>
          <Avatar name={m.users?.full_name ?? "?"} size={32} url={m.users?.avatar_url} />
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 500 }}>{m.users?.full_name}</div><div style={{ fontSize: 10, color: "var(--muted)" }}>{m.users?.email}</div></div>
          <RoleBadge role={m.role} />
        </div>
      ))}
    </div>
  );
}

function RoutingRules() {
  const [rules, setRules] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [tcs, setTcs] = useState<TCCapacityResponse[]>([]);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: bm } = await supabase.from("brokerage_members").select("brokerage_id").eq("user_id", user!.id).eq("is_active", true).single();
      const { data: mems } = await supabase.from("brokerage_members").select("role,users(*)").eq("brokerage_id", bm!.brokerage_id).eq("is_active", true) as any;
      setAgents((mems ?? []).filter((m: any) => m.role === "agent" || m.role === "admin").map((m: any) => m.users));
      const res = await fetch("/api/tc/available");
      if (res.ok) setTcs(await res.json());
      const { data: existingRules } = await supabase.from("tc_routing_rules").select("*,agent:users!tc_routing_rules_agent_id_fkey(full_name),default_tc:users!tc_routing_rules_default_tc_id_fkey(full_name),fallback_tc:users!tc_routing_rules_fallback_tc_id_fkey(full_name)").eq("brokerage_id", bm!.brokerage_id) as any;
      setRules(existingRules ?? []);
    }
    load();
  }, []);

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>TC routing rules</div>
      <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>Set a default TC per agent and a fallback when the default is at capacity. The system auto-suggests the right TC when a deal is opened.</p>
      <div style={{ background: "var(--teal-d)", border: "1px solid var(--teal-b)", borderRadius: 6, padding: "9px 12px", fontSize: 11, color: "var(--teal)", marginBottom: 14 }}>
        Routing suggest logic: Default TC → if at cap, fallback TC → if no fallback, agent picks manually.
      </div>
      {rules.length === 0 && <div style={{ fontSize: 12, color: "var(--muted)" }}>No routing rules configured. Add one below.</div>}
      {rules.map((r: any) => (
        <div key={r.id} style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, padding: "11px 13px", marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Agent: {r.agent?.full_name}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>Default TC</div><div style={{ fontSize: 12 }}>{r.default_tc?.full_name ?? "—"}</div></div>
            <div><div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>Fallback TC</div><div style={{ fontSize: 12, color: "var(--muted)" }}>{r.fallback_tc?.full_name ?? "None"}</div></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Integrations() {
  const CONNECTED = [{icon:"🔗",name:"Follow Up Boss",desc:"Sync contacts, trigger post-close sequences",status:"connected"},{icon:"📋",name:"Dotloop",desc:"Deep-link loops, sync executed status",status:"connected"},{icon:"✍️",name:"DocuSign",desc:"Send envelopes, track signature status",status:"connected"},{icon:"⚡",name:"Zapier",desc:"Outbound webhooks on deal events",status:"connected"}];
  const PLANNED = [{icon:"☁️",name:"SkySlope",desc:"Compliance file sync, brokerage review",status:"priority"},{icon:"📧",name:"Gmail / Outlook",desc:"Sync deal emails, send from DEMI",status:"planned"},{icon:"📅",name:"Google Calendar",desc:"Sync closing dates to agent calendars",status:"planned"},{icon:"💳",name:"Stripe",desc:"Subscription management and invoicing",status:"internal"}];
  const CLR:Record<string,[string,string]>={connected:["var(--teal-d)","var(--teal)"],priority:["var(--rose-d)","var(--rose)"],planned:["var(--amber-d)","var(--amber)"],internal:["rgba(255,255,255,.05)","var(--muted)"]};
  const LBL:Record<string,string>={connected:"Connected",priority:"Priority v2",planned:"Planned",internal:"Internal"};
  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Integrations</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--dim)", letterSpacing: .6, textTransform: "uppercase" as const, fontFamily: "monospace", marginBottom: 9 }}>Connected at launch</div>
          {CONNECTED.map(i=>{const[bg,fg]=CLR[i.status];return(<div key={i.name} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 11px",background:"var(--panel)",border:"1px solid var(--bdr)",borderRadius:8,marginBottom:6}}><div style={{width:30,height:30,borderRadius:7,background:"var(--card)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>{i.icon}</div><div style={{flex:1}}><div style={{fontSize:12,fontWeight:500}}>{i.name}</div><div style={{fontSize:10,color:"var(--muted)"}}>{i.desc}</div></div><span style={{fontSize:9,fontWeight:700,fontFamily:"monospace",background:bg,color:fg,padding:"2px 7px",borderRadius:20,whiteSpace:"nowrap"}}>{LBL[i.status]}</span></div>);})}
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--dim)", letterSpacing: .6, textTransform: "uppercase" as const, fontFamily: "monospace", marginBottom: 9 }}>Roadmap</div>
          {PLANNED.map(i=>{const[bg,fg]=CLR[i.status];return(<div key={i.name} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 11px",background:"var(--panel)",border:"1px solid var(--bdr)",borderRadius:8,marginBottom:6}}><div style={{width:30,height:30,borderRadius:7,background:"var(--card)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>{i.icon}</div><div style={{flex:1}}><div style={{fontSize:12,fontWeight:500}}>{i.name}</div><div style={{fontSize:10,color:"var(--muted)"}}>{i.desc}</div></div><span style={{fontSize:9,fontWeight:700,fontFamily:"monospace",background:bg,color:fg,padding:"2px 7px",borderRadius:20,whiteSpace:"nowrap"}}>{LBL[i.status]}</span></div>);})}
        </div>
      </div>
    </div>
  );
}

function Billing() {
  const T=[{n:"Starter",p:"$49",per:"/month · up to 1 agent + 1 TC",f:["Up to 20 active deals","Buyer + seller checklists","Document tracking","1 integration (FUB or Dotloop)","Email notifications"]},{n:"Pro",p:"$149",per:"/month · up to 5 agents + 2 TCs",f:["Unlimited active deals","All integrations","Custom checklist templates","Reports + CSV export","Priority support"],featured:true},{n:"Team",p:"$349",per:"/month · unlimited seats",f:["Everything in Pro","SkySlope integration","Gmail / Outlook sync","White-label email templates","Dedicated onboarding","API access"]}];
  return(
    <div>
      <div style={{fontSize:14,fontWeight:600,marginBottom:14}}>Plans</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        {T.map(t=>(
          <div key={t.n} style={{background:"var(--panel)",border:`1px solid ${(t as any).featured?"var(--teal)":"var(--bdr)"}`,borderRadius:10,padding:16}}>
            {(t as any).featured&&<div style={{fontSize:9,background:"var(--teal-d)",color:"var(--teal)",padding:"2px 8px",borderRadius:20,display:"inline-block",marginBottom:8,fontWeight:600}}>Most popular</div>}
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>{t.n}</div>
            <div style={{fontSize:22,fontWeight:700,marginBottom:2}}>{t.p}</div>
            <div style={{fontSize:10,color:"var(--dim)",marginBottom:12}}>{t.per}</div>
            <ul style={{listStyle:"none",display:"flex",flexDirection:"column",gap:5}}>{t.f.map(f=><li key={f} style={{fontSize:11,color:"var(--muted)",display:"flex",gap:5}}><span style={{color:"var(--teal)"}}>·</span>{f}</li>)}</ul>
          </div>
        ))}
      </div>
    </div>
  );
}

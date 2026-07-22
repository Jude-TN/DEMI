"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tag, Avatar, Btn, Modal, Field, SectionLabel, Empty } from "@/components/ui";
import type { Task, Document, Message, TimelineEvent, Contact, User, ContactRole, DocStatus } from "@/types";
import { formatDate, formatShort, isOverdue, isDueToday, daysUntil } from "@/lib/utils/dates";

type Tab = "checklist" | "documents" | "messages" | "contacts" | "timeline" | "dates";
const TABS: { key: Tab; label: string }[] = [
  { key: "checklist",  label: "Checklist" },
  { key: "documents",  label: "Documents" },
  { key: "messages",   label: "Messages" },
  { key: "contacts",   label: "Contacts" },
  { key: "timeline",   label: "Timeline" },
  { key: "dates",      label: "Key dates" },
];

export default function DealTabs({ deal }: { deal: any }) {
  const [tab, setTab] = useState<Tab>("checklist");
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", borderBottom: "1px solid var(--bdr)", flexShrink: 0, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "9px 14px", fontSize: 12, fontWeight: tab === t.key ? 700 : 400, color: tab === t.key ? "var(--teal)" : "var(--muted)", background: "none", border: "none", borderBottom: `2px solid ${tab === t.key ? "var(--teal)" : "transparent"}`, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {tab === "checklist"  && <ChecklistTab deal={deal} />}
        {tab === "documents"  && <DocumentsTab deal={deal} />}
        {tab === "messages"   && <MessagesTab  deal={deal} />}
        {tab === "contacts"   && <ContactsTab  deal={deal} />}
        {tab === "timeline"   && <TimelineTab  deal={deal} />}
        {tab === "dates"      && <DatesTab     deal={deal} />}
      </div>
    </div>
  );
}

// ── Checklist ─────────────────────────────────────────────────────────────────
function ChecklistTab({ deal }: { deal: any }) {
  const [tasks, setTasks] = useState<(Task & { assignee?: any })[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ label: "", due_date: "", priority: "medium", assignee_id: "" });
  const [members, setMembers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const loadTasks = useCallback(async () => {
    const { data } = await supabase.from("tasks")
      .select("*, assignee:users!tasks_assignee_id_fkey(id,full_name,avatar_url)")
      .eq("deal_id", deal.id).order("sort_order").order("created_at");
    setTasks(data ?? []);
  }, [deal.id, supabase]);

  useEffect(() => {
    loadTasks();
    // Load team members for assignee picker
    supabase.from("brokerage_members").select("users(*)").eq("brokerage_id", deal.brokerage_id).eq("is_active", true)
      .then(({ data }) => setMembers((data ?? []).map((m: any) => m.users).filter(Boolean)));
  }, [deal.id, deal.brokerage_id, loadTasks, supabase]);

  async function toggle(task: Task) {
    const isComplete = !!task.completed_at;
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed_at: isComplete ? null : "now" }),
    });
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed_at: isComplete ? null : new Date().toISOString() } : t));
  }

  async function addTask() {
    if (!newTask.label.trim()) return;
    setSaving(true);
    await fetch(`/api/deals/${deal.id}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newTask.label, due_date: newTask.due_date || null, assignee_id: newTask.assignee_id || null, sort_order: tasks.length }),
    });
    setNewTask({ label: "", due_date: "", priority: "medium", assignee_id: "" });
    setShowAdd(false);
    setSaving(false);
    loadTasks();
  }

  const open = tasks.filter(t => !t.completed_at);
  const done = tasks.filter(t => !!t.completed_at);
  const pct = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;

  return (
    <div style={{ padding: 12 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Closing progress</span>
          <span style={{ fontSize: 12, fontFamily: "monospace", color: "var(--teal)" }}>{done.length}/{tasks.length} tasks · {pct}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: "var(--bdr)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: pct + "%", background: "var(--teal)", borderRadius: 999, transition: "width 0.3s ease" }} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>{done.length}/{tasks.length} complete</span>
        <Btn size="sm" variant="primary" onClick={() => setShowAdd(true)}>+ Add task</Btn>
      </div>
      {open.map(t => <TaskRow key={t.id} task={t} onToggle={() => toggle(t)} />)}
      {done.length > 0 && <>
        <div style={{ fontSize: 9, color: "var(--dim)", fontFamily: "monospace", margin: "12px 0 6px", letterSpacing: 0.5 }}>COMPLETED ({done.length})</div>
        {done.map(t => <TaskRow key={t.id} task={t} onToggle={() => toggle(t)} />)}
      </>}
      {tasks.length === 0 && <Empty icon="☑" title="No tasks yet" sub="Tasks are auto-generated from the checklist template when a deal is opened" />}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add task">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Task name" required><input autoFocus value={newTask.label} onChange={e => setNewTask(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Request HOA documents" onKeyDown={e => e.key === "Enter" && addTask()} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Due date"><input type="date" value={newTask.due_date} onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))} /></Field>
            <Field label="Assignee">
              <select value={newTask.assignee_id} onChange={e => setNewTask(p => ({ ...p, assignee_id: e.target.value }))}>
                <option value="">— None —</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="primary" onClick={addTask} loading={saving}>Add task</Btn>
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function TaskRow({ task, onToggle }: { task: Task & { assignee?: any }; onToggle: () => void }) {
  const done = !!task.completed_at;
  const over = !done && isOverdue(task.due_date);
  const today = !done && !over && isDueToday(task.due_date);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: over ? "rgba(229,83,91,.08)" : today ? "rgba(244,165,53,.08)" : "var(--card)", border: `1px solid ${over ? "var(--rose-b)" : today ? "var(--amber-b)" : "var(--bdr)"}`, borderLeft: `3px solid ${over ? "var(--rose)" : today ? "var(--amber)" : "var(--bdr)"}`, borderRadius: 5, padding: "7px 9px", marginBottom: 4 }}>
      <div onClick={onToggle} style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${done ? "var(--teal)" : "var(--bdrs)"}`, background: done ? "var(--teal)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 9, color: "#0a1412", flexShrink: 0 }}>
        {done && "✓"}
      </div>
      <span style={{ flex: 1, fontSize: 11, color: done ? "var(--dim)" : "var(--text)", textDecoration: done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.label}</span>
      {!done && task.is_required && <Tag label="REQ" color="muted" size={8} />}
      {task.due_date && <span style={{ fontSize: 9, fontFamily: "monospace", color: over ? "var(--rose)" : today ? "var(--amber)" : "var(--dim)", whiteSpace: "nowrap" }}>{over ? "\u26A0 " : today ? "\u23F0 " : ""}{formatShort(task.due_date)}</span>}
      {task.assignee && <Avatar name={task.assignee.full_name} size={16} url={task.assignee.avatar_url} />}
    </div>
  );
}

// ── Documents ─────────────────────────────────────────────────────────────────
function DocumentsTab({ deal }: { deal: any }) {
  const [docs, setDocs] = useState<(Document & { uploader?: any })[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showTrack, setShowTrack] = useState(false);
  const [newDoc, setNewDoc] = useState({ name: "", doc_type: "other", status: "received" as DocStatus });
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const loadDocs = useCallback(async () => {
    const { data } = await supabase.from("documents")
      .select("*, uploader:users!documents_uploaded_by_fkey(full_name,avatar_url)")
      .eq("deal_id", deal.id).order("created_at", { ascending: false });
    setDocs(data ?? []);
  }, [deal.id, supabase]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  async function uploadFile(file: File) {
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const path = `${deal.brokerage_id}/${deal.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("deal-documents").upload(path, file);
    if (!error) {
      await supabase.from("documents").insert({
        brokerage_id: deal.brokerage_id, deal_id: deal.id, name: file.name, file_url: path,
        file_size_bytes: file.size, doc_type: "other", status: "received",
        uploaded_by: user?.id, uploaded_at: new Date().toISOString(),
      });
      // Timeline
      await fetch(`/api/deals/${deal.id}/timeline`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event_type: "document_uploaded", description: `Document uploaded: "${file.name}"` }) });
    }
    setUploading(false);
    loadDocs();
  }

  async function updateStatus(id: string, status: DocStatus) {
    await supabase.from("documents").update({ status }).eq("id", id);
    setDocs(prev => prev.map(d => d.id === id ? { ...d, status } : d));
  }

  async function trackDoc() {
    if (!newDoc.name) return;
    await supabase.from("documents").insert({ brokerage_id: deal.brokerage_id, deal_id: deal.id, name: newDoc.name, doc_type: newDoc.doc_type, status: newDoc.status });
    setShowTrack(false);
    setNewDoc({ name: "", doc_type: "other", status: "received" });
    loadDocs();
  }

  async function download(fileUrl: string, name: string) {
    const { data } = await supabase.storage.from("deal-documents").createSignedUrl(fileUrl, 3600);
    if (data?.signedUrl) { const a = document.createElement("a"); a.href = data.signedUrl; a.download = name; a.click(); }
  }

  const missing = docs.filter(d => d.status === "missing");

  return (
    <div style={{ padding: 12 }}>
      {missing.length > 0 && (
        <div style={{ background: "var(--rose-d)", border: "1px solid var(--rose-b)", borderRadius: 6, padding: "8px 11px", marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--rose)", marginBottom: 4 }}>⚠️ {missing.length} missing document{missing.length !== 1 ? "s" : ""}</div>
          {missing.map(d => <div key={d.id} style={{ fontSize: 11, color: "var(--text)" }}>🚫 {d.name}</div>)}
        </div>
      )}
      <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
        <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={e => { Array.from(e.target.files ?? []).forEach(uploadFile); e.target.value = ""; }} />
        <Btn size="sm" variant="primary" loading={uploading} onClick={() => fileRef.current?.click()}>⬆ Upload file</Btn>
        <Btn size="sm" variant="ghost" onClick={() => setShowTrack(true)}>+ Track document</Btn>
      </div>

      {docs.length === 0 && !uploading && <Empty icon="📄" title="No documents yet" sub="Upload files or track required documents" />}

      {docs.map(doc => (
        <div key={doc.id} style={{ background: "var(--card)", border: "1px solid var(--bdr)", borderRadius: 6, overflow: "hidden", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px" }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{doc.status === "missing" ? "🚫" : "📄"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
              <div style={{ fontSize: 9, color: "var(--dim)", fontFamily: "monospace" }}>
                {doc.file_size_bytes ? `${Math.round(Number(doc.file_size_bytes) / 1024)}KB · ` : ""}{formatShort(doc.uploaded_at ?? doc.uploaded_at ?? "")}
                {doc.uploader && ` · ${doc.uploader.full_name}`}
              </div>
            </div>
            {doc.external_ref_url && <a href={doc.external_ref_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "var(--blue)", whiteSpace: "nowrap" }}>View →</a>}
            {doc.file_url && <button onClick={() => download(doc.file_url!, doc.name)} style={{ fontSize: 10, color: "var(--teal)", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>↓ Download</button>}
            <select value={doc.status} onChange={e => updateStatus(doc.id, e.target.value as DocStatus)}
              style={{ background: "var(--card2)", border: "1px solid var(--bdrs)", borderRadius: 4, padding: "3px 6px", fontSize: 10, color: "var(--text)", width: "auto", flexShrink: 0 }}>
              <option value="missing">Missing</option>
              <option value="received">Received</option>
              <option value="executed">Executed</option>
              <option value="cleared">Cleared</option>
            </select>
          </div>
        </div>
      ))}

      <Modal open={showTrack} onClose={() => setShowTrack(false)} title="Track document">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Document name" required><input autoFocus value={newDoc.name} onChange={e => setNewDoc(p => ({ ...p, name: e.target.value }))} placeholder="HOA Estoppel Letter" /></Field>
          <Field label="Status"><select value={newDoc.status} onChange={e => setNewDoc(p => ({ ...p, status: e.target.value as DocStatus }))}><option value="missing">Missing</option><option value="received">Received</option><option value="executed">Executed</option></select></Field>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="primary" onClick={trackDoc}>Track document</Btn>
            <Btn variant="ghost" onClick={() => setShowTrack(false)}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Messages ──────────────────────────────────────────────────────────────────
function MessagesTab({ deal }: { deal: any }) {
  const [messages, setMessages] = useState<(Message & { sender?: any })[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setMyId(user?.id ?? null));
    loadMessages();
    const channel = supabase.channel(`messages:${deal.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `deal_id=eq.${deal.id}` }, loadMessages)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [deal.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function loadMessages() {
    const { data } = await supabase.from("messages")
      .select("*, sender:users!messages_sender_id_fkey(id,full_name,avatar_url)")
      .eq("deal_id", deal.id).order("created_at");
    setMessages(data ?? []);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !myId) return;
    setSending(true);
    await supabase.from("messages").insert({ deal_id: deal.id, sender_id: myId, body: body.trim() });
    setBody(""); setSending(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
        {messages.length === 0 && <Empty icon="💬" title="No messages yet" sub="Start the deal thread" />}
        {messages.map(msg => {
          const mine = msg.sender_id === myId;
          return (
            <div key={msg.id} style={{ display: "flex", gap: 7, marginBottom: 10, flexDirection: mine ? "row-reverse" : "row" }}>
              {!mine && <Avatar name={msg.sender?.full_name ?? "?"} size={22} url={msg.sender?.avatar_url} />}
              <div style={{ maxWidth: "72%" }}>
                {!mine && <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 2 }}>{msg.sender?.full_name}</div>}
                <div style={{ background: mine ? "var(--teal-d)" : "var(--card)", border: `1px solid ${mine ? "var(--teal-b)" : "var(--bdr)"}`, borderRadius: 8, padding: "7px 10px", fontSize: 12, lineHeight: 1.55, wordBreak: "break-word" }}>
                  {msg.body}
                </div>
                <div style={{ fontSize: 9, color: "var(--dim)", marginTop: 2, textAlign: mine ? "right" : "left", fontFamily: "monospace" }}>
                  {formatDate(msg.created_at, "h:mm a")}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} style={{ padding: "8px 12px", borderTop: "1px solid var(--bdr)", display: "flex", gap: 7, flexShrink: 0 }}>
        <input value={body} onChange={e => setBody(e.target.value)} placeholder="Message deal thread…" />
        <Btn size="sm" variant="primary" type="submit" loading={sending} disabled={!body.trim()}>Send</Btn>
      </form>
    </div>
  );
}

// ── Contacts ──────────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<ContactRole, string> = { buyer: "Buyer", seller: "Seller", buyer_agent: "Buyer Agent", seller_agent: "Seller Agent", title: "Title", lender: "Lender", inspector: "Inspector", other: "Other" };
const ROLE_COLORS: Record<ContactRole, "teal" | "amber" | "blue" | "muted"> = { buyer: "teal", seller: "amber", buyer_agent: "teal", seller_agent: "amber", title: "blue", lender: "blue", inspector: "muted", other: "muted" };

function ContactsTab({ deal }: { deal: any }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ full_name: "", role: "buyer" as ContactRole, email: "", phone: "", company: "" });
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data } = await supabase.from("contacts").select("*").eq("deal_id", deal.id).order("role");
    setContacts(data ?? []);
  }, [deal.id, supabase]);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!form.full_name) return;
    await supabase.from("contacts").insert({ ...form, deal_id: deal.id });
    setShowAdd(false);
    setForm({ full_name: "", role: "buyer", email: "", phone: "", company: "" });
    load();
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <Btn size="sm" variant="primary" onClick={() => setShowAdd(true)}>+ Add party</Btn>
      </div>
      {contacts.length === 0 && <Empty icon="👥" title="No contacts yet" sub="Add buyers, sellers, lenders, and other parties" />}
      {contacts.map(c => (
        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 9, background: "var(--card)", border: "1px solid var(--bdr)", borderRadius: 6, padding: "9px 11px", marginBottom: 5 }}>
          <Avatar name={c.full_name} size={30} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500 }}>{c.full_name}</div>
            <div style={{ fontSize: 10, color: "var(--muted)" }}>{c.company ? `${c.company} · ` : ""}{ROLE_LABELS[c.role]}</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            {c.email && <div style={{ fontSize: 10, color: "var(--teal)" }}><a href={`mailto:${c.email}`} style={{ color: "inherit" }}>{c.email}</a></div>}
            {c.phone && <div style={{ fontSize: 10, color: "var(--muted)" }}>{c.phone}</div>}
          </div>
          <Tag label={ROLE_LABELS[c.role]} color={ROLE_COLORS[c.role]} />
        </div>
      ))}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add party">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Name" required><input autoFocus value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Maria Contreras" /></Field>
          <Field label="Role"><select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value as ContactRole }))}>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Email"><input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></Field>
            <Field label="Phone"><input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></Field>
          </div>
          <Field label="Company"><input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} /></Field>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="primary" onClick={add}>Add party</Btn>
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────────
function TimelineTab({ deal }: { deal: any }) {
  const [events, setEvents] = useState<(TimelineEvent & { actor?: any })[]>([]);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("timeline_events")
      .select("*, actor:users!timeline_events_actor_id_fkey(full_name)")
      .eq("deal_id", deal.id).order("created_at", { ascending: false })
      .then(({ data }) => setEvents(data ?? []));
  }, [deal.id, supabase]);

  const ICONS: Record<string, string> = { deal_opened: "🏠", task_completed: "✅", task_added: "☑", task_reopened: "↩", document_uploaded: "📄", stage_changed: "📊", tc_reassigned: "👤", deal_closed: "🎉", dates_updated: "📅", default: "·" };

  return (
    <div style={{ padding: "10px 12px" }}>
      {events.length === 0 && <Empty icon="📅" title="No activity yet" sub="Events are logged automatically as the deal progresses" />}
      {events.map((ev, i) => (
        <div key={ev.id} style={{ display: "flex", gap: 9, paddingBottom: 10, position: "relative" }}>
          {i < events.length - 1 && <div style={{ position: "absolute", left: 10, top: 22, bottom: 0, width: 1, background: "var(--bdr)" }} />}
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--card)", border: "1px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, zIndex: 1 }}>
            {ICONS[ev.event_type] ?? ICONS.default}
          </div>
          <div style={{ paddingTop: 2, flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "var(--text)" }}>{ev.description}</div>
            <div style={{ fontSize: 9, color: "var(--dim)", fontFamily: "monospace", marginTop: 2 }}>
              {ev.actor?.full_name ? `${ev.actor.full_name} · ` : ""}{formatDate(ev.created_at, "MMM d 'at' h:mm a")}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Key dates ─────────────────────────────────────────────────────────────────
const KEY_DATE_FIELDS: { key: string; label: string }[] = [
  { key: "effective_date",              label: "Executed Contract Date" },
  { key: "emd_due_date",                label: "EMD Due Date" },
  { key: "mortgage_application_due",    label: "Mortgage Application Due" },
  { key: "inspection_period_end",       label: "Inspection Period End Date" },
  { key: "financing_approval_due",      label: "Financing Approval Due Date" },
  { key: "survey_due_date",             label: "Survey Due Date" },
  { key: "flood_insurance_contingency", label: "Flood Insurance Contingency" },
  { key: "walk_through_date",           label: "Walk-Through Date" },
  { key: "close_date",                  label: "Closing Date" },
];

// Business days between today and the target date (excludes weekends).
function businessDaysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00"); target.setHours(0, 0, 0, 0);
  if (isNaN(target.getTime())) return 999;
  const past = target < today;
  let count = 0;
  const cur = new Date(today);
  while (cur.getTime() !== target.getTime()) {
    cur.setDate(cur.getDate() + (past ? -1 : 1));
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count += past ? -1 : 1;
  }
  return count;
}

// Green = 7+ days away, Yellow = approaching (< 7 days or < 3 business days), Red = due now / overdue.
function urgency(dateStr: string): { color: string; bg: string; label: string } | null {
  if (!dateStr) return null;
  const cal = daysUntil(dateStr);
  const biz = businessDaysUntil(dateStr);
  if (biz <= 0) return { color: "#ef4444", bg: "rgba(239,68,68,0.14)", label: cal < 0 ? "Overdue" : "Due now" };
  if (biz < 3)  return { color: "#f59e0b", bg: "rgba(245,158,11,0.16)", label: biz + " business day" + (biz === 1 ? "" : "s") + " left" };
  if (cal < 7)  return { color: "#f59e0b", bg: "rgba(245,158,11,0.16)", label: cal + " days away" };
  return { color: "#22c55e", bg: "rgba(34,197,94,0.14)", label: cal + " days away" };
}

function DatesTab({ deal }: { deal: any }) {
  const [stage, setStage] = useState<string>(deal.stage);
  const [lifeSaving, setLifeSaving] = useState(false);
  const [lifeMsg, setLifeMsg] = useState("");

  async function changeStage(newStage: string) {
    setLifeSaving(true);
    setLifeMsg("");
    const res = await fetch(`/api/deals/${deal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    setLifeSaving(false);
    if (res.ok) {
      setStage(newStage);
      setLifeMsg("Stage updated");
      setTimeout(() => setLifeMsg(""), 2500);
    } else {
      setLifeMsg("Could not update stage");
    }
  }

  async function archiveDeal() {
    if (!confirm("Archive this transaction? It will be hidden from the pipeline but can be restored.")) return;
    setLifeSaving(true);
    const res = await fetch(`/api/deals/${deal.id}`, { method: "DELETE" });
    setLifeSaving(false);
    if (res.ok) {
      window.location.href = "/dashboard/deals";
    } else {
      setLifeMsg("Could not archive (admin only)");
    }
  }

  const initial: Record<string, string> = {};
  KEY_DATE_FIELDS.forEach(f => { initial[f.key] = deal[f.key] ?? ""; });
  const [form, setForm] = useState<Record<string, string>>({
    ...initial,
    sale_price: deal.sale_price ? String(deal.sale_price) : "",
    close_price: deal.close_price ? String(deal.close_price) : "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    const payload: Record<string, any> = {
      sale_price: form.sale_price ? parseFloat(form.sale_price.replace(/,/g, "")) : null,
      close_price: form.close_price ? parseFloat(form.close_price.replace(/,/g, "")) : null,
    };
    KEY_DATE_FIELDS.forEach(f => { payload[f.key] = form[f.key] || null; });
    await fetch(`/api/deals/${deal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await fetch(`/api/deals/${deal.id}/timeline`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event_type: "dates_updated", description: "Key dates updated" }) });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ padding: 16, maxWidth: 460 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <SectionLabel>Key dates</SectionLabel>
        <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--muted)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />7+ days</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />Approaching</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />Due now</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {KEY_DATE_FIELDS.map(f => {
          let u = urgency(form[f.key]);
          if (f.key === "effective_date" && form[f.key]) u = { color: "#22c55e", bg: "rgba(34,197,94,0.14)", label: "Set" };
          return (
            <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{f.label}</span>
                {u && <span style={{ fontSize: 10, fontWeight: 700, color: u.color, background: u.bg, padding: "2px 8px", borderRadius: 999 }}>{u.label}</span>}
              </div>
              <input type="date" value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ borderColor: u ? u.color : undefined, borderWidth: u ? 1 : undefined, borderStyle: u ? "solid" : undefined }} />
            </div>
          );
        })}
        <div style={{ height: 1, background: "var(--bdr)", margin: "4px 0" }} />
        <Field label="Sale price"><input value={form.sale_price} onChange={e => setForm(p => ({ ...p, sale_price: e.target.value }))} placeholder="485000" /></Field>
        <Field label="Closed Price (actual)"><input value={form.close_price} onChange={e => setForm(p => ({ ...p, close_price: e.target.value }))} placeholder="Same as sale price if not different" /></Field>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Btn variant="primary" onClick={save} loading={saving}>Save dates</Btn>
          {saved && <span style={{ fontSize: 12, color: "var(--teal)" }}>Saved ✓</span>}
        </div>
      </div>
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--bdr)" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Stage & Lifecycle</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Stage</span>
          <select value={stage} onChange={(e) => changeStage(e.target.value)} disabled={lifeSaving} style={{ background: "var(--bg)", color: "var(--fg)", border: "1px solid var(--bdr)", borderRadius: 8, padding: "8px 10px", fontSize: 14 }}>
            <option value="lead">Lead</option>
            <option value="listing">Listing</option>
            <option value="under_contract">Under Contract</option>
            <option value="clear_to_close">Clear to Close</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn variant="subtle" onClick={() => changeStage("closed")} loading={lifeSaving}>Mark as Closed</Btn>
          <Btn variant="danger" onClick={archiveDeal} loading={lifeSaving}>Archive</Btn>
        </div>
        {lifeMsg && <div style={{ fontSize: 12, color: "var(--teal)", marginTop: 8 }}>{lifeMsg}</div>}
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tag, PriorityTag, DocStatusTag, Avatar, Btn, Modal, Field, SectionLabel, Empty } from "@/components/ui";
import type { Task, Document, Message, TimelineEvent, Contact, User, TaskPriority, DocStatus, DocType, ContactRole } from "@/types";
import { formatDate, formatDateShort, isOverdue, isDueToday } from "@/lib/utils/dates";

type Tab = "checklist" | "documents" | "messages" | "timeline" | "contacts" | "dates";

const TABS: { key: Tab; label: string }[] = [
  { key: "checklist",  label: "Checklist" },
  { key: "documents",  label: "Documents" },
  { key: "messages",   label: "Messages" },
  { key: "contacts",   label: "Contacts" },
  { key: "timeline",   label: "Timeline" },
  { key: "dates",      label: "Key dates" },
];

export default function DealTabs({ dealId, deal }: { dealId: string; deal: any }) {
  const [tab, setTab] = useState<Tab>("checklist");

  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--bdr)", flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "9px 14px", fontSize: 12,
            fontWeight: tab === t.key ? 700 : 400,
            color: tab === t.key ? "var(--teal)" : "var(--muted)",
            background: "none", border: "none",
            borderBottom: `2px solid ${tab === t.key ? "var(--teal)" : "transparent"}`,
            cursor: "pointer", fontFamily: "inherit",
          }}>{t.label}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {tab === "checklist"  && <ChecklistTab dealId={dealId} deal={deal} />}
        {tab === "documents"  && <DocumentsTab dealId={dealId} deal={deal} />}
        {tab === "messages"   && <MessagesTab  dealId={dealId} deal={deal} />}
        {tab === "contacts"   && <ContactsTab  dealId={dealId} deal={deal} />}
        {tab === "timeline"   && <TimelineTab  dealId={dealId} />}
        {tab === "dates"      && <DatesTab     deal={deal} />}
      </div>
    </div>
  );
}

// ── Checklist tab ─────────────────────────────────────────────────────────────
function ChecklistTab({ dealId, deal }: { dealId: string; deal: any }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ label: "", due_date: "", priority: "medium" as TaskPriority });
  const [tcs, setTcs] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadTasks();
    supabase.from("users").select("*").eq("brokerage_id", deal.brokerage_id).in("role", ["tc", "admin"]).then(({ data }) => setTcs(data ?? []));
  }, [dealId]);

  async function loadTasks() {
    const { data } = await supabase.from("tasks").select("*, assignee:users!tasks_assignee_id_fkey(full_name,avatar_url)").eq("deal_id", dealId).order("sort_order").order("created_at");
    setTasks(data ?? []);
  }

  async function toggle(task: Task) {
    const newStatus = task.status === "completed" ? "open" : "completed";
    await supabase.from("tasks").update({ status: newStatus, completed_at: newStatus === "completed" ? new Date().toISOString() : null }).eq("id", task.id);
    await supabase.from("timeline_events").insert({ deal_id: dealId, brokerage_id: deal.brokerage_id, event_type: "task_updated", description: `Task "${task.label}" marked ${newStatus}` });
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus as any } : t));
  }

  async function addTask() {
    if (!newTask.label) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("tasks").insert({
      deal_id: dealId, brokerage_id: deal.brokerage_id,
      label: newTask.label, due_date: newTask.due_date || null,
      priority: newTask.priority, status: "open", sort_order: tasks.length,
    });
    setNewTask({ label: "", due_date: "", priority: "medium" });
    setShowAdd(false);
    setSaving(false);
    loadTasks();
  }

  const open = tasks.filter(t => t.status === "open");
  const done = tasks.filter(t => t.status !== "open");

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>{done.length}/{tasks.length} complete</div>
        <Btn size="sm" variant="primary" onClick={() => setShowAdd(true)}>+ Add task</Btn>
      </div>

      {open.map(task => <TaskRow key={task.id} task={task} onToggle={() => toggle(task)} />)}
      {done.length > 0 && (
        <>
          <div style={{ fontSize: 9, color: "var(--dim)", fontFamily: "monospace", margin: "12px 0 6px", letterSpacing: 0.5 }}>COMPLETED</div>
          {done.map(task => <TaskRow key={task.id} task={task} onToggle={() => toggle(task)} />)}
        </>
      )}
      {tasks.length === 0 && <Empty icon="☑" title="No tasks yet" sub="Add tasks or apply a checklist template" />}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add task">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Task name" required><input autoFocus value={newTask.label} onChange={e => setNewTask(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Request HOA documents" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Due date"><input type="date" value={newTask.due_date} onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))} /></Field>
            <Field label="Priority">
              <select value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value as TaskPriority }))}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </Field>
          </div>
          <Btn variant="primary" onClick={addTask} loading={saving}>Add task</Btn>
        </div>
      </Modal>
    </div>
  );
}

function TaskRow({ task, onToggle }: { task: Task & { assignee?: any }; onToggle: () => void }) {
  const done = task.status === "completed";
  const over = !done && task.due_date && isOverdue(task.due_date);
  const today = !done && !over && task.due_date && isDueToday(task.due_date);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--card)", border: "1px solid var(--bdr)", borderRadius: 5, padding: "7px 9px", marginBottom: 4 }}>
      <div onClick={onToggle} style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${done ? "var(--teal)" : "var(--bdrs)"}`, background: done ? "var(--teal)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 9, color: "#0a1412", flexShrink: 0 }}>
        {done ? "✓" : ""}
      </div>
      <span style={{ flex: 1, fontSize: 11, color: done ? "var(--dim)" : "var(--text)", textDecoration: done ? "line-through" : "none" }}>{task.label}</span>
      {!done && <PriorityTag priority={task.priority} />}
      {task.due_date && (
        <span style={{ fontSize: 9, fontFamily: "monospace", color: over ? "var(--rose)" : today ? "var(--amber)" : "var(--muted)", whiteSpace: "nowrap" }}>
          {formatDateShort(task.due_date)}
        </span>
      )}
      {task.assignee && <Avatar name={task.assignee.full_name} size={16} url={task.assignee.avatar_url} />}
    </div>
  );
}

// ── Documents tab ─────────────────────────────────────────────────────────────
function DocumentsTab({ dealId, deal }: { dealId: string; deal: any }) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newDoc, setNewDoc] = useState({ name: "", doc_type: "other" as DocType, status: "received" as DocStatus });
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => { loadDocs(); }, [dealId]);

  async function loadDocs() {
    const { data } = await supabase.from("documents").select("*, uploader:users!documents_uploaded_by_fkey(full_name)").eq("deal_id", dealId).order("created_at", { ascending: false });
    setDocs(data ?? []);
  }

  async function uploadFile(file: File) {
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const path = `${deal.brokerage_id}/${dealId}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from("deal-documents").upload(path, file);
    if (upErr) { setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("deal-documents").getPublicUrl(path);
    await supabase.from("documents").insert({
      deal_id: dealId, brokerage_id: deal.brokerage_id,
      name: file.name, file_url: path, file_size_bytes: file.size,
      doc_type: "other", status: "received",
      uploaded_by: user?.id, uploaded_at: new Date().toISOString(),
    });
    await supabase.from("timeline_events").insert({ deal_id: dealId, brokerage_id: deal.brokerage_id, event_type: "document_uploaded", description: `Document uploaded: ${file.name}`, user_id: user?.id });
    setUploading(false);
    loadDocs();
  }

  async function addDocEntry() {
    if (!newDoc.name) return;
    await supabase.from("documents").insert({ deal_id: dealId, brokerage_id: deal.brokerage_id, name: newDoc.name, doc_type: newDoc.doc_type, status: newDoc.status });
    setShowAdd(false);
    setNewDoc({ name: "", doc_type: "other", status: "received" });
    loadDocs();
  }

  async function updateStatus(id: string, status: DocStatus) {
    await supabase.from("documents").update({ status }).eq("id", id);
    setDocs(prev => prev.map(d => d.id === id ? { ...d, status } : d));
  }

  async function getDownloadUrl(fileUrl: string): Promise<string> {
    const { data } = await supabase.storage.from("deal-documents").createSignedUrl(fileUrl, 3600);
    return data?.signedUrl ?? "#";
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
        <input ref={fileRef} type="file" multiple style={{ display: "none" }}
          onChange={e => { Array.from(e.target.files ?? []).forEach(uploadFile); e.target.value = ""; }} />
        <Btn size="sm" variant="primary" loading={uploading} onClick={() => fileRef.current?.click()}>⬆ Upload file</Btn>
        <Btn size="sm" variant="ghost" onClick={() => setShowAdd(true)}>+ Track document</Btn>
      </div>

      {docs.length === 0 && !uploading && <Empty icon="📄" title="No documents yet" sub="Upload files or track required documents" />}

      {docs.map(doc => (
        <div key={doc.id} style={{ background: "var(--card)", border: "1px solid var(--bdr)", borderRadius: 6, overflow: "hidden", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px" }}>
            <span style={{ fontSize: 18 }}>{doc.status === "missing" ? "🚫" : "📄"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
              <div style={{ fontSize: 9, color: "var(--dim)", fontFamily: "monospace" }}>
                {doc.file_size_bytes ? `${Math.round(doc.file_size_bytes / 1024)}KB · ` : ""}{formatDate(doc.uploaded_at ?? doc.created_at)}
              </div>
            </div>
            <select value={doc.status} onChange={e => updateStatus(doc.id, e.target.value as DocStatus)}
              style={{ background: "var(--card2)", border: "1px solid var(--bdrs)", borderRadius: 4, padding: "3px 6px", fontSize: 10, color: "var(--text)", width: "auto" }}>
              <option value="missing">Missing</option>
              <option value="received">Received</option>
              <option value="executed">Executed</option>
              <option value="waived">Waived</option>
            </select>
          </div>
        </div>
      ))}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Track document">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Document name" required><input autoFocus value={newDoc.name} onChange={e => setNewDoc(p => ({ ...p, name: e.target.value }))} placeholder="HOA Estoppel Letter" /></Field>
          <Field label="Status">
            <select value={newDoc.status} onChange={e => setNewDoc(p => ({ ...p, status: e.target.value as DocStatus }))}>
              <option value="missing">Missing</option>
              <option value="received">Received</option>
              <option value="executed">Executed</option>
            </select>
          </Field>
          <Btn variant="primary" onClick={addDocEntry}>Add document</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ── Messages tab ──────────────────────────────────────────────────────────────
function MessagesTab({ dealId, deal }: { dealId: string; deal: any }) {
  const [messages, setMessages] = useState<(Message & { sender?: any })[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setMyId(user?.id ?? null));
    loadMessages();
    const channel = supabase.channel(`messages:${dealId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `deal_id=eq.${dealId}` }, () => loadMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [dealId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function loadMessages() {
    const { data } = await supabase.from("messages").select("*, sender:users!messages_sender_id_fkey(full_name,avatar_url)").eq("deal_id", dealId).order("created_at");
    setMessages(data ?? []);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !myId) return;
    setSending(true);
    await supabase.from("messages").insert({ deal_id: dealId, brokerage_id: deal.brokerage_id, sender_id: myId, body: body.trim() });
    setBody("");
    setSending(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
        {messages.length === 0 && <Empty icon="💬" title="No messages yet" sub="Send the first message on this deal" />}
        {messages.map(msg => {
          const mine = msg.sender_id === myId;
          return (
            <div key={msg.id} style={{ display: "flex", gap: 7, marginBottom: 10, flexDirection: mine ? "row-reverse" : "row" }}>
              {!mine && <Avatar name={msg.sender?.full_name ?? "?"} size={22} url={msg.sender?.avatar_url} />}
              <div style={{ maxWidth: "70%" }}>
                {!mine && <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 2 }}>{msg.sender?.full_name}</div>}
                <div style={{ background: mine ? "var(--teal-d)" : "var(--card)", border: `1px solid ${mine ? "var(--teal-b)" : "var(--bdr)"}`, borderRadius: 8, padding: "7px 10px", fontSize: 12, lineHeight: 1.55 }}>
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
      <form onSubmit={send} style={{ padding: "8px 12px", borderTop: "1px solid var(--bdr)", display: "flex", gap: 7 }}>
        <input value={body} onChange={e => setBody(e.target.value)} placeholder="Message…" style={{ flex: 1 }} />
        <Btn size="sm" variant="primary" type="submit" loading={sending} disabled={!body.trim()}>Send</Btn>
      </form>
    </div>
  );
}

// ── Contacts tab ──────────────────────────────────────────────────────────────
function ContactsTab({ dealId, deal }: { dealId: string; deal: any }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newContact, setNewContact] = useState({ full_name: "", role: "buyer" as ContactRole, email: "", phone: "", company: "" });
  const supabase = createClient();

  useEffect(() => { load(); }, [dealId]);

  async function load() {
    const { data } = await supabase.from("contacts").select("*").eq("deal_id", dealId).order("role");
    setContacts(data ?? []);
  }

  async function addContact() {
    if (!newContact.full_name) return;
    await supabase.from("contacts").insert({ ...newContact, deal_id: dealId, brokerage_id: deal.brokerage_id });
    setShowAdd(false);
    setNewContact({ full_name: "", role: "buyer", email: "", phone: "", company: "" });
    load();
  }

  const ROLE_LABELS: Record<ContactRole, string> = { buyer:"Buyer", seller:"Seller", buyer_agent:"Buyer Agent", seller_agent:"Seller Agent", title:"Title", lender:"Lender", inspector:"Inspector", appraiser:"Appraiser", hoa:"HOA", attorney:"Attorney", other:"Other" };

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <Btn size="sm" variant="primary" onClick={() => setShowAdd(true)}>+ Add party</Btn>
      </div>
      {contacts.length === 0 && <Empty icon="👥" title="No contacts yet" sub="Add buyers, sellers, and other parties" />}
      {contacts.map(c => (
        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 9, background: "var(--card)", border: "1px solid var(--bdr)", borderRadius: 6, padding: "9px 11px", marginBottom: 5 }}>
          <Avatar name={c.full_name} size={30} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500 }}>{c.full_name}</div>
            <div style={{ fontSize: 10, color: "var(--muted)" }}>{c.company ? `${c.company} · ` : ""}{ROLE_LABELS[c.role]}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            {c.email && <div style={{ fontSize: 10, color: "var(--teal)" }}>{c.email}</div>}
            {c.phone && <div style={{ fontSize: 10, color: "var(--muted)" }}>{c.phone}</div>}
          </div>
        </div>
      ))}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add party">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Name" required><input autoFocus value={newContact.full_name} onChange={e => setNewContact(p => ({ ...p, full_name: e.target.value }))} /></Field>
          <Field label="Role"><select value={newContact.role} onChange={e => setNewContact(p => ({ ...p, role: e.target.value as ContactRole }))}>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Email"><input type="email" value={newContact.email} onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))} /></Field>
            <Field label="Phone"><input type="tel" value={newContact.phone} onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))} /></Field>
          </div>
          <Field label="Company"><input value={newContact.company} onChange={e => setNewContact(p => ({ ...p, company: e.target.value }))} /></Field>
          <Btn variant="primary" onClick={addContact}>Add party</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ── Timeline tab ──────────────────────────────────────────────────────────────
function TimelineTab({ dealId }: { dealId: string }) {
  const [events, setEvents] = useState<(TimelineEvent & { user?: any })[]>([]);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("timeline_events").select("*, user:users!timeline_events_user_id_fkey(full_name)").eq("deal_id", dealId).order("created_at", { ascending: false }).then(({ data }) => setEvents(data ?? []));
  }, [dealId]);

  const ICONS: Record<string, string> = { deal_opened: "🏠", task_updated: "☑", document_uploaded: "📄", stage_changed: "📊", message_sent: "💬", default: "·" };

  return (
    <div style={{ padding: "10px 12px" }}>
      {events.length === 0 && <Empty icon="📅" title="No activity yet" sub="Events will appear here as the deal progresses" />}
      {events.map((ev, i) => (
        <div key={ev.id} style={{ display: "flex", gap: 9, paddingBottom: i < events.length - 1 ? 12 : 0, position: "relative" }}>
          {i < events.length - 1 && <div style={{ position: "absolute", left: 10, top: 20, bottom: 0, width: 1, background: "var(--bdr)" }} />}
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--card)", border: "1px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, zIndex: 1 }}>
            {ICONS[ev.event_type] ?? ICONS.default}
          </div>
          <div style={{ paddingTop: 2 }}>
            <div style={{ fontSize: 11, color: "var(--text)" }}>{ev.description}</div>
            <div style={{ fontSize: 9, color: "var(--dim)", fontFamily: "monospace", marginTop: 2 }}>
              {ev.user?.full_name ? `${ev.user.full_name} · ` : ""}{formatDate(ev.created_at, "MMM d 'at' h:mm a")}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Key dates tab ─────────────────────────────────────────────────────────────
function DatesTab({ deal }: { deal: any }) {
  const [form, setForm] = useState({ close_date: deal.close_date ?? "", effective_date: deal.effective_date ?? "", sale_price: deal.sale_price ? String(deal.sale_price) : "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  async function save() {
    setSaving(true);
    await supabase.from("deals").update({ close_date: form.close_date || null, effective_date: form.effective_date || null, sale_price: form.sale_price ? parseFloat(form.sale_price) : null }).eq("id", deal.id);
    await supabase.from("timeline_events").insert({ deal_id: deal.id, brokerage_id: deal.brokerage_id, event_type: "dates_updated", description: "Key dates updated" });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div style={{ padding: 16, maxWidth: 400 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Effective date"><input type="date" value={form.effective_date} onChange={e => setForm(p => ({ ...p, effective_date: e.target.value }))} /></Field>
        <Field label="Close date"><input type="date" value={form.close_date} onChange={e => setForm(p => ({ ...p, close_date: e.target.value }))} /></Field>
        <Field label="Sale price"><input value={form.sale_price} onChange={e => setForm(p => ({ ...p, sale_price: e.target.value }))} placeholder="485000" /></Field>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Btn variant="primary" onClick={save} loading={saving}>Save dates</Btn>
          {saved && <span style={{ fontSize: 11, color: "var(--teal)" }}>✓ Saved</span>}
        </div>
      </div>
    </div>
  );
}

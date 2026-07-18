"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, Tag } from "@/components/ui";
import Topbar from "@/components/layout/Topbar";
import Link from "next/link";
import type { Contact, ContactRole } from "@/types";

const ROLE_LABELS: Record<ContactRole, string> = { buyer: "Buyer", seller: "Seller", buyer_agent: "Buyer Agent", seller_agent: "Seller Agent", title: "Title", lender: "Lender", inspector: "Inspector", other: "Other" };
const ROLE_COLORS: Record<ContactRole, "teal"|"amber"|"blue"|"muted"> = { buyer: "teal", seller: "amber", buyer_agent: "teal", seller_agent: "amber", title: "blue", lender: "blue", inspector: "muted", other: "muted" };

export default function ContactsPage() {
  const [contacts, setContacts] = useState<(Contact & { deal?: any })[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<ContactRole | "all">("all");
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: bm } = await supabase.from("brokerage_members").select("brokerage_id").eq("user_id", user!.id).eq("is_active", true).single();
      // Get all contacts via deals in this brokerage
      const { data } = await supabase.from("contacts")
        .select("*, deal:deals!contacts_deal_id_fkey(id,address)")
        .in("deal_id", (await supabase.from("deals").select("id").eq("brokerage_id", bm!.brokerage_id).is("archived_at", null)).data?.map(d => d.id) ?? [])
        .order("full_name") as any;
      setContacts(data ?? []);
    }
    load();
  }, []);

  const filtered = contacts
    .filter(c => roleFilter === "all" || c.role === roleFilter)
    .filter(c => !search || c.full_name.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()));

  const ROLES: (ContactRole | "all")[] = ["all", "buyer", "seller", "buyer_agent", "seller_agent", "title", "lender"];

  return (
    <>
      <Topbar title="Contacts" search={{ placeholder: "Search contacts…", value: search, onChange: setSearch }} />
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {ROLES.map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 500, border: "1px solid var(--bdrs)", cursor: "pointer", fontFamily: "inherit", background: roleFilter === r ? "var(--teal-d)" : "transparent", color: roleFilter === r ? "var(--teal)" : "var(--muted)", borderColor: roleFilter === r ? "var(--teal-b)" : "var(--bdrs)" }}>
              {r === "all" ? "All" : ROLE_LABELS[r]}
            </button>
          ))}
        </div>
        {filtered.length === 0 && <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)", fontSize: 13 }}>No contacts found</div>}
        {filtered.map(c => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, marginBottom: 6 }}>
            <Avatar name={c.full_name} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{c.full_name}</div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>
                {c.company ? `${c.company} · ` : ""}
                {c.deal && <Link href={`/dashboard/deals/${c.deal.id}`} style={{ color: "var(--teal)" }}>{c.deal.address}</Link>}
              </div>
            </div>
            <div style={{ textAlign: "right", marginRight: 8 }}>
              {c.email && <div style={{ fontSize: 10, color: "var(--teal)" }}><a href={`mailto:${c.email}`} style={{ color: "inherit" }}>{c.email}</a></div>}
              {c.phone && <div style={{ fontSize: 10, color: "var(--muted)" }}>{c.phone}</div>}
            </div>
            <Tag label={ROLE_LABELS[c.role]} color={ROLE_COLORS[c.role]} />
          </div>
        ))}
      </div>
    </>
  );
}

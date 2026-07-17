"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Avatar, Tag } from "@/components/ui";
import Topbar from "@/components/layout/Topbar";
import type { Contact, ContactRole } from "@/types";

const ROLE_LABELS: Record<ContactRole, string> = { buyer:"Buyer", seller:"Seller", buyer_agent:"Buyer Agent", seller_agent:"Seller Agent", title:"Title", lender:"Lender", inspector:"Inspector", appraiser:"Appraiser", hoa:"HOA", attorney:"Attorney", other:"Other" };
const ROLE_COLORS: Record<ContactRole, "teal" | "amber" | "blue" | "muted"> = { buyer:"teal", seller:"amber", buyer_agent:"teal", seller_agent:"amber", title:"blue", lender:"blue", inspector:"muted", appraiser:"muted", hoa:"muted", attorney:"muted", other:"muted" };

export default function ContactsPage() {
  const [contacts, setContacts] = useState<(Contact & { deals?: any })[]>([]);
  const [search, setSearch] = useState("");
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("users").select("brokerage_id").eq("id", user!.id).single();
      const { data } = await supabase.from("contacts").select("*, deals(address)").eq("brokerage_id", profile!.brokerage_id).order("full_name");
      setContacts(data ?? []);
    }
    load();
  }, []);

  const filtered = search
    ? contacts.filter(c => c.full_name.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()))
    : contacts;

  return (
    <>
      <Topbar title="Contacts" search={{ placeholder: "Search contacts…", value: search, onChange: setSearch }} />
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)", fontSize: 13 }}>
            No contacts yet — they appear as you add parties to deals.
          </div>
        )}
        {filtered.map(c => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", background: "var(--panel)", border: "1px solid var(--bdr)", borderRadius: 8, marginBottom: 6 }}>
            <Avatar name={c.full_name} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{c.full_name}</div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>
                {c.company ? `${c.company} · ` : ""}
                {(c as any).deals?.address}
              </div>
            </div>
            {c.email && <div style={{ fontSize: 10, color: "var(--teal)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{c.email}</div>}
            {c.phone && <div style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap" }}>{c.phone}</div>}
            <Tag label={ROLE_LABELS[c.role]} color={ROLE_COLORS[c.role]} />
          </div>
        ))}
      </div>
    </>
  );
}

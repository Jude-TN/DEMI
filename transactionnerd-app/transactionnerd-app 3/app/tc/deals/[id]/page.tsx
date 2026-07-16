import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { emailDomain, STATUS_LABELS, type Transaction } from "@/lib/types";
import StreamFeed from "@/components/StreamFeed";
import EmailAddressBox from "@/components/EmailAddressBox";
import Checklists from "@/components/Checklists";
import AgentManager from "@/components/AgentManager";
import type { Checklist } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TCDealPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: transaction } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!transaction) {
    return <div className="p-8 text-[13px] text-charcoal">Transaction not found.</div>;
  }

  const t = transaction as Transaction;

  const { data: checklistRows } = await supabase
    .from("checklists")
    .select("*")
    .eq("transaction_id", t.id)
    .order("position");

  const checklistIds = (checklistRows || []).map((c) => c.id);
  const { data: allItems } = checklistIds.length
    ? await supabase.from("checklist_items").select("*").in("checklist_id", checklistIds).order("position")
    : { data: [] };

  const checklists: Checklist[] = (checklistRows || []).map((c) => ({
    ...c,
    items: (allItems || []).filter((i) => i.checklist_id === c.id),
  }));

  const { data: templates } = await supabase.from("checklist_templates").select("id, title").order("title");

  const { data: links } = await supabase
    .from("transaction_agents")
    .select("agent_id, profiles(id, full_name, email)")
    .eq("transaction_id", t.id);
  const linkedAgents = (links || []).map((l: any) => l.profiles).filter(Boolean);

  const { data: allAgents } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "agent")
    .order("full_name");

  const { data: stream } = await supabase
    .from("stream_entries")
    .select("*")
    .eq("transaction_id", t.id)
    .order("created_at", { ascending: false });

  const fullEmail = `${t.email_slug}@${emailDomain()}`;

  return (
    <div className="min-h-screen bg-off">
      <div className="bg-charcoal px-6 py-3 flex items-center justify-between">
        <div className="text-[11px] text-white/60">
          <Link href="/tc/board" className="hover:text-white">
            &larr; Board
          </Link>{" "}
          / <span className="text-white">{t.address}</span>
        </div>
        <span className="bg-teal/20 text-teal text-[10px] font-medium px-2.5 py-1 rounded-md">
          {STATUS_LABELS[t.status]}
        </span>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
        <div className="space-y-3">
          <EmailAddressBox email={fullEmail} />
          <Checklists
            transactionId={t.id}
            checklists={checklists}
            templates={templates || []}
            editable={true}
          />
          <AgentManager transactionId={t.id} linkedAgents={linkedAgents} allAgents={allAgents || []} />
        </div>

        <div className="bg-white border border-line rounded-xl p-4">
          <StreamFeed transactionId={t.id} entries={stream || []} canPost={true} />
        </div>
      </div>
    </div>
  );
}

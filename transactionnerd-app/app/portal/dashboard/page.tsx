import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SERVICE_LABELS, type Transaction } from "@/lib/types";
import ProgressBar from "@/components/ProgressBar";
import StatusBadge from "@/components/StatusBadge";
import SignOutButton from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function AgentDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();

  const { data: links } = await supabase
    .from("transaction_agents")
    .select("transaction_id, transactions(*)")
    .eq("agent_id", user!.id);

  const transactions = (links || [])
    .map((l: any) => l.transactions as Transaction)
    .filter(Boolean)
    .sort((a, b) => (a.status === "closed" ? 1 : -1));

  const transactionIds = transactions.map((t) => t.id);
  const { data: checklistRows } = transactionIds.length
    ? await supabase.from("checklists").select("id, transaction_id").in("transaction_id", transactionIds)
    : { data: [] };
  const checklistToTxn = new Map((checklistRows || []).map((c) => [c.id, c.transaction_id]));
  const checklistIds = (checklistRows || []).map((c) => c.id);
  const { data: items } = checklistIds.length
    ? await supabase.from("checklist_items").select("checklist_id, done").in("checklist_id", checklistIds)
    : { data: [] };

  const taskCounts = new Map<string, { done: number; total: number }>();
  (items || []).forEach((item) => {
    const txnId = checklistToTxn.get(item.checklist_id);
    if (!txnId) return;
    const c = taskCounts.get(txnId) || { done: 0, total: 0 };
    c.total += 1;
    if (item.done) c.done += 1;
    taskCounts.set(txnId, c);
  });

  const activeCount = transactions.filter((t) => t.status !== "closed").length;

  return (
    <div className="min-h-screen bg-off">
      <div className="bg-charcoal px-6 py-3 flex items-center justify-between">
        <div className="font-display text-base font-semibold text-white">
          Transaction<span className="text-teal">Nerd</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/60">{profile?.full_name}</span>
          <div className="w-6 h-6 rounded-full bg-sage flex items-center justify-center text-[9px] font-medium text-charcoal">
            {profile?.full_name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="w-px h-4 bg-white/15 mx-1" />
          <SignOutButton light />
        </div>
      </div>

      <div className="p-5 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[14px] font-medium text-charcoal">Your transactions</div>
          <span className="bg-teal/10 text-teal-dark text-[10px] px-2.5 py-1 rounded-md">{activeCount} active</span>
        </div>

        <div className="space-y-2.5">
          {transactions.map((t) => {
            const counts = taskCounts.get(t.id);
            const pct = counts && counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
            const status = t.status === "closed" ? "complete" : "on_track";
            return (
              <Link
                key={t.id}
                href={`/portal/deals/${t.id}`}
                className="grid grid-cols-[1.4fr_1fr_auto] items-center gap-3 bg-white border border-line rounded-xl p-4 hover:border-teal/50 transition-colors"
              >
                <div>
                  <div className="text-[12px] font-medium text-charcoal">{t.address}</div>
                  <div className="text-[9.5px] text-charcoal/60 mt-0.5">{SERVICE_LABELS[t.service_type]}</div>
                </div>
                <div>
                  <ProgressBar percent={pct} />
                  <div className="text-[9px] text-charcoal/60 mt-1">
                    {counts ? `${counts.done} of ${counts.total} tasks` : "No tasks yet"}
                  </div>
                </div>
                <StatusBadge status={status as any} />
              </Link>
            );
          })}
          {transactions.length === 0 && (
            <div className="text-[11px] text-charcoal/50 text-center py-8">
              No transactions yet. Your TC team will add you once a deal is submitted.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

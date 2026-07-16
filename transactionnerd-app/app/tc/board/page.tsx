import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, SERVICE_LABELS, type Transaction, type TransactionStatus } from "@/lib/types";
import ProgressBar from "@/components/ProgressBar";

export const dynamic = "force-dynamic";

export default async function TCBoardPage() {
  const supabase = createClient();

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: checklistRows } = await supabase.from("checklists").select("id, transaction_id");
  const checklistToTxn = new Map((checklistRows || []).map((c) => [c.id, c.transaction_id]));
  const { data: items } = await supabase.from("checklist_items").select("checklist_id, done");

  const taskCounts = new Map<string, { done: number; total: number }>();
  (items || []).forEach((item) => {
    const txnId = checklistToTxn.get(item.checklist_id);
    if (!txnId) return;
    const c = taskCounts.get(txnId) || { done: 0, total: 0 };
    c.total += 1;
    if (item.done) c.done += 1;
    taskCounts.set(txnId, c);
  });

  const columns: TransactionStatus[] = ["new", "under_contract", "pending_close", "closed"];
  const grouped = new Map<TransactionStatus, Transaction[]>(columns.map((c) => [c, []]));
  (transactions || []).forEach((t) => grouped.get(t.status as TransactionStatus)?.push(t as Transaction));

  return (
    <div className="min-h-screen bg-off">
      <div className="bg-charcoal px-6 py-3 flex items-center justify-between">
        <div className="font-display text-base font-semibold text-white">
          Transaction<span className="text-teal">Nerd</span>{" "}
          <span className="font-sans text-[10px] text-white/50 font-normal">/ TC board</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/60">{transactions?.length || 0} deals</span>
          <Link
            href="/tc/deals/new"
            className="bg-teal text-white text-[10px] font-medium px-3 py-1.5 rounded-md"
          >
            + New transaction
          </Link>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {columns.map((col) => (
          <div key={col} className="bg-line/40 rounded-xl p-2.5">
            <div className="text-[10px] font-medium text-charcoal uppercase tracking-wide mb-2 px-1">
              {STATUS_LABELS[col]} <span className="text-charcoal/50">&middot; {grouped.get(col)?.length || 0}</span>
            </div>
            <div className="space-y-2">
              {grouped.get(col)?.map((t) => {
                const counts = taskCounts.get(t.id);
                const pct = counts && counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
                return (
                  <Link
                    key={t.id}
                    href={`/tc/deals/${t.id}`}
                    className="block bg-white border border-line rounded-lg p-2.5 hover:border-teal/50 transition-colors"
                  >
                    <div className="text-[11px] font-medium text-charcoal">{t.address}</div>
                    <div className="text-[9.5px] text-charcoal/60 mt-1 mb-1.5">{SERVICE_LABELS[t.service_type]}</div>
                    {counts && counts.total > 0 && (
                      <>
                        <ProgressBar percent={pct} />
                        <div className="text-[9px] text-charcoal/50 mt-1">
                          {counts.done} of {counts.total} tasks
                        </div>
                      </>
                    )}
                  </Link>
                );
              })}
              {grouped.get(col)?.length === 0 && (
                <div className="text-[10px] text-charcoal/40 px-1 py-2">No deals here</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

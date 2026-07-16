import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, type Transaction, type StreamEntry } from "@/lib/types";
import StreamFeed from "@/components/StreamFeed";
import { summarizeWeek } from "@/lib/ai";

export const dynamic = "force-dynamic";

export default async function AgentDealPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: transaction } = await supabase.from("transactions").select("*").eq("id", params.id).single();
  if (!transaction) {
    return <div className="p-8 text-[13px] text-charcoal">Transaction not found.</div>;
  }
  const t = transaction as Transaction;

  const { data: stream } = await supabase
    .from("stream_entries")
    .select("*")
    .eq("transaction_id", t.id)
    .order("created_at", { ascending: false });

  const entries = (stream || []) as StreamEntry[];

  // Summarize the most recent entries (oldest to newest) for the top banner.
  const recentAsc = [...entries].slice(0, 6).reverse().map((e) => e.content);
  let summary = "";
  try {
    summary = await summarizeWeek(recentAsc);
  } catch {
    summary = "Summary unavailable right now. See the full stream below for the latest.";
  }

  return (
    <div className="min-h-screen bg-off">
      <div className="bg-charcoal px-6 py-3 flex items-center justify-between">
        <div className="text-[11px] text-white/60">
          <Link href="/portal/dashboard" className="hover:text-white">
            &larr; Dashboard
          </Link>{" "}
          / <span className="text-white">{t.address}</span>
        </div>
        <span className="bg-teal/20 text-teal text-[10px] font-medium px-2.5 py-1 rounded-md">
          {STATUS_LABELS[t.status]}
        </span>
      </div>

      <div className="p-5 max-w-2xl mx-auto space-y-4">
        <div className="bg-teal/5 border border-teal/20 rounded-xl p-4">
          <div className="text-[9px] uppercase tracking-wide text-teal mb-1">This week's summary</div>
          <div className="text-[11px] text-charcoal leading-relaxed">{summary}</div>
        </div>

        <div className="bg-white border border-line rounded-xl p-4">
          <StreamFeed transactionId={t.id} entries={entries} canPost={false} />
        </div>
      </div>
    </div>
  );
}

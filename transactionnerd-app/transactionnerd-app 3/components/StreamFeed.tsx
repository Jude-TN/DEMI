"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { StreamEntry } from "@/lib/types";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs < 1) return "Just now";
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function StreamFeed({
  transactionId,
  entries: initialEntries,
  canPost,
}: {
  transactionId: string;
  entries: StreamEntry[];
  canPost: boolean;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const supabase = createClient();

  const post = async () => {
    if (!draft.trim()) return;
    setPosting(true);
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("stream_entries")
      .insert({
        transaction_id: transactionId,
        source: "manual",
        author_id: userData.user?.id,
        content: draft.trim(),
      })
      .select()
      .single();
    if (!error && data) {
      setEntries([data as StreamEntry, ...entries]);
      setDraft("");
    }
    setPosting(false);
  };

  return (
    <div>
      <div className="text-[11px] font-medium text-charcoal mb-3">Stream</div>

      {canPost && (
        <div className="mb-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Post an update to the stream..."
            rows={2}
            className="w-full text-[10.5px] border border-line rounded-md px-2.5 py-2 bg-off placeholder:text-charcoal/40 focus:outline-none focus:ring-1 focus:ring-teal"
          />
          <button
            onClick={post}
            disabled={posting || !draft.trim()}
            className="mt-1.5 text-[10px] font-medium bg-teal text-white px-3 py-1.5 rounded-md disabled:opacity-50"
          >
            {posting ? "Posting..." : "Post update"}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {entries.length === 0 && (
          <div className="text-[10.5px] text-charcoal/50">No activity yet.</div>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className="flex gap-2">
            <div
              className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-medium ${
                entry.source === "email" ? "bg-teal/15 text-teal" : "bg-sage text-charcoal"
              }`}
            >
              {entry.source === "email" ? "✉" : "TC"}
            </div>
            <div>
              <div className="text-[10.5px] text-charcoal leading-snug">{entry.content}</div>
              <div className="text-[9px] text-charcoal/50">
                {entry.source === "email" ? "From email" : "Manual update"} &middot; {timeAgo(entry.created_at)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";

export default function EmailAddressBox({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="bg-white border border-line rounded-xl p-4">
      <div className="text-[9px] uppercase tracking-wide text-teal mb-1">Transaction email</div>
      <button
        onClick={copy}
        className="w-full flex items-center gap-2 bg-off border border-dashed border-line/80 rounded-md px-2.5 py-2 text-left"
      >
        <span className="text-[11px] text-charcoal font-mono truncate">{email}</span>
        <span className="ml-auto text-[9px] text-charcoal/50 flex-shrink-0">{copied ? "Copied" : "Copy"}</span>
      </button>
      <div className="text-[9.5px] text-charcoal/60 mt-1.5">
        CC this on any email about the deal. It auto-summarizes into the stream.
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SERVICE_LABELS, type ServiceType } from "@/lib/types";

const DEFAULT_CHECKLIST_ITEMS: Record<ServiceType, string[]> = {
  listing_coordination: [
    "MLS entry and syndication",
    "Listing agreement and disclosures signed",
    "Showing and lockbox setup",
    "Marketing checklist coordination",
  ],
  contract_to_close: [
    "Order title commitment",
    "Send inspection report to lender",
    "Confirm appraisal scheduled",
    "Order HOA estoppel",
    "Schedule final walkthrough",
  ],
  write_an_offer: ["Draft offer", "Attach addenda and disclosures", "Submit to listing agent"],
};

export default function NewTransactionPage() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("contract_to_close");
  const [closingDate, setClosingDate] = useState("");
  const [includeChecklist, setIncludeChecklist] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;
    setSaving(true);
    setError("");

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: address.trim(),
        service_type: serviceType,
        closing_date: closingDate || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Something went wrong");
      setSaving(false);
      return;
    }

    if (includeChecklist) {
      await fetch("/api/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_id: data.transaction.id,
          title: `${SERVICE_LABELS[serviceType]} · standard`,
          items: DEFAULT_CHECKLIST_ITEMS[serviceType],
        }),
      });
    }

    router.push(`/tc/deals/${data.transaction.id}`);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-off">
      <div className="bg-charcoal px-6 py-3">
        <div className="text-[11px] text-white/60">
          <Link href="/tc/board" className="hover:text-white">
            &larr; Board
          </Link>{" "}
          / <span className="text-white">New transaction</span>
        </div>
      </div>

      <div className="p-5 max-w-md mx-auto">
        <div className="text-[14px] font-medium text-charcoal mb-4">New transaction</div>

        <form onSubmit={submit} className="bg-white border border-line rounded-xl p-5">
          <label className="block text-[10px] uppercase tracking-wide text-charcoal/60 mb-1">
            Property address
          </label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="88 Bimini Ave, Cape Coral"
            required
            className="w-full text-[13px] border border-line rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring-1 focus:ring-teal"
          />

          <label className="block text-[10px] uppercase tracking-wide text-charcoal/60 mb-1">Service type</label>
          <div className="flex flex-col gap-1.5 mb-4">
            {(Object.keys(SERVICE_LABELS) as ServiceType[]).map((key) => (
              <button
                type="button"
                key={key}
                onClick={() => setServiceType(key)}
                className={`text-left text-[12px] px-3 py-2 rounded-md border ${
                  serviceType === key ? "border-teal bg-teal/5 text-charcoal" : "border-line text-charcoal/70"
                }`}
              >
                {SERVICE_LABELS[key]}
              </button>
            ))}
          </div>

          <label className="block text-[10px] uppercase tracking-wide text-charcoal/60 mb-1">
            Closing date <span className="normal-case text-charcoal/40">(optional)</span>
          </label>
          <input
            type="date"
            value={closingDate}
            onChange={(e) => setClosingDate(e.target.value)}
            className="w-full text-[13px] border border-line rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring-1 focus:ring-teal"
          />

          <label className="flex items-center gap-2 mb-5">
            <input
              type="checkbox"
              checked={includeChecklist}
              onChange={(e) => setIncludeChecklist(e.target.checked)}
              className="w-3.5 h-3.5"
            />
            <span className="text-[11px] text-charcoal">Add the standard checklist for this service type</span>
          </label>

          {error && <div className="text-[11px] text-red-600 mb-3">{error}</div>}

          <button
            type="submit"
            disabled={saving || !address.trim()}
            className="w-full bg-teal text-white text-[13px] font-medium py-2.5 rounded-md disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create transaction"}
          </button>
        </form>
      </div>
    </div>
  );
}

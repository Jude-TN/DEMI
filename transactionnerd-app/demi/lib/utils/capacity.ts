import type { SupabaseClient } from "@supabase/supabase-js";
import type { TCCapacityResponse } from "@/types";

export type CapacityStatus = "available" | "near" | "at_cap";

export function capacityStatus(total: number, cap: number): CapacityStatus {
  const pct = cap > 0 ? total / cap : 1;
  if (pct >= 1) return "at_cap";
  if (pct >= 0.75) return "near";
  return "available";
}

export function capacityColor(status: CapacityStatus): string {
  return status === "at_cap" ? "var(--rose)" : status === "near" ? "var(--amber)" : "var(--teal)";
}

export function capacityLabel(status: CapacityStatus): string {
  return status === "at_cap" ? "At capacity" : status === "near" ? "Near capacity" : "Available";
}

export function capacityLabelColor(status: CapacityStatus): "rose" | "amber" | "teal" {
  return status === "at_cap" ? "rose" : status === "near" ? "amber" : "teal";
}

/**
 * Get TC capacity data.
 * breakdown_by_brokerage is only included when requesterId === tcId (the TC viewing themselves).
 * This enforces the cross-brokerage privacy rule from the spec.
 */
export async function getTCCapacity(
  supabase: SupabaseClient,
  tcId: string,
  requesterId: string
): Promise<TCCapacityResponse> {
  const { data: tc } = await supabase
    .from("users")
    .select("id, full_name, tc_company, tc_capacity_cap")
    .eq("id", tcId)
    .single();

  // Global active file count — no brokerage filter (cross-team)
  const { count: total_files } = await supabase
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("tc_id", tcId)
    .is("closed_at", null)
    .is("archived_at", null);

  const count = total_files ?? 0;
  const cap = tc?.tc_capacity_cap ?? 33;

  // Per-team breakdown — ONLY for the TC themselves
  let breakdown: TCCapacityResponse["breakdown_by_brokerage"] = null;
  if (requesterId === tcId) {
    const { data: rows } = await supabase
      .from("deals")
      .select("brokerage_id, brokerages(team_name)")
      .eq("tc_id", tcId)
      .is("closed_at", null)
      .is("archived_at", null);

    if (rows) {
      const map = new Map<string, { team_name: string; file_count: number }>();
      for (const r of rows as any[]) {
        const bid = r.brokerage_id;
        const name = r.brokerages?.team_name ?? "Unknown team";
        if (!map.has(bid)) map.set(bid, { team_name: name, file_count: 0 });
        map.get(bid)!.file_count++;
      }
      breakdown = Array.from(map.entries())
        .map(([brokerage_id, d]) => ({ brokerage_id, ...d }))
        .sort((a, b) => b.file_count - a.file_count);
    }
  }

  return {
    user_id: tcId,
    full_name: tc?.full_name ?? "",
    tc_company: tc?.tc_company ?? null,
    total_files: count,
    cap,
    available: Math.max(0, cap - count),
    breakdown_by_brokerage: breakdown,
  };
}

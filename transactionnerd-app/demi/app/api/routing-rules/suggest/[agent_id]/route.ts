import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTCCapacity } from "@/lib/utils/capacity";

export async function GET(_req: NextRequest, { params }: { params: { agent_id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: bm } = await supabase.from("brokerage_members")
    .select("brokerage_id").eq("user_id", user.id).eq("is_active", true).single();
  if (!bm) return NextResponse.json(null);

  const { data: rule } = await supabase.from("tc_routing_rules")
    .select("*").eq("agent_id", params.agent_id).eq("brokerage_id", bm.brokerage_id).single();

  if (!rule) return NextResponse.json(null);

  const defaultCap = await getTCCapacity(supabase, rule.default_tc_id, user.id);

  // Default TC at cap → suggest fallback
  if (defaultCap.total_files >= defaultCap.cap && rule.fallback_tc_id) {
    const fallbackCap = await getTCCapacity(supabase, rule.fallback_tc_id, user.id);
    return NextResponse.json({ ...fallbackCap, is_recommended: true, reason: "fallback" });
  }

  return NextResponse.json({ ...defaultCap, is_recommended: true, reason: "default" });
}

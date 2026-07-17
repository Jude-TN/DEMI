import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTCCapacity } from "@/lib/utils/capacity";

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get brokerage for requesting user
  const { data: bm } = await supabase.from("brokerage_members")
    .select("brokerage_id").eq("user_id", user.id).eq("is_active", true).single();
  if (!bm) return NextResponse.json([]);

  // Get all TCs in this brokerage
  const { data: members } = await supabase.from("brokerage_members")
    .select("user_id, users(id,full_name,tc_company,tc_capacity_cap,avatar_url)")
    .eq("brokerage_id", bm.brokerage_id)
    .eq("role", "tc")
    .eq("is_active", true) as any;

  if (!members?.length) return NextResponse.json([]);

  // Get capacity for each TC — breakdown always null (requester is not the TC)
  const result = await Promise.all(members.map(async (m: any) => {
    const cap = await getTCCapacity(supabase, m.user_id, user.id);
    return cap;
  }));

  return NextResponse.json(result.sort((a, b) => b.available - a.available));
}

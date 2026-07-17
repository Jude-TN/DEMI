import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTCCapacity } from "@/lib/utils/capacity";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // breakdown_by_brokerage only returned when requester === TC themselves
  const capacity = await getTCCapacity(supabase, params.id, user.id);
  return NextResponse.json(capacity);
}

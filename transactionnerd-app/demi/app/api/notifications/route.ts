import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const unreadOnly = new URL(req.url).searchParams.get("unread_only") === "true";
  let q = supabase.from("notifications")
    .select("*, deal:deals(id,address)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (unreadOnly) q = q.is("read_at", null);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type P = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: P) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.from("timeline_events")
    .select("*, actor:users!timeline_events_actor_id_fkey(full_name,avatar_url)")
    .eq("deal_id", params.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest, { params }: P) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { error } = await supabase.from("timeline_events").insert({
    deal_id: params.id,
    actor_id: user.id,
    event_type: body.event_type,
    description: body.description,
    metadata: body.metadata ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

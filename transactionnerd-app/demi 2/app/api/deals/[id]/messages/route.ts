import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type P = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: P) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.from("messages")
    .select("*, sender:users!messages_sender_id_fkey(id,full_name,avatar_url)")
    .eq("deal_id", params.id).order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest, { params }: P) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { body: msgBody } = await req.json();
  if (!msgBody?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });
  const { data, error } = await supabase.from("messages")
    .insert({ deal_id: params.id, sender_id: user.id, body: msgBody.trim() })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

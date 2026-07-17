import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logTimeline } from "@/lib/utils/notifications";

type P = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: P) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.from("documents")
    .select("*, uploader:users!documents_uploaded_by_fkey(full_name,avatar_url)")
    .eq("deal_id", params.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest, { params }: P) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data: doc, error } = await supabase.from("documents").insert({
    deal_id: params.id,
    name: body.name,
    file_url: body.file_url ?? null,
    file_size_bytes: body.file_size_bytes ?? null,
    doc_type: body.doc_type ?? "other",
    status: body.status ?? "received",
    external_ref_url: body.external_ref_url ?? null,
    uploaded_by: user.id,
    uploaded_at: new Date().toISOString(),
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logTimeline(supabase, { deal_id: params.id, actor_id: user.id, event_type: "document_uploaded", description: `Document: "${body.name}"` });
  return NextResponse.json(doc, { status: 201 });
}

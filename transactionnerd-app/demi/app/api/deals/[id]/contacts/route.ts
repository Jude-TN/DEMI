import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type P = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: P) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.from("contacts").select("*").eq("deal_id", params.id).order("role");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest, { params }: P) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.full_name) return NextResponse.json({ error: "full_name required" }, { status: 400 });
  const { data, error } = await supabase.from("contacts").insert({
    deal_id: params.id,
    role: body.role ?? "other",
    full_name: body.full_name,
    email: body.email ?? null,
    phone: body.phone ?? null,
    company: body.company ?? null,
    fub_contact_id: body.fub_contact_id ?? null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

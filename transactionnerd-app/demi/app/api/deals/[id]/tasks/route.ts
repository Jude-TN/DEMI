import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logTimeline, createNotification } from "@/lib/utils/notifications";

type P = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: P) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.from("tasks")
    .select("*, assignee:users!tasks_assignee_id_fkey(id,full_name,avatar_url)")
    .eq("deal_id", params.id)
    .order("sort_order")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest, { params }: P) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { data: task, error } = await supabase.from("tasks").insert({
    deal_id: params.id,
    label: body.label,
    assignee_id: body.assignee_id ?? null,
    due_date: body.due_date ?? null,
    sort_order: body.sort_order ?? 999,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logTimeline(supabase, { deal_id: params.id, actor_id: user.id, event_type: "task_added", description: `Task added: "${body.label}"` });
  return NextResponse.json(task, { status: 201 });
}

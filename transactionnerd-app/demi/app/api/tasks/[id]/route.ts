import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logTimeline } from "@/lib/utils/notifications";

type P = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: P) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { data: current } = await supabase.from("tasks").select("*, deal:deals(id, address)").eq("id", params.id).single() as any;
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const update: Record<string, unknown> = { ...body };

  // Completing a task
  if (body.completed_at === "now" || (body.completed_at === undefined && body.complete === true)) {
    update.completed_at = new Date().toISOString();
    delete update.complete;
  }
  if (body.completed_at === null) {
    update.completed_at = null;
  }

  const { data: task, error } = await supabase.from("tasks").update(update).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log if completion status changed
  const wasComplete = !!current.completed_at;
  const isNowComplete = !!task.completed_at;
  if (!wasComplete && isNowComplete) {
    await logTimeline(supabase, { deal_id: current.deal_id, actor_id: user.id, event_type: "task_completed", description: `Task completed: "${current.label}"` });
  } else if (wasComplete && !isNowComplete) {
    await logTimeline(supabase, { deal_id: current.deal_id, actor_id: user.id, event_type: "task_reopened", description: `Task reopened: "${current.label}"` });
  }

  return NextResponse.json(task);
}

export async function DELETE(_req: NextRequest, { params }: P) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role === "agent") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase.from("tasks").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

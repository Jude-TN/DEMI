import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logTimeline, createNotification } from "@/lib/utils/notifications";
import { addDays, parseISO } from "date-fns";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  const { searchParams } = new URL(req.url);
  const stage  = searchParams.get("stage");
  const agent  = searchParams.get("agent_id");
  const tc     = searchParams.get("tc_id");
  const archived = searchParams.get("archived") === "true";

  let q = supabase.from("deals")
    .select("*, agent:users!deals_agent_id_fkey(id,full_name,avatar_url,email), tc:users!deals_tc_id_fkey(id,full_name,avatar_url,tc_company), brokerage:brokerages(id,name,team_name)")
    .order("close_date", { ascending: true, nullsFirst: false });

  if (!archived) q = q.is("archived_at", null);
  if (stage)  q = q.eq("stage", stage);
  if (agent)  q = q.eq("agent_id", agent);
  if (tc)     q = q.eq("tc_id", tc);

  // RLS scopes automatically â admin sees all, agent sees own, TC sees assigned
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!profile || (profile.role !== "admin" && profile.role !== "agent")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { address, city, mls_number, sale_price, side, stage, close_date, effective_date,
          agent_id, tc_id, checklist_template_id, notes } = body;

  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });

  // Get brokerage_id for the agent
  const { data: bm } = await supabase.from("brokerage_members")
    .select("brokerage_id")
    .eq("user_id", agent_id ?? user.id)
    .eq("is_active", true)
    .single();

  if (!bm?.brokerage_id) return NextResponse.json({ error: "Agent has no brokerage" }, { status: 400 });

  const { data: deal, error: dealErr } = await supabase.from("deals").insert({
    brokerage_id: bm.brokerage_id,
    agent_id: agent_id ?? user.id,
    tc_id: tc_id || null,
    address, city: city ?? "",
    mls_number: mls_number ?? null,
    sale_price: sale_price ? parseFloat(String(sale_price)) : null,
    side: side ?? "buyer",
    stage: stage ?? "under_contract",
    close_date: close_date || null,
    effective_date: effective_date || null,
    checklist_template_id: checklist_template_id || null,
    notes: notes ?? null,
  }).select().single();

  if (dealErr || !deal) return NextResponse.json({ error: dealErr?.message ?? "Failed to create deal" }, { status: 500 });

  // Generate tasks from template
  if (checklist_template_id) {
    const { data: steps } = await supabase
      .from("checklist_template_steps")
      .select("*")
      .eq("template_id", checklist_template_id)
      .order("sort_order");

    if (steps && steps.length > 0) {
      const effDate = effective_date ? parseISO(effective_date) : (close_date ? parseISO(close_date) : new Date());
      const closeDate = close_date ? parseISO(close_date) : null;

      const tasks = steps.map((step: any, i: number) => {
        let dueDate: string | null = null;
        if (step.days_from_effective != null) {
          const ref = step.days_from_effective < 0 && closeDate ? closeDate : effDate;
          const offset = step.days_from_effective < 0 ? closeDate ? step.days_from_effective : 0 : step.days_from_effective;
          const d = addDays(ref, offset);
          dueDate = d.toISOString().split("T")[0];
        }
        const assigneeId =
          step.assignee_role === "tc" ? (tc_id || null) :
          step.assignee_role === "agent" ? (agent_id ?? user.id) : null;

        return {
          deal_id: deal.id,
          brokerage_id: bm.brokerage_id,
          template_step_id: step.id,
          label: step.label,
          assignee_id: assigneeId,
          due_date: dueDate,
          sort_order: i,
        };
      });
      await supabase.from("tasks").insert(tasks);
    }
  }

  // Log timeline
  await logTimeline(supabase, { deal_id: deal.id, actor_id: user.id, event_type: "deal_opened", description: "Deal opened" });

  // Notify assigned TC
  if (tc_id) {
    await createNotification(supabase, {
      user_id: tc_id, deal_id: deal.id,
      type: "deal_assigned",
      title: "New deal assigned",
      body: `${address} has been assigned to you`,
      deep_link: `/deals/${deal.id}`,
    });
  }

  // Zapier webhook (fire and forget)
  fireZapierWebhook(supabase, bm.brokerage_id, "deal.opened", { deal_id: deal.id, address });

  return NextResponse.json(deal, { status: 201 });
}

async function fireZapierWebhook(supabase: any, brokerageId: string, event: string, payload: object) {
  try {
    const { data: conn } = await supabase.from("integration_connections")
      .select("access_token").eq("brokerage_id", brokerageId).eq("provider", "zapier").eq("status", "connected").single();
    if (!conn?.access_token) return;
    await fetch(conn.access_token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, ...payload, timestamp: new Date().toISOString() }),
    });
  } catch {}
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logTimeline, createNotifications } from "@/lib/utils/notifications";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.from("deals")
    .select("*, agent:users!deals_agent_id_fkey(*), tc:users!deals_tc_id_fkey(*), brokerage:brokerages(*)")
    .eq("id", params.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { stage: newStage, tc_id: newTcId, ...rest } = body;

  // Get current deal for comparison
  const { data: current } = await supabase.from("deals").select("*").eq("id", params.id).single();
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const update: Record<string, unknown> = { ...rest };
  if (newStage) update.stage = newStage;
  if ("tc_id" in body) update.tc_id = newTcId;

  const { data: deal, error } = await supabase.from("deals").update(update).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Stage change notification
  if (newStage && newStage !== current.stage) {
    await logTimeline(supabase, { deal_id: params.id, actor_id: user.id, event_type: "stage_changed", description: `Stage changed from ${current.stage} to ${newStage}`, metadata: { from: current.stage, to: newStage } });

    const notifTargets: string[] = [];
    if (current.agent_id) notifTargets.push(current.agent_id);
    if (deal.tc_id && deal.tc_id !== current.agent_id) notifTargets.push(deal.tc_id);
    const uniqueTargets = [...new Set(notifTargets)];

    if (uniqueTargets.length) {
      await createNotifications(supabase, uniqueTargets.map(uid => ({
        user_id: uid, deal_id: params.id,
        type: "stage_changed",
        title: `Deal moved to ${newStage.replace(/_/g, " ")}`,
        body: current.address,
        deep_link: `/deals/${params.id}`,
      })));
    }
  }

  // TC reassignment notification
  if ("tc_id" in body && newTcId && newTcId !== current.tc_id) {
    await logTimeline(supabase, { deal_id: params.id, actor_id: user.id, event_type: "tc_reassigned", description: "TC reassigned", metadata: { old_tc: current.tc_id, new_tc: newTcId } });
    await createNotifications(supabase, [{ user_id: newTcId, deal_id: params.id, type: "tc_assigned", title: "Deal assigned to you", body: current.address, deep_link: `/deals/${params.id}` }]);
  }

  return NextResponse.json(deal);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { error } = await supabase.from("deals").update({ archived_at: new Date().toISOString() }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

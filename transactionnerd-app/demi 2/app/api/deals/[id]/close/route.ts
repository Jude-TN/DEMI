import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logTimeline, createNotifications } from "@/lib/utils/notifications";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { close_price } = body;

  const { data: deal } = await supabase.from("deals")
    .select("*, agent:users!deals_agent_id_fkey(*), tc:users!deals_tc_id_fkey(*)")
    .eq("id", params.id).single() as any;

  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (deal.stage === "closed") return NextResponse.json({ error: "Already closed" }, { status: 400 });

  // Mark all open tasks complete
  await supabase.from("tasks").update({ completed_at: new Date().toISOString() }).eq("deal_id", params.id).is("completed_at", null);

  // Close the deal
  const { data: closed, error } = await supabase.from("deals").update({
    stage: "closed",
    closed_at: new Date().toISOString(),
    close_price: close_price ? parseFloat(String(close_price)) : deal.sale_price,
  }).eq("id", params.id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Timeline
  await logTimeline(supabase, { deal_id: params.id, actor_id: user.id, event_type: "deal_closed", description: `Deal closed${close_price ? ` at $${Number(close_price).toLocaleString()}` : ""}`, metadata: { close_price } });

  // Notify all parties
  const targets = [deal.agent_id, deal.tc_id].filter(Boolean) as string[];
  if (targets.length) {
    await createNotifications(supabase, targets.map(uid => ({
      user_id: uid, deal_id: params.id,
      type: "deal_closed",
      title: "🎉 Deal closed!",
      body: deal.address,
      deep_link: `/deals/${params.id}`,
    })));
  }

  // FUB post-close sync (fire and forget)
  if (deal.agent_id) {
    triggerFUBPostClose(supabase, deal).catch(console.error);
  }

  return NextResponse.json(closed);
}

async function triggerFUBPostClose(supabase: any, deal: any) {
  const { data: conn } = await supabase.from("integration_connections")
    .select("access_token").eq("brokerage_id", deal.brokerage_id).eq("provider", "fub").eq("status", "connected").single();
  if (!conn?.access_token) return;
  // Tag contacts in FUB with "Closed"
  const { data: contacts } = await supabase.from("contacts").select("fub_contact_id").eq("deal_id", deal.id).not("fub_contact_id", "is", null);
  for (const c of (contacts ?? [])) {
    await fetch(`https://api.followupboss.com/v1/people/${c.fub_contact_id}`, {
      method: "PUT",
      headers: { "Authorization": `Bearer ${conn.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ tags: ["Closed"] }),
    }).catch(() => {});
  }
}

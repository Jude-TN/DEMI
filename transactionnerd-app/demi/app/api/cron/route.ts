import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Protected by CRON_SECRET header — set this in Vercel Cron config
// Schedule these in vercel.json or an external scheduler (Supabase Edge, Inngest, etc.)
// GET /api/cron?job=overdue_tasks     — run at 9:00 AM ET
// GET /api/cron?job=closing_soon      — run at 7:00 AM ET
// GET /api/cron?job=message_digest    — run at 8:00 AM ET

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = new URL(req.url).searchParams.get("job");
  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  // ── Job 1: Overdue tasks ────────────────────────────────────────
  if (job === "overdue_tasks") {
    // Tasks due today that aren't complete
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, label, deal_id, assignee_id, deals(brokerage_id, address, agent_id)")
      .eq("due_date", today)
      .is("completed_at", null) as any;

    const notifs: any[] = [];
    for (const task of (tasks ?? [])) {
      const deal = task.deals;
      if (!deal) continue;

      // Notify assigned TC
      if (task.assignee_id) {
        notifs.push({ user_id: task.assignee_id, deal_id: task.deal_id, type: "task_overdue", title: "Task due today", body: `"${task.label}" — ${deal.address}`, deep_link: `/deals/${task.deal_id}` });
      }

      // Notify brokerage admins
      const { data: admins } = await supabase.from("brokerage_members")
        .select("user_id").eq("brokerage_id", deal.brokerage_id).eq("role", "admin").eq("is_active", true);
      for (const admin of (admins ?? [])) {
        if (admin.user_id !== task.assignee_id) {
          notifs.push({ user_id: admin.user_id, deal_id: task.deal_id, type: "task_overdue", title: "Overdue task", body: `"${task.label}" — ${deal.address}`, deep_link: `/deals/${task.deal_id}` });
        }
      }
    }

    if (notifs.length) await supabase.from("notifications").insert(notifs);
    return NextResponse.json({ job: "overdue_tasks", processed: notifs.length });
  }

  // ── Job 2: Closing soon (7 days and 3 days) ─────────────────────
  if (job === "closing_soon") {
    const in7 = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    const in3 = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];

    const { data: deals } = await supabase
      .from("deals")
      .select("id, address, close_date, agent_id, tc_id, brokerage_id")
      .in("close_date", [in7, in3])
      .is("closed_at", null)
      .is("archived_at", null);

    const notifs: any[] = [];
    for (const deal of (deals ?? [])) {
      const days = deal.close_date === in7 ? 7 : 3;
      const targets: string[] = [];
      if (deal.agent_id) targets.push(deal.agent_id);
      if (deal.tc_id)    targets.push(deal.tc_id);

      const { data: admins } = await supabase.from("brokerage_members")
        .select("user_id").eq("brokerage_id", deal.brokerage_id).eq("role", "admin").eq("is_active", true);
      for (const a of (admins ?? [])) targets.push(a.user_id);

      const unique = [...new Set(targets)];
      for (const uid of unique) {
        notifs.push({ user_id: uid, deal_id: deal.id, type: "closing_soon", title: `Closing in ${days} days`, body: deal.address, deep_link: `/deals/${deal.id}` });
      }
    }

    if (notifs.length) await supabase.from("notifications").insert(notifs);
    return NextResponse.json({ job: "closing_soon", processed: notifs.length });
  }

  // ── Job 3: Message digest (unread messages from yesterday) ───────
  if (job === "message_digest") {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const { data: messages } = await supabase
      .from("messages")
      .select("id, deal_id, sender_id, body, deals(address, agent_id, tc_id, brokerage_id)")
      .gte("created_at", yesterday) as any;

    // Group by deal, find unique participants who haven't read
    const dealMap = new Map<string, { address: string; count: number; participants: Set<string> }>();
    for (const msg of (messages ?? [])) {
      if (!dealMap.has(msg.deal_id)) {
        dealMap.set(msg.deal_id, { address: msg.deals?.address ?? "Unknown", count: 0, participants: new Set() });
      }
      const entry = dealMap.get(msg.deal_id)!;
      entry.count++;
      if (msg.deals?.agent_id) entry.participants.add(msg.deals.agent_id);
      if (msg.deals?.tc_id)    entry.participants.add(msg.deals.tc_id);
    }

    const notifs: any[] = [];
    for (const [dealId, { address, count, participants }] of dealMap) {
      for (const uid of participants) {
        notifs.push({ user_id: uid, deal_id: dealId, type: "message_digest", title: `${count} message${count !== 1 ? "s" : ""} yesterday`, body: address, deep_link: `/deals/${dealId}` });
      }
    }

    if (notifs.length) await supabase.from("notifications").insert(notifs);
    return NextResponse.json({ job: "message_digest", processed: notifs.length });
  }

  return NextResponse.json({ error: "Unknown job" }, { status: 400 });
}

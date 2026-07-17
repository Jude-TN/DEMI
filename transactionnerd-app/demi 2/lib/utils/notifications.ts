import type { SupabaseClient } from "@supabase/supabase-js";

interface NotifPayload {
  user_id: string;
  deal_id?: string | null;
  type: string;
  title: string;
  body: string;
  deep_link?: string | null;
}

export async function createNotification(supabase: SupabaseClient, payload: NotifPayload) {
  const { error } = await supabase.from("notifications").insert({
    user_id: payload.user_id,
    deal_id: payload.deal_id ?? null,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    deep_link: payload.deep_link ?? null,
  });
  return error;
}

export async function createNotifications(supabase: SupabaseClient, payloads: NotifPayload[]) {
  if (!payloads.length) return;
  const { error } = await supabase.from("notifications").insert(payloads.map(p => ({
    user_id: p.user_id,
    deal_id: p.deal_id ?? null,
    type: p.type,
    title: p.title,
    body: p.body,
    deep_link: p.deep_link ?? null,
  })));
  return error;
}

export async function logTimeline(supabase: SupabaseClient, payload: {
  deal_id: string; actor_id?: string | null; event_type: string; description: string; metadata?: Record<string, unknown>;
}) {
  const { error } = await supabase.from("timeline_events").insert({
    deal_id: payload.deal_id,
    actor_id: payload.actor_id ?? null,
    event_type: payload.event_type,
    description: payload.description,
    metadata: payload.metadata ?? null,
  });
  return error;
}

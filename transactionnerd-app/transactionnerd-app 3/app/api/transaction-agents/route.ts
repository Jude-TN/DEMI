import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireTC(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "tc") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user };
}

// Link an agent to a transaction so they can see it in their dashboard.
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { error } = await requireTC(supabase);
  if (error) return error;

  const { transaction_id, agent_id } = await req.json();
  if (!transaction_id || !agent_id) {
    return NextResponse.json({ error: "transaction_id and agent_id are required" }, { status: 400 });
  }

  const { error: insertError } = await supabase
    .from("transaction_agents")
    .insert({ transaction_id, agent_id });

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Remove an agent's access to a transaction.
export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const { error } = await requireTC(supabase);
  if (error) return error;

  const { transaction_id, agent_id } = await req.json();
  if (!transaction_id || !agent_id) {
    return NextResponse.json({ error: "transaction_id and agent_id are required" }, { status: 400 });
  }

  const { error: deleteError } = await supabase
    .from("transaction_agents")
    .delete()
    .eq("transaction_id", transaction_id)
    .eq("agent_id", agent_id);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

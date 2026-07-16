import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/types";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "tc") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { address, service_type, closing_date, agent_ids, default_tasks } = await req.json();

  if (!address || !service_type) {
    return NextResponse.json({ error: "address and service_type are required" }, { status: 400 });
  }

  const baseSlug = slugify(address);
  let slug = baseSlug;
  let attempt = 0;

  // Ensure the email slug is unique - append a short suffix if collision.
  while (attempt < 5) {
    const { data: existing } = await supabase.from("transactions").select("id").eq("email_slug", slug).maybeSingle();
    if (!existing) break;
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  const { data: transaction, error } = await supabase
    .from("transactions")
    .insert({
      address,
      service_type,
      closing_date: closing_date || null,
      email_slug: slug,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (Array.isArray(agent_ids) && agent_ids.length > 0) {
    await supabase
      .from("transaction_agents")
      .insert(agent_ids.map((agent_id: string) => ({ transaction_id: transaction.id, agent_id })));
  }

  if (Array.isArray(default_tasks) && default_tasks.length > 0) {
    await supabase.from("tasks").insert(
      default_tasks.map((title: string, i: number) => ({
        transaction_id: transaction.id,
        title,
        position: i,
      }))
    );
  }

  return NextResponse.json({ transaction });
}

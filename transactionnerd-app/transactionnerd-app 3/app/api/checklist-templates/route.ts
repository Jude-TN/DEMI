import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Save an existing checklist's structure as a reusable template
 * (FR-8: opt-in, not automatic — TC explicitly chooses this).
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "tc") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { checklist_id, title } = await req.json();
  if (!checklist_id || !title) {
    return NextResponse.json({ error: "checklist_id and title are required" }, { status: 400 });
  }

  const { data: items } = await supabase
    .from("checklist_items")
    .select("title, position")
    .eq("checklist_id", checklist_id)
    .order("position");

  const { data: template, error } = await supabase
    .from("checklist_templates")
    .insert({ title, created_by: user.id })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (items && items.length > 0) {
    await supabase.from("checklist_template_items").insert(
      items.map((it) => ({ template_id: template.id, title: it.title, position: it.position }))
    );
  }

  // Link the originating checklist back to its new template.
  await supabase.from("checklists").update({ template_id: template.id, is_custom: false }).eq("id", checklist_id);

  return NextResponse.json({ template });
}

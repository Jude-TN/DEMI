import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Attach a checklist to a transaction.
 *
 * Two shapes of request body:
 *  - From a template: { transaction_id, template_id }
 *  - Fully custom:     { transaction_id, title, items: string[] }
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "tc") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { transaction_id, template_id, title, items } = body;

  if (!transaction_id) {
    return NextResponse.json({ error: "transaction_id is required" }, { status: 400 });
  }

  const { count } = await supabase
    .from("checklists")
    .select("id", { count: "exact", head: true })
    .eq("transaction_id", transaction_id);
  const position = count || 0;

  if (template_id) {
    // From a saved template: copy the template's title and items onto a new checklist.
    const { data: template } = await supabase
      .from("checklist_templates")
      .select("title")
      .eq("id", template_id)
      .single();
    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    const { data: templateItems } = await supabase
      .from("checklist_template_items")
      .select("title, position")
      .eq("template_id", template_id)
      .order("position");

    const { data: checklist, error } = await supabase
      .from("checklists")
      .insert({ transaction_id, template_id, title: template.title, is_custom: false, position })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (templateItems && templateItems.length > 0) {
      await supabase.from("checklist_items").insert(
        templateItems.map((it) => ({ checklist_id: checklist.id, title: it.title, position: it.position }))
      );
    }
    return NextResponse.json({ checklist });
  }

  // Fully custom checklist, attached to this transaction only.
  if (!title) return NextResponse.json({ error: "title is required for a custom checklist" }, { status: 400 });

  const { data: checklist, error } = await supabase
    .from("checklists")
    .insert({ transaction_id, title, is_custom: true, position })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (Array.isArray(items) && items.length > 0) {
    await supabase.from("checklist_items").insert(
      items.map((itemTitle: string, i: number) => ({ checklist_id: checklist.id, title: itemTitle, position: i }))
    );
  }

  return NextResponse.json({ checklist });
}

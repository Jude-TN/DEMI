import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Lists all agent profiles, for the "add agent to this deal" picker.
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "tc") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: agents, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "agent")
    .order("full_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ agents: agents || [] });
}

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Self-serve registration for both agents and TCs.
 *
 * Agents can register freely. TCs must supply a correct access code
 * (set as TC_SIGNUP_CODE, a server-only env var — never exposed to the
 * client) or they're registered as an agent instead. This is a simple
 * gate, not full admin approval — anyone with the code becomes a full
 * TC. Rotate the code, or move to an invite-link model, if that's not
 * strict enough once the team grows.
 */
export async function POST(req: NextRequest) {
  const { full_name, email, password, role, tc_code } = await req.json();

  if (!full_name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }
  if (role !== "agent" && role !== "tc") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (role === "tc") {
    if (!process.env.TC_SIGNUP_CODE) {
      return NextResponse.json({ error: "TC registration is not configured yet" }, { status: 500 });
    }
    if (tc_code !== process.env.TC_SIGNUP_CODE) {
      return NextResponse.json({ error: "That TC access code isn't right" }, { status: 403 });
    }
  }

  const supabase = createServiceClient();

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name.trim() },
  });

  if (createError || !created.user) {
    const message = createError?.message?.includes("already been registered")
      ? "An account with that email already exists"
      : createError?.message || "Could not create account";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // handle_new_user's trigger already inserted a profile row with role='agent'.
  // If they registered as TC with a valid code, promote it here — this update
  // runs under the service-role key, so the self-escalation trigger allows it.
  if (role === "tc") {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: "tc" })
      .eq("id", created.user.id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { data: bm } = await supabase.from("brokerage_members").select("brokerage_id").eq("user_id", user.id).eq("is_active", true).single();
  const { email, role } = await req.json();

  if (!email || !role) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const admin = createServiceClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    data: { invited_role: role, invited_brokerage_id: bm?.brokerage_id },
  });

  if (error) {
    const already = /already been registered|already registered|already exists/i.test(error.message || "");
    return NextResponse.json({ error: already ? "This user is already invited or registered." : (error.message || "Failed to send invite."), code: already ? "already_registered" : "invite_error" }, { status: already ? 409 : ((error as any).status || 500) });
  }
  // Record a pending invitation so it shows on the Team Members page immediately
  await admin.from("invitations").insert({
    brokerage_id: bm?.brokerage_id,
    email,
    role,
    invited_by: user.id,
    status: "pending",
  });

  return NextResponse.json({ success: true });
}

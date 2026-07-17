import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { email, role } = await request.json();
    if (!email || !role) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("brokerage_id, role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

    // Use service role to invite
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      data: { brokerage_id: profile.brokerage_id, invited_role: role },
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

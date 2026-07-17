import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (toSet: { name: string; value: string; options: any }[]) => { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Handle invited users — create their profile if it doesn't exist
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existing } = await supabase.from("users").select("id").eq("id", user.id).single();
        if (!existing) {
          const meta = user.user_metadata;
          const role = meta?.invited_role ?? "agent";
          await supabase.from("users").insert({
            id: user.id,
            email: user.email!,
            full_name: meta?.full_name ?? user.email!.split("@")[0],
            role,
          });
          if (meta?.invited_brokerage_id) {
            await supabase.from("brokerage_members").insert({
              brokerage_id: meta.invited_brokerage_id,
              user_id: user.id,
              role,
            });
          }
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/auth/login?error=auth_error`);
}

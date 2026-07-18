import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/auth/", "/api/auth/", "/api/webhooks/"];
const TC_ADMIN_PATHS = ["/dashboard", "/pipeline", "/deals", "/agents", "/contacts", "/reports", "/notifications", "/settings"];
const AGENT_PATHS = ["/portal"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet: { name: string; value: string; options: any }[]) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
  const isRoot = pathname === "/";
  const isCron = pathname.startsWith("/api/cron");

  // Cron jobs protected by secret header, not auth
  if (isCron) return response;

  // Unauthenticated → login
  if (!user && !isPublic && !isRoot) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Authenticated + auth route OR root → redirect to workspace
  if (user && (isPublic || isRoot) && !pathname.startsWith("/api/")) {
    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    const role = profile?.role ?? "agent";
    const dest = role === "agent" ? "/portal" : "/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // Role guards
  if (user && !isPublic) {
    const isTcAdminPath = TC_ADMIN_PATHS.some(p => pathname.startsWith(p));
    const isAgentPath = AGENT_PATHS.some(p => pathname.startsWith(p));

    if (isTcAdminPath || isAgentPath) {
      const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
      const role = profile?.role ?? "agent";
      if (isTcAdminPath && role === "agent") return NextResponse.redirect(new URL("/portal", request.url));
      if (isAgentPath && role !== "agent")   return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

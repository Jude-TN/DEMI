import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const PUBLIC = ["/auth/", "/api/auth/"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet: { name: string; value: string; options?: any }[]) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const isPublic = PUBLIC.some((p) => pathname.startsWith(p));

  // Unauthenticated → login
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Authenticated + public route → redirect to workspace
  if (user && isPublic && !pathname.startsWith("/api/")) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = profile?.role ?? "agent";
    const dest = role === "agent" ? "/portal" : "/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // Guard /dashboard (admin/tc only) and /portal (agent only)
  if (user && (pathname.startsWith("/dashboard") || pathname.startsWith("/portal"))) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = profile?.role ?? "agent";
    if (pathname.startsWith("/dashboard") && role === "agent") {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
    if (pathname.startsWith("/portal") && role !== "agent") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

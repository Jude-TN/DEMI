import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (toSet: { name: string; value: string; options: any }[]) => { try { toSet.forEach(({ name, value, options }) => store.set(name, value, options)); } catch {} },
      },
    }
  );
}

/** Service-role client for server-side operations that bypass RLS */
export function createServiceClient() {
  const { createClient: create } = require("@supabase/supabase-js");
  return create(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

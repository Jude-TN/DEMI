import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: p } = await supabase.from("users").select("role").eq("id", user.id).single();
  redirect(p?.role === "agent" ? "/portal" : "/dashboard");
}

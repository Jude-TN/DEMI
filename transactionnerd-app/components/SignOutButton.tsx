"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton({ light = false }: { light?: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={signOut}
      disabled={loading}
      className={`text-[10px] font-medium disabled:opacity-50 ${
        light ? "text-white/60 hover:text-white" : "text-charcoal/60 hover:text-charcoal"
      }`}
    >
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}

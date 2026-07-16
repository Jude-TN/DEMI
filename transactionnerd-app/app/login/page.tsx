"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display text-2xl font-semibold text-white">
            Transaction<span className="text-teal">Nerd</span>
          </div>
        </div>
        <form onSubmit={handleLogin} className="bg-off rounded-xl p-6">
          <label className="block text-[10px] uppercase tracking-wide text-charcoal/60 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full text-[13px] border border-line rounded-md px-3 py-2 mb-4 bg-white focus:outline-none focus:ring-1 focus:ring-teal"
          />
          <label className="block text-[10px] uppercase tracking-wide text-charcoal/60 mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full text-[13px] border border-line rounded-md px-3 py-2 mb-4 bg-white focus:outline-none focus:ring-1 focus:ring-teal"
          />
          {error && <div className="text-[11px] text-red-600 mb-3">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal text-white text-[13px] font-medium py-2.5 rounded-md disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <div className="text-center mt-4">
          <Link href="/register" className="text-[11px] text-white/60 hover:text-white">
            New here? Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}

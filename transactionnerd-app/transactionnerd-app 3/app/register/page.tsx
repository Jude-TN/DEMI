"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Role = "agent" | "tc";

export default function RegisterPage() {
  const [role, setRole] = useState<Role>("agent");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tcCode, setTcCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        role,
        tc_code: role === "tc" ? tcCode.trim() : undefined,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Something went wrong");
      setLoading(false);
      return;
    }

    // Account is created and confirmed server-side — sign them in immediately
    // rather than sending them back to a separate login step.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (signInError) {
      // Rare: account created but the immediate sign-in failed. Send them to
      // login instead of leaving them stuck on this form.
      router.push("/login");
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="font-display text-2xl font-semibold text-white">
            Transaction<span className="text-teal">Nerd</span>
          </div>
        </div>

        <div className="bg-off rounded-xl p-6">
          <div className="flex gap-1.5 mb-5 bg-line/50 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setRole("agent")}
              className={`flex-1 text-[11px] font-medium py-2 rounded-md transition-colors ${
                role === "agent" ? "bg-white text-charcoal shadow-sm" : "text-charcoal/50"
              }`}
            >
              I'm a Realtor
            </button>
            <button
              type="button"
              onClick={() => setRole("tc")}
              className={`flex-1 text-[11px] font-medium py-2 rounded-md transition-colors ${
                role === "tc" ? "bg-white text-charcoal shadow-sm" : "text-charcoal/50"
              }`}
            >
              I'm a TC
            </button>
          </div>

          <form onSubmit={handleRegister}>
            <label className="block text-[10px] uppercase tracking-wide text-charcoal/60 mb-1">Full name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full text-[13px] border border-line rounded-md px-3 py-2 mb-3.5 bg-white focus:outline-none focus:ring-1 focus:ring-teal"
            />

            <label className="block text-[10px] uppercase tracking-wide text-charcoal/60 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-[13px] border border-line rounded-md px-3 py-2 mb-3.5 bg-white focus:outline-none focus:ring-1 focus:ring-teal"
            />

            <label className="block text-[10px] uppercase tracking-wide text-charcoal/60 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-[13px] border border-line rounded-md px-3 py-2 mb-3.5 bg-white focus:outline-none focus:ring-1 focus:ring-teal"
            />

            <label className="block text-[10px] uppercase tracking-wide text-charcoal/60 mb-1">
              Confirm password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full text-[13px] border border-line rounded-md px-3 py-2 mb-3.5 bg-white focus:outline-none focus:ring-1 focus:ring-teal"
            />

            {role === "tc" && (
              <>
                <label className="block text-[10px] uppercase tracking-wide text-charcoal/60 mb-1">
                  TC access code
                </label>
                <input
                  type="text"
                  required
                  value={tcCode}
                  onChange={(e) => setTcCode(e.target.value)}
                  placeholder="Given to you by your team"
                  className="w-full text-[13px] border border-line rounded-md px-3 py-2 mb-3.5 bg-white focus:outline-none focus:ring-1 focus:ring-teal"
                />
              </>
            )}

            {error && <div className="text-[11px] text-red-600 mb-3">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal text-white text-[13px] font-medium py-2.5 rounded-md disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>

        <div className="text-center mt-4">
          <Link href="/login" className="text-[11px] text-white/60 hover:text-white">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

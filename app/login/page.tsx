"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } =
      mode === "sign_in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen min-h-[100dvh] flex items-center justify-center px-6 py-8">
      <div className="w-full max-w-sm rounded-2xl border-2 border-surface2 bg-surface p-8 shadow-lg transition-all duration-300 hover:shadow-xl">
        <p className="font-mech text-xs uppercase tracking-[0.2em] text-cocoa mb-2">DecaStory</p>
        <h1 className="font-display text-4xl mb-8">
          {mode === "sign_in" ? "Welcome back." : "Begin your archive."}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mech text-sm uppercase tracking-wide text-muted mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface border-2 border-surface2 rounded-xl px-3 py-2.5 text-base outline-none transition-colors duration-200 focus:border-sage"
            />
          </div>
          <div>
            <label className="block font-mech text-sm uppercase tracking-wide text-muted mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface border-2 border-surface2 rounded-xl px-3 py-2.5 text-base outline-none transition-colors duration-200 focus:border-sage"
            />
          </div>

          {error && <p className="text-rust text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brass text-ink font-medium rounded-xl px-3 py-2.5 text-base transition-all duration-200 hover:scale-[1.02] hover:opacity-90 disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? "Working..." : mode === "sign_in" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "sign_in" ? "sign_up" : "sign_in")}
          className="mt-4 text-sm text-muted hover:text-sage transition-colors underline"
        >
          {mode === "sign_in" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>

        <div className="mt-6 pt-6 border-t border-surface2">
          <Link
            href="/guest"
            className="text-sm text-steel hover:text-sage transition-colors hover:underline"
          >
            Continue as guest — no account, nothing saved
          </Link>
          <div className="flex gap-4 mt-4">
            <Link href="/privacy" className="text-xs text-muted hover:underline">Privacy Policy</Link>
            <Link href="/terms" className="text-xs text-muted hover:underline">Terms of Service</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

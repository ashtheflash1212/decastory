"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function TopNav({ email }: { email: string }) {
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-surface2">
      <Link href="/" className="font-mech text-xs uppercase tracking-[0.2em] text-brass">
        DecaStory
      </Link>
      <div className="flex items-center gap-4 text-sm">
        <Link href="/" className="hover:text-brass">
          New Story
        </Link>
        <Link href="/vault" className="hover:text-brass">
          Chronicle Vault
        </Link>
        <span className="text-muted">{email}</span>
        <button onClick={signOut} className="text-muted hover:text-rust">
          Sign out
        </button>
      </div>
    </nav>
  );
}

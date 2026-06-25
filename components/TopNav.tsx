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
    <nav className="border-b border-surface2">
      {/* Row 1: logo + sign out — always visible, this row alone is enough on mobile to feel uncluttered */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
        <Link href="/" className="font-mech text-xs uppercase tracking-[0.2em] text-cocoa">
          DecaStory
        </Link>

        {/* Desktop: everything inline in one row */}
        <div className="hidden sm:flex items-center gap-4 text-sm">
          <Link href="/" className="hover:text-cocoa">
            New Story
          </Link>
          <Link href="/vault" className="hover:text-cocoa">
            Chronicle Vault
          </Link>
          <span className="text-muted">{email}</span>
          <button onClick={signOut} className="text-muted hover:text-rust">
            Sign out
          </button>
        </div>

        {/* Mobile: just sign out up here, rest moves to row 2 */}
        <button onClick={signOut} className="sm:hidden text-sm text-muted hover:text-rust">
          Sign out
        </button>
      </div>

      {/* Row 2: mobile-only — nav links + email, given their own breathing room */}
      <div className="flex sm:hidden items-center gap-4 px-4 pb-3 text-sm overflow-x-auto">
        <Link href="/" className="hover:text-cocoa whitespace-nowrap">
          New Story
        </Link>
        <Link href="/vault" className="hover:text-cocoa whitespace-nowrap">
          Chronicle Vault
        </Link>
        <span className="text-muted text-xs truncate">{email}</span>
      </div>
    </nav>
  );
}

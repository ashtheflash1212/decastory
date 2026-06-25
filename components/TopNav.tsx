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
    <nav className="border-b border-surface2" style={{ backgroundColor: "#BFD8EC" }}>
      {/* Row 1: logo + sign out — always visible, this row alone is enough on mobile to feel uncluttered */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
        <Link href="/" className="font-mech text-xs uppercase tracking-[0.2em] text-black">
          DecaStory
        </Link>

        {/* Desktop: everything inline in one row, each "tab" divided by a thin line */}
        <div className="hidden sm:flex items-center text-sm divide-x divide-cocoa/20">
          <Link href="/" className="px-3 transition-colors hover:text-sage">
            New Story
          </Link>
          <Link href="/vault" className="px-3 transition-colors hover:text-sage">
            Chronicle Vault
          </Link>
          <Link href="/how-it-works" className="px-3 transition-colors hover:text-sage">
            How It Works?
          </Link>
          <Link href="/timeline" className="px-3 transition-colors hover:text-sage">
            Timeline Tree
          </Link>
          <Link href="/achievements" className="px-3 transition-colors hover:text-sage">
            Achievements
          </Link>
          <span className="px-3 text-muted">{email}</span>
          <button onClick={signOut} className="px-3 text-muted transition-colors hover:text-rust">
            Sign out
          </button>
        </div>

        {/* Mobile: just sign out up here, rest moves to row 2 */}
        <button onClick={signOut} className="sm:hidden text-sm text-muted hover:text-rust">
          Sign out
        </button>
      </div>

      {/* Row 2: mobile-only — nav links + email, given their own breathing room */}
      <div className="flex sm:hidden items-center gap-4 px-4 pb-3 text-sm overflow-x-auto divide-x divide-cocoa/20">
        <Link href="/" className="pl-0 pr-4 hover:text-sage whitespace-nowrap">
          New Story
        </Link>
        <Link href="/vault" className="pl-4 pr-4 hover:text-sage whitespace-nowrap">
          Chronicle Vault
        </Link>
        <Link href="/how-it-works" className="pl-4 pr-4 hover:text-sage whitespace-nowrap">
          How It Works?
        </Link>
        <Link href="/timeline" className="pl-4 pr-4 hover:text-sage whitespace-nowrap">
          Timeline Tree
        </Link>
        <Link href="/achievements" className="pl-4 pr-4 hover:text-sage whitespace-nowrap">
          Achievements
        </Link>
        <span className="pl-4 text-muted text-xs truncate">{email}</span>
      </div>
    </nav>
  );
}

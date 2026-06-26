"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/", label: "New Story" },
  { href: "/vault", label: "Chronicle Vault" },
  { href: "/how-it-works", label: "How It Works?" },
  { href: "/timeline", label: "Timeline Tree" },
  { href: "/achievements", label: "Achievements" },
];

export default function TopNav({ email }: { email: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="border-b border-surface2" style={{ backgroundColor: "#BFD8EC" }}>
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
        <Link href="/" className="font-mech text-xs uppercase tracking-[0.2em] text-black">
          DecaStory
        </Link>

        {/* Desktop: pill-style links, no divider lines */}
        <div className="hidden sm:flex items-center gap-1 text-sm">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 rounded-md transition-colors hover:bg-white/40 hover:text-sage"
            >
              {link.label}
            </Link>
          ))}
          <span className="px-3 text-muted">{email}</span>
          <button
            onClick={signOut}
            className="px-3 py-1.5 rounded-md text-muted transition-colors hover:bg-white/40 hover:text-rust"
          >
            Sign out
          </button>
        </div>

        {/* Mobile: hamburger toggle */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
          className="sm:hidden w-9 h-9 flex items-center justify-center rounded-md hover:bg-white/40 transition-colors"
        >
          <span className="font-mech text-lg leading-none">{menuOpen ? "✕" : "☰"}</span>
        </button>
      </div>

      {/* Mobile dropdown - only rendered when open */}
      {menuOpen && (
        <div className="sm:hidden px-4 pb-4 space-y-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2.5 rounded-md text-sm transition-colors hover:bg-white/40 hover:text-sage"
            >
              {link.label}
            </Link>
          ))}
          <div className="px-3 py-2 text-sm text-muted truncate">{email}</div>
          <button
            onClick={signOut}
            className="block w-full text-left px-3 py-2.5 rounded-md text-sm text-muted transition-colors hover:bg-white/40 hover:text-rust"
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}

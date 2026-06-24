"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const GENRE_ICON: Record<string, string> = {
  action: "⚡",
  suspense: "◐",
  fantasy: "✦",
  romance: "♡",
};

export default function VaultCard({
  story,
}: {
  story: {
    id: string;
    title: string;
    genre: string;
    status: string;
    slide_budget: number;
    created_at: string;
    slides?: { slide_number: number }[];
  };
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Delete "${story.title}"? This can't be undone.`)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/stories/${story.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete story.");
      }
      router.refresh();
    } catch (err: any) {
      alert(err.message ?? "Failed to delete story.");
      setDeleting(false);
    }
  }

  return (
    <Link
      href={`/story/${story.id}`}
      className="relative rounded-lg border border-surface2 bg-surface px-4 py-4 hover:border-brass transition block"
    >
      <button
        onClick={handleDelete}
        disabled={deleting}
        title="Delete story"
        className="absolute top-3 right-3 font-mech text-[11px] text-muted hover:text-rust disabled:opacity-40"
      >
        {deleting ? "…" : "✕"}
      </button>

      <div className="flex items-center justify-between mb-2 pr-6">
        <span className="text-2xl text-brass">{GENRE_ICON[story.genre] ?? "●"}</span>
        <span
          className={`font-mech text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${
            story.status === "completed" ? "bg-surface2 text-brass" : "bg-surface2 text-steel"
          }`}
        >
          {story.status === "completed" ? "Complete" : "In Progress"}
        </span>
      </div>
      <h2 className="font-display text-lg pr-6">{story.title}</h2>
      <p className="text-sm text-muted mt-1">
        {story.slides?.length ?? 0}/{story.slide_budget} slides survived
      </p>
      <p className="font-mech text-[11px] text-muted mt-2">
        {new Date(story.created_at).toLocaleDateString()}
      </p>
    </Link>
  );
}

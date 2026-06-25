"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const GENRE_ICON: Record<string, string> = {
  action: "▲",
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
    is_favorite?: boolean;
    slides?: { slide_number: number }[];
  };
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  const [favoriting, setFavoriting] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(story.title);
  const [savingTitle, setSavingTitle] = useState(false);

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

  async function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    setSharing(true);
    try {
      const res = await fetch(`/api/stories/${story.id}/share`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to share story.");

      const url = `${window.location.origin}/shared/${data.share_token}`;
      await navigator.clipboard.writeText(url);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2000);
    } catch (err: any) {
      alert(err.message ?? "Failed to share story.");
    } finally {
      setSharing(false);
    }
  }

  async function handleToggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    setFavoriting(true);
    try {
      const res = await fetch(`/api/stories/${story.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_favorite: !story.is_favorite }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update favorite.");
      }
      router.refresh();
    } catch (err: any) {
      alert(err.message ?? "Failed to update favorite.");
    } finally {
      setFavoriting(false);
    }
  }

  function startEditingTitle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setTitleDraft(story.title);
    setEditingTitle(true);
  }

  async function saveTitle() {
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === story.title) {
      setEditingTitle(false);
      return;
    }
    setSavingTitle(true);
    try {
      const res = await fetch(`/api/stories/${story.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to rename story.");
      }
      router.refresh();
    } catch (err: any) {
      alert(err.message ?? "Failed to rename story.");
    } finally {
      setSavingTitle(false);
      setEditingTitle(false);
    }
  }

  return (
    <Link
      href={`/story/${story.id}`}
      className="relative rounded-lg border border-surface2 bg-surface px-4 py-4 hover:border-brass transition block"
    >
      <div className="absolute top-3 right-3 flex items-center gap-3">
        <button
          onClick={handleToggleFavorite}
          disabled={favoriting}
          title={story.is_favorite ? "Remove from favorites" : "Mark as favorite"}
          className="text-base leading-none disabled:opacity-40"
        >
          <span className={story.is_favorite ? "text-yellow-500" : "text-muted hover:text-yellow-500"}>
            {story.is_favorite ? "★" : "☆"}
          </span>
        </button>
        <button
          onClick={handleShare}
          disabled={sharing}
          title="Copy a shareable read-only link"
          className="font-mech text-[11px] text-muted hover:text-steel disabled:opacity-40"
        >
          {sharing ? "…" : justCopied ? "Copied!" : "⤴ Share"}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          title="Delete story"
          className="font-mech text-[11px] text-muted hover:text-rust disabled:opacity-40"
        >
          {deleting ? "…" : "✕"}
        </button>
      </div>

      <div className="flex items-center justify-between mb-2 pr-28">
        <span className="text-2xl text-cocoa">{GENRE_ICON[story.genre] ?? "●"}</span>
        <span
          className={`font-mech text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${
            story.status === "completed" ? "bg-surface2 text-cocoa" : "bg-surface2 text-steel"
          }`}
        >
          {story.status === "completed" ? "Complete" : "In Progress"}
        </span>
      </div>

      {editingTitle ? (
        <input
          autoFocus
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveTitle();
            if (e.key === "Escape") setEditingTitle(false);
          }}
          disabled={savingTitle}
          className="font-display text-lg w-full bg-surface2 rounded px-1 -mx-1 outline-none border border-steel pr-6"
        />
      ) : (
        <h2
          onClick={startEditingTitle}
          title="Click to rename"
          className="font-display text-lg pr-6 hover:underline cursor-text"
        >
          {story.title}
        </h2>
      )}

      <p className="text-sm text-muted mt-1">
        {story.slides?.length ?? 0}/{story.slide_budget} slides survived
      </p>
      <p className="font-mech text-[11px] text-muted mt-2">
        {new Date(story.created_at).toLocaleDateString()}
      </p>
    </Link>
  );
}

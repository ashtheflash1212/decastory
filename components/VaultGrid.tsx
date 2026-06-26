"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import VaultCard, { VaultStory } from "./VaultCard";

export default function VaultGrid({ stories = [] }: { stories?: VaultStory[] }) {
  const router = useRouter();
  const [sortMode, setSortMode] = useState<"recent" | "favorites">("recent");

  // Exactly one continue-story modal exists in the whole page,
  // regardless of how many cards are rendered — this is what
  // actually fixes the flicker bug, since previously every card
  // rendered its own full-screen overlay.
  const [continuingStory, setContinuingStory] = useState<VaultStory | null>(null);
  const [extending, setExtending] = useState(false);

  const sorted = useMemo(() => {
    const safe = stories ?? [];
    if (sortMode === "recent") return safe;
    return [...safe].sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite));
  }, [stories, sortMode]);

  async function handleExtend(additionalSlides: number) {
    if (!continuingStory) return;
    setExtending(true);
    try {
      const res = await fetch(`/api/stories/${continuingStory.id}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ additional_slides: additionalSlides }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to continue story.");
      router.push(`/story/${continuingStory.id}`);
    } catch (err: any) {
      alert(err.message ?? "Failed to continue story.");
      setExtending(false);
      setContinuingStory(null);
    }
  }

  return (
    <div>
      <div className="inline-flex rounded-lg border border-surface2 overflow-hidden mb-6">
        {(["recent", "favorites"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setSortMode(mode)}
            className={`px-4 py-1.5 font-mech text-xs uppercase tracking-wide capitalize ${
              sortMode === mode ? "bg-brass text-ink" : "bg-surface text-ink hover:bg-surface2"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <p className="text-muted">No stories to show.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sorted.map((s) => (
            <VaultCard key={s.id} story={s} onContinue={setContinuingStory} />
          ))}
        </div>
      )}

      {continuingStory && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center px-6 z-50"
          onClick={() => {
            if (!extending) setContinuingStory(null);
          }}
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-surface rounded-2xl border-2 border-surface2 p-6 max-w-sm w-full">
            <h3 className="font-display text-xl mb-2">Continue this story</h3>
            <p className="text-sm text-muted mb-5">
              Pick up where "{continuingStory.title}" left off, with the full history so far carried into the new
              chapters.
            </p>
            <div className="flex gap-2">
              {[5, 10, 20].map((n) => (
                <button
                  key={n}
                  onClick={() => handleExtend(n)}
                  disabled={extending}
                  className="flex-1 rounded-xl border-2 border-surface2 hover:border-brass px-3 py-3 font-mech text-sm transition-all duration-200 hover:scale-105 disabled:opacity-40"
                >
                  +{n}
                </button>
              ))}
            </div>
            {extending && <p className="text-sm text-muted mt-4">Writing the next chapter…</p>}
            <button
              onClick={() => setContinuingStory(null)}
              disabled={extending}
              className="text-sm text-muted hover:text-rust mt-5 disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

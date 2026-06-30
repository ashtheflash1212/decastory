"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import VaultCard, { VaultStory } from "./VaultCard";

export default function VaultGrid({ stories = [] }: { stories?: VaultStory[] }) {
  const router = useRouter();
  const [sortMode, setSortMode] = useState<"recent" | "favorites" | "in_progress">("recent");

  // Exactly one continue-story modal exists in the whole page,
  // regardless of how many cards are rendered — this is what
  // actually fixes the flicker bug, since previously every card
  // rendered its own full-screen overlay.
  const [continuingStory, setContinuingStory] = useState<VaultStory | null>(null);
  const [extending, setExtending] = useState(false);
  const [continuationFocus, setContinuationFocus] = useState("");

  const sorted = useMemo(() => {
    const safe = stories ?? [];
    if (sortMode === "favorites")
      return [...safe].sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite));
    if (sortMode === "in_progress")
      return safe.filter((s) => s.status === "in_progress");
    return safe;
  }, [stories, sortMode]);

  async function handleExtend(additionalSlides: number) {
    if (!continuingStory) return;
    setExtending(true);
    try {
      const res = await fetch(`/api/stories/${continuingStory.id}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          additional_slides: additionalSlides,
          continuation_focus: continuationFocus.trim() || null,
        }),
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

  function closeModal() {
    if (extending) return;
    setContinuingStory(null);
    setContinuationFocus("");
  }

  return (
    <div>
      <div className="inline-flex rounded-lg border border-surface2 overflow-hidden mb-6">
        {(["recent", "favorites", "in_progress"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setSortMode(mode)}
            className={`px-4 py-1.5 font-mech text-xs uppercase tracking-wide capitalize ${
              sortMode === mode ? "bg-[#F0FFF0] border-sage text-ink" : "bg-surface text-ink hover:bg-surface2"
            }`}
          >
            {mode === "in_progress" ? "In Progress" : mode}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <p className="text-muted">
          {sortMode === "in_progress" ? "No stories in progress." : "No stories to show."}
        </p>
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
          onClick={closeModal}
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-surface rounded-2xl border-2 border-surface2 p-6 max-w-sm w-full">
            <h3 className="font-display text-xl mb-2">Continue this story</h3>
            <p className="text-sm text-muted mb-5">
              Pick up where "{continuingStory.title}" left off, with the full history so far carried into the new
              chapters.
            </p>

            <label className="block font-mech text-[11px] uppercase tracking-wide text-muted mb-1.5">
              What should it focus on? (optional)
            </label>
            <textarea
              value={continuationFocus}
              onChange={(e) => setContinuationFocus(e.target.value)}
              disabled={extending}
              placeholder='e.g. "Bring back the rival from slide 2."'
              className="w-full bg-surface border-2 border-surface2 rounded-xl px-3 py-2 text-sm outline-none transition-colors focus:border-sage resize-none h-16 mb-4 disabled:opacity-50"
            />

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
              onClick={closeModal}
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

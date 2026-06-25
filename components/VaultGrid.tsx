"use client";

import { useMemo, useState } from "react";
import VaultCard from "./VaultCard";

type StoryForGrid = {
  id: string;
  title: string;
  genre: string;
  status: string;
  slide_budget: number;
  created_at: string;
  is_favorite?: boolean;
  slides?: { slide_number: number }[];
};

export default function VaultGrid({ stories }: { stories: StoryForGrid[] }) {
  const [sortMode, setSortMode] = useState<"recent" | "favorites">("recent");

  const sorted = useMemo(() => {
    if (sortMode === "recent") return stories;
    // Favorites first, each group keeping its original (recent) order.
    return [...stories].sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite));
  }, [stories, sortMode]);

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sorted.map((s) => (
          <VaultCard key={s.id} story={s} />
        ))}
      </div>
    </div>
  );
}

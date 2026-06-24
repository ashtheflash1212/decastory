"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GENRES } from "@/lib/genres";

const RATINGS = ["G", "PG", "R"] as const;

export default function ConfigHub({ usageToday }: { usageToday: number }) {
  const router = useRouter();
  const [genre, setGenre] = useState(GENRES[0].id);
  const [rating, setRating] = useState<"G" | "PG" | "R">("PG");
  const [budget, setBudget] = useState<5 | 10>(5);
  const [seed, setSeed] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startStory(useRandom: boolean) {
    setLoading(true);
    setError(null);

    try {
      const createRes = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genre,
          maturity_rating: rating,
          slide_budget: budget,
          seed_prompt: useRandom ? null : seed.trim() || null,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error);

      const storyId = createData.story.id;

      const slideRes = await fetch(`/api/stories/${storyId}/slide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chosen_choice_id: null }),
      });
      const slideData = await slideRes.json();
      if (!slideRes.ok) throw new Error(slideData.error);

      router.push(`/story/${storyId}`);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong starting your story.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <p className="font-mech text-xs uppercase tracking-[0.2em] text-brass mb-2">Configuration Hub</p>
      <div className="flex items-center justify-between gap-4 mb-2">
        <h1 className="font-display text-4xl">Build your canvas.</h1>
        <span
          className="font-mech text-xs text-muted whitespace-nowrap"
          title="Free-tier AI requests used today, across all stories. Resets at midnight Pacific time."
        >
          {usageToday} requests today
        </span>
      </div>
      <div className="mb-10" />

      <section className="mb-8">
        <h2 className="font-mech text-xs uppercase tracking-wide text-muted mb-3">Genre</h2>
        <div className="grid grid-cols-2 gap-3">
          {GENRES.map((g) => (
            <button
              key={g.id}
              onClick={() => setGenre(g.id)}
              className={`text-left rounded-lg border px-4 py-3 transition ${
                genre === g.id ? "border-brass bg-surface2" : "border-surface2 bg-surface hover:border-muted"
              }`}
            >
              <div className="font-display text-lg">{g.label}</div>
              <div className="text-sm text-muted">{g.blurb}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="font-mech text-xs uppercase tracking-wide text-muted mb-3">Content Maturity</h2>
        <div className="inline-flex rounded-lg border border-surface2 overflow-hidden">
          {RATINGS.map((r) => (
            <button
              key={r}
              onClick={() => setRating(r)}
              className={`px-5 py-2 font-mech text-sm ${
                rating === r ? "bg-brass text-ink" : "bg-surface text-ink hover:bg-surface2"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="font-mech text-xs uppercase tracking-wide text-muted mb-3">Slide Pacing Budget</h2>
        <div className="inline-flex rounded-lg border border-surface2 overflow-hidden">
          {[5, 10].map((n) => (
            <button
              key={n}
              onClick={() => setBudget(n as 5 | 10)}
              className={`px-5 py-2 font-mech text-sm ${
                budget === n ? "bg-brass text-ink" : "bg-surface text-ink hover:bg-surface2"
              }`}
            >
              {n} Slides
            </button>
          ))}
        </div>
        <p className="text-sm text-muted mt-1">
          {budget === 5 ? "Paced Flash Fiction" : "Standard Novella Arc"}
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-mech text-xs uppercase tracking-wide text-muted mb-3">Opening</h2>
        <textarea
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          placeholder='e.g. "I wake up in an abandoned underwater research station with an alarm sounding."'
          className="w-full bg-surface border border-surface2 rounded px-3 py-2 outline-none focus:border-brass resize-none h-20"
        />
      </section>

      {error && <p className="text-rust text-sm mb-4">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => startStory(false)}
          disabled={loading || !seed.trim()}
          className="bg-brass text-ink font-medium rounded px-5 py-2.5 hover:opacity-90 disabled:opacity-40"
        >
          {loading ? "Generating…" : "Begin with this opening"}
        </button>
        <button
          onClick={() => startStory(true)}
          disabled={loading}
          className="border border-steel text-steel font-medium rounded px-5 py-2.5 hover:bg-surface2 disabled:opacity-40"
        >
          {loading ? "Generating…" : "Random (Insta-Start)"}
        </button>
      </div>
    </div>
  );
}

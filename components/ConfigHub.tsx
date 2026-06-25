"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GENRES } from "@/lib/genres";

const RATINGS = ["G", "PG", "R"] as const;

export default function ConfigHub({
  slidesToday,
  slideLimit,
}: {
  slidesToday: number;
  slideLimit: number;
}) {
  const router = useRouter();
  const [genre, setGenre] = useState(GENRES[0].id);
  const [rating, setRating] = useState<"G" | "PG" | "R">("PG");
  const [budget, setBudget] = useState<5 | 10 | 20>(5);
  const [proseLength, setProseLength] = useState<"concise" | "standard">("standard");
  const [seed, setSeed] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const atLimit = slidesToday >= slideLimit;

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
          prose_length: proseLength,
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
    <div className="max-w-5xl mx-auto px-6 py-12">
      <p className="font-mech text-xs uppercase tracking-[0.25em] text-cocoa mb-2">Configuration Hub</p>
      <div className="flex items-end justify-between gap-4 mb-2 flex-wrap">
        <h1 className="font-display text-5xl sm:text-6xl leading-tight">Choose your story.</h1>
        <span
          className={`font-mech text-xs whitespace-nowrap ${atLimit ? "text-rust" : "text-muted"}`}
          title="AI-generated slides used today, across all stories. Resets at midnight Eastern."
        >
          {slidesToday}/{slideLimit} slides today
        </span>
      </div>
      <div className="mb-12" />

      {atLimit && (
        <div className="bg-surface2 text-ink text-sm rounded px-4 py-3 mb-6">
          You've reached today's limit of {slideLimit} story slides. This keeps things fair while we're on the free
          tier — come back tomorrow, or revisit any stories already in progress from the{" "}
          <a href="/vault" className="underline">
            Chronicle Vault
          </a>
          .
        </div>
      )}

      <section className="rounded-2xl border-2 border-surface2 bg-surface p-6 mb-6">
        <h2 className="font-mech text-xs uppercase tracking-[0.2em] text-muted mb-4">Genre</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {GENRES.map((g) => (
            <button
              key={g.id}
              onClick={() => setGenre(g.id)}
              style={{ backgroundColor: g.cardBg }}
              className={`text-left rounded-xl border-2 px-5 py-6 transition-all duration-200 hover:scale-[1.03] hover:shadow-md ${
                genre === g.id ? "border-brass" : "border-surface2 hover:border-sage"
              }`}
            >
              <div className="font-display text-2xl mb-1">{g.label}</div>
              <div className="text-sm text-ink/70 leading-snug">{g.blurb}</div>
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <section className="rounded-2xl border-2 border-surface2 bg-surface p-6">
          <h2 className="font-mech text-xs uppercase tracking-[0.2em] text-muted mb-4">Slide Pacing Budget</h2>
          <div className="grid grid-cols-3 gap-2">
            {[5, 10, 20].map((n) => (
              <button
                key={n}
                onClick={() => setBudget(n as 5 | 10 | 20)}
                className={`px-2 py-2.5 rounded-xl border-2 font-mech text-sm transition-all duration-200 hover:scale-105 ${
                  budget === n
                    ? "bg-brass border-brass text-ink"
                    : "bg-surface border-surface2 text-ink hover:border-sage"
                }`}
              >
                {n} Slides
              </button>
            ))}
          </div>
          <p className="text-sm text-muted mt-3">
            {budget === 5 ? "Paced Flash Fiction" : budget === 10 ? "Standard Novella Arc" : "Extended Saga"}
          </p>
        </section>

        <section className="rounded-2xl border-2 border-surface2 bg-surface p-6">
          <h2 className="font-mech text-xs uppercase tracking-[0.2em] text-muted mb-4">Content Maturity</h2>
          <div className="flex gap-3">
            {RATINGS.map((r) => (
              <button
                key={r}
                onClick={() => setRating(r)}
                className={`w-11 h-11 rounded-full border-2 font-mech text-sm transition-all duration-200 hover:scale-110 ${
                  rating === r
                    ? "bg-brass border-brass text-ink"
                    : "bg-surface border-surface2 text-ink hover:border-sage"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted mt-3">
            {rating === "G"
              ? "Wholesome, family-friendly"
              : rating === "PG"
              ? "Moderate tension, mild suspense"
              : "Intense themes, dark tone"}
          </p>
        </section>

        <section className="rounded-2xl border-2 border-surface2 bg-surface p-6">
          <h2 className="font-mech text-xs uppercase tracking-[0.2em] text-muted mb-4">Text Length</h2>
          <div className="flex gap-3">
            {(["standard", "concise"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setProseLength(p)}
                className={`px-5 py-2 rounded-full border-2 font-mech text-sm capitalize transition-all duration-200 hover:scale-105 ${
                  proseLength === p
                    ? "bg-brass border-brass text-ink"
                    : "bg-surface border-surface2 text-ink hover:border-sage"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted mt-3">
            {proseLength === "concise" ? "Shorter, punchier prose" : "Fuller prose"}
          </p>
        </section>
      </div>

      <section className="rounded-2xl border-2 border-surface2 bg-surface p-6 mb-6">
        <h2 className="font-mech text-xs uppercase tracking-[0.2em] text-muted mb-4">Opening</h2>
        <textarea
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          placeholder='e.g. "I wake up in an abandoned underwater research station with an alarm sounding."'
          className="w-full bg-surface border-2 border-surface2 rounded-xl px-4 py-3 text-base outline-none transition-colors focus:border-sage resize-none h-24"
        />
      </section>

      {error && <p className="text-rust text-sm mb-4">{error}</p>}

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => startStory(false)}
          disabled={loading || atLimit || !seed.trim()}
          className="bg-brass text-ink font-medium rounded-xl px-6 py-3 text-base transition-all duration-200 hover:scale-105 hover:opacity-90 disabled:opacity-40 disabled:hover:scale-100"
        >
          {loading ? "Generating…" : "Begin with this opening"}
        </button>
        <button
          onClick={() => startStory(true)}
          disabled={loading || atLimit}
          className="border-2 border-sage text-sage font-medium rounded-xl px-6 py-3 text-base transition-all duration-200 hover:scale-105 hover:bg-sage hover:text-surface disabled:opacity-40 disabled:hover:scale-100"
        >
          {loading ? "Generating…" : "Random (Insta-Start)"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GENRES } from "@/lib/genres";
import { Choice, KarmaVector } from "@/lib/types";
import ProgressRibbon from "./ProgressRibbon";
import ChoiceCard from "./ChoiceCard";

const RATINGS = ["G", "PG", "R"] as const;
const COOLDOWN_SECONDS = 4;

type GuestSlide = {
  slide_number: number;
  prose: string;
  choices: Choice[];
  narrative_phase: string;
  chosen_text?: string | null;
};

export default function GuestPlay() {
  const [phase, setPhase] = useState<"config" | "playing">("config");
  const [genre, setGenre] = useState(GENRES[0].id);
  const [rating, setRating] = useState<"G" | "PG" | "R">("PG");
  const [budget, setBudget] = useState<5 | 10>(5);
  const [proseLength, setProseLength] = useState<"concise" | "standard">("standard");
  const [seed, setSeed] = useState("");

  const [slides, setSlides] = useState<GuestSlide[]>([]);
  const [karma, setKarma] = useState<KarmaVector>({ prudence: 0, force: 0, subtlety: 0, genre_axis: 0 });
  const [storyTitle, setStoryTitle] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const isBusy = loading || cooldown > 0;

  async function requestSlide(lastChoice: Choice | null) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/guest/slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genre,
          maturity_rating: rating,
          slide_budget: budget,
          prose_length: proseLength,
          seed_prompt: seed.trim() || null,
          karma_vector: karma,
          history: slides.map((s) => ({ slide_number: s.slide_number, prose: s.prose, chosen_text: s.chosen_text })),
          last_choice: lastChoice,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSlides((prev) => [
        ...prev.map((s, i) => (i === prev.length - 1 ? { ...s, chosen_text: lastChoice?.text ?? null } : s)),
        data.slide,
      ]);
      setKarma(data.karma_vector);
      if (data.is_final) {
        setIsComplete(true);
        if (data.story_title) setStoryTitle(data.story_title);
      }
    } catch (e: any) {
      setError(e.message ?? "The story engine stumbled. Try again.");
    } finally {
      setLoading(false);
      setCooldown(COOLDOWN_SECONDS);
    }
  }

  function startStory() {
    setPhase("playing");
    requestSlide(null);
  }

  function resetToConfig() {
    setSlides([]);
    setKarma({ prudence: 0, force: 0, subtlety: 0, genre_axis: 0 });
    setStoryTitle(null);
    setIsComplete(false);
    setError(null);
    setPhase("config");
  }

  const currentSlide = slides[slides.length - 1];

  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-surface2">
        <span className="font-mech text-xs uppercase tracking-[0.2em] text-cocoa">DecaStory — Guest</span>
        <Link href="/login" className="font-mech text-xs text-steel hover:underline">
          Sign up to save your stories
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-4">
        <div className="bg-surface2 text-ink text-sm rounded px-4 py-2 mb-6">
          Guest mode — this story lives only in your browser. Refresh or close the tab and it's gone.
        </div>
      </div>

      {phase === "config" && (
        <div className="max-w-2xl mx-auto px-6 pb-12">
          <p className="font-mech text-xs uppercase tracking-[0.2em] text-cocoa mb-2">Configuration Hub</p>
          <h1 className="font-display text-4xl mb-10">Build your canvas.</h1>

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
          </section>

          <section className="mb-8">
            <h2 className="font-mech text-xs uppercase tracking-wide text-muted mb-3">Text Length</h2>
            <div className="inline-flex rounded-lg border border-surface2 overflow-hidden">
              {(["standard", "concise"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setProseLength(p)}
                  className={`px-5 py-2 font-mech text-sm capitalize ${
                    proseLength === p ? "bg-brass text-ink" : "bg-surface text-ink hover:bg-surface2"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </section>

          <section className="mb-10">
            <h2 className="font-mech text-xs uppercase tracking-wide text-muted mb-3">Opening (optional)</h2>
            <textarea
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder='e.g. "I wake up in an abandoned underwater research station with an alarm sounding."'
              className="w-full bg-surface border border-surface2 rounded px-3 py-2 outline-none focus:border-brass resize-none h-20"
            />
          </section>

          {error && <p className="text-rust text-sm mb-4">{error}</p>}

          <button
            onClick={startStory}
            disabled={loading}
            className="bg-brass text-ink font-medium rounded px-5 py-2.5 hover:opacity-90 disabled:opacity-40"
          >
            {loading ? "Generating…" : "Begin"}
          </button>
        </div>
      )}

      {phase === "playing" && currentSlide && (
        <div className="max-w-xl mx-auto">
          <ProgressRibbon current={currentSlide.slide_number} total={budget} />

          <div className="px-6 py-8">
            <p className="font-mech text-[11px] uppercase tracking-wide text-muted mb-3">
              {currentSlide.narrative_phase}
            </p>
            <p className="font-display text-[19px] leading-relaxed">{currentSlide.prose}</p>

            {error && <p className="text-rust text-sm mt-4">{error}</p>}

            {!isComplete && (
              <div className="mt-8 space-y-3">
                {currentSlide.choices.map((choice, i) => (
                  <ChoiceCard
                    key={choice.id}
                    choice={choice}
                    index={i}
                    genre={genre}
                    onSelect={() => requestSlide(choice)}
                    disabled={isBusy}
                  />
                ))}
                {loading && <p className="font-mech text-xs text-muted">writing next slide…</p>}
                {!loading && cooldown > 0 && (
                  <p className="font-mech text-xs text-muted">next choice available in {cooldown}s…</p>
                )}
              </div>
            )}

            {isComplete && (
              <div className="mt-8 border-t border-surface2 pt-6">
                <p className="font-mech text-xs uppercase tracking-wide text-cocoa mb-2">Story Complete</p>
                {storyTitle && <p className="font-display text-lg mb-4">{storyTitle}</p>}
                <p className="text-sm text-muted mb-6">
                  This guest story wasn't saved.{" "}
                  <Link href="/login" className="text-steel underline">
                    Sign up
                  </Link>{" "}
                  to keep future ones in your Chronicle Vault.
                </p>
                <button
                  onClick={resetToConfig}
                  className="border border-steel text-steel font-medium rounded px-5 py-2.5 hover:bg-surface2"
                >
                  Start another guest story
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

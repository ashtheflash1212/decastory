"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GENRES, getGenre } from "@/lib/genres";
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
  const [died, setDied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const isBusy = loading || cooldown > 0;
  const currentSlide = slides[slides.length - 1];

  async function requestSlide(lastChoice: Choice | null, forceNullSeed: boolean = false) {
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
          seed_prompt: forceNullSeed ? null : seed.trim() || null,
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
        setDied(!!data.died);
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
    requestSlide(null, false);
  }

  function startStoryRandom() {
    setPhase("playing");
    requestSlide(null, true);
  }

  function resetToConfig() {
    setSlides([]);
    setKarma({ prudence: 0, force: 0, subtlety: 0, genre_axis: 0 });
    setStoryTitle(null);
    setIsComplete(false);
    setDied(false);
    setError(null);
    setPhase("config");
  }

  return (
    <main className="min-h-screen" style={phase === "playing" ? { backgroundColor: getGenre(genre).cardBg } : undefined}>
      <nav
        className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-surface2"
        style={{ backgroundColor: "#BFD8EC" }}
      >
        <span className="font-mech text-xs uppercase tracking-[0.2em] text-black">DecaStory — Guest</span>
        <div className="flex items-center gap-1 text-sm">
          <Link
            href="/how-it-works"
            className="px-3 py-1.5 rounded-md transition-colors hover:bg-white/40 hover:text-sage"
          >
            How It Works?
          </Link>
          <Link href="/login" className="px-3 py-1.5 rounded-md text-steel transition-colors hover:bg-white/40">
            Sign up to save
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-4">
        <div className="bg-surface2 text-ink text-sm rounded px-4 py-2 mb-6">
          Guest mode — this story lives only in your browser. Refresh or close the tab and it's gone.
        </div>
      </div>

      {phase === "config" && (
        <div className="max-w-5xl mx-auto px-6 pb-12">
          <p className="font-mech text-xs uppercase tracking-[0.25em] text-cocoa mb-2">Configuration Hub</p>
          <h1 className="font-display text-5xl sm:text-6xl leading-tight mb-12">Choose your story.</h1>

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
              <div className="grid grid-cols-2 gap-2">
                {[5, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setBudget(n as 5 | 10)}
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
              <p className="text-sm text-muted mt-3">{budget === 5 ? "Paced Flash Fiction" : "Standard Novella Arc"}</p>
              <p className="text-xs text-muted mt-1">20-slide sagas are available to signed-in accounts.</p>
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
              onClick={startStory}
              disabled={loading || !seed.trim()}
              className="bg-brass text-ink font-medium rounded-xl px-6 py-3 text-base transition-all duration-200 hover:scale-105 hover:opacity-90 disabled:opacity-40 disabled:hover:scale-100"
            >
              {loading ? "Generating…" : "Begin with this opening"}
            </button>
            <button
              onClick={startStoryRandom}
              disabled={loading}
              className="border-2 border-sage text-sage font-medium rounded-xl px-6 py-3 text-base transition-all duration-200 hover:scale-105 hover:bg-sage hover:text-surface disabled:opacity-40 disabled:hover:scale-100"
            >
              {loading ? "Generating…" : "Random (Insta-Start)"}
            </button>
          </div>
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
                    phase={currentSlide.narrative_phase}
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
                <p className={`font-mech text-xs uppercase tracking-wide mb-2 ${died ? "text-rust" : "text-cocoa"}`}>
                  {died ? "☠ You Died" : "Story Complete"}
                </p>
                {storyTitle && <p className="font-display text-lg mb-4">{storyTitle}</p>}
                <p className="text-sm text-muted mb-6">
                  This guest story wasn't saved.{" "}
                  <Link href="/login" className="text-steel underline">
                    Sign up
                  </Link>{" "}
                  to keep future ones in your Chronicle Vault — and continue them later.
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

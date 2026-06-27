"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KarmaVector, SlideRecord, StoryRecord } from "@/lib/types";
import { maskProse } from "@/lib/maskText";
import ProgressRibbon from "./ProgressRibbon";
import ChoiceCard from "./ChoiceCard";

const COOLDOWN_SECONDS = 4;
const REVEAL_PAUSE_MS = 2200; // longer pause after a missing-word slide reveals its hidden words

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function StoryCanvas({
  story: initialStory,
  slides: initialSlides,
}: {
  story: StoryRecord;
  slides: SlideRecord[];
}) {
  const router = useRouter();
  const [story, setStory] = useState(initialStory);
  const [slides, setSlides] = useState(initialSlides);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const currentSlide = slides[slides.length - 1];
  const isComplete = story.status === "completed" || story.status === "failed";
  const isBusy = loading || cooldown > 0;
  const hasHiddenWords = !!currentSlide.redacted_words?.length;

  // Reset the reveal state whenever a new slide becomes current.
  useEffect(() => {
    setRevealed(false);
  }, [currentSlide.id]);

  async function pickChoice(choiceId: string) {
    // If this slide hid some words, reveal them in place first and
    // hold for a beat before fetching the next slide — the pause IS
    // the moment, not just a loading delay.
    if (hasHiddenWords && !revealed) {
      setRevealed(true);
      setLoading(true);
      await sleep(REVEAL_PAUSE_MS);
    } else {
      setLoading(true);
    }

    setError(null);
    try {
      const res = await fetch(`/api/stories/${story.id}/slide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chosen_choice_id: choiceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSlides((prev) => [
        ...prev.map((s) => (s.id === currentSlide.id ? { ...s, chosen_choice_id: choiceId } : s)),
        data.slide,
      ]);
      setStory((prev) => ({
        ...prev,
        karma_vector: data.karma_vector as KarmaVector,
        status: data.is_final ? (data.died ? "failed" : "completed") : prev.status,
      }));
    } catch (e: any) {
      setError(e.message ?? "The story engine stumbled. Try again.");
    } finally {
      setLoading(false);
      setCooldown(COOLDOWN_SECONDS);
    }
  }

  async function branchFromHere(slideNumber: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stories/${story.id}/branch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch_point_slide: slideNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/story/${data.story.id}`);
    } catch (e: any) {
      setError(e.message ?? "Could not start a new timeline.");
      setLoading(false);
    }
  }

  const displayedProse =
    hasHiddenWords && !revealed ? maskProse(currentSlide.prose, currentSlide.redacted_words) : currentSlide.prose;

  return (
    <div className="max-w-xl mx-auto">
      <ProgressRibbon current={currentSlide.slide_number} total={story.slide_budget} />

      <div className="px-6 py-8">
        <p className="font-mech text-[11px] uppercase tracking-wide text-muted mb-3">
          {currentSlide.narrative_phase}
        </p>
        <p className="font-display text-[19px] leading-relaxed">{displayedProse}</p>
        {hasHiddenWords && !revealed && (
          <p className="font-mech text-[11px] uppercase tracking-wide text-rust mt-2">
            ▓ something's missing — choose anyway
          </p>
        )}
        {hasHiddenWords && revealed && loading && (
          <p className="font-mech text-[11px] uppercase tracking-wide text-steel mt-2">now you know...</p>
        )}

        {error && <p className="text-rust text-sm mt-4">{error}</p>}

        {!isComplete && (
          <div className="mt-8 space-y-3">
            {currentSlide.choices.map((choice, i) => (
              <ChoiceCard
                key={choice.id}
                choice={choice}
                index={i}
                genre={story.genre}
                phase={currentSlide.narrative_phase}
                onSelect={() => pickChoice(choice.id)}
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
            <p
              className={`font-mech text-xs uppercase tracking-wide mb-3 ${
                story.status === "failed" ? "text-rust" : "text-cocoa"
              }`}
            >
              {story.status === "failed" ? "☠ You Died" : "Story Complete"}
            </p>
            <p className="text-sm text-muted mb-4">
              {slides.length}/{story.slide_budget} slides survived.
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {slides.slice(0, -1).map((s) => (
                <button
                  key={s.id}
                  onClick={() => branchFromHere(s.slide_number)}
                  disabled={loading}
                  className="font-mech text-xs border border-steel text-steel rounded px-3 py-1.5 hover:bg-surface2 disabled:opacity-40"
                >
                  Split timeline from slide {s.slide_number}
                </button>
              ))}
            </div>
            {story.status === "completed" && (
              <p className="text-sm text-muted mt-3">
                Want more? Head back to the{" "}
                <a href="/vault" className="text-steel underline">
                  Chronicle Vault
                </a>{" "}
                and click 📖 on this story to continue it.
              </p>
            )}
            <a href="/vault" className="inline-block mt-4 text-sm text-muted hover:text-cocoa underline">
              Return to Chronicle Vault
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

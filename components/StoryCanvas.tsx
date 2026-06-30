"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { KarmaVector, SlideRecord, StoryRecord } from "@/lib/types";
import { getGenre } from "@/lib/genres";
import { maskProse } from "@/lib/maskText";
import ProgressRibbon from "./ProgressRibbon";
import ChoiceCard from "./ChoiceCard";

const COOLDOWN_SECONDS = 4;
const REVEAL_PAUSE_MS = 2200; // longer pause after a missing-word slide reveals its hidden words
const ACTION_TIMER_SECONDS = 18; // Action only: "no time to think" - literal countdown per choice

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
  const [timerKey, setTimerKey] = useState(0);
  const actionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fantasy rewrite: which choice (if any) has been given custom
  // wording on the CURRENT slide, and what that wording is. Resets
  // whenever a new slide loads.
  const [overrideChoiceId, setOverrideChoiceId] = useState<string | null>(null);
  const [overrideText, setOverrideText] = useState<string | null>(null);
  const [introDismissed, setIntroDismissed] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<"up" | "down" | null>(story.feedback_rating ?? null);
  const [feedbackComment, setFeedbackComment] = useState(story.feedback_comment ?? "");
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSaved, setFeedbackSaved] = useState(!!story.feedback_rating);
  const [feedbackError, setFeedbackError] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const currentSlide = slides[slides.length - 1];
  const isComplete = story.status === "completed" || story.status === "failed";
  const isBusy = loading || cooldown > 0;
  const hasHiddenWords = !!currentSlide.redacted_words?.length;
  const isAction = story.genre === "action";
  const genreColor = getGenre(story.genre).climaxBorder;
  const showIntro =
    !introDismissed &&
    !!story.intro_text &&
    slides.length === 1 &&
    currentSlide.slide_number === 1 &&
    !currentSlide.chosen_choice_id;
  const canRewriteSlide =
    story.genre === "fantasy" &&
    story.rewrites_remaining > 0 &&
    overrideChoiceId === null &&
    currentSlide.narrative_phase !== "CLIMAX" &&
    currentSlide.narrative_phase !== "RESOLUTION";

  // Reset per-slide state whenever a new slide becomes current.
  useEffect(() => {
    setRevealed(false);
    setOverrideChoiceId(null);
    setOverrideText(null);
  }, [currentSlide.id]);

  // Action only: a hard countdown per slide. Running out auto-picks
  // the first option rather than leaving the player stuck — fits
  // the genre's "no time to think" identity literally.
  useEffect(() => {
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    if (!isAction || isComplete || showIntro || currentSlide.choices.length === 0) return;

    setTimerKey((k) => k + 1);
    actionTimeoutRef.current = setTimeout(() => {
      const fallback = currentSlide.choices[0];
      if (fallback) pickChoice(fallback.id);
    }, ACTION_TIMER_SECONDS * 1000);

    return () => {
      if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlide.id, isAction, isComplete, showIntro]);

  async function pickChoice(choiceId: string) {
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);

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
        body: JSON.stringify({
          chosen_choice_id: choiceId,
          override_text: overrideChoiceId === choiceId ? overrideText : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSlides((prev) => [
        ...prev.map((s) =>
          s.id === currentSlide.id
            ? {
                ...s,
                chosen_choice_id: choiceId,
                choice_override_text: overrideChoiceId === choiceId ? overrideText : null,
              }
            : s
        ),
        data.slide,
      ]);
      setStory((prev) => ({
        ...prev,
        karma_vector: data.karma_vector as KarmaVector,
        status: data.is_final ? (data.died ? "failed" : "completed") : prev.status,
        rewrites_remaining: data.rewrites_remaining ?? prev.rewrites_remaining,
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

  async function submitFeedback(rating: "up" | "down", comment: string) {
    setFeedbackRating(rating);
    setSubmittingFeedback(true);
    setFeedbackError(false);
    try {
      const res = await fetch(`/api/stories/${story.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setFeedbackSaved(true);
      setShowCommentBox(false);
    } catch {
      setFeedbackError(true);
    } finally {
      setSubmittingFeedback(false);
    }
  }

  const displayedProse =
    hasHiddenWords && !revealed ? maskProse(currentSlide.prose, currentSlide.redacted_words) : currentSlide.prose;

  return (
    <div className="max-w-xl mx-auto">
      {showIntro ? (
        <div className="px-6 py-8">
          <p className="font-mech text-[11px] uppercase tracking-wide text-muted mb-3">Prologue</p>
          <p className="font-display text-[19px] leading-relaxed">{story.intro_text}</p>
          <button
            onClick={() => setIntroDismissed(true)}
            className="mt-8 bg-brass text-ink font-medium rounded-xl px-6 py-3 text-base transition-all duration-200 hover:scale-105 hover:opacity-90"
          >
            Begin Story →
          </button>
        </div>
      ) : (
        <>
          <ProgressRibbon current={currentSlide.slide_number} total={story.slide_budget} />

      <div className="px-6 py-8">
        <p
          className={`font-mech text-[11px] uppercase tracking-wide mb-3 ${
            currentSlide.narrative_phase === "CLIMAX"
              ? ""
              : "text-muted"
          }`}
          style={
            currentSlide.narrative_phase === "CLIMAX"
              ? { color: genreColor }
              : undefined
          }
        >
          {currentSlide.narrative_phase}
        </p>
        <p
          key={currentSlide.id}
          className="font-display text-[17px] sm:text-[19px] leading-relaxed"
          style={{ animation: "decastory-prose-in 300ms ease-out both" }}
        >
          {displayedProse}
        </p>
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
            {isAction && (
              <div key={timerKey} className="h-2 rounded-full bg-surface2 overflow-hidden mb-2">
                <div
                  className="h-full bg-rust"
                  style={{ animation: `decastory-countdown ${ACTION_TIMER_SECONDS}s linear forwards` }}
                />
              </div>
            )}
            {canRewriteSlide && (
              <p className="font-mech text-[11px] uppercase tracking-wide text-mystic mb-1">
                ✎ {story.rewrites_remaining} rewrite{story.rewrites_remaining === 1 ? "" : "s"} left — click the
                pencil on any choice to put it in your own words
              </p>
            )}
            {currentSlide.choices.map((choice, i) => (
              <ChoiceCard
                key={choice.id}
                choice={choice}
                index={i}
                genre={story.genre}
                phase={currentSlide.narrative_phase}
                overrideText={overrideChoiceId === choice.id ? overrideText : null}
                canRewrite={canRewriteSlide}
                onSelect={() => pickChoice(choice.id)}
                onRewrite={(text) => {
                  setOverrideChoiceId(choice.id);
                  setOverrideText(text);
                }}
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
              className={`font-display text-4xl mb-1 ${
                story.status === "failed" ? "text-rust" : ""
              }`}
              style={story.status !== "failed" ? { color: genreColor } : undefined}
            >
              {story.status === "failed" ? "☠ You Died" : "Story Complete"}
            </p>
            <p className="text-sm text-muted mb-4">
              {slides.length}/{story.slide_budget} slides survived.
            </p>

            <div className="rounded-xl border-2 border-surface2 bg-surface2/40 px-4 py-3 mb-4">
              {feedbackSaved ? (
                <p className="font-mech text-xs text-muted">
                  {feedbackRating === "up" ? "↑" : "↓"} Thanks for the feedback!
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <p className="font-mech text-xs uppercase tracking-wide text-muted">Did you like this story?</p>
                    <button
                      onClick={() => { setShowCommentBox(true); setFeedbackRating("up"); }}
                      disabled={submittingFeedback}
                      title="Thumbs up"
                      className={`rounded-lg border-2 p-1.5 transition-all duration-200 hover:scale-110 disabled:opacity-40 ${
                        feedbackRating === "up" ? "border-sage bg-[#F0FFF0] text-sage" : "border-surface2 text-muted hover:border-sage hover:text-sage"
                      }`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                        <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => { setShowCommentBox(true); setFeedbackRating("down"); }}
                      disabled={submittingFeedback}
                      title="Thumbs down"
                      className={`rounded-lg border-2 p-1.5 transition-all duration-200 hover:scale-110 disabled:opacity-40 ${
                        feedbackRating === "down" ? "border-rust bg-rust/10 text-rust" : "border-surface2 text-muted hover:border-rust hover:text-rust"
                      }`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
                        <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
                      </svg>
                    </button>
                  </div>
                  {showCommentBox && feedbackRating && (
                    <div className="mt-2.5">
                      <textarea
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        placeholder={feedbackRating === "up" ? "What worked? (optional)" : "What went wrong? (optional)"}
                        className="w-full bg-surface border-2 border-surface2 rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-sage resize-none h-14 mb-2"
                      />
                      <button
                        onClick={() => submitFeedback(feedbackRating, feedbackComment)}
                        disabled={submittingFeedback}
                        className="font-mech text-xs bg-brass text-ink rounded px-3 py-1.5 hover:opacity-90 disabled:opacity-40"
                      >
                        {submittingFeedback ? "Saving…" : "Submit"}
                      </button>
                      {feedbackError && (
                        <p className="text-rust text-xs mt-1">Couldn't save — try again.</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

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
                Want more? Head back to{" "}
                <a href="/vault" className="text-steel underline">
                  The Vault
                </a>{" "}
                and click 📖 on this story to continue it.
              </p>
            )}
            <a href="/vault" className="inline-block mt-4 text-sm text-muted hover:text-cocoa underline">
              Return to The Vault
            </a>
          </div>
        )}
          </div>
        </>
      )}
    </div>
  );
}

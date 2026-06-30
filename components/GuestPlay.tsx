"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GENRES, getGenre } from "@/lib/genres";
import { Choice, KarmaVector } from "@/lib/types";
import { maskProse } from "@/lib/maskText";
import { getOrCreateGuestId } from "@/lib/guestId";
import ProgressRibbon from "./ProgressRibbon";
import ChoiceCard from "./ChoiceCard";

const RATINGS = ["G", "PG", "R"] as const;
const COOLDOWN_SECONDS = 4;
const REVEAL_PAUSE_MS = 2200;
const ACTION_TIMER_SECONDS = 18;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Fantasy only, guest mode: same allotment logic as the
// authenticated route's initialRewrites(), kept client-side only
// since guest stories never touch the database.
function initialRewrites(genreId: string, slideBudget: number): number {
  if (genreId !== "fantasy") return 0;
  return slideBudget === 10 ? 1 : 0; // guests only have 5/10, no 20-slide tier
}

type GuestSlide = {
  slide_number: number;
  prose: string;
  choices: Choice[];
  narrative_phase: string;
  chosen_text?: string | null;
  redacted_words?: string[] | null;
};

export default function GuestPlay() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [phase, setPhase] = useState<"config" | "playing">("config");
  const [genre, setGenre] = useState(GENRES[0].id);
  const [hoveredGenre, setHoveredGenre] = useState<string | null>(null);
  const [rating, setRating] = useState<"G" | "PG" | "R">("PG");
  const [budget, setBudget] = useState<5 | 10>(5);
  const [proseLength, setProseLength] = useState<"concise" | "standard">("standard");
  const [seed, setSeed] = useState("");
  const [focusPrompt, setFocusPrompt] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [guestId, setGuestId] = useState("");

  useEffect(() => {
    setGuestId(getOrCreateGuestId());
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [slides, setSlides] = useState<GuestSlide[]>([]);
  const [karma, setKarma] = useState<KarmaVector>({ prudence: 0, force: 0, subtlety: 0, genre_axis: 0 });
  const [storyTitle, setStoryTitle] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [died, setDied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [rewritesRemaining, setRewritesRemaining] = useState(0);
  const [feedbackRating, setFeedbackRating] = useState<"up" | "down" | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const actionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fantasy rewrite: which choice (if any) has custom wording on
  // the CURRENT slide. Resets whenever a new slide loads.
  const [overrideChoiceId, setOverrideChoiceId] = useState<string | null>(null);
  const [overrideText, setOverrideText] = useState<string | null>(null);
  const [introText, setIntroText] = useState<string | null>(null);
  const [introDismissed, setIntroDismissed] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const isBusy = loading || cooldown > 0;
  const currentSlide = slides[slides.length - 1];
  const hasHiddenWords = !!currentSlide?.redacted_words?.length;
  const isAction = genre === "action";
  const canRewriteSlide =
    genre === "fantasy" &&
    rewritesRemaining > 0 &&
    overrideChoiceId === null &&
    currentSlide?.narrative_phase !== "CLIMAX" &&
    currentSlide?.narrative_phase !== "RESOLUTION";
  const showIntro = !introDismissed && !!introText && slides.length === 1 && currentSlide?.slide_number === 1;

  useEffect(() => {
    setRevealed(false);
    setOverrideChoiceId(null);
    setOverrideText(null);
  }, [currentSlide?.slide_number]);

  // Action only: hard countdown per slide, auto-picks the first
  // option if time runs out.
  useEffect(() => {
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    if (!isAction || isComplete || showIntro || !currentSlide || currentSlide.choices.length === 0) return;

    setTimerKey((k) => k + 1);
    actionTimeoutRef.current = setTimeout(() => {
      const fallback = currentSlide.choices[0];
      if (fallback) requestSlide(fallback);
    }, ACTION_TIMER_SECONDS * 1000);

    return () => {
      if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlide?.slide_number, isAction, isComplete, showIntro]);


  async function requestSlide(lastChoice: Choice | null, forceNullSeed: boolean = false) {
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);

    const usingOverride = lastChoice && overrideChoiceId === lastChoice.id ? overrideText : null;

    // If the current slide hid words and the player is now picking,
    // reveal them in place and hold for a beat before fetching next.
    if (lastChoice && hasHiddenWords && !revealed) {
      setRevealed(true);
      setLoading(true);
      await sleep(REVEAL_PAUSE_MS);
    } else {
      setLoading(true);
    }
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
          focus_prompt: focusPrompt.trim() || null,
          karma_vector: karma,
          history: slides.map((s) => ({ slide_number: s.slide_number, prose: s.prose, chosen_text: s.chosen_text })),
          last_choice: lastChoice,
          override_text: usingOverride,
          rewrites_remaining: rewritesRemaining,
          guest_id: guestId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSlides((prev) => [
        ...prev.map((s, i) =>
          i === prev.length - 1 ? { ...s, chosen_text: usingOverride ?? lastChoice?.text ?? null } : s
        ),
        data.slide,
      ]);
      setKarma(data.karma_vector);
      if (typeof data.rewrites_remaining === "number") setRewritesRemaining(data.rewrites_remaining);
      if (typeof data.intro_text === "string") setIntroText(data.intro_text);
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
    setRewritesRemaining(initialRewrites(genre, budget));
    setIntroText(null);
    setIntroDismissed(false);
    setPhase("playing");
    requestSlide(null, false);
  }

  function startStoryRandom() {
    setRewritesRemaining(initialRewrites(genre, budget));
    setIntroText(null);
    setIntroDismissed(false);
    setPhase("playing");
    requestSlide(null, true);
  }

  function resetToConfig() {
    setSlides([]);
    setKarma({ prudence: 0, force: 0, subtlety: 0, genre_axis: 0 });
    setStoryTitle(null);
    setIsComplete(false);
    setDied(false);
    setRewritesRemaining(0);
    setOverrideChoiceId(null);
    setOverrideText(null);
    setIntroText(null);
    setIntroDismissed(false);
    setFeedbackRating(null);
    setFeedbackComment("");
    setShowCommentBox(false);
    setFeedbackSaved(false);
    setError(null);
    setPhase("config");
  }

  async function submitFeedback(rating: "up" | "down", comment: string) {
    setFeedbackRating(rating);
    setSubmittingFeedback(true);
    try {
      const res = await fetch("/api/guest/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guest_id: guestId,
          genre,
          slide_budget: budget,
          rating,
          comment: comment.trim() || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setFeedbackSaved(true);
      setShowCommentBox(false);
    } catch {
      // non-critical — don't block the player over a feedback save failing
    } finally {
      setSubmittingFeedback(false);
    }
  }

  return (
    <main className="min-h-screen" style={phase === "playing" ? { backgroundColor: getGenre(genre).cardBg } : undefined}>
      <nav className="sticky top-0 z-50 border-b border-surface2" style={{ backgroundColor: "#BFD8EC" }}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <span className="font-mech text-xs uppercase tracking-[0.2em] text-black">DecaStory — Guest</span>

          {/* Desktop: inline pill links */}
          <div className="hidden sm:flex items-center gap-1 text-sm">
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

          {/* Mobile: hamburger toggle */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            className="sm:hidden w-9 h-9 flex items-center justify-center rounded-md hover:bg-white/40 transition-colors"
          >
            <span className="font-mech text-lg leading-none">{menuOpen ? "✕" : "☰"}</span>
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="sm:hidden px-4 pb-4 space-y-1">
            <Link
              href="/how-it-works"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2.5 rounded-md text-sm transition-colors hover:bg-white/40 hover:text-sage"
            >
              How It Works?
            </Link>
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2.5 rounded-md text-sm text-steel transition-colors hover:bg-white/40"
            >
              Sign up to save
            </Link>
          </div>
        )}
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-4">
        <div className="bg-surface2 text-ink text-sm rounded px-4 py-2 mb-6">
          Guest mode — this story lives only in your browser. Refresh or close the tab and it's gone.
        </div>
      </div>

      {phase === "config" && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-8 sm:pb-12">
          <p className="font-mech text-xs uppercase tracking-[0.25em] text-cocoa mb-2">Configuration Hub</p>
          <h1 className="font-display text-5xl sm:text-6xl leading-tight mb-8 sm:mb-12">Choose your story.</h1>

          <section className="rounded-2xl border-2 border-surface2 bg-surface p-4 sm:p-6 mb-6">
            <h2 className="font-mech text-xs uppercase tracking-[0.2em] text-muted mb-4">Genre</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {GENRES.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGenre(g.id)}
                  onMouseEnter={() => setHoveredGenre(g.id)}
                  onMouseLeave={() => setHoveredGenre(null)}
                  style={{
                    backgroundColor: g.cardBg,
                    boxShadow: hoveredGenre === g.id ? `0 0 0 3px ${g.cardBg}, 0 4px 16px ${g.cardBg}88` : undefined,
                  }}
                  className={`relative text-left rounded-xl border-2 px-5 py-6 transition-all duration-200 hover:scale-[1.03] hover:shadow-md ${
                    genre === g.id ? "border-brass" : "border-surface2 hover:border-sage"
                  }`}
                >
                  {genre === g.id && (
                    <span
                      className="absolute top-3 right-3 w-6 h-6 rounded-full border-2 border-sage flex items-center justify-center text-sage text-xs"
                      style={{ backgroundColor: "#F0FFF0" }}
                    >
                      ✓
                    </span>
                  )}
                  <div className="font-display text-2xl mb-1">{g.label}</div>
                  <div className="text-sm text-ink/70 leading-snug min-h-[2.5rem]">{g.blurb}</div>
                </button>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <section className="rounded-2xl border-2 border-surface2 bg-surface p-4 sm:p-6">
              <h2 className="font-mech text-xs uppercase tracking-[0.2em] text-muted mb-4">Slide Pacing Budget</h2>
              <div className="grid grid-cols-2 gap-2">
                {[5, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setBudget(n as 5 | 10)}
                    className={`px-2 py-2.5 rounded-xl border-2 font-mech text-sm transition-all duration-200 hover:scale-105 ${
                      budget === n
                        ? "bg-[#F0FFF0] border-sage text-ink"
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

            <section className="rounded-2xl border-2 border-surface2 bg-surface p-4 sm:p-6">
              <h2 className="font-mech text-xs uppercase tracking-[0.2em] text-muted mb-4">Content Maturity</h2>
              <div className="flex gap-3">
                {RATINGS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRating(r)}
                    className={`w-11 h-11 rounded-full border-2 font-mech text-sm transition-all duration-200 hover:scale-110 ${
                      rating === r
                        ? "bg-[#F0FFF0] border-sage text-ink"
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

            <section className="rounded-2xl border-2 border-surface2 bg-surface p-4 sm:p-6">
              <h2 className="font-mech text-xs uppercase tracking-[0.2em] text-muted mb-4">Text Length</h2>
              <div className="flex gap-3">
                {(["standard", "concise"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setProseLength(p)}
                    className={`px-5 py-2 rounded-full border-2 font-mech text-sm capitalize transition-all duration-200 hover:scale-105 ${
                      proseLength === p
                        ? "bg-[#F0FFF0] border-sage text-ink"
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

          <section className="rounded-2xl border-2 border-surface2 bg-surface p-4 sm:p-6 mb-6">
            <h2 className="font-mech text-xs uppercase tracking-[0.2em] text-muted mb-4">Opening</h2>
            <textarea
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder='e.g. "I wake up in an abandoned underwater research station with an alarm sounding."'
              className="w-full bg-surface border-2 border-surface2 rounded-xl px-4 py-3 text-base outline-none transition-colors focus:border-sage resize-none h-24"
            />
          </section>

          <section className="rounded-2xl border-2 border-surface2 bg-surface p-4 sm:p-6 mb-6">
            <h2 className="font-mech text-xs uppercase tracking-[0.2em] text-muted mb-4">
              What the story should focus on <span className="text-muted/70">(optional)</span>
            </h2>
            <p className="text-sm text-muted mb-3">
              Keeps the AI on your actual subject instead of drifting into generic genre spectacle.
            </p>
            <textarea
              value={focusPrompt}
              onChange={(e) => setFocusPrompt(e.target.value)}
              placeholder={
                isMobile
                  ? 'e.g. "Stay on the basketball game, no disasters."'
                  : 'e.g. "Keep this entirely about an intense 1-on-1 basketball game — no unrelated disasters."'
              }
              className="w-full bg-surface border-2 border-surface2 rounded-xl px-4 py-3 text-base outline-none transition-colors focus:border-sage resize-none h-20"
            />
          </section>

          {error && <p className="text-rust text-sm mb-4">{error}</p>}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={startStory}
              disabled={loading || !seed.trim()}
              className="w-full sm:w-auto text-center bg-brass text-ink font-medium rounded-xl px-6 py-3 text-base transition-all duration-200 hover:scale-105 hover:opacity-90 disabled:opacity-40 disabled:hover:scale-100"
            >
              {loading ? "Generating…" : "Begin with this opening"}
            </button>
            <button
              onClick={startStoryRandom}
              disabled={loading}
              className="w-full sm:w-auto text-center border-2 border-sage text-sage font-medium rounded-xl px-6 py-3 text-base transition-all duration-200 hover:scale-105 hover:bg-sage hover:text-surface disabled:opacity-40 disabled:hover:scale-100"
            >
              {loading ? "Generating…" : "Random (Insta-Start)"}
            </button>
          </div>
        </div>
      )}

      {phase === "playing" && currentSlide && (
        <div className="max-w-xl mx-auto">
          {showIntro ? (
            <div className="px-6 py-8">
              <p className="font-mech text-[11px] uppercase tracking-wide text-muted mb-3">Prologue</p>
              <p className="font-display text-[19px] leading-relaxed">{introText}</p>
              <button
                onClick={() => setIntroDismissed(true)}
                className="mt-8 bg-brass text-ink font-medium rounded-xl px-6 py-3 text-base transition-all duration-200 hover:scale-105 hover:opacity-90"
              >
                Begin Story →
              </button>
            </div>
          ) : (
          <>
          <ProgressRibbon current={currentSlide.slide_number} total={budget} />

          <div className="px-6 py-8">
            <p
              className={`font-mech text-[11px] uppercase tracking-wide mb-3 ${
                currentSlide.narrative_phase === "CLIMAX" ? "" : "text-muted"
              }`}
              style={
                currentSlide.narrative_phase === "CLIMAX"
                  ? { color: getGenre(genre).climaxBorder }
                  : undefined
              }
            >
              {currentSlide.narrative_phase}
            </p>
            <p
              key={currentSlide.slide_number}
              className="font-display text-[17px] sm:text-[19px] leading-relaxed"
              style={{ animation: "decastory-prose-in 300ms ease-out both" }}
            >
              {hasHiddenWords && !revealed ? maskProse(currentSlide.prose, currentSlide.redacted_words) : currentSlide.prose}
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
                    ✎ {rewritesRemaining} rewrite{rewritesRemaining === 1 ? "" : "s"} left — click the pencil on
                    any choice to put it in your own words
                  </p>
                )}
                {currentSlide.choices.map((choice, i) => (
                  <ChoiceCard
                    key={choice.id}
                    choice={choice}
                    index={i}
                    genre={genre}
                    phase={currentSlide.narrative_phase}
                    overrideText={overrideChoiceId === choice.id ? overrideText : null}
                    canRewrite={canRewriteSlide}
                    onSelect={() => requestSlide(choice)}
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
                  className={`font-display text-4xl mb-1 ${died ? "text-rust" : ""}`}
                  style={!died ? { color: getGenre(genre).climaxBorder } : undefined}
                >
                  {died ? "☠ You Died" : "Story Complete"}
                </p>
                {storyTitle && <p className="font-display text-lg mb-4 text-muted">{storyTitle}</p>}

                <div className="rounded-xl border-2 border-surface2 bg-surface2/40 px-4 py-3 mb-6">
                  {feedbackSaved ? (
                    <p className="font-mech text-xs text-muted">
                      {feedbackRating === "up" ? "👍" : "👎"} Thanks for the feedback!
                    </p>
                  ) : (
                    <>
                      <p className="font-mech text-xs uppercase tracking-wide text-muted mb-2">
                        Did you like this story?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setShowCommentBox(true);
                            setFeedbackRating("up");
                          }}
                          disabled={submittingFeedback}
                          className={`text-2xl rounded-lg border-2 px-3 py-1.5 transition-all duration-200 hover:scale-110 disabled:opacity-40 ${
                            feedbackRating === "up" ? "border-sage bg-[#F0FFF0]" : "border-surface2 hover:border-sage"
                          }`}
                        >
                          👍
                        </button>
                        <button
                          onClick={() => {
                            setShowCommentBox(true);
                            setFeedbackRating("down");
                          }}
                          disabled={submittingFeedback}
                          className={`text-2xl rounded-lg border-2 px-3 py-1.5 transition-all duration-200 hover:scale-110 disabled:opacity-40 ${
                            feedbackRating === "down" ? "border-rust bg-rust/10" : "border-surface2 hover:border-rust"
                          }`}
                        >
                          👎
                        </button>
                      </div>
                      {showCommentBox && feedbackRating && (
                        <div className="mt-3">
                          <textarea
                            value={feedbackComment}
                            onChange={(e) => setFeedbackComment(e.target.value)}
                            placeholder={feedbackRating === "up" ? "What worked? (optional)" : "What went wrong? (optional)"}
                            className="w-full bg-surface border-2 border-surface2 rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-sage resize-none h-16 mb-2"
                          />
                          <button
                            onClick={() => submitFeedback(feedbackRating, feedbackComment)}
                            disabled={submittingFeedback}
                            className="font-mech text-xs bg-brass text-ink rounded px-3 py-1.5 hover:opacity-90 disabled:opacity-40"
                          >
                            {submittingFeedback ? "Saving…" : "Submit"}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <p className="text-sm text-muted mb-6">
                  This guest story wasn't saved.{" "}
                  <Link href="/login" className="text-steel underline">
                    Sign up
                  </Link>{" "}
                  to keep future ones in The Vault — and continue them later.
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
          </>
          )}
        </div>
      )}
    </main>
  );
}

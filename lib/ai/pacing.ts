import { KarmaAxis, KarmaVector, NarrativePhase } from "../types";

/**
 * FEATURE 1: Deterministic Narrative Compression Algorithm
 *
 * The PRD specifies P = C / N driving phase changes, but never
 * nails down the exact boundaries or what happens at the edges.
 * This is the single source of truth for that math — everything
 * else (prompts, UI ribbon, stat checks) reads from here so the
 * thresholds can never drift out of sync between systems.
 */
export function computePhase(currentSlide: number, totalBudget: number): NarrativePhase {
  const p = currentSlide / totalBudget;
  if (p >= 1) return "RESOLUTION";
  if (p >= 0.8) return "CLIMAX";
  return p < 0.5 ? "INCITING" : "RISING";
}

export function isFinalSlide(currentSlide: number, totalBudget: number): boolean {
  return currentSlide >= totalBudget;
}

/**
 * FEATURE 2: Dynamic Karma & Vector Stat Alignment
 *
 * The PRD gestures at a "stat check" on slide 7 without defining
 * pass/fail. We make it concrete and deterministic (not another
 * AI guess) so it's testable and fair:
 *
 *  - A check only fires once P >= 0.8 (the climax window) AND one
 *    axis has drifted at least STAT_CHECK_THRESHOLD away from 0.
 *  - Pass/fail compares the dominant axis value against the
 *    threshold plus a small fixed-seed variance — no randomness
 *    that can't be explained to the player.
 *  - The result is computed BEFORE the AI call and handed to the
 *    AI as a fact to narrate, never something the AI decides.
 */
const STAT_CHECK_THRESHOLD = 4;

export function maybeForceStatCheck(
  karma: KarmaVector,
  currentSlide: number,
  totalBudget: number
): { axis: KarmaAxis; threshold: number; passed: boolean } | null {
  const phase = computePhase(currentSlide, totalBudget);
  if (phase !== "CLIMAX") return null;

  const entries = Object.entries(karma) as [KarmaAxis, number][];
  const [dominantAxis, value] = entries.reduce((a, b) => (Math.abs(b[1]) > Math.abs(a[1]) ? b : a));

  if (Math.abs(value) < STAT_CHECK_THRESHOLD) return null;

  // Deterministic margin: passes if the player committed to this
  // axis decisively (value at least 1.5x the threshold).
  const passed = Math.abs(value) >= STAT_CHECK_THRESHOLD * 1.5;

  return { axis: dominantAxis, threshold: STAT_CHECK_THRESHOLD, passed };
}

export function applyChoiceToKarma(karma: KarmaVector, cost: Partial<KarmaVector>): KarmaVector {
  return {
    prudence: karma.prudence + (cost.prudence ?? 0),
    force: karma.force + (cost.force ?? 0),
    subtlety: karma.subtlety + (cost.subtlety ?? 0),
    genre_axis: karma.genre_axis + (cost.genre_axis ?? 0),
  };
}

/**
 * Stories created before the genre-axis feature have a karma_vector
 * in the database missing the genre_axis key entirely. This backfills
 * it to 0 so older in-progress stories don't break when resumed.
 */
export function withGenreAxisDefault(karma: Partial<KarmaVector>): KarmaVector {
  return {
    prudence: karma.prudence ?? 0,
    force: karma.force ?? 0,
    subtlety: karma.subtlety ?? 0,
    genre_axis: karma.genre_axis ?? 0,
  };
}

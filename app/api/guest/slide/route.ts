import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAIProvider } from "@/lib/ai/provider";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompts";
import { applyChoiceToKarma, checkForDeath, computePhase, getChoiceCount, isFinalSlide, isLastChoiceSlide, isMissingWordSlide, maybeForceStatCheck, withGenreAxisDefault } from "@/lib/ai/pacing";
import { Choice, KarmaVector, MaturityRating } from "@/lib/types";
import { getGenre } from "@/lib/genres";
import { detectHighIntensity } from "@/lib/ai/intensity";

const REWRITE_WORD_LIMIT = 12;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Guest mode: identical AI generation + pacing logic as the
 * authenticated route, but nothing is persisted server-side. The
 * entire story (history, karma) is round-tripped through the
 * client on every request and lives only in browser memory —
 * close the tab and it's gone, by design.
 *
 * Note: this intentionally has no per-user daily cap, since there
 * is no user identity to attach one to. It still counts against
 * the shared global daily quota tracked in api_usage_daily.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const {
    genre,
    maturity_rating,
    slide_budget,
    prose_length,
    seed_prompt,
    focus_prompt,
    karma_vector,
    history,
    last_choice,
    override_text,
    rewrites_remaining,
  }: {
    genre: string;
    maturity_rating: MaturityRating;
    slide_budget: 5 | 10;
    prose_length?: "concise" | "standard";
    seed_prompt: string | null;
    focus_prompt?: string | null;
    karma_vector: KarmaVector;
    history: { slide_number: number; prose: string; chosen_text?: string | null }[];
    last_choice: Choice | null;
    override_text?: string | null;
    rewrites_remaining?: number;
  } = body;

  const proseLength: "concise" | "standard" = prose_length === "concise" ? "concise" : "standard";

  if (!genre || !["G", "PG", "R"].includes(maturity_rating) || ![5, 10].includes(slide_budget)) {
    return NextResponse.json({ error: "Invalid story configuration." }, { status: 400 });
  }

  const priorSlides = history ?? [];

  let karma: KarmaVector = withGenreAxisDefault(karma_vector ?? {});
  let lastChoiceText: string | null = null;
  let rewritesAfter = rewrites_remaining ?? 0;

  if (last_choice) {
    const actingSlideNumber = priorSlides.length ? priorSlides[priorSlides.length - 1].slide_number : 0;
    const actingPhase = actingSlideNumber > 0 ? computePhase(actingSlideNumber, slide_budget) : null;

    const useOverride =
      genre === "fantasy" &&
      (rewrites_remaining ?? 0) > 0 &&
      actingPhase !== "CLIMAX" &&
      actingPhase !== "RESOLUTION" &&
      typeof override_text === "string" &&
      override_text.trim().length > 0 &&
      wordCount(override_text) <= REWRITE_WORD_LIMIT;

    karma = applyChoiceToKarma(karma, last_choice.mechanic_cost);
    lastChoiceText = useOverride ? override_text!.trim() : last_choice.text;
    if (useOverride) rewritesAfter -= 1;
  }

  const nextSlideNumber = priorSlides.length ? priorSlides[priorSlides.length - 1].slide_number + 1 : 1;
  const phase = computePhase(nextSlideNumber, slide_budget);
  const isFinal = isFinalSlide(nextSlideNumber, slide_budget);
  const died = isFinal && checkForDeath(karma, getGenre(genre).deathThreshold);
  const highIntensity = detectHighIntensity(seed_prompt);
  const forcedStatCheck = maybeForceStatCheck(karma, nextSlideNumber, slide_budget);
  const missingWord = isMissingWordSlide(nextSlideNumber, slide_budget, genre);
  const dramaticFinale = genre === "romance" && isLastChoiceSlide(nextSlideNumber, slide_budget);

  const systemPrompt = buildSystemPrompt(genre, maturity_rating, slide_budget, proseLength, highIntensity, focus_prompt);
  const userPrompt = buildUserPrompt({
    slideNumber: nextSlideNumber,
    totalBudget: slide_budget,
    phase,
    karma,
    history: priorSlides,
    lastChoiceText,
    seedPrompt: seed_prompt ?? null,
    forcedStatCheck,
    died,
    missingWord,
    dramaticFinale,
    focusPrompt: focus_prompt,
  });

  const ai = await getAIProvider();

  let aiResponse;
  try {
    aiResponse = await ai.generateSlide({ systemPrompt, userPrompt });
  } catch (err: any) {
    const rateLimited = String(err.message).startsWith("RATE_LIMITED");
    return NextResponse.json(
      { error: rateLimited ? "The free AI tier hit its rate limit. Try again in a minute." : err.message },
      { status: rateLimited ? 429 : 502 }
    );
  }

  try {
    const admin = createAdminClient();
    await admin.rpc("increment_daily_usage");
  } catch {
    // best-effort, never block the story over this
  }

  const choiceCount = getChoiceCount(nextSlideNumber, slide_budget, genre);
  const choices: Choice[] = isFinal ? [] : aiResponse.choices.slice(0, choiceCount);

  return NextResponse.json({
    slide: {
      slide_number: nextSlideNumber,
      prose: aiResponse.prose,
      choices,
      narrative_phase: phase,
      forced_stat_check: forcedStatCheck,
      redacted_words: missingWord ? aiResponse.redacted_words ?? [] : null,
    },
    karma_vector: karma,
    is_final: isFinal,
    died,
    rewrites_remaining: rewritesAfter,
    story_title: isFinal ? aiResponse.story_title : null,
  });
}

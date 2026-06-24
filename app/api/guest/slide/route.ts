import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAIProvider } from "@/lib/ai/provider";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompts";
import { applyChoiceToKarma, computePhase, isFinalSlide, maybeForceStatCheck, withGenreAxisDefault } from "@/lib/ai/pacing";
import { Choice, KarmaVector, MaturityRating } from "@/lib/types";

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
    seed_prompt,
    karma_vector,
    history,
    last_choice,
  }: {
    genre: string;
    maturity_rating: MaturityRating;
    slide_budget: 5 | 10;
    seed_prompt: string | null;
    karma_vector: KarmaVector;
    history: { slide_number: number; prose: string }[];
    last_choice: Choice | null;
  } = body;

  if (!genre || !["G", "PG", "R"].includes(maturity_rating) || ![5, 10].includes(slide_budget)) {
    return NextResponse.json({ error: "Invalid story configuration." }, { status: 400 });
  }

  let karma: KarmaVector = withGenreAxisDefault(karma_vector ?? {});
  let lastChoiceText: string | null = null;
  if (last_choice) {
    karma = applyChoiceToKarma(karma, last_choice.mechanic_cost);
    lastChoiceText = last_choice.text;
  }

  const priorSlides = history ?? [];
  const nextSlideNumber = priorSlides.length ? priorSlides[priorSlides.length - 1].slide_number + 1 : 1;
  const phase = computePhase(nextSlideNumber, slide_budget);
  const forcedStatCheck = maybeForceStatCheck(karma, nextSlideNumber, slide_budget);

  const systemPrompt = buildSystemPrompt(genre, maturity_rating, slide_budget);
  const userPrompt = buildUserPrompt({
    slideNumber: nextSlideNumber,
    totalBudget: slide_budget,
    phase,
    karma,
    history: priorSlides as any, // only slide_number/prose are read — full SlideRecord shape isn't needed here
    lastChoiceText,
    seedPrompt: seed_prompt ?? null,
    forcedStatCheck,
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

  const isFinal = isFinalSlide(nextSlideNumber, slide_budget);
  const choices: Choice[] = isFinal ? [] : aiResponse.choices.slice(0, 3);

  return NextResponse.json({
    slide: {
      slide_number: nextSlideNumber,
      prose: aiResponse.prose,
      choices,
      narrative_phase: phase,
      forced_stat_check: forcedStatCheck,
    },
    karma_vector: karma,
    is_final: isFinal,
    story_title: isFinal ? aiResponse.story_title : null,
  });
}

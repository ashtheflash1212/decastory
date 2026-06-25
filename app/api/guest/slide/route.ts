import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAIProvider } from "@/lib/ai/provider";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompts";
import { applyChoiceToKarma, canUsePowerupAt, checkForDeath, computePhase, isFinalSlide, maybeForceStatCheck, withGenreAxisDefault } from "@/lib/ai/pacing";
import { Choice, KarmaVector, MaturityRating } from "@/lib/types";
import { getGenre } from "@/lib/genres";
import { detectHighIntensity } from "@/lib/ai/intensity";

type PowerupType = "amplify" | "ally" | "shield";

/**
 * Guest mode: identical AI generation + pacing logic as the
 * authenticated route, but nothing is persisted server-side. The
 * entire story (history, karma, powerup state) is round-tripped
 * through the client on every request and lives only in browser
 * memory — close the tab and it's gone, by design.
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
    karma_vector,
    history,
    last_choice,
    powerup,
    powerups_remaining,
    shield_active,
  }: {
    genre: string;
    maturity_rating: MaturityRating;
    slide_budget: 5 | 10 | 20;
    prose_length?: "concise" | "standard";
    seed_prompt: string | null;
    karma_vector: KarmaVector;
    history: { slide_number: number; prose: string; chosen_text?: string | null }[];
    last_choice: Choice | null;
    powerup?: PowerupType | null;
    powerups_remaining: number;
    shield_active: boolean;
  } = body;

  const proseLength: "concise" | "standard" = prose_length === "concise" ? "concise" : "standard";

  if (!genre || !["G", "PG", "R"].includes(maturity_rating) || ![5, 10, 20].includes(slide_budget)) {
    return NextResponse.json({ error: "Invalid story configuration." }, { status: 400 });
  }

  const priorSlides = history ?? [];
  const currentSlideNumber = priorSlides.length ? priorSlides[priorSlides.length - 1].slide_number : 0;

  let powerupUsed: PowerupType | null = null;
  if (powerup && ["amplify", "ally", "shield"].includes(powerup)) {
    const canUse = (powerups_remaining ?? 0) > 0 && canUsePowerupAt(Math.max(currentSlideNumber, 1), slide_budget);
    if (canUse) powerupUsed = powerup;
  }

  let karma: KarmaVector = withGenreAxisDefault(karma_vector ?? {});
  let lastChoiceText: string | null = null;
  if (last_choice) {
    const cost = { ...last_choice.mechanic_cost };
    if (powerupUsed === "amplify" && cost.genre_axis) {
      cost.genre_axis = cost.genre_axis * 2;
    }
    karma = applyChoiceToKarma(karma, cost);
    lastChoiceText = last_choice.text;
  }

  const nextSlideNumber = priorSlides.length ? priorSlides[priorSlides.length - 1].slide_number + 1 : 1;
  const phase = computePhase(nextSlideNumber, slide_budget);
  const isFinal = isFinalSlide(nextSlideNumber, slide_budget);
  const died = isFinal && checkForDeath(karma, getGenre(genre).deathThreshold);
  const highIntensity = detectHighIntensity(seed_prompt);

  const rawStatCheck = maybeForceStatCheck(karma, nextSlideNumber, slide_budget);
  let forcedStatCheck = rawStatCheck;
  let shieldConsumed = false;
  if (rawStatCheck && shield_active) {
    forcedStatCheck = { ...rawStatCheck, passed: true };
    shieldConsumed = true;
  }

  const systemPrompt = buildSystemPrompt(genre, maturity_rating, slide_budget, proseLength, highIntensity);
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
    powerup: powerupUsed,
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

  const choices: Choice[] = isFinal ? [] : aiResponse.choices.slice(0, 3);

  const newPowerupsRemaining = (powerups_remaining ?? 0) - (powerupUsed ? 1 : 0);
  const newShieldActive = shieldConsumed ? false : powerupUsed === "shield" ? true : !!shield_active;

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
    died,
    powerups_remaining: newPowerupsRemaining,
    shield_active: newShieldActive,
    powerup_used: powerupUsed,
    story_title: isFinal ? aiResponse.story_title : null,
  });
}

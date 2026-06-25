import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAIProvider } from "@/lib/ai/provider";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompts";
import {
  applyChoiceToKarma,
  canUsePowerupAt,
  checkForDeath,
  computePhase,
  isFinalSlide,
  maybeForceStatCheck,
  withGenreAxisDefault,
} from "@/lib/ai/pacing";
import { Choice, KarmaVector, SlideRecord } from "@/lib/types";
import { DAILY_SLIDE_LIMIT, getEasternDateString } from "@/lib/limits";
import { getGenre } from "@/lib/genres";

type PowerupType = "amplify" | "ally" | "shield";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = getEasternDateString();

  // Check the per-user cap BEFORE spending a Gemini call — if
  // they're already at the limit, fail fast and don't burn quota.
  try {
    const { data: usedToday } = await admin.rpc("get_user_daily_usage", {
      p_user_id: userData.user.id,
      p_date: today,
    });
    if ((usedToday ?? 0) >= DAILY_SLIDE_LIMIT) {
      return NextResponse.json(
        {
          error: `You've reached today's limit of ${DAILY_SLIDE_LIMIT} story slides. This keeps the shared free AI tier available for everyone — resets at midnight Eastern.`,
        },
        { status: 429 }
      );
    }
  } catch {
    // fail open rather than breaking the app over a tracking bug
  }

  const { chosen_choice_id, powerup }: { chosen_choice_id: string | null; powerup?: PowerupType | null } = await req
    .json()
    .catch(() => ({ chosen_choice_id: null, powerup: null }));

  const { data: story, error: storyErr } = await supabase
    .from("stories")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", userData.user.id)
    .single();

  if (storyErr || !story) {
    return NextResponse.json({ error: "Story not found." }, { status: 404 });
  }
  if (story.status !== "in_progress") {
    return NextResponse.json({ error: "This story has already ended." }, { status: 400 });
  }

  const { data: history } = await supabase
    .from("slides")
    .select("*")
    .eq("story_id", story.id)
    .order("slide_number", { ascending: true });

  const slides = (history ?? []) as SlideRecord[];
  const lastSlide = slides[slides.length - 1] ?? null;

  // Validate the requested power-up: must have uses left, and the
  // CURRENT slide (the one the player is acting from) must be
  // under the 60% mark. Frontend already gates this, but the
  // server re-checks rather than trusting the client.
  const currentSlideNumber = lastSlide?.slide_number ?? 0;
  let powerupUsed: PowerupType | null = null;
  if (powerup && ["amplify", "ally", "shield"].includes(powerup)) {
    const canUse = story.powerups_remaining > 0 && canUsePowerupAt(Math.max(currentSlideNumber, 1), story.slide_budget);
    if (canUse) powerupUsed = powerup;
  }

  let karma: KarmaVector = withGenreAxisDefault(story.karma_vector);
  let lastChoiceText: string | null = null;

  // Resolve the previous slide's choice (skip on the very first call)
  if (lastSlide && chosen_choice_id) {
    const choice = (lastSlide.choices as Choice[]).find((c) => c.id === chosen_choice_id);
    if (!choice) {
      return NextResponse.json({ error: "Invalid choice id." }, { status: 400 });
    }

    // AMPLIFY doubles this turn's genre-axis impact specifically —
    // a meaningful boost to the one stat that's most genre-flavored.
    const cost = { ...choice.mechanic_cost };
    if (powerupUsed === "amplify" && cost.genre_axis) {
      cost.genre_axis = cost.genre_axis * 2;
    }

    karma = applyChoiceToKarma(karma, cost);
    lastChoiceText = choice.text;

    await supabase.from("slides").update({ chosen_choice_id }).eq("id", lastSlide.id);
  }

  const nextSlideNumber = (lastSlide?.slide_number ?? 0) + 1;
  const phase = computePhase(nextSlideNumber, story.slide_budget);
  const isFinal = isFinalSlide(nextSlideNumber, story.slide_budget);
  const died = isFinal && checkForDeath(karma, getGenre(story.genre).deathThreshold);

  // SHIELD: if one was banked on an earlier turn, it silently
  // guarantees the next stat check passes, then gets consumed.
  // Activating a NEW shield this turn can never apply to a check
  // firing this same turn — powerups only work before P<0.6, stat
  // checks only fire at P>=0.8, so the windows never overlap.
  const rawStatCheck = maybeForceStatCheck(karma, nextSlideNumber, story.slide_budget);
  let forcedStatCheck = rawStatCheck;
  let shieldConsumed = false;
  if (rawStatCheck && story.shield_active) {
    forcedStatCheck = { ...rawStatCheck, passed: true };
    shieldConsumed = true;
  }

  // Resolve which choice text was actually picked at each prior
  // slide, so the AI can callback to specific earlier decisions by
  // name (see prompts.ts rule 8b) instead of only seeing raw prose.
  const historyForPrompt = slides.map((s) => ({
    slide_number: s.slide_number,
    prose: s.prose,
    chosen_text: s.choices?.find((c) => c.id === s.chosen_choice_id)?.text ?? null,
  }));

  const systemPrompt = buildSystemPrompt(
    story.genre,
    story.maturity_rating,
    story.slide_budget,
    story.prose_length,
    story.high_intensity
  );
  const userPrompt = buildUserPrompt({
    slideNumber: nextSlideNumber,
    totalBudget: story.slide_budget,
    phase,
    karma,
    history: historyForPrompt,
    lastChoiceText,
    seedPrompt: story.seed_prompt,
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

  // Best-effort usage tracking — never let a counter failure block
  // the actual story from generating.
  try {
    await admin.rpc("increment_daily_usage");
    await admin.rpc("increment_user_daily_usage", { p_user_id: userData.user.id, p_date: today });
  } catch {
    // intentionally ignored
  }

  const choices: Choice[] = isFinal ? [] : aiResponse.choices.slice(0, 3); // hard cap at 3, schema rule #4

  const { data: newSlide, error: slideErr } = await supabase
    .from("slides")
    .insert({
      story_id: story.id,
      slide_number: nextSlideNumber,
      prose: aiResponse.prose,
      choices,
      narrative_phase: phase,
      forced_stat_check: forcedStatCheck,
    })
    .select()
    .single();

  if (slideErr) {
    return NextResponse.json({ error: slideErr.message }, { status: 500 });
  }

  const newPowerupsRemaining = story.powerups_remaining - (powerupUsed ? 1 : 0);
  const newShieldActive = shieldConsumed ? false : powerupUsed === "shield" ? true : story.shield_active;

  const storyUpdate: Record<string, unknown> = {
    karma_vector: karma,
    powerups_remaining: newPowerupsRemaining,
    shield_active: newShieldActive,
  };
  if (isFinal) {
    storyUpdate.status = died ? "failed" : "completed";
    storyUpdate.completed_at = new Date().toISOString();
    if (aiResponse.story_title) storyUpdate.title = aiResponse.story_title;
  }
  await supabase.from("stories").update(storyUpdate).eq("id", story.id);

  return NextResponse.json({
    slide: newSlide,
    karma_vector: karma,
    is_final: isFinal,
    died,
    powerups_remaining: newPowerupsRemaining,
    shield_active: newShieldActive,
    powerup_used: powerupUsed,
  });
}

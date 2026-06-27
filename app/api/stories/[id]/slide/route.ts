import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAIProvider } from "@/lib/ai/provider";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompts";
import {
  applyChoiceToKarma,
  checkForDeath,
  computePhase,
  getChoiceCount,
  isFinalSlide,
  isLastChoiceSlide,
  isMissingWordSlide,
  maybeForceStatCheck,
  withGenreAxisDefault,
} from "@/lib/ai/pacing";
import { Choice, KarmaVector, SlideRecord } from "@/lib/types";
import { DAILY_SLIDE_LIMIT, getEasternDateString } from "@/lib/limits";
import { getGenre } from "@/lib/genres";

const REWRITE_WORD_LIMIT = 12;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

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

  const {
    chosen_choice_id,
    override_text,
  }: { chosen_choice_id: string | null; override_text?: string | null } = await req
    .json()
    .catch(() => ({ chosen_choice_id: null, override_text: null }));

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

  let karma: KarmaVector = withGenreAxisDefault(story.karma_vector);
  let lastChoiceText: string | null = null;
  let rewritesRemaining = story.rewrites_remaining as number;

  // Resolve the previous slide's choice (skip on the very first call)
  if (lastSlide && chosen_choice_id) {
    const choice = (lastSlide.choices as Choice[]).find((c) => c.id === chosen_choice_id);
    if (!choice) {
      return NextResponse.json({ error: "Invalid choice id." }, { status: 400 });
    }

    // The karma effect ALWAYS comes from the original choice's
    // mechanic_cost, regardless of wording — only Fantasy stories
    // with a charge remaining can supply custom wording, and it's
    // capped tightly so it can't be used to smuggle in instructions.
    const useOverride =
      story.genre === "fantasy" &&
      rewritesRemaining > 0 &&
      lastSlide.narrative_phase !== "CLIMAX" &&
      lastSlide.narrative_phase !== "RESOLUTION" &&
      typeof override_text === "string" &&
      override_text.trim().length > 0 &&
      wordCount(override_text) <= REWRITE_WORD_LIMIT;

    karma = applyChoiceToKarma(karma, choice.mechanic_cost);
    lastChoiceText = useOverride ? override_text!.trim() : choice.text;
    if (useOverride) rewritesRemaining -= 1;

    await supabase
      .from("slides")
      .update({
        chosen_choice_id,
        choice_override_text: useOverride ? override_text!.trim() : null,
      })
      .eq("id", lastSlide.id);
  }

  const nextSlideNumber = (lastSlide?.slide_number ?? 0) + 1;
  const phase = computePhase(nextSlideNumber, story.slide_budget);
  const isFinal = isFinalSlide(nextSlideNumber, story.slide_budget);
  const died = isFinal && checkForDeath(karma, getGenre(story.genre).deathThreshold);
  const forcedStatCheck = maybeForceStatCheck(karma, nextSlideNumber, story.slide_budget);
  const missingWord = isMissingWordSlide(nextSlideNumber, story.slide_budget, story.genre);
  const dramaticFinale = story.genre === "romance" && isLastChoiceSlide(nextSlideNumber, story.slide_budget);

  // Resolve which choice text was actually picked at each prior
  // slide, so the AI can callback to specific earlier decisions by
  // name (see prompts.ts rule 8b) instead of only seeing raw prose.
  // Prefer the player's own rewritten wording when present.
  const historyForPrompt = slides.map((s) => ({
    slide_number: s.slide_number,
    prose: s.prose,
    chosen_text: s.choice_override_text ?? s.choices?.find((c) => c.id === s.chosen_choice_id)?.text ?? null,
  }));

  const systemPrompt = buildSystemPrompt(
    story.genre,
    story.maturity_rating,
    story.slide_budget,
    story.prose_length,
    story.high_intensity,
    story.focus_prompt
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
    missingWord,
    dramaticFinale,
    focusPrompt: story.focus_prompt,
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

  const choiceCount = getChoiceCount(nextSlideNumber, story.slide_budget, story.genre);
  const choices: Choice[] = isFinal ? [] : aiResponse.choices.slice(0, choiceCount);

  const { data: newSlide, error: slideErr } = await supabase
    .from("slides")
    .insert({
      story_id: story.id,
      slide_number: nextSlideNumber,
      prose: aiResponse.prose,
      choices,
      narrative_phase: phase,
      forced_stat_check: forcedStatCheck,
      redacted_words: missingWord ? aiResponse.redacted_words ?? [] : null,
    })
    .select()
    .single();

  if (slideErr) {
    return NextResponse.json({ error: slideErr.message }, { status: 500 });
  }

  const storyUpdate: Record<string, unknown> = { karma_vector: karma, rewrites_remaining: rewritesRemaining };
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
    rewrites_remaining: rewritesRemaining,
  });
}

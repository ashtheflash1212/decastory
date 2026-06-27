import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAIProvider } from "@/lib/ai/provider";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompts";
import { computePhase, getChoiceCount, isFinalSlide, isLastChoiceSlide, isMissingWordSlide, maybeForceStatCheck, withGenreAxisDefault, checkForDeath } from "@/lib/ai/pacing";
import { Choice, KarmaVector, SlideRecord } from "@/lib/types";
import { DAILY_SLIDE_LIMIT, getEasternDateString } from "@/lib/limits";
import { getGenre } from "@/lib/genres";

const VALID_EXTENSIONS = [5, 10, 20];

/**
 * Continue an already-completed story past its original ending.
 * This is just the normal slide-generation flow with two changes:
 * no choice is being resolved (we're picking back up after an
 * ending, not reacting to one), and the AI is told explicitly that
 * this is a continuation (see prompts.ts isContinuation) so it
 * writes a sensible transition instead of contradicting how the
 * story already ended.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { additional_slides } = await req.json().catch(() => ({ additional_slides: null }));
  if (!VALID_EXTENSIONS.includes(additional_slides)) {
    return NextResponse.json({ error: "Invalid extension amount." }, { status: 400 });
  }

  const admin = createAdminClient();
  const today = getEasternDateString();

  try {
    const { data: usedToday } = await admin.rpc("get_user_daily_usage", {
      p_user_id: userData.user.id,
      p_date: today,
    });
    if ((usedToday ?? 0) >= DAILY_SLIDE_LIMIT) {
      return NextResponse.json(
        { error: `You've reached today's limit of ${DAILY_SLIDE_LIMIT} story slides. Try again tomorrow.` },
        { status: 429 }
      );
    }
  } catch {
    // fail open
  }

  const { data: story, error: storyErr } = await supabase
    .from("stories")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", userData.user.id)
    .single();

  if (storyErr || !story) {
    return NextResponse.json({ error: "Story not found." }, { status: 404 });
  }
  if (story.status !== "completed") {
    return NextResponse.json({ error: "Only finished stories can be continued." }, { status: 400 });
  }

  const { data: history } = await supabase
    .from("slides")
    .select("*")
    .eq("story_id", story.id)
    .order("slide_number", { ascending: true });

  const slides = (history ?? []) as SlideRecord[];
  const lastSlide = slides[slides.length - 1];
  const newBudget = story.slide_budget + additional_slides;

  const karma: KarmaVector = withGenreAxisDefault(story.karma_vector);
  const nextSlideNumber = lastSlide.slide_number + 1;
  const phase = computePhase(nextSlideNumber, newBudget);
  const isFinal = isFinalSlide(nextSlideNumber, newBudget);
  const died = isFinal && checkForDeath(karma, getGenre(story.genre).deathThreshold);
  const forcedStatCheck = maybeForceStatCheck(karma, nextSlideNumber, newBudget);
  const missingWord = isMissingWordSlide(nextSlideNumber, newBudget, story.genre);
  const dramaticFinale = story.genre === "romance" && isLastChoiceSlide(nextSlideNumber, newBudget);

  const historyForPrompt = slides.map((s) => ({
    slide_number: s.slide_number,
    prose: s.prose,
    chosen_text: s.choices?.find((c: Choice) => c.id === s.chosen_choice_id)?.text ?? null,
  }));

  const systemPrompt = buildSystemPrompt(
    story.genre,
    story.maturity_rating,
    newBudget,
    story.prose_length,
    story.high_intensity
  );
  const userPrompt = buildUserPrompt({
    slideNumber: nextSlideNumber,
    totalBudget: newBudget,
    phase,
    karma,
    history: historyForPrompt,
    lastChoiceText: null,
    seedPrompt: story.seed_prompt,
    forcedStatCheck,
    died,
    isContinuation: true,
    missingWord,
    dramaticFinale,
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
    await admin.rpc("increment_daily_usage");
    await admin.rpc("increment_user_daily_usage", { p_user_id: userData.user.id, p_date: today });
  } catch {
    // intentionally ignored
  }

  const choiceCount = getChoiceCount(nextSlideNumber, newBudget, story.genre);
  const choices: Choice[] = isFinal ? [] : aiResponse.choices.slice(0, choiceCount);

  const { error: slideErr } = await supabase.from("slides").insert({
    story_id: story.id,
    slide_number: nextSlideNumber,
    prose: aiResponse.prose,
    choices,
    narrative_phase: phase,
    forced_stat_check: forcedStatCheck,
    redacted_words: missingWord ? aiResponse.redacted_words ?? [] : null,
  });

  if (slideErr) {
    return NextResponse.json({ error: slideErr.message }, { status: 500 });
  }

  const storyUpdate: Record<string, unknown> = {
    slide_budget: newBudget,
    status: isFinal ? (died ? "failed" : "completed") : "in_progress",
    karma_vector: karma,
  };
  if (isFinal && aiResponse.story_title) storyUpdate.title = aiResponse.story_title;
  if (!isFinal) storyUpdate.completed_at = null;

  await supabase.from("stories").update(storyUpdate).eq("id", story.id);

  return NextResponse.json({ success: true });
}

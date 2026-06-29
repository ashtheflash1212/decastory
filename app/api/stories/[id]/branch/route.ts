import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { branch_point_slide } = await req.json();
  if (!branch_point_slide || branch_point_slide < 1) {
    return NextResponse.json({ error: "branch_point_slide is required." }, { status: 400 });
  }

  const { data: parentStory } = await supabase
    .from("stories")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", userData.user.id)
    .single();

  if (!parentStory) {
    return NextResponse.json({ error: "Story not found." }, { status: 404 });
  }

  const { data: slidesUpToBranch } = await supabase
    .from("slides")
    .select("*")
    .eq("story_id", parentStory.id)
    .lte("slide_number", branch_point_slide)
    .order("slide_number", { ascending: true });

  if (!slidesUpToBranch || slidesUpToBranch.length === 0) {
    return NextResponse.json({ error: "Branch point not found in this story." }, { status: 400 });
  }

  // New branch is always a fresh 5-slide arc, per the PRD's Timeline Split spec.
  // Carries over every setting that shapes HOW the AI writes (not
  // just what genre/rating it is) — focus_prompt especially, since
  // without it the branch has no idea the player ever constrained
  // the subject, and genre flavor can drift right back in.
  const { data: newStory, error } = await supabase
    .from("stories")
    .insert({
      user_id: userData.user.id,
      genre: parentStory.genre,
      maturity_rating: parentStory.maturity_rating,
      slide_budget: 5,
      prose_length: parentStory.prose_length,
      seed_prompt: parentStory.seed_prompt,
      focus_prompt: parentStory.focus_prompt,
      high_intensity: parentStory.high_intensity,
      karma_vector: parentStory.karma_vector,
      parent_story_id: parentStory.id,
      branch_point_slide,
      title: `${parentStory.title} — Branch`,
    })
    .select()
    .single();

  if (error || !newStory) {
    return NextResponse.json({ error: error?.message ?? "Branch creation failed." }, { status: 500 });
  }

  // Copy the shared history into the new story so its narrative
  // context starts identical to the parent up to the fork point.
  const clonedSlides = slidesUpToBranch.map((s) => ({
    story_id: newStory.id,
    slide_number: s.slide_number,
    prose: s.prose,
    choices: s.slide_number === branch_point_slide ? s.choices : [],
    narrative_phase: s.narrative_phase,
    forced_stat_check: s.forced_stat_check,
    chosen_choice_id: s.slide_number === branch_point_slide ? null : s.chosen_choice_id,
  }));

  await supabase.from("slides").insert(clonedSlides);

  return NextResponse.json({ story: newStory });
}

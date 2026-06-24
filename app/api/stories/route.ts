import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DAILY_STORY_LIMIT } from "@/lib/limits";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("stories")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userData.user.id)
    .gte("created_at", todayStart.toISOString());

  if ((count ?? 0) >= DAILY_STORY_LIMIT) {
    return NextResponse.json(
      { error: `You've reached today's limit of ${DAILY_STORY_LIMIT} new stories. Try again tomorrow.` },
      { status: 429 }
    );
  }

  const body = await req.json();
  const { genre, maturity_rating, slide_budget, seed_prompt } = body;

  if (!genre || !["G", "PG", "R"].includes(maturity_rating) || ![5, 10].includes(slide_budget)) {
    return NextResponse.json({ error: "Invalid story configuration." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("stories")
    .insert({
      user_id: userData.user.id,
      genre,
      maturity_rating,
      slide_budget,
      seed_prompt: seed_prompt || null,
      title: "Untitled Story",
      karma_vector: { prudence: 0, force: 0, subtlety: 0, genre_axis: 0 },
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ story: data });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { detectHighIntensity } from "@/lib/ai/intensity";
import { getPowerupAllotment } from "@/lib/ai/pacing";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await req.json();
  const { genre, maturity_rating, slide_budget, seed_prompt, prose_length } = body;
  const proseLength = ["concise", "standard"].includes(prose_length) ? prose_length : "standard";

  if (!genre || !["G", "PG", "R"].includes(maturity_rating) || ![5, 10, 20].includes(slide_budget)) {
    return NextResponse.json({ error: "Invalid story configuration." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("stories")
    .insert({
      user_id: userData.user.id,
      genre,
      maturity_rating,
      slide_budget,
      prose_length: proseLength,
      seed_prompt: seed_prompt || null,
      title: "Untitled Story",
      karma_vector: { prudence: 0, force: 0, subtlety: 0, genre_axis: 0 },
      high_intensity: detectHighIntensity(seed_prompt),
      powerups_remaining: getPowerupAllotment(slide_budget),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ story: data });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { rating, comment } = await req.json().catch(() => ({}));
  if (rating !== "up" && rating !== "down") {
    return NextResponse.json({ error: "Rating must be 'up' or 'down'." }, { status: 400 });
  }

  const { data: story, error: storyErr } = await supabase
    .from("stories")
    .select("id, status")
    .eq("id", params.id)
    .eq("user_id", userData.user.id)
    .single();

  if (storyErr || !story) {
    return NextResponse.json({ error: "Story not found." }, { status: 404 });
  }
  if (story.status !== "completed" && story.status !== "failed") {
    return NextResponse.json({ error: "Only finished stories can be rated." }, { status: 400 });
  }

  const trimmedComment = typeof comment === "string" ? comment.trim().slice(0, 500) : null;

  const { error } = await supabase
    .from("stories")
    .update({ feedback_rating: rating, feedback_comment: trimmedComment || null })
    .eq("id", story.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if (typeof body.title === "string") {
    const trimmed = body.title.trim().slice(0, 100); // keep titles reasonable
    if (trimmed.length === 0) {
      return NextResponse.json({ error: "Title can't be empty." }, { status: 400 });
    }
    update.title = trimmed;
  }

  if (typeof body.is_favorite === "boolean") {
    update.is_favorite = body.is_favorite;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("stories")
    .update(update)
    .eq("id", params.id)
    .eq("user_id", userData.user.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Story not found." }, { status: 404 });
  }

  return NextResponse.json({ story: data });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // RLS already restricts this to the owner, but checking explicitly
  // here means we can return a clean 404 instead of a vague RLS error.
  const { error } = await supabase
    .from("stories")
    .delete()
    .eq("id", params.id)
    .eq("user_id", userData.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Slides delete automatically via the ON DELETE CASCADE foreign key
  // in the schema — no separate cleanup needed.
  return NextResponse.json({ success: true });
}

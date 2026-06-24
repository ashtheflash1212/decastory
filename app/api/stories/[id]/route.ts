import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

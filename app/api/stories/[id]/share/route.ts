import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("stories")
    .update({ is_public: true })
    .eq("id", params.id)
    .eq("user_id", userData.user.id)
    .select("share_token")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Story not found." }, { status: 404 });
  }

  return NextResponse.json({ share_token: data.share_token });
}

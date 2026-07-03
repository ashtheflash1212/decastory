import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * DELETE /api/account — permanently deletes the signed-in user's
 * account. Required by App Store guideline 5.1.1(v): apps that
 * support account creation must offer in-app account deletion.
 *
 * Deleting the auth user cascades through the schema
 * (stories, slides, usage rows all reference auth.users or
 * stories with ON DELETE CASCADE), so no orphaned data remains.
 */
export async function DELETE() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userData.user.id);
  if (error) {
    return NextResponse.json({ error: "Could not delete account. Try again." }, { status: 500 });
  }

  // Clear the local session cookie too.
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}

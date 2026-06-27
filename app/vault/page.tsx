import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TopNav from "@/components/TopNav";
import VaultGrid from "@/components/VaultGrid";

export default async function VaultPage() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: stories } = await supabase
    .from("stories")
    .select("*, slides(slide_number)")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen">
      <TopNav email={userData.user.email ?? ""} />
      <div className="max-w-7xl mx-auto px-6 py-12">
        <p className="font-mech text-xs uppercase tracking-[0.2em] text-cocoa mb-2">The Vault</p>
        <h1 className="font-display text-4xl mb-10">Your archive.</h1>

        {(!stories || stories.length === 0) ? (
          <p className="text-muted">No stories yet. Start one from the Configuration Hub.</p>
        ) : (
          <VaultGrid stories={stories as any} />
        )}
      </div>
    </main>
  );
}

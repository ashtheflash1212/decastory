import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TopNav from "@/components/TopNav";
import VaultCard from "@/components/VaultCard";

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
      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="font-mech text-xs uppercase tracking-[0.2em] text-brass mb-2">Chronicle Vault</p>
        <h1 className="font-display text-4xl mb-10">Your archive.</h1>

        {(!stories || stories.length === 0) && (
          <p className="text-muted">No stories yet. Start one from the Configuration Hub.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stories?.map((s: any) => <VaultCard key={s.id} story={s} />)}
        </div>
      </div>
    </main>
  );
}

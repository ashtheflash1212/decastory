import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DAILY_STORY_LIMIT } from "@/lib/limits";
import ConfigHub from "@/components/ConfigHub";
import TopNav from "@/components/TopNav";

export default async function HomePage() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("stories")
    .select("*", { count: "exact", head: true })
    .eq("user_id", data.user.id)
    .gte("created_at", todayStart.toISOString());

  const storiesToday = count ?? 0;

  return (
    <main className="min-h-screen">
      <TopNav email={data.user.email ?? ""} />
      <ConfigHub storiesToday={storiesToday} storyLimit={DAILY_STORY_LIMIT} />
    </main>
  );
}

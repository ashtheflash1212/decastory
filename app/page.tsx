import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DAILY_SLIDE_LIMIT, getEasternDateString } from "@/lib/limits";
import ConfigHub from "@/components/ConfigHub";
import TopNav from "@/components/TopNav";

export default async function HomePage() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  let slidesToday = 0;
  try {
    const admin = createAdminClient();
    const { data: usage } = await admin.rpc("get_user_daily_usage", {
      p_user_id: data.user.id,
      p_date: getEasternDateString(),
    });
    slidesToday = usage ?? 0;
  } catch {
    // non-critical — homepage still works without this number
  }

  return (
    <main className="min-h-screen">
      <TopNav email={data.user.email ?? ""} />
      <ConfigHub slidesToday={slidesToday} slideLimit={DAILY_SLIDE_LIMIT} />
    </main>
  );
}

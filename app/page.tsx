import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ConfigHub from "@/components/ConfigHub";
import TopNav from "@/components/TopNav";

export default async function HomePage() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  let usageToday = 0;
  try {
    const admin = createAdminClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data: usage } = await admin
      .from("api_usage_daily")
      .select("request_count")
      .eq("usage_date", today)
      .maybeSingle();
    usageToday = usage?.request_count ?? 0;
  } catch {
    // non-critical — homepage still works without this number
  }

  return (
    <main className="min-h-screen">
      <TopNav email={data.user.email ?? ""} />
      <ConfigHub usageToday={usageToday} />
    </main>
  );
}

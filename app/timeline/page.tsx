import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TopNav from "@/components/TopNav";
import TimelineExplorer from "@/components/TimelineExplorer";
import TimelineHelpButton from "@/components/TimelineHelpButton";

export default async function TimelinePage() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: stories } = await supabase
    .from("stories")
    .select("id, title, genre, status, slide_budget, parent_story_id, branch_point_slide, created_at, slides(slide_number)")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#E9F6E6" }}>
      <TopNav email={userData.user.email ?? ""} />
      <div className="max-w-6xl mx-auto px-6 py-12">
        <p className="font-mech text-xs uppercase tracking-[0.25em] text-cocoa mb-2">Timeline Tree</p>
        <div className="flex items-center gap-3 mb-8">
          <h1 className="font-display text-4xl">Trace your branches.</h1>
          <TimelineHelpButton />
        </div>
        <TimelineExplorer stories={(stories as any) ?? []} />
      </div>
    </main>
  );
}

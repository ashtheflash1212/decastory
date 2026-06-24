import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StoryCanvas from "@/components/StoryCanvas";
import TopNav from "@/components/TopNav";

export default async function StoryPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: story } = await supabase
    .from("stories")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", userData.user.id)
    .single();

  if (!story) notFound();

  const { data: slides } = await supabase
    .from("slides")
    .select("*")
    .eq("story_id", story.id)
    .order("slide_number", { ascending: true });

  if (!slides || slides.length === 0) notFound();

  return (
    <main className="min-h-screen">
      <TopNav email={userData.user.email ?? ""} />
      <StoryCanvas story={story} slides={slides} />
    </main>
  );
}

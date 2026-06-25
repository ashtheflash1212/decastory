import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGenre } from "@/lib/genres";

export default async function SharedStoryPage({ params }: { params: { token: string } }) {
  const supabase = createClient();

  const { data: story } = await supabase
    .from("stories")
    .select("*")
    .eq("share_token", params.token)
    .eq("is_public", true)
    .single();

  if (!story) notFound();

  const { data: slides } = await supabase
    .from("slides")
    .select("*")
    .eq("story_id", story.id)
    .order("slide_number", { ascending: true });

  const genre = getGenre(story.genre);

  return (
    <main className="min-h-screen">
      <nav className="px-6 py-4 border-b border-surface2">
        <span className="font-mech text-xs uppercase tracking-[0.2em] text-cocoa">DecaStory</span>
        <span className="text-muted text-sm ml-2">— shared story</span>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-12">
        <p className="font-mech text-xs uppercase tracking-wide text-muted mb-2">
          {genre.label} · {story.maturity_rating} · {story.slide_budget} slides
        </p>
        <h1 className="font-display text-3xl mb-10">{story.title}</h1>

        <div className="space-y-8">
          {slides?.map((s) => (
            <div key={s.id}>
              <p className="font-mech text-[11px] uppercase tracking-wide text-muted mb-2">Slide {s.slide_number}</p>
              <p className="font-display text-[18px] leading-relaxed">{s.prose}</p>
              {s.chosen_choice_id && (
                <p className="text-sm text-steel mt-3">
                  → {s.choices?.find((c: any) => c.id === s.chosen_choice_id)?.text}
                </p>
              )}
            </div>
          ))}
        </div>

        <p className="text-sm text-muted mt-12 pt-6 border-t border-surface2">
          This is a shared, read-only view. Want to build your own story?{" "}
          <a href="/login" className="text-steel underline">
            Try DecaStory
          </a>
          .
        </p>
      </div>
    </main>
  );
}

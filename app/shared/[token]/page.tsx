import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGenre } from "@/lib/genres";

const GENRE_ICON: Record<string, string> = {
  action: "▲",
  suspense: "◐",
  fantasy: "✦",
  romance: "♡",
};

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
    <main className="min-h-screen" style={{ backgroundColor: genre.cardBg }}>
      <nav className="sticky top-0 z-50 bg-surface/90 backdrop-blur-sm px-6 py-4 border-b border-surface2 flex items-center justify-between">
        <span className="font-mech text-xs uppercase tracking-[0.2em] text-black">DecaStory</span>
        <span
          className="font-mech text-[10px] uppercase tracking-wide px-2 py-1 rounded"
          style={{ backgroundColor: genre.climaxBorder + "22", color: genre.climaxBorder }}
        >
          {story.status === "completed" ? "Complete" : story.status === "failed" ? "Died" : "In Progress"}
        </span>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="rounded-2xl border-2 border-surface2 bg-surface p-8 mb-8 shadow-lg">
          <div className="flex items-center gap-4 mb-3">
            <span className="text-4xl" style={{ color: genre.climaxBorder }}>
              {GENRE_ICON[story.genre] ?? "●"}
            </span>
            <div>
              <p className="font-mech text-xs uppercase tracking-[0.2em] text-muted">
                {genre.label} · {story.maturity_rating} · {story.slide_budget} slides
              </p>
              <h1 className="font-display text-3xl sm:text-4xl leading-tight">{story.title}</h1>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {slides?.map((s) => {
            const isClimax = s.narrative_phase === "CLIMAX";
            return (
              <div
                key={s.id}
                className="rounded-2xl border-2 bg-surface p-6 shadow-sm transition-all duration-200"
                style={isClimax ? { borderColor: genre.climaxBorder } : { borderColor: "transparent" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="font-mech text-[11px] uppercase tracking-wide text-muted">Slide {s.slide_number}</p>
                  {isClimax && (
                    <span
                      className="font-mech text-[10px] uppercase tracking-wide px-2 py-0.5 rounded"
                      style={{ backgroundColor: genre.climaxBorder + "22", color: genre.climaxBorder }}
                    >
                      Climax
                    </span>
                  )}
                </div>
                <p className="font-display text-[18px] leading-relaxed mb-3">{s.prose}</p>
                {s.chosen_choice_id && (
                  <p
                    className="text-sm font-medium rounded-lg px-3 py-2 inline-block"
                    style={{ backgroundColor: genre.climaxBorder + "15", color: genre.climaxBorder }}
                  >
                    → {s.choices?.find((c: any) => c.id === s.chosen_choice_id)?.text}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border-2 border-surface2 bg-surface p-6 mt-8 text-center">
          <p className="text-sm text-muted">
            This is a shared, read-only view. Want to build your own story?{" "}
            <a href="/login" className="text-steel underline font-medium">
              Try DecaStory
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}

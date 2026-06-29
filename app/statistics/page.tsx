import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GENRES } from "@/lib/genres";
import TopNav from "@/components/TopNav";

export default async function StatisticsPage() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: stories } = await supabase
    .from("stories")
    .select("status, genre, slide_budget, karma_vector, slides(slide_number)")
    .eq("user_id", userData.user.id);

  const all = stories ?? [];
  const totalStories = all.length;
  const deaths = all.filter((s) => s.status === "failed").length;
  const completed = all.filter((s) => s.status === "completed").length;
  const inProgress = all.filter((s) => s.status === "in_progress").length;

  const genreCounts: Record<string, number> = {};
  for (const g of GENRES) {
    genreCounts[g.id] = all.filter((s) => s.genre === g.id).length;
  }

  const slideCounts = all.map((s) => s.slides?.length ?? 0);
  const totalSlidesPlayed = slideCounts.reduce((sum, n) => sum + n, 0);
  const longestStory = slideCounts.length ? Math.max(...slideCounts) : 0;

  // Any story whose budget isn't one of the original 5/10/20 tiers
  // must have gone through Continue Story at least once.
  const storiesContinued = all.filter((s) => ![5, 10, 20].includes(s.slide_budget)).length;

  const sums = all.reduce(
    (acc, s) => {
      const k = (s.karma_vector as any) ?? {};
      acc.prudence += k.prudence ?? 0;
      acc.force += k.force ?? 0;
      acc.subtlety += k.subtlety ?? 0;
      return acc;
    },
    { prudence: 0, force: 0, subtlety: 0 }
  );
  const totalMagnitude = Math.abs(sums.prudence) + Math.abs(sums.force) + Math.abs(sums.subtlety) || 1;
  const axes = [
    { label: "Caution", value: sums.prudence, color: "#3F7EA6" },
    { label: "Boldness", value: sums.force, color: "#C1453D" },
    { label: "Cunning", value: sums.subtlety, color: "#6B4F33" },
  ].map((a) => ({ ...a, pct: Math.round((Math.abs(a.value) / totalMagnitude) * 100) }));
  const dominant = axes.reduce((a, b) => (b.pct > a.pct ? b : a));

  const generalStats: { label: string; value: string | number; color?: string }[] = [
    { label: "Total Stories", value: totalStories },
    { label: "Completed", value: completed },
    { label: "In Progress", value: inProgress },
    { label: "Deaths", value: deaths, color: "#C1453D" },
    { label: "Total Slides Played", value: totalSlidesPlayed },
    { label: "Longest Story", value: `${longestStory} slides` },
    { label: "Stories Continued", value: storiesContinued },
  ];

  return (
    <main className="min-h-screen">
      <TopNav email={userData.user.email ?? ""} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <p className="font-mech text-xs uppercase tracking-[0.25em] text-cocoa mb-2">Statistics</p>
        <h1 className="font-display text-4xl mb-10">Your numbers.</h1>

        <section className="mb-8">
          <h2 className="font-mech text-xs uppercase tracking-[0.2em] text-muted mb-3">By Genre</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {GENRES.map((g) => (
              <div
                key={g.id}
                style={{ backgroundColor: g.cardBg }}
                className="rounded-xl border-2 border-surface2 p-4 text-center"
              >
                <p className="font-display text-3xl">{genreCounts[g.id]}</p>
                <p className="font-mech text-[11px] uppercase tracking-wide text-ink/70 mt-1">{g.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="font-mech text-xs uppercase tracking-[0.2em] text-muted mb-3">Overall</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {generalStats.map((s) => (
              <div key={s.label} className="rounded-xl border-2 border-surface2 bg-surface p-4 text-center">
                <p className="font-display text-3xl" style={s.color ? { color: s.color } : undefined}>
                  {s.value}
                </p>
                <p className="font-mech text-[11px] uppercase tracking-wide text-muted mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border-2 border-surface2 bg-surface p-6">
          <h2 className="font-mech text-xs uppercase tracking-[0.2em] text-muted mb-2">What type of person are you?</h2>
          <p className="text-sm text-muted mb-6">
            Built from every choice you've made across all your stories, leading up to each stat check.
          </p>

          {totalStories === 0 ? (
            <p className="text-muted">Play a story to start building your profile.</p>
          ) : (
            <>
              <div className="space-y-5">
                {axes.map((axis) => (
                  <div key={axis.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mech text-sm" style={{ color: axis.color }}>
                        {axis.label}
                      </span>
                      <span className="font-mech text-xs text-muted">{axis.pct}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-surface2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(2, axis.pct)}%`, backgroundColor: axis.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-sm text-muted mt-6 pt-4 border-t border-surface2">
                Overall, you lean toward{" "}
                <span className="font-medium" style={{ color: dominant.color }}>
                  {dominant.label}
                </span>{" "}
                ({dominant.pct}%).
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

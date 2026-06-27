import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACHIEVEMENTS, AchievementStats } from "@/lib/achievements";
import { GENRES } from "@/lib/genres";
import TopNav from "@/components/TopNav";

export default async function AchievementsPage() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: stories } = await supabase
    .from("stories")
    .select("status, genre, karma_vector")
    .eq("user_id", userData.user.id);

  const all = stories ?? [];
  const totalStories = all.length;
  const finished = all.filter((s) => s.status === "completed" || s.status === "failed");
  const deaths = all.filter((s) => s.status === "failed").length;

  const genreFinished: Record<string, number> = {};
  for (const g of GENRES) {
    genreFinished[g.id] = finished.filter((s) => s.genre === g.id).length;
  }

  const stats: AchievementStats = {
    totalFinished: finished.length,
    deaths,
    genreFinished,
  };

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

  const milestoneAchievements = ACHIEVEMENTS.filter((a) => a.id === "first_story" || a.id === "first_death");
  const unlockedCount = ACHIEVEMENTS.filter((a) => a.unlocked(stats)).length;

  return (
    <main className="min-h-screen">
      <TopNav email={userData.user.email ?? ""} />
      <div className="max-w-5xl mx-auto px-6 py-12">
        <p className="font-mech text-xs uppercase tracking-[0.25em] text-cocoa mb-2">Achievements</p>
        <h1 className="font-display text-4xl mb-10">Who you've become.</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <section className="rounded-2xl border-2 border-surface2 bg-surface p-6">
            <h2 className="font-mech text-xs uppercase tracking-[0.2em] text-muted mb-3">Stories Made</h2>
            <p className="font-display text-5xl">{totalStories}</p>
          </section>

          <section className="rounded-2xl border-2 border-surface2 bg-surface p-6">
            <h2 className="font-mech text-xs uppercase tracking-[0.2em] text-muted mb-3">Deaths</h2>
            <p className="font-display text-5xl text-rust">{deaths}</p>
            <p className="text-sm text-muted mt-2">
              Deaths come from sustained reckless choices, not chance — Action and Suspense are riskiest, Fantasy
              less so, Romance rarely ends this way.
            </p>
          </section>
        </div>

        <section className="rounded-2xl border-2 border-surface2 bg-surface p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mech text-xs uppercase tracking-[0.2em] text-muted">Badges</h2>
            <span className="font-mech text-xs text-muted">
              {unlockedCount}/{ACHIEVEMENTS.length} unlocked
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {milestoneAchievements.map((a) => {
              const unlocked = a.unlocked(stats);
              return (
                <div
                  key={a.id}
                  title={a.description}
                  className={`rounded-xl border-2 px-3 py-4 text-center transition-all duration-200 ${
                    unlocked ? "border-surface2" : "border-surface2 opacity-40"
                  }`}
                  style={unlocked ? { backgroundColor: `${a.color}22`, borderColor: a.color } : undefined}
                >
                  <div className="text-3xl mb-1" style={{ color: unlocked ? a.color : undefined }}>
                    {unlocked ? a.icon : "🔒"}
                  </div>
                  <p className="font-mech text-[11px] uppercase tracking-wide">{a.label}</p>
                </div>
              );
            })}
          </div>

          {GENRES.map((g) => {
            const genreAchievements = ACHIEVEMENTS.filter((a) => a.id.startsWith(`${g.id}_`));
            return (
              <div key={g.id} className="mb-5">
                <h3 className="font-mech text-[11px] uppercase tracking-wide text-muted mb-2">
                  {g.label} ({genreFinished[g.id] ?? 0} finished)
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {genreAchievements.map((a) => {
                    const unlocked = a.unlocked(stats);
                    return (
                      <div
                        key={a.id}
                        title={a.description}
                        className={`rounded-xl border-2 px-3 py-4 text-center transition-all duration-200 ${
                          unlocked ? "" : "border-surface2 opacity-40"
                        }`}
                        style={unlocked ? { backgroundColor: `${a.color}22`, borderColor: a.color } : undefined}
                      >
                        <div className="text-2xl mb-1" style={{ color: unlocked ? a.color : undefined }}>
                          {unlocked ? a.icon : "🔒"}
                        </div>
                        <p className="font-mech text-[10px] uppercase tracking-wide">{a.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
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

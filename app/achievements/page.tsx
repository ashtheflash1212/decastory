import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TopNav from "@/components/TopNav";

export default async function AchievementsPage() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: stories } = await supabase
    .from("stories")
    .select("status, karma_vector")
    .eq("user_id", userData.user.id);

  const all = stories ?? [];
  const totalStories = all.length;
  const deaths = all.filter((s) => s.status === "failed").length;

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

  // Convert to a percentage of total engagement across the three
  // axes — "35 points" means nothing on its own, but "70% Boldness"
  // immediately communicates the shape of how someone plays.
  const totalMagnitude = Math.abs(sums.prudence) + Math.abs(sums.force) + Math.abs(sums.subtlety) || 1;

  const axes = [
    { label: "Caution", value: sums.prudence, color: "#3F7EA6" },
    { label: "Boldness", value: sums.force, color: "#C1453D" },
    { label: "Cunning", value: sums.subtlety, color: "#6B4F33" },
  ].map((a) => ({ ...a, pct: Math.round((Math.abs(a.value) / totalMagnitude) * 100) }));

  const dominant = axes.reduce((a, b) => (b.pct > a.pct ? b : a));

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

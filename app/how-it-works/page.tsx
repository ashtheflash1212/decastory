import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HowItWorksPage() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const homeHref = userData.user ? "/" : "/guest";

  return (
    <main className="min-h-screen">
      <nav className="sticky top-0 z-50 bg-parchment flex items-center justify-between px-6 py-4 border-b border-surface2">
        <Link href={homeHref} className="font-mech text-xs uppercase tracking-[0.2em] text-cocoa">
          DecaStory
        </Link>
        <Link
          href={homeHref}
          className="font-mech text-xs text-steel hover:underline whitespace-nowrap"
        >
          ← Back to {userData.user ? "homepage" : "guest mode"}
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <p className="font-mech text-xs uppercase tracking-[0.2em] text-cocoa mb-2">How It Works</p>
        <h1 className="font-display text-4xl mb-10">Reading the story engine.</h1>


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-2xl border-2 border-steel/30 bg-surface p-6 lg:col-span-2">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 rounded-full bg-steel/15 text-steel flex items-center justify-center text-lg font-mech">
                ▤
              </span>
              <h2 className="font-display text-2xl">The basic loop</h2>
            </div>
            <p className="text-[15px] leading-relaxed">
              Each story is constructed from either 5, 10, or 20 slides. Following a brief introduction, you will
              navigate through the respective slides with choices to choose from. These choices affect the story,
              so be sure to choose wisely.
            </p>
          </section>

          <section className="rounded-2xl border-2 border-brass/40 bg-surface p-6 lg:col-span-2">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 rounded-full bg-brass/25 text-cocoa flex items-center justify-center text-lg font-mech">
                ⚖
              </span>
              <h2 className="font-display text-2xl">Every choice has a cost</h2>
            </div>
            <p className="text-[15px] leading-relaxed mb-4">
              Each choice holds hidden traits that you build up over the course of each story:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl bg-steel/10 px-4 py-3">
                <span className="text-steel font-medium text-[15px]">Caution</span>
                <p className="text-sm text-muted">careful, analytical choices</p>
              </div>
              <div className="rounded-xl bg-rust/10 px-4 py-3">
                <span className="text-rust font-medium text-[15px]">Boldness</span>
                <p className="text-sm text-muted">aggressive, direct choices</p>
              </div>
              <div className="rounded-xl bg-cocoa/10 px-4 py-3">
                <span className="text-cocoa font-medium text-[15px]">Cunning</span>
                <p className="text-sm text-muted">sneaky, clever choices</p>
              </div>
              <div className="rounded-xl bg-mystic/10 px-4 py-3">
                <span className="text-mystic font-medium text-[15px]">A genre-specific trait</span>
                <p className="text-sm text-muted">Magic, Paranoia, Spectacle, or Intimacy</p>
              </div>
            </div>
            <p className="text-[15px] leading-relaxed">
              These traits are labeled underneath your choices. It's up to you to choose what type of character you
              want to be; in the end, your dominant character trait will matter.
            </p>
          </section>

          <section className="rounded-2xl border-2 border-rust/30 bg-surface p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 rounded-full bg-rust/15 text-rust flex items-center justify-center text-lg font-mech">
                ⚔
              </span>
              <h2 className="font-display text-2xl">What is a "stat check"?</h2>
            </div>
            <p className="text-[15px] leading-relaxed mb-3">
              Near the climax, if you've leaned hard enough into one trait through your choices, the story can put
              that to the test. Remember, this isn't done by chance - this is strategic.
            </p>
            <p className="text-[15px] leading-relaxed">
              The story will most likely provide information about your dominant trait towards the end, and you
              can look back at your choices at the end.
            </p>
          </section>

          <section className="rounded-2xl border-2 border-sage/40 bg-surface p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 rounded-full bg-sage/20 text-sage flex items-center justify-center text-lg font-mech">
                ⑂
              </span>
              <h2 className="font-display text-2xl">Timeline Split</h2>
            </div>
            <p className="text-[15px] leading-relaxed mb-3">
              Once a story is finished, you can fork it from any earlier slide to create a whole other story. For
              example, if I fork from slide 3/5 from story A, story B will start a new story from slide 3.
            </p>
            <p className="text-sm text-muted">
              Timeline Split and the Timeline Tree page are only available on a signed-in account — guest stories
              aren't saved, so there's nothing to branch from or trace.
            </p>
          </section>
        </div>

        <p className="text-sm text-muted mt-10 pt-6 border-t border-surface2">
          Ready to try it?{" "}
          <Link href={homeHref} className="text-steel underline">
            Build a story
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

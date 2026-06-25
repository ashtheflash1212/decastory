import Link from "next/link";

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen">
      <nav className="px-6 py-4 border-b border-surface2">
        <Link href="/" className="font-mech text-xs uppercase tracking-[0.2em] text-cocoa">
          DecaStory
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
              Every story is built from a fixed number of slides — 5, 10, or 20, whichever you picked. Each slide
              shows a short bit of prose, then gives you 3 choices. Whichever you pick shapes what happens next. The
              story always ends exactly on the slide budget you chose — no more, no less.
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
              Choices aren't just flavor — each one quietly nudges one of a few hidden traits your character is
              building up over the course of the story:
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
              You'll see which trait a choice leans into as a small colored label underneath it. There's no
              "correct" trait to build — they just track which kind of character you're playing as the story
              unfolds.
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
              that to the test. This isn't a dice roll — it's based entirely on what you've already chosen.
            </p>
            <p className="text-[15px] leading-relaxed">
              Either way, the story tells you what happened concretely. You can usually look back at your own
              choices and see exactly why it went the way it did.
            </p>
          </section>

          <section className="rounded-2xl border-2 border-sage/40 bg-surface p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 rounded-full bg-sage/20 text-sage flex items-center justify-center text-lg font-mech">
                ⑂
              </span>
              <h2 className="font-display text-2xl">Timeline Split</h2>
            </div>
            <p className="text-[15px] leading-relaxed">
              Once a story is finished, you can fork it from any earlier slide into a brand new 5-slide story — same
              history up to that point, but a fresh path forward. Useful for exploring "what if I'd chosen
              differently?"
            </p>
          </section>
        </div>

        <p className="text-sm text-muted mt-10 pt-6 border-t border-surface2">
          Ready to try it?{" "}
          <Link href="/" className="text-steel underline">
            Build a story
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

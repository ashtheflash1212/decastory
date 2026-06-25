import Link from "next/link";

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen">
      <nav className="px-6 py-4 border-b border-surface2">
        <Link href="/" className="font-mech text-xs uppercase tracking-[0.2em] text-cocoa">
          DecaStory
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <p className="font-mech text-xs uppercase tracking-[0.2em] text-cocoa mb-2">How It Works</p>
        <h1 className="font-display text-4xl mb-10">Reading the story engine.</h1>

        <section className="mb-10">
          <h2 className="font-display text-2xl mb-3">The basic loop</h2>
          <p className="text-[15px] leading-relaxed mb-3">
            Every story is built from a fixed number of slides — 5 or 10, whichever you picked. Each slide shows a
            short bit of prose, then gives you 3 choices. Whichever you pick shapes what happens next. The story
            always ends exactly on the slide budget you chose — no more, no less.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="font-display text-2xl mb-3">Every choice has a cost</h2>
          <p className="text-[15px] leading-relaxed mb-3">
            Choices aren't just flavor — each one quietly nudges one of a few hidden traits your character is
            building up over the course of the story:
          </p>
          <ul className="space-y-2 mb-3">
            <li className="text-[15px]">
              <span className="text-steel font-medium">Caution</span> — careful, analytical choices
            </li>
            <li className="text-[15px]">
              <span className="text-rust font-medium">Boldness</span> — aggressive, direct choices
            </li>
            <li className="text-[15px]">
              <span className="text-cocoa font-medium">Cunning</span> — sneaky, clever choices
            </li>
            <li className="text-[15px]">
              <span className="text-mystic font-medium">A genre-specific trait</span> — Magic in Fantasy, Paranoia in
              Suspense, Spectacle in Action, Intimacy in Romance
            </li>
          </ul>
          <p className="text-[15px] leading-relaxed">
            You'll see which trait a choice leans into as a small colored label underneath it. There's no "correct"
            trait to build — they just track which kind of character you're playing as the story unfolds.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="font-display text-2xl mb-3">What is a "stat check"?</h2>
          <p className="text-[15px] leading-relaxed mb-3">
            Near the climax of the story, if you've leaned hard enough into one trait through your choices, the
            story can put that to the test. This isn't a dice roll — it's based entirely on what you've already
            chosen. If you've committed strongly to one trait, you pass. If you only leaned that way a little, you
            fail.
          </p>
          <p className="text-[15px] leading-relaxed">
            Either way, the story tells you what happened concretely — a pass might mean your bold streak finally
            pays off, a fail might mean it catches up with you. You can usually look back at your own choices and
            see exactly why it went the way it did.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="font-display text-2xl mb-3">Timeline Split</h2>
          <p className="text-[15px] leading-relaxed">
            Once a story is finished, you can fork it from any earlier slide into a brand new 5-slide story — same
            setup, same history up to that point, but a fresh path forward from there. Useful for exploring "what
            if I'd chosen differently?"
          </p>
        </section>

        <p className="text-sm text-muted mt-12 pt-6 border-t border-surface2">
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

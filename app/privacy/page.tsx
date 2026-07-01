import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen">
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-surface2 bg-parchment">
        <Link href="/" className="font-mech text-xs uppercase tracking-[0.2em] text-cocoa">
          DecaStory
        </Link>
        <Link href="/" className="font-mech text-xs text-steel hover:underline">
          ← Back
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <p className="font-mech text-xs uppercase tracking-[0.25em] text-cocoa mb-2">Legal</p>
        <h1 className="font-display text-4xl mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted mb-10">Last updated: June 2026</p>

        <div className="space-y-8 text-[15px] leading-relaxed">

          <section>
            <h2 className="font-mech text-xs uppercase tracking-[0.2em] text-muted mb-3">The short version</h2>
            <p>
              DecaStory is a personal project built by a UC Davis student. It collects only what it needs to work:
              your email to log in, and the stories you create. It doesn't sell your data, run ads, or share
              anything with third parties beyond the infrastructure services that power the app. Guest mode stores
              nothing tied to your identity except an anonymous cookie for usage counting.
            </p>
          </section>

          <section>
            <h2 className="font-mech text-xs uppercase tracking-[0.2em] text-muted mb-3">Who runs this</h2>
            <p>
              DecaStory is an independent personal project. It is not a company. If you have questions or requests
              about your data, contact: <a href="mailto:ajcharles05@ucdavis.edu" className="text-steel underline">ajcharles05@ucdavis.edu</a>
            </p>
          </section>

          <section>
            <h2 className="font-mech text-xs uppercase tracking-[0.2em] text-muted mb-3">What we collect — signed-in accounts</h2>
            <ul className="space-y-2 list-none">
              <li className="pl-4 border-l-2 border-surface2"><span className="font-medium">Email address</span> — used only for login. Never used for marketing.</li>
              <li className="pl-4 border-l-2 border-surface2"><span className="font-medium">Password</span> — hashed and stored securely by Supabase. We never see it in plaintext.</li>
              <li className="pl-4 border-l-2 border-surface2"><span className="font-medium">Stories you create</span> — the story content, your choices, and any focus prompts you write are stored so you can return to them.</li>
              <li className="pl-4 border-l-2 border-surface2"><span className="font-medium">Feedback ratings</span> — if you give a thumbs up or down on a story, that rating and any optional comment are stored on your story record.</li>
              <li className="pl-4 border-l-2 border-surface2"><span className="font-medium">Daily slide usage count</span> — a count of how many slides you've generated today, used to enforce the fair-use daily limit.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-mech text-xs uppercase tracking-[0.2em] text-muted mb-3">What we collect — guest mode</h2>
            <p className="mb-3">
              Guest stories are never saved to our database. When you close the tab, they're gone.
            </p>
            <ul className="space-y-2 list-none">
              <li className="pl-4 border-l-2 border-surface2"><span className="font-medium">Anonymous guest ID</span> — a random identifier generated in your browser and stored in a cookie for up to one year. It has no name, email, or account attached to it. It's used only to count how many distinct guest visitors use the app, and to apply a daily usage limit per guest browser.</li>
              <li className="pl-4 border-l-2 border-surface2"><span className="font-medium">Guest feedback</span> — if you submit a thumbs up/down in guest mode, the rating, genre, and your anonymous guest ID are stored. No personal information is attached.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-mech text-xs uppercase tracking-[0.2em] text-muted mb-3">What we don't collect</h2>
            <p>
              We do not collect your IP address, device fingerprint, location, real name, phone number, payment
              information, or any information about how you use other websites. We run no advertising and use no
              third-party analytics scripts (no Google Analytics, no tracking pixels).
            </p>
          </section>

          <section>
            <h2 className="font-mech text-xs uppercase tracking-[0.2em] text-muted mb-3">Third-party services</h2>
            <p className="mb-3">DecaStory uses the following infrastructure to operate:</p>
            <ul className="space-y-2 list-none">
              <li className="pl-4 border-l-2 border-surface2"><span className="font-medium">Supabase</span> — database and authentication. Your account data lives on Supabase's servers. <a href="https://supabase.com/privacy" className="text-steel underline" target="_blank" rel="noopener noreferrer">Supabase Privacy Policy</a></li>
              <li className="pl-4 border-l-2 border-surface2"><span className="font-medium">Vercel</span> — hosting and deployment. Web requests pass through Vercel's infrastructure. <a href="https://vercel.com/legal/privacy-policy" className="text-steel underline" target="_blank" rel="noopener noreferrer">Vercel Privacy Policy</a></li>
              <li className="pl-4 border-l-2 border-surface2"><span className="font-medium">Google Gemini</span> — AI story generation. The text you write in the opening and focus fields is sent to Gemini to generate your story. It is not stored by DecaStory beyond what's needed for story continuity, but is subject to Google's API terms. <a href="https://policies.google.com/privacy" className="text-steel underline" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></li>
            </ul>
          </section>

          <section>
            <h2 className="font-mech text-xs uppercase tracking-[0.2em] text-muted mb-3">Cookies</h2>
            <p>
              DecaStory uses one cookie: <span className="font-mono text-sm bg-surface2 px-1 rounded">decastory_guest_id</span>,
              set only in guest mode, containing a random identifier with no personal information attached.
              Signed-in sessions use Supabase's standard auth cookies to keep you logged in. No advertising or
              tracking cookies are used.
            </p>
          </section>

          <section>
            <h2 className="font-mech text-xs uppercase tracking-[0.2em] text-muted mb-3">Your rights</h2>
            <p className="mb-3">You can:</p>
            <ul className="space-y-2 list-none">
              <li className="pl-4 border-l-2 border-surface2">Delete any story you've created at any time from The Vault.</li>
              <li className="pl-4 border-l-2 border-surface2">Request deletion of your entire account and all associated data by emailing <a href="mailto:ajcharles05@ucdavis.edu" className="text-steel underline">ajcharles05@ucdavis.edu</a>.</li>
              <li className="pl-4 border-l-2 border-surface2">Clear your guest ID cookie at any time through your browser's cookie settings.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-mech text-xs uppercase tracking-[0.2em] text-muted mb-3">Changes to this policy</h2>
            <p>
              If this policy changes materially, the "last updated" date above will reflect that. Since this is a
              personal project without a user mailing list, changes won't be pushed by email — check this page if
              you want to stay current.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-surface2 flex gap-6">
          <Link href="/terms" className="text-sm text-steel hover:underline">Terms of Service</Link>
          <Link href="/" className="text-sm text-muted hover:text-cocoa">Back to DecaStory</Link>
        </div>
      </div>
    </main>
  );
}

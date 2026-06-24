# Project DecaStory

A finite, mechanical AI text adventure — built to run entirely on free tiers.

Stack: **Next.js** (hosting: Vercel free tier) + **Supabase** (database + auth, free tier) + **Google Gemini API** (AI story engine, free tier).

---

## 1. Get your free accounts (5–10 min)

You need three free accounts. None require a credit card for what this app uses.

### a) Supabase (database + login)
1. Go to https://supabase.com → sign up → "New project"
2. Wait ~2 min for it to provision
3. Go to **Project Settings → API**. Copy:
   - `Project URL` → this is `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → this is `SUPABASE_SERVICE_ROLE_KEY` (keep secret, never expose to the browser)
4. Go to **SQL Editor → New query**, paste the entire contents of `supabase/schema.sql` from this project, and run it. This creates the `stories` and `slides` tables with row-level security already locked down so users can only see their own data.
5. Go to **Authentication → Providers** and confirm "Email" is enabled (it is by default). You can leave "Confirm email" off for now to skip setting up an email sender — turn it on later if you want email verification.

### b) Google Gemini (AI story engine — free, no card)
1. Go to https://ai.google.dev → "Get API key" → sign in with a Google account
2. Create a key in a new or existing project
3. Copy it → this is `GEMINI_API_KEY`

Free tier gives you roughly 1,500 requests/day — far more than a side project needs. One nuance: Google's free tier may use your prompts to improve their models. If that matters to you (e.g. you don't want user-submitted story seeds used this way), keep that in mind, or revisit the paid Anthropic path documented in `lib/ai/anthropic.ts` later.

### c) Vercel (hosting — free)
You'll connect this when you deploy in step 4. No setup needed yet beyond having a GitHub account.

---

## 2. Run it locally

```bash
npm install
cp .env.example .env.local
# paste in your real keys from step 1
npm run dev
```

Visit http://localhost:3000 — you should land on the login screen.

---

## 3. Push to GitHub

```bash
git init
git add .
git commit -m "Initial DecaStory scaffold"
```

Create a new repo on https://github.com/new, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/decastory.git
git branch -M main
git push -u origin main
```

---

## 4. Deploy to Vercel (free)

1. Go to https://vercel.com → sign up with GitHub → "Add New Project"
2. Import your `decastory` repo
3. In **Environment Variables**, add the same five values from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `AI_PROVIDER` = `gemini`
   - `GEMINI_API_KEY`
4. Click **Deploy**. In ~1 minute you'll get a live URL like `decastory.vercel.app`.

That's it — live, public, $0/month.

---

## How the proprietary mechanics map to code

- **Feature 1 (Deterministic Narrative Compression)** — `lib/ai/pacing.ts` `computePhase()`. The P = C/N math and the 0.5 / 0.8 / 1.0 boundaries are centralized there so the prompt builder, the API route, and the UI progress ribbon can never drift out of sync with each other.
- **Feature 2 (Karma & Stat Checks)** — also in `pacing.ts`. The original PRD never defined how a "stat check" resolves; this build makes it deterministic: a check only fires once the story enters the climax phase AND one karma axis has drifted past a fixed threshold, and pass/fail is a fixed comparison — not another AI guess — so it's fair and explainable.
- **Feature 3 (Timeline Split)** — `app/api/stories/[id]/branch/route.ts`. Forking clones the shared slide history into a new story row pointing at `parent_story_id` + `branch_point_slide`, so branches form a tree, not a flat list — this was a gap in the original PRD's data model.

## Known gaps still worth tackling next
- No per-user daily generation cap yet — add one in the slide route if you open this up publicly, even on the free AI tier, to avoid one user exhausting your daily quota.
- No retry/backoff on malformed AI JSON beyond the schema enforcement Gemini's `responseSchema` already gives you — worth adding if you see failures in practice.
- Epilogue node-map (visual tree of the full branch history across all timelines) isn't built yet — the data model supports it via `parent_story_id`/`branch_point_slide`, but there's no UI rendering the tree visually yet.

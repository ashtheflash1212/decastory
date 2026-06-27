-- Project DecaStory — Supabase schema
-- Run this in Supabase Dashboard > SQL Editor on your free-tier project.

create extension if not exists "pgcrypto";

-- ============================================================
-- STORIES
-- A story is one playthrough. Branched timelines (Feature 3:
-- Timeline Split) are their own story rows that point back to
-- the parent story + the slide they forked from, so the data
-- is a tree, not a flat list.
-- ============================================================
create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text default 'Untitled Story',
  genre text not null,
  maturity_rating text not null check (maturity_rating in ('G','PG','R')),
  slide_budget int not null check (slide_budget > 0),
  prose_length text not null default 'standard' check (prose_length in ('concise','standard')),
  status text not null default 'in_progress' check (status in ('in_progress','completed','failed')),
  karma_vector jsonb not null default '{"prudence":0,"force":0,"subtlety":0}'::jsonb,
  seed_prompt text,
  parent_story_id uuid references stories(id) on delete set null,
  branch_point_slide int,
  share_token uuid not null default gen_random_uuid(),
  is_public boolean not null default false,
  is_favorite boolean not null default false,
  high_intensity boolean not null default false,
  rewrites_remaining int not null default 0, -- Fantasy only: how many times the player can undo their last choice
  powerups_remaining int not null default 0,
  shield_active boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_stories_user on stories(user_id);
create index if not exists idx_stories_parent on stories(parent_story_id);

-- ============================================================
-- SLIDES
-- Atomic narrative beats. One row per slide per story.
-- chosen_choice_id is filled in once the player picks, which is
-- what lets the Epilogue Mapping draw the path the player took.
-- ============================================================
create table if not exists slides (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  slide_number int not null,
  prose text not null,
  choices jsonb not null default '[]'::jsonb, -- [{id,text,mechanic_cost:{prudence,force,subtlety}}]
  narrative_phase text not null check (narrative_phase in ('INCITING','RISING','CLIMAX','RESOLUTION')),
  forced_stat_check jsonb, -- {axis, threshold, passed} when a check fires on this slide
  redacted_words jsonb, -- words hidden from the player until they choose, on Suspense missing-word slides
  choice_override_text text, -- Fantasy only: player's own rewritten wording for whichever choice they picked
  chosen_choice_id text,
  created_at timestamptz not null default now(),
  unique (story_id, slide_number)
);

create index if not exists idx_slides_story on slides(story_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- Users can only ever see/touch their own stories and slides.
-- ============================================================
alter table stories enable row level security;
alter table slides enable row level security;

create policy "stories: owner read" on stories
  for select using (auth.uid() = user_id);

create policy "stories: owner insert" on stories
  for insert with check (auth.uid() = user_id);

create policy "stories: owner update" on stories
  for update using (auth.uid() = user_id);

create policy "stories: owner delete" on stories
  for delete using (auth.uid() = user_id);

-- Anyone (including unauthenticated visitors) can read a story once
-- the owner has explicitly marked it public via share_token — this
-- is what powers the public share-link feature. Owner-only policies
-- above still apply for everything else; Postgres OR's permissive
-- policies together, so this only ADDS read access, never removes it.
create policy "stories: public read when shared" on stories
  for select using (is_public = true);

create policy "slides: owner read" on slides
  for select using (
    exists (select 1 from stories s where s.id = slides.story_id and s.user_id = auth.uid())
  );

create policy "slides: public read when shared" on slides
  for select using (
    exists (select 1 from stories s where s.id = slides.story_id and s.is_public = true)
  );

create policy "slides: owner insert" on slides
  for insert with check (
    exists (select 1 from stories s where s.id = slides.story_id and s.user_id = auth.uid())
  );

create policy "slides: owner update" on slides
  for update using (
    exists (select 1 from stories s where s.id = slides.story_id and s.user_id = auth.uid())
  );

-- ============================================================
-- API USAGE TRACKING
-- A simple daily counter of successful AI calls, so the app can
-- show "X requests used today" on the homepage. RLS is enabled
-- with NO policies, meaning the anon/authenticated keys cannot
-- read or write this table at all — only the service_role key
-- (used server-side only, never in the browser) can touch it,
-- since service_role always bypasses RLS regardless of policies.
-- ============================================================
create table if not exists api_usage_daily (
  usage_date date primary key,
  request_count int not null default 0
);

alter table api_usage_daily enable row level security;

create or replace function increment_daily_usage()
returns int
language plpgsql
security definer
as $$
declare
  new_count int;
begin
  insert into api_usage_daily (usage_date, request_count)
  values (current_date, 1)
  on conflict (usage_date) do update set request_count = api_usage_daily.request_count + 1
  returning request_count into new_count;
  return new_count;
end;
$$;

-- ============================================================
-- PER-USER DAILY LIMIT
-- Separate from the global counter above. The global counter is
-- "how close is the whole app to the shared free quota"; this is
-- "how much has this one person used today" — needed so a single
-- enthusiastic user can't exhaust the shared free quota for
-- everyone else. Same RLS-locked, service_role-only pattern.
-- ============================================================
create table if not exists user_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  request_count int not null default 0,
  primary key (user_id, usage_date)
);

alter table user_usage_daily enable row level security;

create or replace function increment_user_daily_usage(p_user_id uuid, p_date date default current_date)
returns int
language plpgsql
security definer
as $$
declare
  new_count int;
begin
  insert into user_usage_daily (user_id, usage_date, request_count)
  values (p_user_id, p_date, 1)
  on conflict (user_id, usage_date) do update set request_count = user_usage_daily.request_count + 1
  returning request_count into new_count;
  return new_count;
end;
$$;

create or replace function get_user_daily_usage(p_user_id uuid, p_date date default current_date)
returns int
language sql
security definer
as $$
  select coalesce(
    (select request_count from user_usage_daily where user_id = p_user_id and usage_date = p_date),
    0
  );
$$;

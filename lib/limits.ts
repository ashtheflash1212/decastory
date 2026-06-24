// Max NEW stories a single user can start per day. Separate from
// DAILY_USER_REQUEST_LIMIT (which caps total slide-generation calls,
// including continuing existing stories) — this caps how many fresh
// stories someone can kick off, which is the number players actually
// think in terms of.
export const DAILY_STORY_LIMIT = Number(process.env.DAILY_STORY_LIMIT ?? 7);

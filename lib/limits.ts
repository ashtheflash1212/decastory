// Max AI-generated slides a single user can request per day — this
// is the real cost driver (every slide = one AI call), so it scales
// correctly with story length and can't be bypassed by Timeline
// Split branching the way a "stories created" cap could be.
export const DAILY_SLIDE_LIMIT = Number(process.env.DAILY_SLIDE_LIMIT ?? 50);

/**
 * Returns the most recent midnight in US Eastern Time, as a UTC
 * Date — used as the cutoff for "today" when counting stories.
 *
 * Vercel's serverless functions run in UTC regardless of where the
 * user is, so a naive `new Date(); setHours(0,0,0,0)` resets at
 * midnight UTC (8pm or 9pm Eastern the evening before), not at an
 * intuitive local time. This computes the real Eastern calendar
 * date and converts that midnight to its correct UTC instant,
 * correctly handling the EST/EDT daylight-saving switch.
 */
export function getEasternMidnightUTC(): Date {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZoneName: "shortOffset",
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const year = get("year");
  const month = get("month");
  const day = get("day");

  // timeZoneName comes back like "GMT-4" (EDT) or "GMT-5" (EST)
  const offsetMatch = get("timeZoneName").match(/GMT([+-]\d+)/);
  const offsetHours = offsetMatch ? parseInt(offsetMatch[1], 10) : -5; // default to EST if parsing ever fails
  const utcHour = -offsetHours; // midnight ET in EDT (-4) = 04:00 UTC; in EST (-5) = 05:00 UTC

  return new Date(`${year}-${month}-${day}T${String(utcHour).padStart(2, "0")}:00:00.000Z`);
}

/**
 * The current calendar date in US Eastern Time, as 'YYYY-MM-DD'.
 * Used as the day-key for the slide-usage counter so it resets at
 * Eastern midnight rather than whatever timezone the database
 * server happens to default to.
 */
export function getEasternDateString(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

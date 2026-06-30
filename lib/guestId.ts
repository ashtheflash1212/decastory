const COOKIE_NAME = "decastory_guest_id";
const COOKIE_MAX_AGE_DAYS = 365;

/**
 * Returns a random, anonymous identifier for this browser, used
 * only to count unique guest-mode visitors and their activity.
 * Not tied to any account, IP, or identity — just a UUID stored in
 * a cookie so repeat visits from the same browser count as the
 * same "guest" rather than a new one each time.
 */
export function getOrCreateGuestId(): string {
  if (typeof document === "undefined") return ""; // SSR guard

  const existing = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`))
    ?.split("=")[1];

  if (existing) return existing;

  const id = crypto.randomUUID();
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE_NAME}=${id}; path=/; max-age=${maxAge}; SameSite=Lax`;
  return id;
}

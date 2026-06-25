/**
 * FEATURE: Opening intensity detection.
 *
 * If the player's own opening prompt is intense enough, the story
 * is guaranteed to land on a dramatic, high-stakes conclusion —
 * not because of a dice roll, but because the player set that tone
 * themselves from the very first word. This is a deliberate,
 * explainable rule (keyword-based), not an AI judgment call, to
 * stay consistent with how every other mechanic in this app works.
 *
 * Only applies to player-written openings — Random (Insta-Start)
 * has no seed text, so it never triggers this.
 */
const INTENSITY_KEYWORDS = [
  "kill", "killed", "killing", "murder", "death", "dying", "dead",
  "blood", "bleeding", "explosion", "explode", "bomb", "gun", "gunfire",
  "shot", "shooting", "stab", "stabbed", "war", "battle", "attack",
  "attacked", "danger", "dangerous", "trapped", "escape", "alarm",
  "emergency", "crisis", "fire", "burning", "drowning", "collapse",
  "collapsing", "hunted", "chasing", "chased", "threat", "threatened",
  "terror", "terrifying", "screaming", "fight", "fighting", "survive",
  "survival", "critical", "hostage", "kidnapped", "poison", "poisoned",
];

export function detectHighIntensity(seedPrompt: string | null | undefined): boolean {
  if (!seedPrompt) return false;
  const text = seedPrompt.toLowerCase();
  const matchCount = INTENSITY_KEYWORDS.filter((kw) => text.includes(kw)).length;
  // Require 2+ matches so a single incidental word doesn't trigger
  // this — a real intense opening usually carries more than one signal.
  return matchCount >= 2;
}

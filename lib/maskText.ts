/**
 * Replaces each redacted word/phrase with a blank of matching
 * visual length, so the player can see *that* something is hidden
 * (and roughly how much) without seeing what it says.
 */
export function maskProse(prose: string, redactedWords: string[] | null | undefined): string {
  if (!redactedWords || redactedWords.length === 0) return prose;
  let result = prose;
  for (const word of redactedWords) {
    if (!word) continue;
    const blank = "▓".repeat(Math.max(3, word.length));
    result = result.split(word).join(blank);
  }
  return result;
}

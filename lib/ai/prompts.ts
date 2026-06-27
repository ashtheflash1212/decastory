import { KarmaVector, MaturityRating, NarrativePhase } from "../types";
import { getGenre } from "../genres";

const MATURITY_GUIDANCE: Record<MaturityRating, string> = {
  G: "Wholesome and universally safe. No violence beyond cartoonish peril, no profanity, no romance beyond friendship.",
  PG: "Moderate tension and stylized action is fine. Mild suspense, no graphic injury detail, no profanity.",
  R: "Intense psychological elements, visceral combat description, and dark themes are permitted. No gratuitous content for its own sake.",
};

const PHASE_GUIDANCE: Record<NarrativePhase, string> = {
  INCITING:
    "You are in the INCITING phase (P < 0.5). Establish setting, stakes, and the inciting incident. Do not resolve the central tension yet.",
  RISING:
    "You are in the RISING phase (0.5 <= P < 0.8). Escalate complications from prior choices. Tighten stakes toward the climax.",
  CLIMAX:
    "You are in the CLIMAX phase (P >= 0.8). This slide MUST contain the structural climax — the highest-stakes turning point of the story.",
  RESOLUTION:
    "This is the FINAL slide (P = 1.0). Resolve the story based on everything that happened. Do not introduce new conflict. There are NO choices on this slide.",
};

const PROSE_LENGTH_GUIDANCE: Record<"concise" | "standard", string> = {
  concise: "Prose is limited to 1-2 short lines (roughly 25-40 words). Keep it tight and stripped to the essential beat — concise, lower-detail by design.",
  standard: "Prose is limited to 3-4 short lines (roughly 60-90 words).",
};

export function buildSystemPrompt(
  genreId: string,
  rating: MaturityRating,
  totalBudget: number,
  proseLength: "concise" | "standard" = "standard",
  highIntensity: boolean = false
): string {
  const genre = getGenre(genreId);

  return `You are the narrative engine for Project DecaStory, a finite, mechanically-constrained text adventure.

HARD RULES (never break these):
1. The story MUST conclude exactly at slide ${totalBudget}. Never pad, never wrap up early.
2. Genre: ${genre.label}. Content rating: ${rating} — ${MATURITY_GUIDANCE[rating]}
2b. Genre flavor: ${genre.flavorGuidance} Aim to bring this element into most slides where it plausibly fits — it should feel like a recurring texture of this story's world, not a one-time mention.
3. ${PROSE_LENGTH_GUIDANCE[proseLength]} Never exceed this.
4. Except on the final slide, you MUST return exactly 3 choices, each a single concrete action (10-16 words).
5. Choices must be HIGH-STAKES and meaningfully diverge the story. Never offer three flavors of the same outcome dressed differently — each choice should plausibly lead to a noticeably different next scene, with real consequences (gains, losses, irreversible changes, new dangers or allies). Avoid safe, low-impact options; every choice should feel like it actually matters.
6. Every choice has an inherent, legible TRADE-OFF that the player can sense before picking — make this clear in the choice's wording itself, not just in mechanic_cost numbers. Examples of the shape this takes (adapt to context, don't reuse verbatim): a forceful/direct choice is decisive but risks immediate safety; a peaceful/passive choice is safer in the moment but lets something develop unseen in the background that will surface later; an honest/talk-it-out choice builds trust but risks complicating a relationship or revealing too much. Whichever path the player picks, the choices they DIDN'T pick should still feel like they had real, sensible trade-offs.
7. Each choice has a mechanic_cost: an integer delta (-3 to 3) on one or more of [prudence, force, subtlety, genre_axis]. prudence = cautious/analytical, force = aggressive/direct, subtlety = sneaky/clever, genre_axis = ${genre.axisLabel} (this genre's own dimension — weight this when a choice specifically engages with the genre flavor element described in rule 2b). Most choices should weight ONE axis primarily, and bold/extreme choices should use the full range, not just +-1.
8. The next slide's prose MUST visibly and specifically pay off the cost of whichever choice the player picked, per rule 6 — not a generic continuation that could follow any of the three options. If they chose the safer/passive option, something consequential should now surface that happened while they weren't looking. If force, show a concrete cost to safety or standing. If honesty/talking, show a concrete relational complication. Make the chosen path's impact impossible to mistake for one of the other paths.
8b. The "Story so far" section below shows exactly which choice the player made at each earlier slide. During the CLIMAX and RESOLUTION phases especially, explicitly call back to a SPECIFIC earlier choice or detail by name — not vaguely — to make clear the player's early decisions, not just their most recent one, shaped how this ends. Earlier choices should feel like they're still alive in the story, not forgotten the moment the next slide started.
9. On the final slide, return an empty choices array and a story_title summarizing the journey in 3-6 words.
9b. If you are told this final slide is a DEATH ending, the resolution MUST be the character's death, narrated concretely and fitting the genre and content rating — not a survival, not a last-second rescue. The story_title should reflect this (e.g. a title implying a fall, an ending, a cost paid), not a triumphant one.
10. You will be told the player's accumulated karma vector and, on some slides, a pre-computed stat check result. Narrate that result as fact — never contradict it or invent your own outcome.
11. If the player's opening or choices mention a real, identifiable person — including public figures, content creators, or well-known usernames/handles you recognize — actively draw on what you know of their genuine public persona (their known personality, interests, sense of humor, catchphrases, public reputation) to make the story feel personalized and true to who they actually are. However: never present this as a literal factual account of that real person, and never write realistic invented dialogue and attribute it to them as if they actually said it in real life. The character should read as an affectionate, clearly fictionalized version built from their public persona — think fan-fiction tone, not biography.
12. Use only plain ASCII punctuation — regular hyphens (-), straight quotes ("), and standard apostrophes ('). Do not use em-dashes, en-dashes, smart/curly quotes, or any other special punctuation characters.
${highIntensity ? `13. This story's opening was intense enough that the conclusion is GUARANTEED to be dramatic and high-stakes — never let the RESOLUTION slide be quiet, anticlimactic, or gentle, regardless of how the middle of the story went. The ending must feel as intense as how it began.` : ""}
14. On a slide flagged as a MISSING-WORD slide (you'll be told when), also return a "redacted_words" array of 2-4 EXACT substrings copied verbatim from your prose field. Pick narratively significant words or short phrases (a name, a key object, a crucial detail) whose absence makes the player uneasy — never pick filler words. These will be hidden from the player until after they choose, then revealed.
15. Respond ONLY with the JSON object matching the required schema. No prose outside the JSON, no markdown fences.`;
}

interface HistoryItem {
  slide_number: number;
  prose: string;
  chosen_text?: string | null;
}

export function buildUserPrompt(params: {
  slideNumber: number;
  totalBudget: number;
  phase: NarrativePhase;
  karma: KarmaVector;
  history: HistoryItem[];
  lastChoiceText: string | null;
  seedPrompt: string | null;
  forcedStatCheck: { axis: string; threshold: number; passed: boolean } | null;
  died?: boolean;
  isContinuation?: boolean;
  missingWord?: boolean;
  dramaticFinale?: boolean;
}): string {
  const {
    slideNumber,
    totalBudget,
    phase,
    karma,
    history,
    lastChoiceText,
    seedPrompt,
    forcedStatCheck,
    died,
    isContinuation,
    missingWord,
    dramaticFinale,
  } = params;

  const historyBlock = history.length
    ? history
        .map((s) => `Slide ${s.slide_number}: ${s.prose}${s.chosen_text ? ` [Player chose: "${s.chosen_text}"]` : ""}`)
        .join("\n")
    : seedPrompt
    ? `Opening seed provided by the player: "${seedPrompt}"`
    : "No seed given — invent a high-stakes opening matching the genre and rating.";

  const checkBlock = forcedStatCheck
    ? `\nA stat check has been triggered on this slide: axis=${forcedStatCheck.axis}, the player ${
        forcedStatCheck.passed ? "PASSED" : "FAILED"
      } it. Narrate the consequence of this outcome concretely in the prose.`
    : "";

  const deathBlock = died
    ? `\nTHIS IS A DEATH ENDING. The player's sustained reckless/aggressive choices have led directly to their character's death. Narrate this as the resolution per system rule 9b.`
    : "";

  const continuationBlock = isContinuation
    ? `\nTHE PLAYER HAS CHOSEN TO CONTINUE THIS STORY past its prior conclusion (the budget just grew). The previous final slide already resolved the story — pick back up in a way that makes narrative sense after that ending (time passing, a new development, an epilogue turning into a new chapter), rather than ignoring or contradicting how it ended.`
    : "";

  const missingWordBlock = missingWord
    ? `\nTHIS IS A MISSING-WORD SLIDE (system rule 14). Also return redacted_words per that rule.`
    : "";

  const finaleBlock = dramaticFinale
    ? `\nTHIS IS THE FINAL DECISION of the relationship — return EXACTLY 2 choices instead of 3, each weighty and irreversible-feeling, a true either/or with no easy middle ground.`
    : "";

  return `${PHASE_GUIDANCE[phase]}

Progress: slide ${slideNumber} of ${totalBudget} (P = ${(slideNumber / totalBudget).toFixed(2)})
Current karma vector: ${JSON.stringify(karma)}
${lastChoiceText ? `The player just chose: "${lastChoiceText}"` : ""}
${checkBlock}${deathBlock}${continuationBlock}${missingWordBlock}${finaleBlock}

Story so far:
${historyBlock}

Generate slide ${slideNumber} now, following the JSON schema exactly.`;
}

export const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    story_title: { type: "string", nullable: true },
    prose: { type: "string" },
    redacted_words: { type: "array", items: { type: "string" } },
    choices: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          text: { type: "string" },
          mechanic_cost: {
            type: "object",
            properties: {
              prudence: { type: "integer" },
              force: { type: "integer" },
              subtlety: { type: "integer" },
              genre_axis: { type: "integer" },
            },
          },
        },
        required: ["id", "text", "mechanic_cost"],
      },
    },
  },
  required: ["prose", "choices"],
};

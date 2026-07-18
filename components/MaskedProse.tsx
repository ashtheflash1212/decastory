"use client";

import { Fragment } from "react";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Renders slide prose with the Suspense genre's hidden words covered
 * by clean rounded redaction pills instead of ▓▓▓ block characters.
 * The hidden word itself is rendered transparent inside the pill, so
 * the bar is exactly the word's width and the text doesn't shift at
 * all when the reveal happens — the pill simply lifts away and the
 * word fades in with a highlight so the player can spot what was hidden.
 */
export default function MaskedProse({
  prose,
  redactedWords,
  revealed,
}: {
  prose: string;
  redactedWords?: string[] | null;
  revealed: boolean;
}) {
  const words = (redactedWords ?? []).filter(Boolean);
  if (words.length === 0) return <>{prose}</>;

  const pattern = new RegExp(`(${words.map(escapeRegExp).join("|")})`, "g");
  const parts = prose.split(pattern);

  return (
    <>
      {parts.map((part, i) =>
        words.includes(part) ? (
          revealed ? (
            <span
              key={i}
              className="text-rust rounded-[5px] px-0.5 -mx-0.5 transition-colors duration-700"
              style={{ animation: "decastory-prose-in 600ms ease-out both" }}
            >
              {part}
            </span>
          ) : (
            <span
              key={i}
              aria-label="hidden word"
              className="select-none rounded-[5px] px-0.5 -mx-0.5 text-transparent bg-ink/20"
            >
              {part}
            </span>
          )
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

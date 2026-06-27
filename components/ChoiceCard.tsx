"use client";

import { useState } from "react";
import { Choice } from "@/lib/types";
import { getGenre } from "@/lib/genres";

const WORD_LIMIT = 12; // Fantasy rewrite cap - tight enough to stop prompt-injection-style abuse

// Internal data still uses prudence/force/subtlety (so existing
// saved stories keep working) — these are just the friendlier
// words shown to players instead of the raw field names.
const AXIS_DISPLAY_LABEL: Record<string, string> = {
  prudence: "Caution",
  force: "Boldness",
  subtlety: "Cunning",
};

const AXIS_COLOR: Record<string, string> = {
  prudence: "text-steel",
  force: "text-rust",
  subtlety: "text-cocoa",
  genre_axis: "text-mystic",
};

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function ChoiceCard({
  choice,
  index,
  genre,
  phase,
  overrideText,
  canRewrite,
  onSelect,
  onRewrite,
  disabled,
}: {
  choice: Choice;
  index: number;
  genre: string;
  phase?: string;
  overrideText?: string | null;
  canRewrite?: boolean;
  onSelect: () => void;
  onRewrite?: (text: string) => void;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(choice.text);

  const dominantAxis = Object.entries(choice.mechanic_cost).sort(
    (a, b) => Math.abs(b[1] ?? 0) - Math.abs(a[1] ?? 0)
  )[0]?.[0];

  const axisLabel =
    dominantAxis === "genre_axis" ? getGenre(genre).axisLabel : AXIS_DISPLAY_LABEL[dominantAxis ?? ""] ?? dominantAxis;

  // During the climax, give the choice cards a subtle genre-tinted
  // background and border instead of the default neutral surface —
  // a visual cue that this slide is the high-stakes turning point.
  const isClimax = phase === "CLIMAX";
  const genreData = getGenre(genre);
  const climaxStyle = isClimax
    ? { backgroundColor: genreData.climaxBg, borderColor: genreData.climaxBorder }
    : undefined;

  const displayText = overrideText ?? choice.text;
  const draftWords = wordCount(draft);
  const overLimit = draftWords > WORD_LIMIT;

  if (editing) {
    return (
      <div
        style={climaxStyle}
        className={`w-full rounded-lg px-4 py-3 ${isClimax ? "border-2" : "border border-steel bg-surface"}`}
      >
        <div className="flex items-start gap-3 mb-2">
          <span className="font-mech text-base font-semibold text-cocoa mt-0.5">{index + 1}</span>
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            className="flex-1 bg-surface2 rounded px-2 py-1.5 text-[15px] outline-none border-2 border-steel resize-none"
          />
        </div>
        <div className="flex items-center justify-between pl-7">
          <span className={`font-mech text-[11px] ${overLimit ? "text-rust" : "text-muted"}`}>
            {draftWords}/{WORD_LIMIT} words
          </span>
          <div className="flex gap-3">
            <button
              onClick={() => setEditing(false)}
              className="font-mech text-[11px] text-muted hover:text-rust"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (!draft.trim() || overLimit) return;
                onRewrite?.(draft.trim());
                setEditing(false);
              }}
              disabled={!draft.trim() || overLimit}
              className="font-mech text-[11px] text-mystic hover:underline disabled:opacity-40"
            >
              Use this wording
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      style={climaxStyle}
      className={`relative w-full text-left rounded-lg px-4 py-3 transition disabled:opacity-40 disabled:cursor-not-allowed ${
        isClimax ? "border-2 hover:opacity-90" : "border border-surface2 bg-surface hover:border-brass hover:bg-surface2"
      }`}
    >
      {canRewrite && !overrideText && (
        <span
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDraft(choice.text);
            setEditing(true);
          }}
          title="Rewrite this choice in your own words"
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-mystic/15 text-mystic text-xs flex items-center justify-center hover:bg-mystic/25 transition-colors"
        >
          ✎
        </span>
      )}
      <div className="flex items-start gap-3">
        <span className="font-mech text-base font-semibold text-cocoa mt-0.5">{index + 1}</span>
        <div className="flex-1 pr-6">
          <p className="font-body text-[15px] leading-snug">{displayText}</p>
          {overrideText && (
            <span className="font-mech text-[10px] uppercase tracking-wide text-mystic">your wording</span>
          )}
          {dominantAxis && (
            <span className={`font-mech text-[10px] uppercase tracking-wide block ${AXIS_COLOR[dominantAxis]}`}>
              {axisLabel}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

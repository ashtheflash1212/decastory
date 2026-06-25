import { Choice } from "@/lib/types";
import { getGenre } from "@/lib/genres";

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

export default function ChoiceCard({
  choice,
  index,
  genre,
  phase,
  onSelect,
  disabled,
}: {
  choice: Choice;
  index: number;
  genre: string;
  phase?: string;
  onSelect: () => void;
  disabled: boolean;
}) {
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

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      style={climaxStyle}
      className={`w-full text-left rounded-lg border px-4 py-3 transition disabled:opacity-40 disabled:cursor-not-allowed ${
        isClimax ? "hover:opacity-90" : "border-surface2 bg-surface hover:border-brass hover:bg-surface2"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="font-mech text-base font-semibold text-cocoa mt-0.5">{index + 1}</span>
        <div className="flex-1">
          <p className="font-body text-[15px] leading-snug">{choice.text}</p>
          {dominantAxis && (
            <span className={`font-mech text-[10px] uppercase tracking-wide ${AXIS_COLOR[dominantAxis]}`}>
              {axisLabel}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

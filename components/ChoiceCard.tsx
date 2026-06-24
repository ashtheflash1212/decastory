import { Choice } from "@/lib/types";
import { getGenre } from "@/lib/genres";

const AXIS_COLOR: Record<string, string> = {
  prudence: "text-steel",
  force: "text-rust",
  subtlety: "text-brass",
  genre_axis: "text-mystic",
};

export default function ChoiceCard({
  choice,
  index,
  genre,
  onSelect,
  disabled,
}: {
  choice: Choice;
  index: number;
  genre: string;
  onSelect: () => void;
  disabled: boolean;
}) {
  const dominantAxis = Object.entries(choice.mechanic_cost).sort(
    (a, b) => Math.abs(b[1] ?? 0) - Math.abs(a[1] ?? 0)
  )[0]?.[0];

  const axisLabel = dominantAxis === "genre_axis" ? getGenre(genre).axisLabel : dominantAxis;

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className="w-full text-left rounded-lg border border-surface2 bg-surface px-4 py-3 hover:border-brass hover:bg-surface2 transition disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <div className="flex items-start gap-3">
        <span className="font-mech text-base font-semibold text-brass mt-0.5">{index + 1}</span>
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

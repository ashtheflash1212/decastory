"use client";

import { useState } from "react";

export type PowerupType = "amplify" | "ally" | "shield";

const POWERUPS: { type: PowerupType; icon: string; label: string; description: string }[] = [
  {
    type: "amplify",
    icon: "⬆",
    label: "Amplify",
    description: "Doubles this turn's impact on your genre-specific trait (Magic, Paranoia, Spectacle, or Intimacy).",
  },
  {
    type: "ally",
    icon: "☺",
    label: "Ally",
    description: "A new helper character appears in the very next slide, assisting you in a way that fits the genre.",
  },
  {
    type: "shield",
    icon: "◆",
    label: "Shield",
    description: "Guarantees your next stat check automatically passes, whenever it eventually fires.",
  },
];

export default function PowerupBar({
  remaining,
  canUse,
  armed,
  onArm,
  genreAxisLabel,
}: {
  remaining: number;
  canUse: boolean;
  armed: PowerupType | null;
  onArm: (type: PowerupType | null) => void;
  genreAxisLabel: string;
}) {
  const [infoOpen, setInfoOpen] = useState<PowerupType | null>(null);

  if (remaining <= 0) return null;

  const powerups = POWERUPS.map((p) =>
    p.type === "amplify"
      ? { ...p, description: `Doubles this turn's impact on your genre-specific trait (${genreAxisLabel}).` }
      : p
  );

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <p className="font-mech text-xs uppercase tracking-wide text-muted">
          {canUse ? "Power-ups" : "Power-ups (past the usable window)"}
        </p>
        <p className="font-mech text-xs text-muted">{remaining} left</p>
      </div>

      <div className="flex gap-3">
        {powerups.map((p) => {
          const isArmed = armed === p.type;
          const disabled = !canUse;
          return (
            <div key={p.type} className="relative">
              <button
                onClick={() => !disabled && onArm(isArmed ? null : p.type)}
                disabled={disabled}
                title={p.label}
                className={`w-16 h-16 rounded-lg border-2 flex flex-col items-center justify-center transition-all duration-200 ${
                  disabled
                    ? "opacity-40 cursor-not-allowed border-surface2 bg-surface"
                    : isArmed
                    ? "border-brass bg-surface2 scale-105"
                    : "border-surface2 bg-surface hover:border-sage hover:scale-105"
                }`}
              >
                <span className="text-xl">{p.icon}</span>
                <span className="font-mech text-[9px] uppercase mt-0.5">{p.label}</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setInfoOpen(infoOpen === p.type ? null : p.type);
                }}
                title="What does this do?"
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-steel text-surface text-[11px] font-mech flex items-center justify-center hover:scale-110 transition-transform"
              >
                ?
              </button>

              {infoOpen === p.type && (
                <div className="absolute z-10 top-full mt-2 left-1/2 -translate-x-1/2 w-44 bg-surface border-2 border-surface2 rounded-lg p-2 shadow-lg">
                  <p className="text-[11px] leading-snug text-ink">{p.description}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

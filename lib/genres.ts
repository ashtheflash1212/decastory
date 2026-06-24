export const GENRES = [
  {
    id: "action",
    label: "Action",
    blurb: "Explosions, chases, no time to think.",
    axisLabel: "Spectacle",
    flavorGuidance:
      "Lean into dramatic, cinematic surroundings — collapsing structures, vehicles, crowds, environmental hazards the player must move through or use.",
  },
  {
    id: "suspense",
    label: "Suspense",
    blurb: "Something's wrong. You just don't know what yet.",
    axisLabel: "Paranoia",
    flavorGuidance:
      "Lean into a creeping sense that something is being watched, followed, or hidden — ambiguous details, things half-glimpsed, reasons to distrust what seems safe.",
  },
  {
    id: "fantasy",
    label: "Fantasy",
    blurb: "Magic with consequences.",
    axisLabel: "Magic",
    flavorGuidance:
      "Lean into magical creatures, enchanted objects, or supernatural forces with real rules and real costs — magic should feel consequential, not decorative.",
  },
  {
    id: "romance",
    label: "Romance",
    blurb: "Hearts on the line, choices that cost.",
    axisLabel: "Intimacy",
    flavorGuidance:
      "Lean into complex relationship dynamics — competing loyalties, unspoken feelings, trust being built or broken between characters.",
  },
];

export function getGenre(id: string) {
  return GENRES.find((g) => g.id === id) ?? GENRES[0];
}


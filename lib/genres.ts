export const GENRES = [
  {
    id: "action",
    label: "Action",
    blurb: "Explosions, chases, no time to think.",
    axisLabel: "Spectacle",
    flavorGuidance:
      "Lean into dramatic, cinematic surroundings — collapsing structures, vehicles, crowds, environmental hazards the player must move through or use.",
    cardBg: "#FBEAEA", // light red — Configuration Hub genre card background
    climaxBg: "#F1F1F1",
    climaxBorder: "#B8B8B8",
    deathThreshold: 6, // lower = recklessness ends the story in death more easily
  },
  {
    id: "suspense",
    label: "Suspense",
    blurb: "Something's wrong. You just don't know what yet.",
    axisLabel: "Paranoia",
    flavorGuidance:
      "Lean into a creeping sense that something is being watched, followed, or hidden — ambiguous details, things half-glimpsed, reasons to distrust what seems safe.",
    cardBg: "#F1F1F1", // light grey
    climaxBg: "#FBEAEA",
    climaxBorder: "#E2A3A3",
    deathThreshold: 6,
  },
  {
    id: "fantasy",
    label: "Fantasy",
    blurb: "Magic with consequences.",
    axisLabel: "Magic",
    flavorGuidance:
      "Lean into magical creatures, enchanted objects, or supernatural forces with real rules and real costs — magic should feel consequential, not decorative.",
    cardBg: "#FCF6D0", // light yellow
    climaxBg: "#FBF3DF",
    climaxBorder: "#DDBE74",
    deathThreshold: 9, // harder to trigger than Action/Suspense
  },
  {
    id: "romance",
    label: "Romance",
    blurb: "Hearts on the line, choices that cost.",
    axisLabel: "Intimacy",
    flavorGuidance:
      "Lean into complex relationship dynamics — competing loyalties, unspoken feelings, trust being built or broken between characters.",
    cardBg: "#FBEAF1", // light pink
    climaxBg: "#FBEAF1",
    climaxBorder: "#E3A6C3",
    deathThreshold: 13, // hardest of all to trigger — needs extreme, sustained recklessness
  },
];

export function getGenre(id: string) {
  return GENRES.find((g) => g.id === id) ?? GENRES[0];
}


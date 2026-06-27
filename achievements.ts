import { GENRES } from "./genres";

export type AchievementStats = {
  totalFinished: number;
  deaths: number;
  genreFinished: Record<string, number>;
};

export type Achievement = {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  unlocked: (stats: AchievementStats) => boolean;
};

const GENRE_TIERS = [5, 10, 50];

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_story",
    label: "First Story",
    description: "Finish your very first story, in any genre.",
    icon: "✦",
    color: "#D9954D",
    unlocked: (s) => s.totalFinished >= 1,
  },
  {
    id: "first_death",
    label: "First Death",
    description: "Have a story end in death from sustained reckless choices.",
    icon: "☠",
    color: "#C1453D",
    unlocked: (s) => s.deaths >= 1,
  },
  ...GENRES.flatMap((g) =>
    GENRE_TIERS.map((tier) => ({
      id: `${g.id}_${tier}`,
      label: `${g.label} x${tier}`,
      description: `Finish ${tier} ${g.label} stories.`,
      icon: g.id === "action" ? "▲" : g.id === "suspense" ? "◐" : g.id === "fantasy" ? "✦" : "♡",
      color: g.climaxBorder,
      unlocked: (s: AchievementStats) => (s.genreFinished[g.id] ?? 0) >= tier,
    }))
  ),
];

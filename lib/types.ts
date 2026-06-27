export type MaturityRating = "G" | "PG" | "R";
export type NarrativePhase = "INCITING" | "RISING" | "CLIMAX" | "RESOLUTION";
export type KarmaAxis = "prudence" | "force" | "subtlety" | "genre_axis";

export interface KarmaVector {
  prudence: number;
  force: number;
  subtlety: number;
  genre_axis: number;
}

export interface MechanicCost {
  prudence?: number;
  force?: number;
  subtlety?: number;
  genre_axis?: number;
}

export interface Choice {
  id: string; // "A" | "B" | "C"
  text: string;
  mechanic_cost: MechanicCost;
}

export interface ForcedStatCheck {
  axis: KarmaAxis;
  threshold: number;
  passed: boolean;
}

export interface SlideRecord {
  id: string;
  story_id: string;
  slide_number: number;
  prose: string;
  choices: Choice[];
  narrative_phase: NarrativePhase;
  forced_stat_check: ForcedStatCheck | null;
  chosen_choice_id: string | null;
  redacted_words?: string[] | null;
  choice_override_text?: string | null;
  created_at: string;
}

export interface StoryRecord {
  id: string;
  user_id: string;
  title: string;
  genre: string;
  maturity_rating: MaturityRating;
  slide_budget: 5 | 10 | 20;
  prose_length: "concise" | "standard";
  high_intensity: boolean;
  rewrites_remaining: number;
  focus_prompt: string | null;
  powerups_remaining: number;
  shield_active: boolean;
  status: "in_progress" | "completed" | "failed";
  karma_vector: KarmaVector;
  seed_prompt: string | null;
  parent_story_id: string | null;
  branch_point_slide: number | null;
  created_at: string;
  completed_at: string | null;
}

// What we ask the AI to return for every slide. Choices are
// omitted entirely once the story has ended (P = 1.0).
export interface AISlideResponse {
  story_title: string | null; // AI assigns this once, typically on slide 1 or final slide
  prose: string;
  choices: Choice[];
  redacted_words?: string[];
}

import { AISlideResponse } from "../types";
import { AIProvider, GenerateSlideParams } from "./provider";

const MODEL = "claude-sonnet-4-6";
const ENDPOINT = "https://api.anthropic.com/v1/messages";

/**
 * Optional paid path. Not used unless AI_PROVIDER=anthropic is set.
 * Kept here so upgrading later (e.g. for better prose quality) is a
 * one-line env var change, not a rewrite.
 */
export class AnthropicProvider implements AIProvider {
  async generateSlide({ systemPrompt, userPrompt }: GenerateSlideParams): Promise<AISlideResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set.");
    }

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        system: `${systemPrompt}\n\nRespond ONLY with raw JSON, no markdown fences, matching: {"story_title": string|null, "prose": string, "choices": [{"id": string, "text": string, "mechanic_cost": {"prudence"?: number, "force"?: number, "subtlety"?: number}}]}`,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text = data?.content?.find((b: { type: string }) => b.type === "text")?.text;
    if (!text) throw new Error("Anthropic returned no text content.");

    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return {
      story_title: parsed.story_title ?? null,
      prose: String(parsed.prose ?? "").trim(),
      choices: Array.isArray(parsed.choices) ? parsed.choices : [],
    };
  }
}

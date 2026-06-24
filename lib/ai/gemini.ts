import { AISlideResponse } from "../types";
import { AIProvider, GenerateSlideParams } from "./provider";
import { RESPONSE_JSON_SCHEMA } from "./prompts";

const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export class GeminiProvider implements AIProvider {
  async generateSlide({ systemPrompt, userPrompt }: GenerateSlideParams): Promise<AISlideResponse> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set. Get a free key at https://ai.google.dev");
    }

    const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_JSON_SCHEMA,
          temperature: 0.9,
          maxOutputTokens: 1024,
          // Gemini 2.5 Flash has "thinking" on by default, and those
          // reasoning tokens are deducted from maxOutputTokens before
          // any visible output is written — this was silently eating
          // the whole budget and truncating our JSON mid-object.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      // 429 = free-tier rate limit hit. Surface this clearly so the
      // UI can show "try again in a moment" instead of a generic error.
      if (res.status === 429) {
        throw new Error("RATE_LIMITED: Gemini free-tier daily/per-minute limit reached.");
      }
      throw new Error(`Gemini API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini returned no content — possibly blocked by safety filters.");
    }

    let parsed: AISlideResponse;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Most common cause: the response was cut off mid-object because
      // maxOutputTokens ran out (often due to "thinking" tokens eating
      // the budget — see thinkingConfig above). Surfacing the raw tail
      // of the response makes that obvious instead of a bare parse error.
      console.error("Gemini returned unparseable JSON. Raw tail:", text.slice(-200));
      throw new Error("Gemini response was not valid JSON — likely truncated. Try again.");
    }

    // Defensive normalization — never trust the model fully even
    // with a schema, since malformed output is exactly the failure
    // mode this app is designed to eliminate (see PRD gap #3).
    return {
      story_title: parsed.story_title ? cleanText(parsed.story_title) : null,
      prose: cleanText(String(parsed.prose ?? "")),
      choices: Array.isArray(parsed.choices)
        ? parsed.choices.map((c: any) => ({ ...c, text: cleanText(String(c.text ?? "")) }))
        : [],
    };
  }
}

/**
 * Occasionally the model writes a literal escape code like "\u2013"
 * as plain text instead of an actual em-dash, surviving JSON.parse
 * as the four-character string "\u2013" rather than "–". This
 * decodes any stray \uXXXX sequences back into the real character.
 */
function cleanText(text: string): string {
  return String(text)
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .trim();
}

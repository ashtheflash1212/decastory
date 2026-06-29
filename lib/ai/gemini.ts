import { AISlideResponse } from "../types";
import { AIProvider, GenerateSlideParams } from "./provider";
import { RESPONSE_JSON_SCHEMA } from "./prompts";

const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// 503 means Gemini's servers are momentarily overloaded — it's not
// our quota and not the user's fault, and it almost always clears
// up within a couple seconds. Retrying automatically here means
// users never see this error at all instead of having to click
// "try again" themselves.
const MAX_503_RETRIES = 2;
const RETRY_DELAY_MS = 1200;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GeminiProvider implements AIProvider {
  async generateSlide({ systemPrompt, userPrompt }: GenerateSlideParams): Promise<AISlideResponse> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set. Get a free key at https://ai.google.dev");
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_503_RETRIES; attempt++) {
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

      if (res.ok) {
        return this.parseResponse(await res.json());
      }

      const errText = await res.text();

      // 429 = free-tier rate limit hit. Surface this immediately —
      // unlike 503, this genuinely needs the user to wait, retrying
      // silently would just burn more of their limited quota.
      if (res.status === 429) {
        throw new Error("RATE_LIMITED: Gemini free-tier daily/per-minute limit reached.");
      }

      if (res.status === 503 && attempt < MAX_503_RETRIES) {
        lastError = new Error(`Gemini API error 503: ${errText}`);
        await sleep(RETRY_DELAY_MS * (attempt + 1)); // 1.2s, then 2.4s
        continue;
      }

      throw new Error(`Gemini API error ${res.status}: ${errText}`);
    }

    // Only reached if every retry was also a 503.
    throw lastError ?? new Error("Gemini API error 503: repeated failures after retry.");
  }

  private parseResponse(data: any): AISlideResponse {
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
      redacted_words: Array.isArray(parsed.redacted_words) ? parsed.redacted_words.map(String) : undefined,
      intro: parsed.intro ? cleanText(String(parsed.intro)) : undefined,
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

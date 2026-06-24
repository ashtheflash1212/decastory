import { AISlideResponse } from "../types";

export interface GenerateSlideParams {
  systemPrompt: string;
  userPrompt: string;
}

export interface AIProvider {
  generateSlide(params: GenerateSlideParams): Promise<AISlideResponse>;
}

/**
 * Swap providers with a single env var (AI_PROVIDER) — no code
 * changes needed elsewhere. Default is "gemini" because it has a
 * genuinely free, indefinite tier (no credit card). "anthropic" is
 * here for when/if you want Claude's prose quality and don't mind
 * pay-per-token billing.
 */
export async function getAIProvider(): Promise<AIProvider> {
  const provider = process.env.AI_PROVIDER ?? "gemini";

  switch (provider) {
    case "gemini": {
      const { GeminiProvider } = await import("./gemini");
      return new GeminiProvider();
    }
    case "anthropic": {
      const { AnthropicProvider } = await import("./anthropic");
      return new AnthropicProvider();
    }
    default:
      throw new Error(`Unknown AI_PROVIDER: ${provider}`);
  }
}

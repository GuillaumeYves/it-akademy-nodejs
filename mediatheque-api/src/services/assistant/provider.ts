import type { Config } from "../../config.ts";
import { createOpenAiProvider } from "./openai.provider.ts";
import { createStubProvider } from "./stub.provider.ts";
import type { AssistantProvider } from "./types.ts";

// Choix du fournisseur par IA_FOURNISSEUR : les routes et les tests ignorent lequel est actif.
export function createAssistantProvider(settings: Config["assistant"]): AssistantProvider {
  if (settings.provider === "openai" && settings.openaiApiKey) {
    return createOpenAiProvider({
      apiKey: settings.openaiApiKey,
      model: settings.model,
      maxOutputTokens: settings.maxOutputTokens,
    });
  }
  return createStubProvider({ delayMs: settings.stubDelayMs });
}

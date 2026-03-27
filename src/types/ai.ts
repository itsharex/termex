export type ProviderType = "claude" | "openai" | "ollama" | "custom";

export interface AiProvider {
  id: string;
  name: string;
  providerType: ProviderType;
  endpoint: string;
  model: string;
  isDefault: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

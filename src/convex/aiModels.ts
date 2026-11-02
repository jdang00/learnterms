// Every AI model ID lives here, so switching models is a one-line change.

export const CLAUDE_HAIKU = 'claude-haiku-5-5';
export const CLAUDE_SONNET = 'claude-sonnet-5-5';
export const CLAUDE_OPUS = 'claude-opus-5-5';
export const claudeModels = [CLAUDE_HAIKU, CLAUDE_SONNET, CLAUDE_OPUS] as const;
export type ClaudeModel = (typeof claudeModels)[number];

// Default model per stage, chosen from the October 2026 eval
// (dev/benchmarks/question-studio/2026-10-28-claude). Studio's default lean pipeline has Opus
// draft alone, gated by a Haiku blind solve: $0.077 per good question against $0.19 for the
// reviewed pipeline (Sonnet draft, Opus review), whose Sonnet reviewer kept 0 good of 15.
export const STAGE_MODELS = {
	leanDraft: CLAUDE_OPUS,
	draft: CLAUDE_SONNET,
	review: CLAUDE_OPUS,
	scenarioReview: CLAUDE_OPUS,
	planning: CLAUDE_HAIKU,
	freeResponse: CLAUDE_HAIKU,
	emoji: CLAUDE_HAIKU,
	ragChat: CLAUDE_HAIKU
} as const satisfies Record<string, ClaudeModel>;

// Anthropic has no embeddings; these stay on OpenRouter so existing RAG indexes remain valid.
export const EMBEDDING_MODEL = 'openai/text-embedding-3-large';
export const EMBEDDING_DIMENSION = 3072;

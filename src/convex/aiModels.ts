// Every AI model ID lives here, so switching models is a one-line change.

// Called directly through the OpenAI provider.
export const TEXT_MODEL = 'gpt-6-luna';
// The same model addressed through OpenRouter.
export const OPENROUTER_TEXT_MODEL = `openai/${TEXT_MODEL}`;

export const EMBEDDING_MODEL = 'openai/text-embedding-3-large';
export const EMBEDDING_DIMENSION = 3072;

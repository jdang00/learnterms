import type { Id } from '../../convex/_generated/dataModel';

export type ReasoningOrder = 'first' | 'second' | 'third';
export type DuplicateRisk = 'low' | 'medium' | 'high';
export type GenerationMode = 'auto' | 'guided' | 'manual';
export type PhaseState = 'done' | 'active' | 'pending';
export type QuestionStudioModel = string;

export interface QuestionStudioModelOption {
	id: QuestionStudioModel;
	label: string;
	description: string;
}

export const DEFAULT_QUESTION_STUDIO_MODEL: QuestionStudioModel = 'deepseek/deepseek-v4-flash';

export const QUESTION_STUDIO_MODEL_OPTIONS: QuestionStudioModelOption[] = [
	{
		id: 'deepseek/deepseek-v4-flash',
		label: 'DeepSeek v4 Flash',
		description: 'Fast default'
	},
	{
		id: 'openai/gpt-5.4-mini',
		label: 'GPT-5.4 Mini',
		description: 'OpenAI mini'
	},
	{
		id: 'anthropic/claude-sonnet-4.6',
		label: 'Claude Sonnet 4.6',
		description: 'Anthropic Sonnet'
	}
];

export interface QuestionStudioPhase {
	key: 'source' | 'topics' | 'draft' | 'review';
	label: string;
	state: PhaseState;
}

export interface TopicMapItem {
	topicId: string;
	title: string;
	summary: string;
	pageNumbers: number[];
	learningObjectives: string[];
	keyTerms: string[];
	suggestedOrders: ReasoningOrder[];
	estimatedQuestionCapacity: number;
}

export interface CandidateQuestion {
	type: 'multiple_choice';
	stem: string;
	options: string[];
	correctAnswers: string[];
	rationale: string;
	reasoningOrder: ReasoningOrder;
	topicId: string;
	topicTitle: string;
	sourcePageNumbers: number[];
	sourceCitations?: Array<{
		citationId: string;
		pageNumber: number;
		noteFile: string;
		chunkTitle: string;
		chunkIndex: number;
	}>;
	duplicateRisk: DuplicateRisk;
	similarQuestionIds: Id<'question'>[];
	metadata: {
		model: string;
		agentThreadId?: string;
		sourceDocumentId: Id<'contentLib'>;
	};
}

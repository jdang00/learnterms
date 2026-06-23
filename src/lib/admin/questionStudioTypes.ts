import type { Id } from '../../convex/_generated/dataModel';

export type ReasoningOrder = 'first' | 'second' | 'third';
export type DuplicateRisk = 'low' | 'medium' | 'high';
export type GenerationMode = 'auto' | 'guided' | 'manual';
export type PhaseState = 'done' | 'active' | 'pending';

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
	duplicateRisk: DuplicateRisk;
	similarQuestionIds: Id<'question'>[];
	metadata: {
		model: string;
		agentThreadId?: string;
		sourceDocumentId: Id<'contentLib'>;
	};
}

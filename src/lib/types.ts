export interface authLog {
	loggedIn: boolean;
	userName: string;
}

export type NewQuestionInput = Omit<
	AdminChallengeQuestions,
	'id' | 'created_at' | 'chapter' | 'pic_url'
>;

export interface Option {
	text: string;
	isSelected: boolean;
	letter: string;
	isEliminated: boolean;
}

export interface ExtendedOption extends Option {
	isCorrect?: boolean;
}

export interface QuestionData {
	options: string[];
	question: string;
	explanation: string;
	correct_answers: string[];
}

export interface Question {
	id: string;
	question_data: QuestionData;
}

export interface ChallengeQuestion {
	id: string;
	question_data: QuestionData;
	pic_url: string;
}

export interface QuestionProgress {
	question_id: string;
	selected_options: Option[];
	eliminated_options: Option[];
	is_flagged: boolean;
}

export interface AdminQuestions {
	id: string;
	question_data: {
		options: string[];
		question: string;
		explanation: string;
		correct_answers: string[];
	};
	chapter: string;
	created_at: string;
}

export interface AdminChallengeQuestions {
	id: string;
	question_data: {
		options: string[];
		question: string;
		explanation: string;
		correct_answers: string[];
	};
	chapter: string;
	pic_url: string | null;
	created_at: string;
}

export interface Chapter {
	name: string;
	desc: string;
	numprobs: number;
	chapter: number;
	emoji: string;
}

export interface RawUserProgress {
	user_id: string;
	user_name: string;
	chapter_id: number;
	chapter_name: string;
	total_questions: number;
	attempted_questions: number;
	progress_percentage: number | null;
}

export interface ChapterProgress {
	chapter_id: number;
	chapter_name: string;
	total_questions: number;
	attempted_questions: number;
	progress_percentage: number | null;
}

export interface UserProgress {
	user_id: string;
	user_name: string;
	chapters: ChapterProgress[];
	total_attempted: number;
	total_questions: number;
	overall_progress: number;
}

export interface User {
	_id: string;
	_creationTime: number;
	clerkUserId: string;
	cohortId: string;
	metadata: Record<string, unknown>;
	name: string;
	updatedAt: number;
}

export interface School {
	_id: string;
	_creationTime: number;
	metadata: Record<string, unknown>;
	description: string;
	name: string;
	updatedAt: number;
}

export interface Class {
	_id: string;
	name: string;
	description: string;
	metadata: Record<string, unknown>;
	semesterId: string;
	updateAt: number;
	deleteAt: number | undefined;
	cohortId: string;
	_creationTime: number;
	code: string;
}

export interface Module {
	_id: string;
	title: string;
	description: string;
	metadata: Record<string, unknown>;
	classId: string;
	updateAt: number;
	deleteAt: number | undefined;
	_creationTime: number;
	order: string;
	status: string;
}

export interface Question {
	_id: string;
	_creationTime: number;
	metadata: Record<string, unknown>;
	updatedAt: number;
	deletedAt: number | undefined;
	moduleId: string;
	order: number;
	type: string;
	stem: string;
	options: Array<{ id: string; text: string }>;
	correctAnswers: string[];
	explanation: string;
	aiGenerated: boolean;
	status: string;
}

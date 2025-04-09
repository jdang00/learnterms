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

export type Ticket = {
	ticketid: string;
	customername: string;
	customeremail: string | null;
	subject: string;
	description: string | null;
	dateopened: string;
	dateclosed: string | null;
	status: string | null;
	resolution: string | null;
};

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

export interface ChatMessage {
	role: 'user' | 'assistant';
	content: string;
}

export interface ChatState {
	messages: ChatMessage[];
	loading: boolean;
	input: string;
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

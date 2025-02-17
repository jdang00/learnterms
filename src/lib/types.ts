export interface authLog {
	loggedIn: boolean;
	userName: string;
}
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
	chapter: number;
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

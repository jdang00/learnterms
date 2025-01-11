export interface authLog {
	loggedIn: boolean;
	userName: string;
}
export interface Option {
	text: string;
	isSelected: boolean;
	letter: string;
}

export interface QuestionData {
	options: string[];
	question: string;
	explanation: string;
	correct_answers: string[];
}

export interface Question {
	question_data: QuestionData;
}

export interface Chapter {
	name: string;
	desc: string;
	numprobs: number;
	chapter: number;
	emoji: string;
}

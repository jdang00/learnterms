export type QuestionData = {
	options: string[];
	question: string;
	explanation: string;
	correct_answers: string[];
};

export type Question = {
	question_data: QuestionData;
};

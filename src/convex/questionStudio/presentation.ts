/** Student prose is separate from structured citation metadata. */
export function hasSourceFraming(text: string): boolean {
	const plain = text
		.normalize('NFKC')
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ');
	return /\b(pdf|pdfs|source documents?|source materials?|source notes?|supplied evidence|provided evidence|excerpts?|citations?|rag)\b|\b(?:the|this|these|provided|supplied)\s+sources?\b(?!\s+of\b)|\baccording to\b|\b(?:the|this|these|provided|supplied|uploaded)\s+(?:documents?|notes|slides?|readings?|materials?|passages?|textbooks?|lectures?)\b|\b(?:in|from) the evidence\b|\b(?:listed as|documented example)\b|\b(?:page|slide)\s*\d+\b|\[(?:p\d+c\d+|c\d+|\d+)\]/i.test(
		plain
	);
}

export function hasAnswerLetterReference(text: string): boolean {
	return /\b(?:[Oo]ption|[Aa]nswer|[Cc]hoice)\s+[A-D]\b|\b[A-D]\s+is\s+(?:the\s+)?(?:correct|incorrect|best|wrong)\b/.test(
		text.replace(/<[^>]*>/g, ' ')
	);
}

export function assertStandaloneRationale(rationale: string) {
	if (hasSourceFraming(rationale))
		throw new Error(
			'Write a standalone teaching rationale without referring to sources, PDFs, notes, pages, or citations. Source links are shown separately.'
		);
	if (hasAnswerLetterReference(rationale))
		throw new Error(
			'Explain answers by their content, not option letters, because answers are shuffled.'
		);
}

export function answerPosition(question: {
	type: string;
	options: { id: string }[];
	correctAnswers: string[];
}): number {
	if (question.type !== 'multiple_choice' || question.correctAnswers.length !== 1) return -1;
	return question.options.findIndex((option) => option.id === question.correctAnswers[0]);
}

/** Shuffle distractors, balance keys, and forbid a four-key run through this question. */
export function shuffleCorrectAnswer<T>(
	options: T[],
	correctIndex: number,
	before: number[],
	after: number[] = [],
	random = Math.random
): T[] {
	if (correctIndex < 0 || correctIndex >= options.length)
		throw new Error('Correct answer must match one option');
	const counts = options.map(
		(_, index) => [...before, ...after].filter((position) => position === index).length
	);
	const eligible = options
		.map((_, index) => index)
		.filter((index) => {
			const left = before.slice(-3),
				right = after.slice(0, 3);
			const sequence = [...left, index, ...right];
			return !sequence.some(
				(value, start) =>
					start <= left.length &&
					start + 3 >= left.length &&
					sequence.slice(start, start + 4).length === 4 &&
					sequence.slice(start, start + 4).every((v) => v === value)
			);
		});
	if (!eligible.length)
		throw new Error('Cannot place the correct answer without repeating four answer positions.');
	const minimum = Math.min(...eligible.map((index) => counts[index]));
	const tied = eligible.filter((index) => counts[index] === minimum);
	const position = tied[Math.floor(random() * tied.length)];
	const shuffled = options.filter((_, index) => index !== correctIndex);
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	shuffled.splice(position, 0, options[correctIndex]);
	return shuffled;
}

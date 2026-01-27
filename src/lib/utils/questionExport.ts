/**
 * Question Export Utilities
 *
 * Functions to export module questions as TXT or JSON files.
 * Gives users control over their own question data.
 *
 * Handles edge cases:
 * - Questions with many options (>6)
 * - Matching questions (prompt/answer pairs)
 * - Fill-in-the-blank (mode and flags encoded in text)
 * - True/False questions
 * - Special characters and newlines
 */

export interface ExportableQuestion {
	_id?: string;
	type: string;
	stem: string;
	options: Array<{ id?: string; text: string }>;
	correctAnswers: string[];
	explanation?: string | null;
	status?: string;
	order?: number;
	aiGenerated?: boolean;
	createdBy?: { firstName: string; lastName: string };
	_creationTime?: number;
}

export interface ExportOptions {
	includeMetadata?: boolean;
	includeIds?: boolean;
	includeExplanations?: boolean;
}

/**
 * Strip HTML tags from text
 */
function stripHtml(html: string): string {
	return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Escape text for CSV (handle quotes, newlines, commas)
 */
function escapeCsv(text: string): string {
	const stripped = stripHtml(text);
	// If contains comma, newline, or quote, wrap in quotes and escape internal quotes
	if (stripped.includes(',') || stripped.includes('\n') || stripped.includes('"')) {
		return `"${stripped.replace(/"/g, '""')}"`;
	}
	return stripped;
}

/**
 * Check if question is a matching type
 */
function isMatchingQuestion(question: ExportableQuestion): boolean {
	return question.type === 'matching';
}

/**
 * Check if question is fill-in-the-blank
 */
function isFillInTheBlank(question: ExportableQuestion): boolean {
	return question.type === 'fill_in_the_blank';
}

/**
 * Parse matching question options into prompts and answers
 */
function parseMatchingOptions(question: ExportableQuestion): {
	prompts: Array<{ id: string; text: string }>;
	answers: Array<{ id: string; text: string }>;
	pairs: Array<{ prompt: string; answer: string }>;
} {
	const prompts: Array<{ id: string; text: string }> = [];
	const answers: Array<{ id: string; text: string }> = [];

	for (const opt of question.options) {
		if (opt.text.startsWith('prompt:')) {
			prompts.push({ id: opt.id || '', text: opt.text.replace('prompt:', '').trim() });
		} else if (opt.text.startsWith('answer:')) {
			answers.push({ id: opt.id || '', text: opt.text.replace('answer:', '').trim() });
		}
	}

	// Parse pairs from correctAnswers (format: "promptId::answerId")
	const pairs: Array<{ prompt: string; answer: string }> = [];
	for (const pair of question.correctAnswers) {
		const [promptId, answerId] = pair.split('::');
		const prompt = prompts.find((p) => p.id === promptId);
		const answer = answers.find((a) => a.id === answerId);
		if (prompt && answer) {
			pairs.push({ prompt: prompt.text, answer: answer.text });
		}
	}

	return { prompts, answers, pairs };
}

/**
 * Parse fill-in-the-blank answer format
 * Format: "mode:answer | flags=flag1,flag2"
 */
function parseFitbAnswer(text: string): {
	answer: string;
	mode: string;
	flags: string[];
} {
	const [mainPart, flagsPart] = text.split(' | flags=');
	const colonIndex = mainPart.indexOf(':');

	let mode = 'exact';
	let answer = mainPart;

	if (colonIndex > 0) {
		const possibleMode = mainPart.substring(0, colonIndex);
		if (['exact', 'exact_cs', 'contains', 'regex'].includes(possibleMode)) {
			mode = possibleMode;
			answer = mainPart.substring(colonIndex + 1);
		}
	}

	const flags = flagsPart ? flagsPart.split(',').map((f) => f.trim()) : [];

	return { answer, mode, flags };
}

/**
 * Get the correct answer letters (A, B, C, etc.) for display
 * Handles standard multiple choice and true/false
 */
function getCorrectAnswerLetters(question: ExportableQuestion): string[] {
	// Skip for matching and fill-in-the-blank
	if (isMatchingQuestion(question) || isFillInTheBlank(question)) {
		return [];
	}

	const optionIds = question.options.map((o) => o.id);
	return question.correctAnswers
		.map((answerId) => {
			const index = optionIds.indexOf(answerId);
			if (index >= 0) {
				return String.fromCharCode('A'.charCodeAt(0) + index);
			}
			// Fallback: try parsing as index
			const numIndex = parseInt(answerId);
			if (!isNaN(numIndex) && numIndex >= 0 && numIndex < question.options.length) {
				return String.fromCharCode('A'.charCodeAt(0) + numIndex);
			}
			return null;
		})
		.filter((letter): letter is string => letter !== null);
}

/**
 * Format question type for display
 */
function formatQuestionType(type: string): string {
	return type
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

/**
 * Export questions as formatted TXT
 */
export function exportAsText(
	questions: ExportableQuestion[],
	moduleTitle: string,
	options: ExportOptions = {}
): string {
	const { includeExplanations = true } = options;
	const lines: string[] = [];

	lines.push('='.repeat(60));
	lines.push(`MODULE: ${moduleTitle}`);
	lines.push(`EXPORTED: ${new Date().toLocaleString()}`);
	lines.push(`TOTAL QUESTIONS: ${questions.length}`);
	lines.push('='.repeat(60));
	lines.push('');

	questions.forEach((q, index) => {
		const questionNum = index + 1;
		const stem = stripHtml(q.stem);

		lines.push(`--- Question ${questionNum} ---`);
		lines.push(`[${formatQuestionType(q.type)}]`);
		lines.push('');
		lines.push(stem);
		lines.push('');

		// Handle different question types
		if (isMatchingQuestion(q)) {
			// Matching question format
			const { pairs } = parseMatchingOptions(q);
			lines.push('Match the following:');
			lines.push('');
			pairs.forEach((pair, i) => {
				lines.push(`  ${i + 1}. ${pair.prompt}  →  ${pair.answer}`);
			});
			lines.push('');
		} else if (isFillInTheBlank(q)) {
			// Fill-in-the-blank format
			lines.push('Accepted Answers:');
			q.options.forEach((opt, i) => {
				const parsed = parseFitbAnswer(opt.text);
				const modeLabel =
					parsed.mode === 'exact'
						? 'Exact match'
						: parsed.mode === 'exact_cs'
							? 'Exact (case-sensitive)'
							: parsed.mode === 'contains'
								? 'Contains'
								: 'Regex';
				const flagsStr = parsed.flags.length > 0 ? ` [${parsed.flags.join(', ')}]` : '';
				lines.push(`  ${i + 1}. "${parsed.answer}" (${modeLabel}${flagsStr})`);
			});
			lines.push('');
		} else {
			// Standard multiple choice / true-false
			const correctLetters = getCorrectAnswerLetters(q);

			q.options.forEach((opt, optIndex) => {
				const letter = String.fromCharCode('A'.charCodeAt(0) + optIndex);
				const isCorrect = correctLetters.includes(letter);
				const marker = isCorrect ? '*' : ' ';
				lines.push(`  ${marker} ${letter}. ${opt.text}`);
			});

			lines.push('');
			lines.push(`Correct Answer(s): ${correctLetters.join(', ')}`);
		}

		if (includeExplanations && q.explanation) {
			lines.push('');
			lines.push('Explanation:');
			lines.push(stripHtml(q.explanation));
		}

		lines.push('');
		lines.push('');
	});

	lines.push('='.repeat(60));
	lines.push('END OF EXPORT');
	lines.push('='.repeat(60));

	return lines.join('\n');
}

/**
 * Export questions as JSON (clean format for reimport or analysis)
 */
export function exportAsJson(
	questions: ExportableQuestion[],
	moduleTitle: string,
	options: ExportOptions = {}
): string {
	const { includeMetadata = false, includeIds = false, includeExplanations = true } = options;

	const exportData = {
		module: moduleTitle,
		exportedAt: new Date().toISOString(),
		questionCount: questions.length,
		questions: questions.map((q, index) => {
			const questionData: Record<string, unknown> = {
				number: index + 1,
				type: q.type,
				stem: stripHtml(q.stem)
			};

			// Handle different question types
			if (isMatchingQuestion(q)) {
				const { prompts, answers, pairs } = parseMatchingOptions(q);
				questionData.prompts = prompts.map((p) => p.text);
				questionData.answers = answers.map((a) => a.text);
				questionData.matchingPairs = pairs;
			} else if (isFillInTheBlank(q)) {
				questionData.acceptedAnswers = q.options.map((opt) => {
					const parsed = parseFitbAnswer(opt.text);
					return {
						answer: parsed.answer,
						matchMode: parsed.mode,
						flags: parsed.flags
					};
				});
			} else {
				// Standard multiple choice / true-false
				const correctLetters = getCorrectAnswerLetters(q);
				const correctIndices = correctLetters.map(
					(letter) => letter.charCodeAt(0) - 'A'.charCodeAt(0)
				);

				questionData.options = q.options.map((o) => o.text);
				questionData.correctAnswers = correctIndices;
				questionData.correctAnswerLetters = correctLetters;
			}

			if (includeExplanations && q.explanation) {
				questionData.explanation = stripHtml(q.explanation);
			}

			if (includeMetadata) {
				questionData.metadata = {
					status: q.status,
					aiGenerated: q.aiGenerated,
					createdBy: q.createdBy,
					createdAt: q._creationTime ? new Date(q._creationTime).toISOString() : null
				};
			}

			if (includeIds && q._id) {
				questionData.id = q._id;
			}

			return questionData;
		})
	};

	return JSON.stringify(exportData, null, 2);
}

/**
 * Export questions as CSV (simple format for spreadsheets)
 * Dynamically handles any number of options
 */
export function exportAsCsv(
	questions: ExportableQuestion[],
	moduleTitle: string
): string {
	const rows: string[] = [];

	// Find max options across all questions (for multiple choice)
	const maxOptions = Math.max(
		...questions
			.filter((q) => !isMatchingQuestion(q) && !isFillInTheBlank(q))
			.map((q) => q.options.length),
		4 // minimum 4 columns
	);

	// Build header with dynamic option columns
	const optionHeaders = Array.from({ length: maxOptions }, (_, i) =>
		String.fromCharCode('A'.charCodeAt(0) + i)
	).map((letter) => `Option ${letter}`);

	rows.push(
		['Question #', 'Type', 'Question', ...optionHeaders, 'Correct Answer(s)', 'Explanation'].join(
			','
		)
	);

	questions.forEach((q, index) => {
		const stem = escapeCsv(q.stem);
		const explanation = q.explanation ? escapeCsv(q.explanation) : '';

		let optionValues: string[];
		let correctAnswerStr: string;

		if (isMatchingQuestion(q)) {
			// For matching, show pairs in first columns
			const { pairs } = parseMatchingOptions(q);
			optionValues = pairs.map((p) => escapeCsv(`${p.prompt} → ${p.answer}`));
			correctAnswerStr = 'See pairs';
		} else if (isFillInTheBlank(q)) {
			// For FITB, show accepted answers
			optionValues = q.options.map((opt) => {
				const parsed = parseFitbAnswer(opt.text);
				return escapeCsv(`${parsed.answer} (${parsed.mode})`);
			});
			correctAnswerStr = 'All listed';
		} else {
			// Standard multiple choice / true-false
			optionValues = q.options.map((o) => escapeCsv(o.text));
			const correctLetters = getCorrectAnswerLetters(q);
			correctAnswerStr = correctLetters.join(';');
		}

		// Pad options to match header
		while (optionValues.length < maxOptions) optionValues.push('');

		const row = [
			index + 1,
			q.type,
			stem,
			...optionValues,
			correctAnswerStr,
			explanation
		];

		rows.push(row.join(','));
	});

	return rows.join('\n');
}

/**
 * Trigger a file download in the browser
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

/**
 * Generate a safe filename from module title
 */
export function sanitizeFilename(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 50);
}

/**
 * High-level export function - handles everything
 */
export function exportModuleQuestions(
	questions: ExportableQuestion[],
	moduleTitle: string,
	format: 'txt' | 'json' | 'csv',
	options: ExportOptions = {}
): void {
	const baseFilename = sanitizeFilename(moduleTitle);
	const timestamp = new Date().toISOString().slice(0, 10);

	let content: string;
	let filename: string;
	let mimeType: string;

	switch (format) {
		case 'txt':
			content = exportAsText(questions, moduleTitle, options);
			filename = `${baseFilename}-questions-${timestamp}.txt`;
			mimeType = 'text/plain';
			break;
		case 'json':
			content = exportAsJson(questions, moduleTitle, options);
			filename = `${baseFilename}-questions-${timestamp}.json`;
			mimeType = 'application/json';
			break;
		case 'csv':
			content = exportAsCsv(questions, moduleTitle);
			filename = `${baseFilename}-questions-${timestamp}.csv`;
			mimeType = 'text/csv';
			break;
	}

	downloadFile(content, filename, mimeType);
}

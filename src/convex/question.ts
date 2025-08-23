import { query, mutation, action } from './_generated/server';
import { v } from 'convex/values';

function makeOptionId(stem: string, text: string, index: number): string {
	const input = `${stem}|${text}|${index}`;
	let hash = 0;
	for (let i = 0; i < input.length; i++) {
		const char = input.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return Math.abs(hash).toString(36).padStart(8, '0').slice(0, 8);
}

function convertQuestionType(type: string): string {
	return type.toLowerCase().replace(/\s+/g, '_');
}

function computeSearchText(input: {
	stem: string;
	explanation?: string | null;
	type: string;
	status: string;
	aiGenerated: boolean;
	options: Array<{ id?: string; text: string }>;
	correctAnswers: Array<string>;
	metadata?: { generation?: { model: string; focus: string; customPromptUsed: boolean } };
}): string {
	const parts: Array<string> = [];
	parts.push(input.stem || '');
	if (input.explanation) parts.push(input.explanation);
	parts.push(convertQuestionType(input.type));
	parts.push((input.status || '').toLowerCase());
	parts.push(input.aiGenerated ? 'ai' : 'user');
	for (const opt of input.options || []) parts.push(opt.text || '');
	if (input.correctAnswers && input.correctAnswers.length > 0)
		parts.push(input.correctAnswers.join(' '));
	if (input.metadata?.generation) {
		const g = input.metadata.generation;
		parts.push(g.model || '');
		parts.push(g.focus || '');
		if (g.customPromptUsed) parts.push('custom');
	}
	return parts
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();
}

export const getQuestionsByModule = query({
	// match the schema: moduleId is an id("module")
	args: { id: v.id('module') },
	handler: async (ctx, { id }) => {
		const questions = await ctx.db
			.query('question')
			.withIndex('by_moduleId_order', (q) => q.eq('moduleId', id))
			.filter((q) => q.eq(q.field('status'), 'published'))
			.collect();

		return questions;
	}
});

export const getQuestionsByModuleAdmin = query({
	// match the schema: moduleId is an id("module")
	args: { id: v.id('module') },
	handler: async (ctx, { id }) => {
		const questions = await ctx.db
			.query('question')
			.withIndex('by_moduleId_order', (q) => q.eq('moduleId', id))
			.collect();

		return questions;
	}
});

export const getFirstQuestionInModule = query({
	// Enter module ID
	args: { id: v.id('module') },
	handler: async (ctx, args) => {
		const firstQuestion = ctx.db
			.query('question')
			.withIndex('by_moduleId_order', (q) => q.eq('moduleId', args.id).eq('order', 0))
			.first();

		return firstQuestion;
	}
});

export const insertQuestion = mutation({
	args: {
		moduleId: v.id('module'),
		type: v.string(),
		stem: v.string(),
		options: v.array(v.object({ text: v.string() })),
		correctAnswers: v.array(v.string()),
		explanation: v.string(),
		aiGenerated: v.boolean(),
		status: v.string(),
		order: v.number(),
		metadata: v.object({
			generation: v.optional(
				v.object({
					model: v.string(),
					focus: v.string(),
					customPromptUsed: v.boolean()
				})
			)
		}),
		updatedAt: v.number()
	},
	handler: async (ctx, args) => {
		const optionsWithIds = args.options.map((option, index) => ({
			id: makeOptionId(args.stem, option.text, index),
			text: option.text
		}));

		const correctAnswerIds = args.correctAnswers
			.map((index) => {
				const numIndex = parseInt(index);
				return optionsWithIds[numIndex]?.id || '';
			})
			.filter((id) => id !== '');

		const searchText = computeSearchText({
			stem: args.stem,
			explanation: args.explanation,
			type: args.type,
			status: args.status,
			aiGenerated: args.aiGenerated,
			options: optionsWithIds,
			correctAnswers: correctAnswerIds,
			metadata: args.metadata
		});

		const id = await ctx.db.insert('question', {
			...args,
			type: convertQuestionType(args.type),
			options: optionsWithIds,
			correctAnswers: correctAnswerIds,
			searchText
		});
		return id;
	}
});

export const deleteQuestion = mutation({
	args: {
		questionId: v.id('question'),
		moduleId: v.id('module')
	},
	handler: async (ctx, args) => {
		const questionToDelete = await ctx.db.get(args.questionId);
		if (!questionToDelete || questionToDelete.moduleId !== args.moduleId) {
			throw new Error('Question not found or access denied');
		}

		await ctx.db.delete(args.questionId);
		return { deleted: true };
	}
});

export const bulkDeleteQuestions = mutation({
	args: {
		questionIds: v.array(v.id('question')),
		moduleId: v.id('module')
	},
	handler: async (ctx, args) => {
		let deletedCount = 0;
		const errors = [];

		for (const questionId of args.questionIds) {
			try {
				const questionToDelete = await ctx.db.get(questionId);
				if (!questionToDelete) {
					errors.push(`Question ${questionId} not found`);
					continue;
				}

				if (questionToDelete.moduleId !== args.moduleId) {
					errors.push(`Question ${questionId} access denied`);
					continue;
				}

				await ctx.db.delete(questionId);
				deletedCount++;
			} catch (error) {
				errors.push(`Failed to delete question ${questionId}: ${error}`);
			}
		}

		return {
			deletedCount,
			errors,
			success: errors.length === 0
		};
	}
});

export const updateQuestion = mutation({
	args: {
		questionId: v.id('question'),
		moduleId: v.id('module'),
		type: v.string(),
		stem: v.string(),
		options: v.array(v.object({ text: v.string() })),
		correctAnswers: v.array(v.string()),
		explanation: v.string(),
		status: v.string()
	},
	handler: async (ctx, args) => {
		const questionToUpdate = await ctx.db.get(args.questionId);
		if (!questionToUpdate || questionToUpdate.moduleId !== args.moduleId) {
			throw new Error('Question not found or access denied');
		}

		const optionsWithIds = args.options.map((option, index) => ({
			id: makeOptionId(args.stem, option.text, index),
			text: option.text
		}));

		const correctAnswerIds = args.correctAnswers
			.map((correctAnswer) => {
				const numIndex = parseInt(correctAnswer);
				if (!isNaN(numIndex) && numIndex >= 0 && numIndex < optionsWithIds.length) {
					return optionsWithIds[numIndex].id;
				}
				return correctAnswer;
			})
			.filter((id) => id !== '');

		const searchText = computeSearchText({
			stem: args.stem,
			explanation: args.explanation,
			type: args.type,
			status: args.status,
			aiGenerated: questionToUpdate.aiGenerated,
			options: optionsWithIds,
			correctAnswers: correctAnswerIds,
			metadata: questionToUpdate.metadata
		});

		await ctx.db.patch(args.questionId, {
			type: convertQuestionType(args.type),
			stem: args.stem,
			options: optionsWithIds,
			correctAnswers: correctAnswerIds,
			explanation: args.explanation,
			status: args.status.toLowerCase(),
			updatedAt: Date.now(),
			searchText
		});

		return { updated: true };
	}
});

export const createQuestion = mutation({
	args: {
		moduleId: v.id('module'),
		type: v.string(),
		stem: v.string(),
		options: v.array(v.object({ id: v.string(), text: v.string() })),
		correctAnswers: v.array(v.string()),
		explanation: v.string(),
		aiGenerated: v.boolean(),
		status: v.string(),
		order: v.number(),
		metadata: v.object({
			generation: v.optional(
				v.object({
					model: v.string(),
					focus: v.string(),
					customPromptUsed: v.boolean()
				})
			)
		}),
		updatedAt: v.number()
	},
	handler: async (ctx, args) => {
		const searchText = computeSearchText({
			stem: args.stem,
			explanation: args.explanation,
			type: args.type,
			status: args.status,
			aiGenerated: args.aiGenerated,
			options: args.options,
			correctAnswers: args.correctAnswers,
			metadata: args.metadata
		});
		const id = await ctx.db.insert('question', { ...args, searchText });
		return id;
	}
});

export const bulkInsertQuestions = mutation({
	args: {
		moduleId: v.id('module'),
		questions: v.array(
			v.object({
				type: v.string(),
				stem: v.string(),
				options: v.array(v.object({ text: v.string() })),
				correctAnswers: v.array(v.string()),
				explanation: v.string(),
				aiGenerated: v.boolean(),
				status: v.string(),
				order: v.number(),
				metadata: v.object({
					generation: v.optional(
						v.object({
							model: v.string(),
							focus: v.string(),
							customPromptUsed: v.boolean()
						})
					)
				}),
				updatedAt: v.number()
			})
		)
	},
	handler: async (ctx, { moduleId, questions }) => {
		const insertedIds: string[] = [];

		for (const q of questions) {
			const optionsWithIds = q.options.map((option, index) => ({
				id: makeOptionId(q.stem, option.text, index),
				text: option.text
			}));

			const correctAnswerIds = q.correctAnswers
				.map((index) => {
					const numIndex = parseInt(index);
					return optionsWithIds[numIndex]?.id || '';
				})
				.filter((id) => id !== '');

			const id = await ctx.db.insert('question', {
				moduleId,
				type: convertQuestionType(q.type),
				stem: q.stem,
				options: optionsWithIds,
				correctAnswers: correctAnswerIds,
				explanation: q.explanation,
				aiGenerated: q.aiGenerated,
				status: q.status.toLowerCase(),
				order: q.order,
				metadata: q.metadata,
				updatedAt: q.updatedAt,
				searchText: computeSearchText({
					stem: q.stem,
					explanation: q.explanation,
					type: q.type,
					status: q.status,
					aiGenerated: q.aiGenerated,
					options: optionsWithIds,
					correctAnswers: correctAnswerIds,
					metadata: q.metadata
				})
			});

			insertedIds.push(id);
		}

		return { insertedIds, insertedCount: insertedIds.length };
	}
});

export const updateQuestionOrder = mutation({
	args: {
		questionId: v.id('question'),
		newOrder: v.number(),
		moduleId: v.id('module')
	},
	handler: async (ctx, args) => {
		const allQuestions = await ctx.db
			.query('question')
			.withIndex('by_moduleId', (q) => q.eq('moduleId', args.moduleId))
			.collect();

		// Sort questions by their current order to get the correct sequence
		allQuestions.sort((a, b) => a.order - b.order);

		const movedQuestion = allQuestions.find((q) => q._id === args.questionId);
		if (!movedQuestion) return;

		// Find the current position of the moved question in the sorted array
		const oldIndex = allQuestions.findIndex((q) => q._id === args.questionId);
		const newIndex = args.newOrder;

		// Remove the moved question from its current position
		allQuestions.splice(oldIndex, 1);
		// Insert it at the new position
		allQuestions.splice(newIndex, 0, movedQuestion);

		// Update all questions with their new order based on their position in the array
		for (let i = 0; i < allQuestions.length; i++) {
			await ctx.db.patch(allQuestions[i]._id, { order: i });
		}
	}
});

export const getAllQuestions = query({
	args: {},
	handler: async (ctx) => {
		const questions = await ctx.db.query('question').collect();
		return questions;
	}
});

export const searchQuestionsByModuleAdmin = query({
	args: { id: v.id('module'), query: v.string(), limit: v.optional(v.number()) },
	handler: async (ctx, { id, query, limit }) => {
		const trimmed = query.trim().toLowerCase();
		if (trimmed.length === 0) {
			const results = await ctx.db
				.query('question')
				.withIndex('by_moduleId_order', (q) => q.eq('moduleId', id))
				.collect();
			return results;
		}
		const max = Math.min(Math.max(limit ?? 200, 1), 1000);
		const results = await ctx.db
			.query('question')
			.withSearchIndex('by_moduleId_searchText', (q) =>
				q.search('searchText', trimmed).eq('moduleId', id)
			)
			.take(max);
		return results;
	}
});

export const backfillQuestionSearchTextForModule = mutation({
	args: { moduleId: v.id('module') },
	handler: async (ctx, { moduleId }) => {
		const items = await ctx.db
			.query('question')
			.withIndex('by_moduleId', (q) => q.eq('moduleId', moduleId))
			.collect();
		let updated = 0;
		for (const q of items) {
			const searchText = computeSearchText({
				stem: q.stem,
				explanation: q.explanation ?? '',
				type: q.type,
				status: q.status,
				aiGenerated: q.aiGenerated,
				options: q.options,
				correctAnswers: q.correctAnswers,
				metadata: q.metadata
			});
			if (q.searchText !== searchText) {
				await ctx.db.patch(q._id, { searchText });
				updated += 1;
			}
		}
		return { updated };
	}
});

export const backfillSearchTextForAllModules = mutation({
	args: {},
	handler: async (ctx) => {
		const modules = await ctx.db.query('module').collect();
		let totalUpdated = 0;
		for (const m of modules) {
			const items = await ctx.db
				.query('question')
				.withIndex('by_moduleId', (q) => q.eq('moduleId', m._id))
				.collect();
			for (const q of items) {
				const searchText = computeSearchText({
					stem: q.stem,
					explanation: q.explanation ?? '',
					type: q.type,
					status: q.status,
					aiGenerated: q.aiGenerated,
					options: q.options,
					correctAnswers: q.correctAnswers,
					metadata: q.metadata
				});
				if (q.searchText !== searchText) {
					await ctx.db.patch(q._id, { searchText });
					totalUpdated += 1;
				}
			}
		}
		return { updated: totalUpdated };
	}
});

export const generateQuestions = action({
	args: {
		material: v.string(),
		model: v.string(),
		numQuestions: v.number(),
		focus: v.string(),
		customPrompt: v.optional(v.string())
	},
	handler: async (ctx, { material, model, numQuestions, focus, customPrompt }) => {
		if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim().length === 0) {
			throw new Error('GEMINI_API_KEY is not configured');
		}

		const { GoogleGenAI, Type } = await import('@google/genai');
		const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

		const focusLabel = (focus || 'optometry').toLowerCase();
		const audience = focusLabel === 'optometry' ? 'optometry students' : focusLabel === 'pharmacy' ? 'pharmacy students' : 'health sciences students';
		const domainHint = focusLabel === 'optometry' ? '- Prefer ocular relevance when present.' : focusLabel === 'pharmacy' ? '- Prefer pharmacotherapy relevance for patient care when present.' : '';
		const extra = (customPrompt || '').trim();
		const prompt = `Role: You are an AI assistant specializing in medical education creating high-quality assessment questions.

Goal: Based ONLY on the provided material, generate high-quality multiple-choice questions for ${audience}.

Instructions:
- Create exactly ${numQuestions} diverse multiple-choice questions.
- Mix levels: recall, understanding, application, critical thinking.
- Include at least 2-3 questions with multiple correct answers.
${domainHint}
- Do NOT include any references to the material or meta-instructions.
- Stems and explanations must be self-contained and must not mention or quote the source material.
- Do not use phrases like: "the material", "the text", "the passage", "the document", "the slides", "the notes", "according to", "as stated", "as mentioned".
- Explanations must justify the correct answer and why distractors are incorrect without referencing the source.
- Options must be plain strings with NO leading letters, numbers, or punctuation (no prefixes like "A.", "1)", or "-").
${extra ? `\nAdditional guidance:\n${extra}\n` : ''}

Material:
${material}`;

		const result = await ai.models.generateContent({
			model,
			contents: [{ role: 'user', parts: [{ text: prompt }] }],
			config: {
				temperature: 0.7,
				maxOutputTokens: 8192,
				responseMimeType: 'application/json',
				responseSchema: {
					type: Type.ARRAY,
					items: {
						type: Type.OBJECT,
						properties: {
							stem: { type: Type.STRING },
							options: { type: Type.ARRAY, minItems: 3, maxItems: 6, items: { type: Type.STRING } },
							correctAnswerIndexes: { type: Type.ARRAY, minItems: 1, items: { type: Type.NUMBER } },
							explanation: { type: Type.STRING }
						},
						required: ['stem', 'options', 'correctAnswerIndexes', 'explanation'],
						propertyOrdering: ['stem', 'options', 'correctAnswerIndexes', 'explanation']
					}
				}
			}
		});

		// Handle different response formats from Google AI SDK
		let responseText: string;

		if (result && typeof result === 'object') {
			// Try different response structures
			if ('text' in result && typeof result.text === 'string') {
				responseText = result.text;
			} else if ('response' in result && result.response && typeof result.response === 'object') {
				const response = result.response as Record<string, unknown>;

				if (response.candidates && Array.isArray(response.candidates) && response.candidates[0] && typeof response.candidates[0] === 'object') {
					const candidate = response.candidates[0] as Record<string, unknown>;
					if (candidate.content && typeof candidate.content === 'object') {
						const content = candidate.content as Record<string, unknown>;
						if (content.parts && Array.isArray(content.parts) && content.parts[0] && typeof content.parts[0] === 'object') {
							const part = content.parts[0] as Record<string, unknown>;
							if (part.text && typeof part.text === 'string') {
								responseText = part.text;
							} else {
								throw new Error('AI response missing text content in parts');
							}
						} else {
							throw new Error('AI response missing parts in candidates content');
						}
					} else {
						throw new Error('AI response missing content in candidates');
					}
				} else if ('text' in response && typeof response.text === 'string') {
					responseText = response.text;
				} else {
					throw new Error('AI response missing expected text content in response structure');
				}
			} else {
				throw new Error('AI response missing expected text content - unknown structure');
			}
		} else {
			throw new Error('AI response is not a valid object');
		}

		if (!responseText || typeof responseText !== 'string' || responseText.trim().length === 0) {
			throw new Error('AI response text is empty or invalid');
		}

		let parsed: Array<{
			stem: string;
			options: string[];
			correctAnswerIndexes: number[];
			explanation: string;
		}>;
		try {
			parsed = JSON.parse(responseText.trim());
			if (!Array.isArray(parsed)) {
				throw new Error('Response is not an array');
			}
		} catch (parseError) {
			throw new Error(`Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
		}

		const normalizeOptionText = (opt: string) =>
			opt.replace(/^\s*(?:[A-Z]|\d+)\s*(?:[.)\]:-])\s+/, '').trim();

		const now = Date.now();

		// Validate each question has required fields
		for (let i = 0; i < parsed.length; i++) {
			const q = parsed[i];
			if (!q.stem || typeof q.stem !== 'string') {
				throw new Error(`Question ${i + 1} missing or invalid stem`);
			}
			if (!Array.isArray(q.options) || q.options.length < 2) {
				throw new Error(`Question ${i + 1} missing or insufficient options`);
			}
			if (!Array.isArray(q.correctAnswerIndexes) || q.correctAnswerIndexes.length === 0) {
				throw new Error(`Question ${i + 1} missing correct answer indexes`);
			}
			if (!q.explanation || typeof q.explanation !== 'string') {
				throw new Error(`Question ${i + 1} missing or invalid explanation`);
			}
		}

		const normalized = parsed.map((q, i) => {
			const options = q.options.map((o) => ({ text: normalizeOptionText(o) }));
			const validIndexes = (q.correctAnswerIndexes || [])
				.filter((n) => Number.isInteger(n))
				.filter((n) => n >= 0 && n < options.length)
				.map((n) => String(n));
			return {
				type: 'multiple_choice',
				stem: q.stem.trim(),
				options,
				correctAnswers: validIndexes,
				explanation: typeof q.explanation === 'string' ? q.explanation.trim() : '',
				aiGenerated: true,
				status: 'published',
				order: i,
				metadata: { generation: { model, focus: focusLabel, customPromptUsed: Boolean(extra) } },
				updatedAt: now
			};
		});

		return { questions: normalized, count: normalized.length };
	}
});

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

		const id = await ctx.db.insert('question', {
			...args,
			type: convertQuestionType(args.type),
			options: optionsWithIds,
			correctAnswers: correctAnswerIds
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

		await ctx.db.patch(args.questionId, {
			type: convertQuestionType(args.type),
			stem: args.stem,
			options: optionsWithIds,
			correctAnswers: correctAnswerIds,
			explanation: args.explanation,
			status: args.status.toLowerCase(),
			updatedAt: Date.now()
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
		const id = await ctx.db.insert('question', args);
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
				updatedAt: q.updatedAt
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

		const responseText = (result as { text?: string } | undefined)?.text;
		if (!responseText || typeof responseText !== 'string') {
			throw new Error('AI response missing expected text content');
		}

		let parsed: Array<{
			stem: string;
			options: string[];
			correctAnswerIndexes: number[];
			explanation: string;
		}>;
		try {
			parsed = JSON.parse(responseText.trim());
			if (!Array.isArray(parsed)) throw new Error('Response is not an array');
		} catch {
			throw new Error('Failed to parse AI response as JSON');
		}

		const normalizeOptionText = (opt: string) =>
			opt.replace(/^\s*(?:[A-Z]|\d+)\s*(?:[.)\]:-])\s+/, '').trim();

		const now = Date.now();
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

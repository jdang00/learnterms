import { query, mutation } from './_generated/server';
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
			.withIndex('by_moduleId', (q) => q.eq('moduleId', id))
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
			.withIndex('by_moduleId', (q) => q.eq('moduleId', id))
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
			.filter((q) => q.and(q.eq(q.field('moduleId'), args.id), q.eq(q.field('order'), 0)))
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
		metadata: v.object({}),
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
		metadata: v.object({}),
		updatedAt: v.number()
	},
	handler: async (ctx, args) => {
		const id = await ctx.db.insert('question', args);
		return id;
	}
});

export const getAllQuestions = query({
	args: {},
	handler: async (ctx) => {
		const questions = await ctx.db.query('question').collect();
		return questions;
	}
});

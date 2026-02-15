import { mutation, action, internalMutation } from './_generated/server';
import { authCuratorMutation } from './authQueries';
import { v } from 'convex/values';
import { authQuery } from './authQueries';
import { internal, components } from './_generated/api';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { applyQuestionCreationDeltaAndEvaluateBadges } from './badgeEngine';

const MAX_QUESTIONS_PER_MODULE = 150;
const LIMIT_FREE = 15;
const LIMIT_PRO = 300;

export const checkAndIncrementUsage = internalMutation({
	args: { count: v.number(), clerkUserId: v.string() },
	handler: async (ctx, { count, clerkUserId }) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', clerkUserId))
			.first();

		if (!user) throw new Error('User not found');

		const now = Date.now();
		const oneDayMs = 24 * 60 * 60 * 1000;
		let usage = user.generationUsage;

		// Initialize or reset if older than 24h
		if (!usage || now - usage.lastResetAt > oneDayMs) {
			usage = { count: 0, lastResetAt: now };
		}

		// Check Polar subscription status to determine pro
		let isPro = false;
		try {
			const subscription = await ctx.runQuery(components.polar.lib.getCurrentSubscription, {
				userId: user._id
			});
			isPro = subscription?.status === 'active' || subscription?.status === 'trialing';
		} catch {
			// If subscription check fails, user is not pro
			isPro = false;
		}

		const limit = isPro ? LIMIT_PRO : LIMIT_FREE;

		if (usage.count + count > limit) {
			if (isPro) {
				throw new Error(
					`Daily generation limit reached. You have used ${usage.count}/${limit} generations today. That's a lot of studying! Please check back tomorrow.`
				);
			}
			throw new Error(
				`Daily generation limit reached. You have used ${usage.count}/${limit} generations today. Upgrade to Pro for more.`
			);
		}

		await ctx.db.patch(user._id, {
			generationUsage: {
				count: usage.count + count,
				lastResetAt: usage.lastResetAt
			}
		});
	}
});

async function checkModuleCapacity(
	ctx: MutationCtx,
	moduleId: Id<'module'>,
	countToAdd: number
): Promise<void> {
	const module = await ctx.db.get(moduleId);
	if (!module) throw new Error('Module not found');

	const currentCount = module.questionCount ?? 0;

	if (currentCount + countToAdd > MAX_QUESTIONS_PER_MODULE) {
		throw new Error(
			`Module limit reached (${MAX_QUESTIONS_PER_MODULE} questions). Please split this module for better learning retention.`
		);
	}
}

async function adjustModuleQuestionCount(
	ctx: MutationCtx,
	moduleId: Id<'module'>,
	delta: number
): Promise<void> {
	const module = await ctx.db.get(moduleId);
	if (!module) return;
	const currentCount = module.questionCount ?? 0;
	await ctx.db.patch(moduleId, {
		questionCount: Math.max(0, currentCount + delta)
	});
}

async function applyQuestionCreationBadgesForActor(
	ctx: MutationCtx,
	moduleId: Id<'module'>,
	questionsCreatedDelta: number
): Promise<void> {
	if (questionsCreatedDelta <= 0) return;

	const identity = await ctx.auth.getUserIdentity();
	if (!identity) return;

	const actor = await ctx.db
		.query('users')
		.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
		.first();
	if (!actor) return;

	const module = await ctx.db.get(moduleId);
	if (!module) return;

	await applyQuestionCreationDeltaAndEvaluateBadges(ctx, {
		userId: actor._id,
		classId: module.classId,
		questionsCreatedDelta,
		occurredAt: Date.now()
	});
}

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
	return parts.join(' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

export const getQuestionsByModule = authQuery({
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

export const getQuestionsByModuleAdmin = authQuery({
	args: { id: v.id('module') },
	handler: async (ctx, { id }) => {
		const questions = await ctx.db
			.query('question')
			.withIndex('by_moduleId_order', (q) => q.eq('moduleId', id))
			.collect();

		return questions;
	}
});

export const getFirstQuestionInModule = authQuery({
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

export const insertQuestion = authCuratorMutation({
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
		updatedAt: v.number(),
		createdBy: v.optional(
			v.object({
				firstName: v.string(),
				lastName: v.string()
			})
		)
	},
	handler: async (ctx, args) => {
		await checkModuleCapacity(ctx, args.moduleId, 1);

		const optionsWithIds = args.options.map((option, index) => ({
			id: makeOptionId(args.stem, option.text, index),
			text: option.text
		}));

		const isMatching = convertQuestionType(args.type) === 'matching';
		if (isMatching) {
			const hasPairs = (args.correctAnswers || []).every((s) => String(s).includes('::'));
			if (!hasPairs) {
				throw new Error(
					'Matching questions must use pair-formatted correctAnswers (promptId::answerId)'
				);
			}
		}
		const correctAnswerIds = isMatching
			? args.correctAnswers
			: args.correctAnswers
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
			status: args.status.toLowerCase(),
			options: optionsWithIds,
			correctAnswers: correctAnswerIds,
			searchText
		});
		await adjustModuleQuestionCount(ctx, args.moduleId, 1);
		await applyQuestionCreationBadgesForActor(ctx, args.moduleId, 1);
		return id;
	}
});

export const deleteQuestion = authCuratorMutation({
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
		await adjustModuleQuestionCount(ctx, args.moduleId, -1);
		return { deleted: true };
	}
});

export const bulkDeleteQuestions = authCuratorMutation({
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

		if (deletedCount > 0) {
			await adjustModuleQuestionCount(ctx, args.moduleId, -deletedCount);
		}

		return {
			deletedCount,
			errors,
			success: errors.length === 0
		};
	}
});

export const updateQuestion = authCuratorMutation({
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

		const isMatching = convertQuestionType(args.type) === 'matching';
		if (isMatching) {
			const hasPairs = (args.correctAnswers || []).every((s) => String(s).includes('::'));
			if (!hasPairs) {
				throw new Error(
					'Matching questions must use pair-formatted correctAnswers (promptId::answerId)'
				);
			}
		}
		let correctAnswerIds: string[];
		if (isMatching) {
			// For matching questions, the frontend sends IDs generated from the new text.
			// Since makeOptionId is deterministic, these IDs match the ones we generated in optionsWithIds.
			// We just need to filter out any that might be invalid (though they shouldn't be).
			const availableIds = new Set(optionsWithIds.map((o) => o.id));
			correctAnswerIds = (args.correctAnswers || []).filter((pair) => {
				const [promptId, answerId] = String(pair).split('::');
				return availableIds.has(promptId) && availableIds.has(answerId);
			});
		} else {
			correctAnswerIds = args.correctAnswers
				.map((correctAnswer) => {
					const numIndex = parseInt(correctAnswer);
					if (!isNaN(numIndex) && numIndex >= 0 && numIndex < optionsWithIds.length) {
						return optionsWithIds[numIndex].id;
					}
					return correctAnswer;
				})
				.filter((id) => id !== '');
		}

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

export const createQuestion = authCuratorMutation({
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
		await checkModuleCapacity(ctx, args.moduleId, 1);

		const identity = await ctx.auth.getUserIdentity();
		const createdBy =
			identity?.givenName && identity?.familyName
				? {
						firstName: identity.givenName,
						lastName: identity.familyName
					}
				: undefined;
		const isMatching = convertQuestionType(args.type) === 'matching';
		if (isMatching) {
			const hasPairs = (args.correctAnswers || []).every((s) => String(s).includes('::'));
			if (!hasPairs) {
				throw new Error(
					'Matching questions must use pair-formatted correctAnswers (promptId::answerId)'
				);
			}
		}
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
		const id = await ctx.db.insert('question', {
			...args,
			searchText,
			...(createdBy && { createdBy })
		});
		await adjustModuleQuestionCount(ctx, args.moduleId, 1);
		await applyQuestionCreationBadgesForActor(ctx, args.moduleId, 1);
		return id;
	}
});

export const bulkInsertQuestions = authCuratorMutation({
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
		await checkModuleCapacity(ctx, moduleId, questions.length);

		const insertedIds: string[] = [];

		for (const q of questions) {
			const isMatching = convertQuestionType(q.type) === 'matching';
			if (isMatching) {
				const hasPairs = (q.correctAnswers || []).every((s) => String(s).includes('::'));
				if (!hasPairs) {
					throw new Error(
						'Matching questions must use pair-formatted correctAnswers (promptId::answerId)'
					);
				}
			}
			const optionsWithIds = q.options.map((option, index) => ({
				id: makeOptionId(q.stem, option.text, index),
				text: option.text
			}));
			const correctAnswerIds = isMatching
				? q.correctAnswers
				: q.correctAnswers
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

		if (insertedIds.length > 0) {
			await adjustModuleQuestionCount(ctx, moduleId, insertedIds.length);
			await applyQuestionCreationBadgesForActor(ctx, moduleId, insertedIds.length);
		}

		return { insertedIds, insertedCount: insertedIds.length };
	}
});

export const updateQuestionOrder = authCuratorMutation({
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

export const moveQuestionsToModule = authCuratorMutation({
	args: {
		sourceModuleId: v.id('module'),
		targetModuleId: v.id('module'),
		questionIds: v.array(v.id('question'))
	},
	handler: async (ctx, args) => {
		if (args.sourceModuleId === args.targetModuleId) {
			return { moved: 0, errors: [], success: true };
		}

		await checkModuleCapacity(ctx, args.targetModuleId, args.questionIds.length);

		const targetQuestions = await ctx.db
			.query('question')
			.withIndex('by_moduleId', (q) => q.eq('moduleId', args.targetModuleId))
			.collect();

		let nextOrder =
			targetQuestions.length > 0 ? Math.max(...targetQuestions.map((q) => q.order)) + 1 : 0;

		const errors: string[] = [];
		let moved = 0;

		for (const qid of args.questionIds) {
			const q = await ctx.db.get(qid);
			if (!q) {
				errors.push(`Question ${qid} not found`);
				continue;
			}
			if (q.moduleId !== args.sourceModuleId) {
				errors.push(`Question ${qid} not in source module`);
				continue;
			}
			await ctx.db.patch(qid, {
				moduleId: args.targetModuleId,
				order: nextOrder,
				updatedAt: Date.now()
			});
			moved += 1;
			nextOrder += 1;
		}

		// Reorder remaining questions in source module to keep contiguous order values
		const remaining = await ctx.db
			.query('question')
			.withIndex('by_moduleId', (q) => q.eq('moduleId', args.sourceModuleId))
			.collect();
		remaining.sort((a, b) => a.order - b.order);
		for (let i = 0; i < remaining.length; i++) {
			const item = remaining[i];
			if (item.order !== i) await ctx.db.patch(item._id, { order: i });
		}

		// Adjust question counts for both modules
		if (moved > 0) {
			await adjustModuleQuestionCount(ctx, args.sourceModuleId, -moved);
			await adjustModuleQuestionCount(ctx, args.targetModuleId, moved);
		}

		return { moved, errors, success: errors.length === 0 };
	}
});

export const duplicateQuestion = authCuratorMutation({
	args: { questionId: v.id('question') },
	handler: async (ctx, { questionId }) => {
		const original = await ctx.db.get(questionId);
		if (!original) {
			throw new Error('Question not found');
		}

		await checkModuleCapacity(ctx, original.moduleId, 1);

		const lastInModule = await ctx.db
			.query('question')
			.withIndex('by_moduleId_order', (q) => q.eq('moduleId', original.moduleId))
			.order('desc')
			.first();

		const nextOrder = lastInModule ? (lastInModule.order ?? 0) + 1 : 0;

		const id = await ctx.db.insert('question', {
			moduleId: original.moduleId,
			type: original.type,
			stem: original.stem,
			options: original.options,
			correctAnswers: original.correctAnswers,
			explanation: original.explanation,
			aiGenerated: original.aiGenerated,
			status: original.status,
			order: nextOrder,
			metadata: original.metadata,
			updatedAt: Date.now(),
			searchText: computeSearchText({
				stem: original.stem,
				explanation: original.explanation,
				type: original.type,
				status: original.status,
				aiGenerated: original.aiGenerated,
				options: original.options,
				correctAnswers: original.correctAnswers,
				metadata: original.metadata
			})
		});

		await adjustModuleQuestionCount(ctx, original.moduleId, 1);
		await applyQuestionCreationBadgesForActor(ctx, original.moduleId, 1);
		return id;
	}
});

export const duplicateQuestionMany = authCuratorMutation({
	args: { questionId: v.id('question'), count: v.number() },
	handler: async (ctx, { questionId, count }) => {
		const original = await ctx.db.get(questionId);
		if (!original) {
			throw new Error('Question not found');
		}
		const n = Math.max(1, Math.min(10, count));

		await checkModuleCapacity(ctx, original.moduleId, n);

		const lastInModule = await ctx.db
			.query('question')
			.withIndex('by_moduleId_order', (q) => q.eq('moduleId', original.moduleId))
			.order('desc')
			.first();

		const nextOrder = lastInModule ? (lastInModule.order ?? 0) + 1 : 0;
		const insertedIds: string[] = [];
		for (let i = 0; i < n; i++) {
			const id = await ctx.db.insert('question', {
				moduleId: original.moduleId,
				type: original.type,
				stem: original.stem,
				options: original.options,
				correctAnswers: original.correctAnswers,
				explanation: original.explanation,
				aiGenerated: original.aiGenerated,
				status: original.status,
				order: nextOrder + i,
				metadata: original.metadata,
				updatedAt: Date.now(),
				searchText: computeSearchText({
					stem: original.stem,
					explanation: original.explanation,
					type: original.type,
					status: original.status,
					aiGenerated: original.aiGenerated,
					options: original.options,
					correctAnswers: original.correctAnswers,
					metadata: original.metadata
				})
			});
			insertedIds.push(id);
		}

		if (insertedIds.length > 0) {
			await adjustModuleQuestionCount(ctx, original.moduleId, insertedIds.length);
			await applyQuestionCreationBadgesForActor(ctx, original.moduleId, insertedIds.length);
		}

		return { insertedIds, insertedCount: insertedIds.length };
	}
});

export const getAllQuestions = authQuery({
	args: {},
	handler: async (ctx) => {
		const questions = await ctx.db.query('question').collect();
		return questions;
	}
});

export const searchQuestionsByModuleAdmin = authQuery({
	args: {
		id: v.id('module'),
		query: v.string(),
		limit: v.optional(v.number()),
		sort: v.optional(v.string())
	},
	handler: async (ctx, { id, query, limit, sort }) => {
		const trimmed = query.trim().toLowerCase();
		if (trimmed.length === 0) {
			if ((sort || 'order') === 'created_desc') {
				const results = await ctx.db
					.query('question')
					.withIndex('by_moduleId', (q) => q.eq('moduleId', id))
					.order('desc')
					.collect();
				return results;
			} else {
				const results = await ctx.db
					.query('question')
					.withIndex('by_moduleId_order', (q) => q.eq('moduleId', id))
					.collect();
				return results;
			}
		}
		const max = Math.min(Math.max(limit ?? 200, 1), 1000);
		const results = await ctx.db
			.query('question')
			.withSearchIndex('by_moduleId_searchText', (q) =>
				q.search('searchText', trimmed).eq('moduleId', id)
			)
			.take(max);
		if ((sort || 'order') === 'created_desc') {
			return results.sort((a, b) => (b._creationTime || 0) - (a._creationTime || 0));
		}
		return results.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
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

export const repairMatchingPairsForModule = authCuratorMutation({
	args: { moduleId: v.id('module') },
	handler: async (ctx, { moduleId }) => {
		const items = await ctx.db
			.query('question')
			.withIndex('by_moduleId', (q) => q.eq('moduleId', moduleId))
			.collect();

		let updated = 0;
		for (const q of items) {
			if (q.type !== 'matching') continue;
			const hasPairs = (q.correctAnswers || []).some((s: string) => String(s).includes('::'));
			if (hasPairs) continue;

			const prompts = (q.options || []).filter((o) => o.text.startsWith('prompt:'));
			const answers = (q.options || []).filter((o) => o.text.startsWith('answer:'));
			const n = Math.min(prompts.length, answers.length);
			if (n === 0) continue;

			const pairs: string[] = [];
			for (let i = 0; i < n; i++) {
				pairs.push(`${prompts[i].id}::${answers[i].id}`);
			}

			const searchText = computeSearchText({
				stem: q.stem,
				explanation: q.explanation ?? '',
				type: q.type,
				status: q.status,
				aiGenerated: q.aiGenerated,
				options: q.options,
				correctAnswers: pairs,
				metadata: q.metadata
			});

			await ctx.db.patch(q._id, { correctAnswers: pairs, searchText, updatedAt: Date.now() });
			updated += 1;
		}

		return { updated };
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
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Unauthenticated');

		await ctx.runMutation(internal.question.checkAndIncrementUsage, {
			count: numQuestions,
			clerkUserId: identity.subject
		});

		if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim().length === 0) {
			throw new Error('GEMINI_API_KEY is not configured');
		}

		const { GoogleGenAI, Type } = await import('@google/genai');
		const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

		const focusLabel = (focus || 'optometry').toLowerCase();
		const audience =
			focusLabel === 'optometry'
				? 'optometry students'
				: focusLabel === 'pharmacy'
					? 'pharmacy students'
					: 'health sciences students';
		const domainHint =
			focusLabel === 'optometry'
				? '- Prefer ocular relevance when present.'
				: focusLabel === 'pharmacy'
					? '- Prefer pharmacotherapy relevance for patient care when present. If the material has structure or mechanism of action content, create questions about its details and/or mechanism of action.'
					: '';
		const extra = (customPrompt || '').trim();
		const prompt = `Role: You are an AI assistant specializing in medical education creating high-quality assessment questions.

Goal: Based ONLY on the provided material, generate high-quality multiple-choice questions for ${audience}.

Instructions:
- Create exactly ${numQuestions} diverse multiple-choice questions.
- Mix levels: recall, understanding, application, critical thinking.
- Include at least 3-4 questions with multiple correct answers.
- When generating questions with multiple correct answers, never indicate to select all that apply. Do not use ("Select 3, Select all that apply, etc").
${domainHint}
- Do NOT include any references to the material or meta-instructions.
- Stems and explanations must be self-contained and must not mention or quote the source material.
- Do not use phrases like: "the material", "the text", "the passage", "the document", "the slides", "the notes", "according to", "as stated", "as mentioned" in either the question, the options or the explanations.
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
				// Using default HIGH thinking level for better question quality
			}
		});

		// Extract response text from SDK (modern SDK provides simple .text accessor)
		const responseText = result.text;
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
			throw new Error(
				`Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
			);
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

/**
 * Generate plausible distractor options and explanation from a stem and correct answer(s).
 * This helps educators who write their own questions but need assistance with distractors.
 */
export const generateDistractorsAndExplanation = action({
	args: {
		stem: v.string(),
		correctAnswers: v.array(v.string()),
		existingOptions: v.optional(v.array(v.string())),
		focus: v.string(),
		numDistractors: v.optional(v.number()),
		existingExplanation: v.optional(v.string())
	},
	handler: async (
		ctx,
		{
			stem,
			correctAnswers,
			existingOptions = [],
			focus,
			numDistractors = 3,
			existingExplanation = ''
		}
	) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Unauthenticated');

		// Check usage limits (count as 1 question generation)
		await ctx.runMutation(internal.question.checkAndIncrementUsage, {
			count: 1,
			clerkUserId: identity.subject
		});

		if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim().length === 0) {
			throw new Error('GEMINI_API_KEY is not configured');
		}

		const { GoogleGenAI, Type } = await import('@google/genai');
		const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

		const focusLabel = (focus || 'general').toLowerCase();
		const domainHint =
			focusLabel === 'optometry'
				? ' If medical, focus on optometry context.'
				: focusLabel === 'pharmacy'
					? ' If medical, focus on pharmacy/pharmacology context.'
					: '';

		// Build existing options list so AI knows what NOT to duplicate
		const avoidSection =
			existingOptions.length > 0
				? `\nAlready used (DO NOT repeat any of these): ${existingOptions.join('; ')}`
				: '';

		const contextHint = existingExplanation.trim() ? `\nNotes: ${existingExplanation.trim()}` : '';

		// Compact prompt optimized for tokens
		const prompt = `MCQ. Generate exactly ${numDistractors} NEW wrong options + explanation.${domainHint}

Q: ${stem}
A: ${correctAnswers.join('; ')}${avoidSection}${contextHint}

Wrong options: plausible, no prefixes, match answer length. Each must be unique and different from every existing option listed above.
Explanation: 2-3 sentences why the answer is correct. Incorporate the notes if provided, rewriting into a clear paragraph. Do not reference wrong options.`;

		const result = await ai.models.generateContent({
			model: 'gemini-2.5-flash-lite',
			contents: [{ role: 'user', parts: [{ text: prompt }] }],
			config: {
				temperature: 0.7,
				maxOutputTokens: 512,
				responseMimeType: 'application/json',
				responseSchema: {
					type: Type.OBJECT,
					properties: {
						distractors: {
							type: Type.ARRAY,
							items: { type: Type.STRING },
							minItems: numDistractors,
							maxItems: numDistractors
						},
						explanation: { type: Type.STRING }
					},
					required: ['distractors', 'explanation']
				}
			}
		});

		const responseText = result.text;
		if (!responseText || typeof responseText !== 'string' || responseText.trim().length === 0) {
			throw new Error('AI response text is empty or invalid');
		}

		let parsed: {
			distractors: string[];
			explanation: string;
		};
		try {
			parsed = JSON.parse(responseText.trim());
			if (!Array.isArray(parsed.distractors) || typeof parsed.explanation !== 'string') {
				throw new Error('Invalid response structure');
			}
		} catch (err) {
			console.error('Failed to parse AI response:', err);
			throw new Error('Failed to parse AI-generated distractors and explanation');
		}

		// Validate, clean up, and deduplicate against existing options
		const existingLower = new Set([
			...existingOptions.map((o) => o.trim().toLowerCase()),
			...correctAnswers.map((a) => a.trim().toLowerCase())
		]);
		const cleanedDistractors = parsed.distractors
			.filter((d) => d && d.trim().length > 0)
			.map((d) => d.trim())
			.filter((d) => !existingLower.has(d.toLowerCase()))
			.slice(0, numDistractors);

		return {
			distractors: cleanedDistractors,
			explanation: parsed.explanation.trim()
		};
	}
});

/**
 * Generate an explanation only (for FITB questions).
 */
export const generateExplanation = action({
	args: {
		stem: v.string(),
		answer: v.string(),
		focus: v.string(),
		existingExplanation: v.optional(v.string())
	},
	handler: async (ctx, { stem, answer, focus, existingExplanation = '' }) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Unauthenticated');

		await ctx.runMutation(internal.question.checkAndIncrementUsage, {
			count: 1,
			clerkUserId: identity.subject
		});

		if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim().length === 0) {
			throw new Error('GEMINI_API_KEY is not configured');
		}

		const { GoogleGenAI, Type } = await import('@google/genai');
		const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

		const focusLabel = (focus || 'general').toLowerCase();
		const domainHint =
			focusLabel === 'optometry'
				? ' If medical, focus on optometry context.'
				: focusLabel === 'pharmacy'
					? ' If medical, focus on pharmacy/pharmacology context.'
					: '';

		const contextHint = existingExplanation.trim() ? `\nNotes: ${existingExplanation.trim()}` : '';

		const prompt = `Explain why this is correct in 2-3 sentences. Incorporate the notes if provided, rewriting into a clear paragraph.${domainHint}

Q: ${stem}
A: ${answer}${contextHint}`;

		const result = await ai.models.generateContent({
			model: 'gemini-2.5-flash-lite',
			contents: [{ role: 'user', parts: [{ text: prompt }] }],
			config: {
				temperature: 0.7,
				maxOutputTokens: 256,
				responseMimeType: 'application/json',
				responseSchema: {
					type: Type.OBJECT,
					properties: {
						explanation: { type: Type.STRING }
					},
					required: ['explanation']
				}
			}
		});

		const responseText = result.text;
		if (!responseText || typeof responseText !== 'string' || responseText.trim().length === 0) {
			throw new Error('AI response text is empty or invalid');
		}

		let parsed: { explanation: string };
		try {
			parsed = JSON.parse(responseText.trim());
			if (typeof parsed.explanation !== 'string') {
				throw new Error('Invalid response structure');
			}
		} catch (err) {
			console.error('Failed to parse AI response:', err);
			throw new Error('Failed to parse AI-generated explanation');
		}

		return {
			explanation: parsed.explanation.trim()
		};
	}
});

import { v } from 'convex/values';
import type { Doc, Id } from '../_generated/dataModel';
import { authMutation, authQuery } from '../authQueries';
import { requireClassAccess } from '../access';
import { publishedQuestionCount } from '../moduleStats';
import { getRationale } from '../../lib/utils/rationale';
import { clampInt, normalizeQuestionType, shuffledWithSeed } from './scoring';
import {
	MAX_QUESTIONS_PER_ATTEMPT,
	getClassPublishedModules,
	getEligibleQuestionsForAttempt,
	getModuleTagsForClass,
	nowTs
} from './shared';

export const getClassQuizBuilderData = authQuery({
	args: { classId: v.id('class') },
	handler: async (ctx, args) => {
		const user = ctx.user;
		const classDoc = await requireClassAccess(ctx, user, args.classId);
		const modules = await getClassPublishedModules(ctx, args.classId);
		const { tagsByModuleId, tagCollections } = await getModuleTagsForClass(
			ctx,
			args.classId,
			modules.map((m) => m._id)
		);
		const questionCountByModuleId = new Map(modules.map((m) => [m._id, publishedQuestionCount(m)]));

		const tagCollectionsWithCounts = tagCollections.map((tag) => ({
			...tag,
			questionCount: tag.moduleIds.reduce(
				(sum, moduleId) => sum + (questionCountByModuleId.get(moduleId) ?? 0),
				0
			)
		}));

		return {
			class: {
				_id: classDoc._id,
				name: classDoc.name,
				code: classDoc.code,
				description: classDoc.description
			},
			modules: modules.map((m: Doc<'module'>) => ({
				_id: m._id,
				title: m.title,
				emoji: m.emoji,
				order: m.order,
				description: m.description,
				questionCount: publishedQuestionCount(m),
				tags: tagsByModuleId.get(m._id) ?? []
			})),
			tagCollections: tagCollectionsWithCounts,
			limits: {
				maxQuestionsPerAttempt: MAX_QUESTIONS_PER_ATTEMPT
			}
		};
	}
});

export const getEligibleQuestionPoolSummary = authQuery({
	args: {
		classId: v.id('class'),
		moduleIds: v.array(v.id('module')),
		sourceFilter: v.union(v.literal('all'), v.literal('flagged'), v.literal('incomplete')),
		questionTypes: v.optional(v.array(v.string()))
	},
	handler: async (ctx, args) => {
		const user = ctx.user;
		await requireClassAccess(ctx, user, args.classId);

		const { questions, modulesById } = await getEligibleQuestionsForAttempt(ctx, {
			userId: user._id,
			classId: args.classId,
			moduleIds: args.moduleIds,
			sourceFilter: args.sourceFilter,
			questionTypes: args.questionTypes
		});

		const byModule = new Map<
			Id<'module'>,
			{ moduleId: Id<'module'>; moduleTitle: string; count: number }
		>();
		const byType = new Map<string, number>();

		for (const question of questions) {
			const module = modulesById.get(question.moduleId);
			if (!module) continue;
			const current = byModule.get(module._id) ?? {
				moduleId: module._id,
				moduleTitle: module.title,
				count: 0
			};
			current.count += 1;
			byModule.set(module._id, current);

			const key = normalizeQuestionType(question.type);
			byType.set(key, (byType.get(key) ?? 0) + 1);
		}

		return {
			totalEligible: questions.length,
			byModule: Array.from(byModule.values()).sort((a, b) =>
				a.moduleTitle.localeCompare(b.moduleTitle)
			),
			byType: Array.from(byType.entries())
				.map(([questionType, count]) => ({ questionType, count }))
				.sort((a, b) => a.questionType.localeCompare(b.questionType))
		};
	}
});

export const createCustomQuizAttempt = authMutation({
	args: {
		classId: v.id('class'),
		moduleIds: v.array(v.id('module')),
		questionCount: v.number(),
		sourceFilter: v.union(v.literal('all'), v.literal('flagged'), v.literal('incomplete')),
		questionTypes: v.optional(v.array(v.string())),
		shuffleQuestions: v.boolean(),
		shuffleOptions: v.boolean(),
		timeLimitSec: v.optional(v.number()),
		passThresholdPct: v.number()
	},
	handler: async (ctx, args) => {
		const user = ctx.user;
		const classDoc = await requireClassAccess(ctx, user, args.classId);

		const requestedCount = clampInt(args.questionCount, 1, MAX_QUESTIONS_PER_ATTEMPT);
		const passThresholdPct = clampInt(args.passThresholdPct, 0, 100);
		const timeLimitSec =
			args.timeLimitSec !== undefined ? clampInt(args.timeLimitSec, 30, 24 * 60 * 60) : undefined;

		const { questions } = await getEligibleQuestionsForAttempt(ctx, {
			userId: user._id,
			classId: args.classId,
			moduleIds: args.moduleIds,
			sourceFilter: args.sourceFilter,
			questionTypes: args.questionTypes
		});

		if (questions.length === 0) {
			throw new Error('No eligible questions found for the selected filters');
		}

		const actualCount = Math.min(requestedCount, questions.length);
		const seed = `${nowTs()}_${Math.random().toString(36).slice(2)}`;
		const shuffledPool = shuffledWithSeed(questions, `pool:${seed}`);
		const selected = shuffledPool.slice(0, actualCount);
		const orderedQuestions = args.shuffleQuestions
			? selected
			: [...selected].sort((a, b) => a.order - b.order);
		const now = nowTs();

		const attemptId = await ctx.db.insert('quizAttempts', {
			userId: user._id,
			classId: args.classId,
			cohortId: classDoc.cohortId,
			status: 'in_progress',
			mode: 'custom_random_v1',
			configSnapshot: {
				moduleIds: args.moduleIds,
				questionCountRequested: requestedCount,
				questionCountActual: actualCount,
				sourceFilter: args.sourceFilter,
				questionTypes:
					args.questionTypes && args.questionTypes.length > 0 ? args.questionTypes : undefined,
				shuffleQuestions: args.shuffleQuestions,
				shuffleOptions: args.shuffleOptions,
				timeLimitSec,
				passThresholdPct
			},
			seed,
			startedAt: now,
			lastActivityAt: now,
			timeLimitSec,
			elapsedMs: 0,
			progressCounters: {
				visitedCount: 0,
				answeredCount: 0,
				flaggedCount: 0
			},
			updatedAt: now
		});

		for (let index = 0; index < orderedQuestions.length; index++) {
			const question = orderedQuestions[index];
			const optionOrder = args.shuffleOptions
				? shuffledWithSeed(
						(question.options || []).map((o) => o.id),
						`options:${seed}:${question._id}`
					)
				: undefined;

			await ctx.db.insert('quizAttemptItems', {
				attemptId,
				userId: user._id,
				classId: args.classId,
				questionId: question._id,
				moduleId: question.moduleId,
				order: index,
				optionOrder,
				questionSnapshot: {
					type: question.type,
					stem: question.stem,
					options: question.options || [],
					correctAnswers: question.correctAnswers || [],
					rationale: getRationale(question),
					examFindings: question.examFindings,
					examFindingsStyle: question.examFindingsStyle,
					source:
						question.metadata.source ??
						(question.metadata.generation?.sourceDocumentId
							? {
									sourceDocumentId: question.metadata.generation.sourceDocumentId,
									sourcePageNumbers: question.metadata.generation.sourcePageNumbers,
									sourceCitations: question.metadata.generation.sourceCitations
								}
							: undefined),
					questionUpdatedAt: question.updatedAt
				},
				response: {
					selectedOptions: [],
					isFlagged: false,
					changeCount: 0,
					timeSpentMs: 0
				},
				score: {
					pointsPossible: 1
				},
				updatedAt: now
			});
		}

		return { attemptId, questionCountActual: actualCount };
	}
});

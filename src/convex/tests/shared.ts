import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { hasInteraction } from '../moduleStats';
import { normalizeQuestionType } from './scoring';

export type SourceFilter = 'all' | 'flagged' | 'incomplete';

export type AttemptStatus = 'in_progress' | 'submitted' | 'timed_out' | 'abandoned';

export type ConvexCtx = QueryCtx | MutationCtx;

export const MAX_QUESTIONS_PER_ATTEMPT = 100;

export const MAX_PATCH_CHANGES = 200;

export function isClassDoc(value: unknown): value is Doc<'class'> {
	const classDoc = value as Partial<Doc<'class'>> | null;
	return Boolean(
		classDoc && typeof classDoc.name === 'string' && typeof classDoc.code === 'string'
	);
}

export function isModuleDoc(value: unknown): value is Doc<'module'> {
	const moduleDoc = value as Partial<Doc<'module'>> | null;
	return Boolean(
		moduleDoc && typeof moduleDoc.title === 'string' && typeof moduleDoc.classId === 'string'
	);
}

export function nowTs() {
	return Date.now();
}

export async function requireAttemptOwner(
	ctx: ConvexCtx,
	user: Doc<'users'>,
	attemptId: Id<'quizAttempts'>,
	classId?: Id<'class'>
) {
	const attempt = await ctx.db.get(attemptId);
	if (!attempt) throw new Error('Attempt not found');
	if (attempt.userId !== user._id) throw new Error('Forbidden');
	if (classId && attempt.classId !== classId) throw new Error('Attempt/class mismatch');
	return attempt;
}

export async function getClassPublishedModules(
	ctx: ConvexCtx,
	classId: Id<'class'>
): Promise<Doc<'module'>[]> {
	const modules = (await ctx.db
		.query('module')
		.withIndex('by_classId', (q) => q.eq('classId', classId))
		.filter((q) => q.eq(q.field('status'), 'published'))
		.collect()) as Doc<'module'>[];
	return modules.sort((a, b) => a.order - b.order);
}

export async function getModuleTagsForClass(
	ctx: ConvexCtx,
	classId: Id<'class'>,
	moduleIds: Id<'module'>[]
): Promise<{
	tagsByModuleId: Map<Id<'module'>, Array<{ _id: Id<'tags'>; name: string; color?: string }>>;
	tagCollections: Array<{
		_id: Id<'tags'>;
		name: string;
		color?: string;
		moduleIds: Id<'module'>[];
		moduleCount: number;
		questionCount: number;
	}>;
}> {
	if (moduleIds.length === 0) {
		return { tagsByModuleId: new Map(), tagCollections: [] };
	}

	const [tagDocs, tagLinks] = await Promise.all([
		ctx.db
			.query('tags')
			.withIndex('by_classId', (q) => q.eq('classId', classId))
			.collect(),
		ctx.db
			.query('moduleTags')
			.withIndex('by_classId', (q) => q.eq('classId', classId))
			.collect()
	]);

	const moduleIdSet = new Set(moduleIds);
	const activeTags = (tagDocs as Doc<'tags'>[]).filter((tag) => !tag.deletedAt);
	const tagById = new Map(activeTags.map((tag) => [tag._id, tag]));
	const filteredLinks = (tagLinks as Doc<'moduleTags'>[])
		.filter((link) => !link.deletedAt && moduleIdSet.has(link.moduleId))
		.filter((link) => tagById.has(link.tagId));

	const tagsByModuleId = new Map<
		Id<'module'>,
		Array<{ _id: Id<'tags'>; name: string; color?: string }>
	>();
	const moduleIdsByTagId = new Map<Id<'tags'>, Set<Id<'module'>>>();

	for (const link of filteredLinks) {
		const tag = tagById.get(link.tagId);
		if (!tag) continue;
		const moduleTags = tagsByModuleId.get(link.moduleId) ?? [];
		moduleTags.push({ _id: tag._id, name: tag.name, color: tag.color });
		tagsByModuleId.set(link.moduleId, moduleTags);

		const taggedModules = moduleIdsByTagId.get(tag._id) ?? new Set<Id<'module'>>();
		taggedModules.add(link.moduleId);
		moduleIdsByTagId.set(tag._id, taggedModules);
	}

	for (const [moduleId, tags] of tagsByModuleId) {
		tags.sort((a, b) => a.name.localeCompare(b.name));
		tagsByModuleId.set(moduleId, tags);
	}

	const tagCollections = activeTags
		.map((tag) => {
			const groupedModuleIds = Array.from(moduleIdsByTagId.get(tag._id) ?? []);
			return {
				_id: tag._id,
				name: tag.name,
				color: tag.color,
				moduleIds: groupedModuleIds,
				moduleCount: groupedModuleIds.length,
				questionCount: 0
			};
		})
		.filter((tag) => tag.moduleCount > 0)
		.sort((a, b) => a.name.localeCompare(b.name));

	return { tagsByModuleId, tagCollections };
}

export async function getEligibleQuestionsForAttempt(
	ctx: ConvexCtx,
	params: {
		userId: Id<'users'>;
		classId: Id<'class'>;
		moduleIds: Id<'module'>[];
		sourceFilter: SourceFilter;
		questionTypes?: string[];
	}
): Promise<{
	questions: Doc<'question'>[];
	modulesById: Map<Id<'module'>, Doc<'module'>>;
}> {
	const modules = await getClassPublishedModules(ctx, params.classId);
	const moduleMap = new Map<Id<'module'>, Doc<'module'>>(modules.map((m) => [m._id, m]));

	if (params.moduleIds.length === 0) {
		throw new Error('At least one module is required');
	}

	for (const moduleId of params.moduleIds) {
		const m = moduleMap.get(moduleId);
		if (!m) throw new Error('Module not found in class or not published');
	}

	const normalizedTypeSet =
		params.questionTypes && params.questionTypes.length > 0
			? new Set(params.questionTypes.map(normalizeQuestionType).filter(Boolean))
			: null;

	const questionLists = await Promise.all(
		params.moduleIds.map(async (moduleId) => {
			const q = await ctx.db
				.query('question')
				.withIndex('by_moduleId_order', (indexQ) => indexQ.eq('moduleId', moduleId))
				.filter((qb) => qb.eq(qb.field('status'), 'published'))
				.collect();
			return q as Doc<'question'>[];
		})
	);

	// Timed tests use synchronous grading. Free responses are practiced in modules.
	let questions = questionLists.flat().filter((q) => q.type !== 'free_response');
	if (normalizedTypeSet) {
		questions = questions.filter((q) => normalizedTypeSet.has(normalizeQuestionType(q.type)));
	}

	if (params.sourceFilter === 'all') {
		return { questions, modulesById: moduleMap };
	}

	const progress = (await ctx.db
		.query('userProgress')
		.withIndex('by_user_class', (q) => q.eq('userId', params.userId).eq('classId', params.classId))
		.collect()) as Doc<'userProgress'>[];

	const progressByQuestionId = new Map<Id<'question'>, Doc<'userProgress'>>(
		progress.map((p) => [p.questionId, p])
	);

	if (params.sourceFilter === 'flagged') {
		questions = questions.filter(
			(question) => progressByQuestionId.get(question._id)?.isFlagged === true
		);
	} else if (params.sourceFilter === 'incomplete') {
		questions = questions.filter((question) => {
			const record = progressByQuestionId.get(question._id);
			return !record || !hasInteraction(record);
		});
	}

	return { questions, modulesById: moduleMap };
}

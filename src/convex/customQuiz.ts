import { query, mutation } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';

type SourceFilter = 'all' | 'flagged' | 'incomplete';
type AttemptStatus = 'in_progress' | 'submitted' | 'timed_out' | 'abandoned';
type ConvexCtx = QueryCtx | MutationCtx;

const MAX_QUESTIONS_PER_ATTEMPT = 100;
const MAX_PATCH_CHANGES = 200;

function isClassDoc(value: any): value is Doc<'class'> {
	return Boolean(value && typeof value.name === 'string' && typeof value.code === 'string');
}

function isModuleDoc(value: any): value is Doc<'module'> {
	return Boolean(value && typeof value.title === 'string' && typeof value.classId === 'string');
}

function nowTs() {
	return Date.now();
}

async function requireCurrentUser(ctx: ConvexCtx): Promise<Doc<'users'>> {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) throw new Error('Unauthorized');

	const user = await ctx.db
		.query('users')
		.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
		.first();

	if (!user) throw new Error('User not found');
	return user;
}

async function requireClassAccess(ctx: ConvexCtx, user: Doc<'users'>, classId: Id<'class'>) {
	const classDoc = await ctx.db.get(classId);
	if (!classDoc) throw new Error('Class not found');
	if (!user.cohortId || classDoc.cohortId !== user.cohortId) {
		throw new Error('Forbidden');
	}
	return classDoc;
}

async function requireAttemptOwner(
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

function hasInteraction(record: Pick<Doc<'userProgress'>, 'selectedOptions' | 'eliminatedOptions'>) {
	return record.selectedOptions.length > 0 || record.eliminatedOptions.length > 0;
}

function normalizeQuestionType(type: string): string {
	return String(type || '').trim().toLowerCase();
}

function seededHash(input: string): number {
	let h = 2166136261 >>> 0;
	for (let i = 0; i < input.length; i++) {
		h ^= input.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

function mulberry32(seed: number) {
	return function () {
		let t = (seed += 0x6d2b79f5);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function shuffledWithSeed<T>(items: T[], seedInput: string): T[] {
	const out = [...items];
	const rand = mulberry32(seededHash(seedInput));
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

function clampInt(n: number, min: number, max: number) {
	return Math.max(min, Math.min(max, Math.trunc(n)));
}

function exactSetMatch(correctAnswers: string[], userAnswers: string[]) {
	const sortedCorrect = [...correctAnswers].sort();
	const sortedUser = [...userAnswers].sort();
	return (
		sortedCorrect.length === sortedUser.length &&
		sortedCorrect.every((value, idx) => value === sortedUser[idx])
	);
}

function matchingRoleFromOptionText(text: string): 'prompt' | 'answer' | null {
	const normalized = String(text ?? '').trimStart().toLowerCase();
	if (normalized.startsWith('prompt:')) return 'prompt';
	if (normalized.startsWith('answer:')) return 'answer';
	return null;
}

function parseMatchingPair(value: string): { promptId: string; answerToken: string } | null {
	const raw = String(value ?? '').trim();
	const sep = raw.indexOf('::');
	if (sep <= 0) return null;
	const promptId = raw.slice(0, sep).trim();
	const answerToken = raw.slice(sep + 2).trim();
	if (!promptId || !answerToken) return null;
	return { promptId, answerToken };
}

function splitMatchingAnswerToken(answerToken: string): string[] {
	return String(answerToken ?? '')
		.split('|')
		.map((part) => part.trim())
		.filter((part) => part.length > 0);
}

function normalizeMatchingAnswerText(text: string): string {
	return String(text ?? '')
		.replace(/^\s*answer:\s*/i, '')
		.trim()
		.toLowerCase()
		.replace(/\s+/g, ' ');
}

function resolveMatchingOptionTokenToId(
	token: string,
	options: Array<{ id: string; text: string }>
): string | null {
	const raw = String(token ?? '').trim();
	if (!raw) return null;
	if (options.some((opt) => opt.id === raw)) return raw;
	if (/^\d+$/.test(raw)) {
		const index = Number(raw);
		if (Number.isInteger(index) && index >= 0 && index < options.length) {
			return options[index]?.id ?? null;
		}
	}
	return null;
}

function normalizeMatchingCorrectPairs(
	questionSnapshot: Doc<'quizAttemptItems'>['questionSnapshot']
): string[] {
	const options = questionSnapshot.options || [];
	const promptOptions = options.filter((o) => matchingRoleFromOptionText(o.text) === 'prompt');
	const answerOptions = options.filter((o) => matchingRoleFromOptionText(o.text) === 'answer');
	const answerIdSet = new Set(answerOptions.map((o) => o.id));
	const promptIdSet = new Set(promptOptions.map((o) => o.id));
	const raw = (questionSnapshot.correctAnswers || []).map((s) => String(s));

	// Modern format: promptId::answerId (answer token may include alternatives separated by "|")
	const pairValues = raw
		.map(parseMatchingPair)
		.filter(
			(
				pair
			): pair is {
				promptId: string;
				answerToken: string;
			} => Boolean(pair)
		)
			.map((pair) => ({
				promptId: resolveMatchingOptionTokenToId(pair.promptId, options) ?? '',
				answerId:
					splitMatchingAnswerToken(pair.answerToken)
						.map((token) => resolveMatchingOptionTokenToId(token, options))
						.filter((id): id is string => Boolean(id))
						.find((id) => answerIdSet.has(id)) ?? ''
			}))
		.filter((pair) => promptIdSet.has(pair.promptId) && answerIdSet.has(pair.answerId));
	if (pairValues.length > 0) {
		return Array.from(new Set(pairValues.map((pair) => `${pair.promptId}::${pair.answerId}`)));
	}

	// Legacy format: answer IDs aligned with prompt order
	const promptCount = promptOptions.length;
	if (promptCount > 0 && raw.length > 0) {
		const pairsFromAnswerIds = promptOptions
			.map((prompt, index) => {
				const answerId = raw[index];
				return answerId && answerIdSet.has(answerId) ? `${prompt.id}::${answerId}` : null;
			})
			.filter((pair): pair is string => Boolean(pair));
		if (pairsFromAnswerIds.length > 0) {
			return Array.from(new Set(pairsFromAnswerIds));
		}
	}

	// Last-resort legacy fallback: zip prompt/answer order from the snapshot.
	const zipped: string[] = [];
	const n = Math.min(promptOptions.length, answerOptions.length);
	for (let i = 0; i < n; i++) {
		zipped.push(`${promptOptions[i].id}::${answerOptions[i].id}`);
	}
	return zipped;
}

function matchingCorrectByPrompt(
	questionSnapshot: Doc<'quizAttemptItems'>['questionSnapshot']
): Map<string, Set<string>> {
	const options = questionSnapshot.options || [];
	const promptOptions = options.filter((o) => matchingRoleFromOptionText(o.text) === 'prompt');
	const answerOptions = options.filter((o) => matchingRoleFromOptionText(o.text) === 'answer');
	const promptIdSet = new Set(promptOptions.map((o) => o.id));
	const answerIdSet = new Set(answerOptions.map((o) => o.id));
	const answerKeyById = new Map(answerOptions.map((o) => [o.id, normalizeMatchingAnswerText(o.text)]));
	const answerIdsByKey = new Map<string, Set<string>>();
	for (const [id, key] of answerKeyById.entries()) {
		if (!answerIdsByKey.has(key)) answerIdsByKey.set(key, new Set());
		answerIdsByKey.get(key)!.add(id);
	}

	const out = new Map<string, Set<string>>();
	const raw = (questionSnapshot.correctAnswers || []).map((s) => String(s));
	const hasPairFormat = raw.some((value) => value.includes('::'));

	if (hasPairFormat) {
		for (const rawPair of raw) {
			const parsed = parseMatchingPair(rawPair);
			if (!parsed) continue;
			const resolvedPromptId = resolveMatchingOptionTokenToId(parsed.promptId, options);
			if (!resolvedPromptId || !promptIdSet.has(resolvedPromptId)) continue;

			const directAnswerIds = splitMatchingAnswerToken(parsed.answerToken)
				.map((token) => resolveMatchingOptionTokenToId(token, options))
				.filter((id): id is string => Boolean(id))
				.filter((id) => answerIdSet.has(id));
			if (directAnswerIds.length === 0) continue;

			const accepted = out.get(resolvedPromptId) ?? new Set<string>();
			for (const directId of directAnswerIds) {
				accepted.add(directId);
				const key = answerKeyById.get(directId);
				if (!key) continue;
				const sameMeaning = answerIdsByKey.get(key);
				if (!sameMeaning) continue;
				for (const equivalentId of sameMeaning) accepted.add(equivalentId);
			}
			out.set(resolvedPromptId, accepted);
		}
		return out;
	}

	const n = Math.min(promptOptions.length, raw.length);
	for (let i = 0; i < n; i++) {
		const promptId = promptOptions[i].id;
		const answerId = resolveMatchingOptionTokenToId(raw[i], options);
		if (!answerId || !answerIdSet.has(answerId)) continue;

		const accepted = new Set<string>([answerId]);
		const key = answerKeyById.get(answerId);
		if (key) {
			const sameMeaning = answerIdsByKey.get(key);
			if (sameMeaning) {
				for (const equivalentId of sameMeaning) accepted.add(equivalentId);
			}
		}
		out.set(promptId, accepted);
	}
	return out;
}

function normalizeMatchingUserPairs(
	questionSnapshot: Doc<'quizAttemptItems'>['questionSnapshot'],
	selectedOptions: string[]
): string[] {
	const options = questionSnapshot.options || [];
	const promptIdSet = new Set(
		options
			.filter((o) => matchingRoleFromOptionText(o.text) === 'prompt')
			.map((o) => o.id)
	);
	const answerIdSet = new Set(
		options
			.filter((o) => matchingRoleFromOptionText(o.text) === 'answer')
			.map((o) => o.id)
	);

	return Array.from(
		new Set(
			(selectedOptions || [])
				.map(parseMatchingPair)
				.filter(
					(
						pair
					): pair is {
						promptId: string;
						answerToken: string;
					} => Boolean(pair)
				)
				.map((pair) => ({
					promptId: resolveMatchingOptionTokenToId(pair.promptId, options) ?? '',
					answerId:
						splitMatchingAnswerToken(pair.answerToken)
							.map((token) => resolveMatchingOptionTokenToId(token, options))
							.find((id): id is string => Boolean(id)) ?? ''
				}))
				.filter((pair) => promptIdSet.has(pair.promptId) && answerIdSet.has(pair.answerId))
				.map((pair) => `${pair.promptId}::${pair.answerId}`)
		)
	);
}

function evaluateMatchingSelection(
	questionSnapshot: Doc<'quizAttemptItems'>['questionSnapshot'],
	selectedOptions: string[]
): boolean {
	const correctByPrompt = matchingCorrectByPrompt(questionSnapshot);
	const userPairs = normalizeMatchingUserPairs(questionSnapshot, selectedOptions || []);

	const userByPrompt = new Map<string, string>();
	for (const pair of userPairs) {
		const parsed = parseMatchingPair(pair);
		if (!parsed) continue;
		const answerId = splitMatchingAnswerToken(parsed.answerToken)[0] ?? '';
		if (!answerId) continue;
		userByPrompt.set(parsed.promptId, answerId);
	}

	if (userByPrompt.size !== correctByPrompt.size) return false;
	for (const [promptId, acceptedIds] of correctByPrompt.entries()) {
		const selectedId = userByPrompt.get(promptId);
		if (!selectedId || !acceptedIds.has(selectedId)) return false;
	}
	return true;
}

type FitbMode = 'exact' | 'exact_cs' | 'contains' | 'regex';

function isFitbMode(s: string): s is FitbMode {
	return s === 'exact' || s === 'exact_cs' || s === 'contains' || s === 'regex';
}

function normalizeForFlags(
	text: string,
	ignorePunct: boolean,
	normalizeWs: boolean,
	toLower: boolean
) {
	let out = String(text || '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
	if (toLower) out = out.toLowerCase();
	if (ignorePunct) out = out.replace(/[^a-z0-9\s]/gi, '');
	if (normalizeWs) out = out.replace(/\s+/g, ' ');
	return out.trim();
}

function looksUnsafeRegexPattern(pattern: string): boolean {
	if (pattern.length > 200) return true;
	// Heuristic for catastrophic backtracking patterns like (.+)+ or (a*){2,}
	if (/\((?:[^()\\]|\\.)*(?:\+|\*|\{\d+(?:,\d*)?\})(?:[^()\\]|\\.)*\)\s*(?:\+|\*|\{\d+(?:,\d*)?\})/.test(pattern)) {
		return true;
	}
	// Heuristic for repeated wildcard groups such as (.*.*)+
	if (/\((?:[^()\\]|\\.)*(?:\.\*|\.\+)(?:[^()\\]|\\.)*(?:\.\*|\.\+)(?:[^()\\]|\\.)*\)/.test(pattern)) {
		return true;
	}
	return false;
}

function safeRegex(pattern: string): RegExp | null {
	if (looksUnsafeRegexPattern(pattern)) return null;
	try {
		return new RegExp(pattern);
	} catch {
		return null;
	}
}

function evaluateFitb(
	questionSnapshot: Doc<'quizAttemptItems'>['questionSnapshot'],
	userText: string
): boolean {
	const options = questionSnapshot.options || [];
	const encodedAnswers = (questionSnapshot.correctAnswers || [])
		.map((id) => options.find((o) => o.id === id)?.text)
		.filter((t): t is string => Boolean(t));

	for (const encoded of encodedAnswers) {
		const [before, flagsPart] = String(encoded || '').split(' | flags=');
		const firstColon = before.indexOf(':');
		let mode: FitbMode = 'exact';
		let value = before;
		if (firstColon > -1) {
			const maybe = before.slice(0, firstColon);
			if (isFitbMode(maybe)) {
				mode = maybe;
				value = before.slice(firstColon + 1);
			}
		}
		const ignorePunct = (flagsPart || '').includes('ignore_punct');
		const normalizeWs = (flagsPart || '').includes('normalize_ws');
		if (mode === 'regex') {
			const re = safeRegex(value);
			if (re && re.test(userText)) return true;
			continue;
		}
		const lowerInsensitive = mode !== 'exact_cs';
		const normalizedUser = normalizeForFlags(userText, ignorePunct, normalizeWs, lowerInsensitive);
		const normalizedValue = normalizeForFlags(value, ignorePunct, normalizeWs, lowerInsensitive);
		if (mode === 'contains') {
			if (normalizedUser.includes(normalizedValue)) return true;
		} else if (normalizedUser === normalizedValue) {
			return true;
		}
	}

	return false;
}

function isFitbType(type: string) {
	return normalizeQuestionType(type) === 'fill_in_the_blank';
}

function isMatchingType(type: string) {
	return normalizeQuestionType(type) === 'matching';
}

function isAnswered(item: Doc<'quizAttemptItems'>) {
	if (isFitbType(item.questionSnapshot.type)) {
		const text = item.response.textResponse ?? item.response.selectedOptions[0] ?? '';
		return String(text).trim().length > 0;
	}
	return (item.response.selectedOptions || []).length > 0;
}

function scoreAttemptItem(item: Doc<'quizAttemptItems'>) {
	const pointsPossible = item.score.pointsPossible ?? 1;
	let isCorrect = false;
	let unanswered = false;

	if (!isAnswered(item)) {
		unanswered = true;
		isCorrect = false;
	} else if (isFitbType(item.questionSnapshot.type)) {
		const text = item.response.textResponse ?? item.response.selectedOptions[0] ?? '';
		isCorrect = evaluateFitb(item.questionSnapshot, String(text));
	} else if (isMatchingType(item.questionSnapshot.type)) {
		isCorrect = evaluateMatchingSelection(
			item.questionSnapshot,
			item.response.selectedOptions || []
		);
	} else {
		isCorrect = exactSetMatch(item.questionSnapshot.correctAnswers || [], item.response.selectedOptions || []);
	}

	return {
		isCorrect,
		unanswered,
		pointsEarned: isCorrect ? pointsPossible : 0,
		pointsPossible
	};
}

function computeAttemptCounters(items: Doc<'quizAttemptItems'>[]) {
	let visitedCount = 0;
	let answeredCount = 0;
	let flaggedCount = 0;
	for (const item of items) {
		if (item.response.visitedAt !== undefined) visitedCount++;
		if (isAnswered(item)) answeredCount++;
		if (item.response.isFlagged) flaggedCount++;
	}
	return { visitedCount, answeredCount, flaggedCount };
}

async function getClassPublishedModules(ctx: ConvexCtx, classId: Id<'class'>): Promise<Doc<'module'>[]> {
	const modules = (await ctx.db
		.query('module')
		.withIndex('by_classId', (q) => q.eq('classId', classId))
		.filter((q) => q.eq(q.field('status'), 'published'))
		.collect()) as Doc<'module'>[];
	return modules.sort((a: any, b: any) => a.order - b.order);
}

async function getModuleTagsForClass(
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

	const tagsByModuleId = new Map<Id<'module'>, Array<{ _id: Id<'tags'>; name: string; color?: string }>>();
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

async function getEligibleQuestionsForAttempt(ctx: ConvexCtx, params: {
	userId: Id<'users'>;
	classId: Id<'class'>;
	moduleIds: Id<'module'>[];
	sourceFilter: SourceFilter;
	questionTypes?: string[];
}): Promise<{
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

	let questions = questionLists.flat();
	if (normalizedTypeSet) {
		questions = questions.filter((q) => normalizedTypeSet.has(normalizeQuestionType(q.type)));
	}

	if (params.sourceFilter === 'all') {
		return { questions, modulesById: moduleMap };
	}

	const progress = (await ctx.db
		.query('userProgress')
		.withIndex('by_user_class', (q) =>
			q.eq('userId', params.userId).eq('classId', params.classId)
		)
		.collect()) as Doc<'userProgress'>[];

	const progressByQuestionId = new Map<Id<'question'>, Doc<'userProgress'>>(
		progress.map((p) => [p.questionId, p])
	);

	if (params.sourceFilter === 'flagged') {
		questions = questions.filter((question) => progressByQuestionId.get(question._id)?.isFlagged === true);
	} else if (params.sourceFilter === 'incomplete') {
		questions = questions.filter((question) => {
			const record = progressByQuestionId.get(question._id);
			return !record || !hasInteraction(record);
		});
	}

	return { questions, modulesById: moduleMap };
}

function decodeFitbDisplayText(raw: string): string {
	const [before] = String(raw || '').split(' | flags=');
	const firstColon = before.indexOf(':');
	if (firstColon > -1) {
		const maybe = before.slice(0, firstColon);
		if (isFitbMode(maybe)) return before.slice(firstColon + 1);
	}
	return before;
}

function buildCorrectAnswerDisplay(item: Doc<'quizAttemptItems'>) {
	if (isFitbType(item.questionSnapshot.type)) {
		const optionMap = new Map(item.questionSnapshot.options.map((o) => [o.id, o.text]));
		return (item.questionSnapshot.correctAnswers || [])
			.map((id) => optionMap.get(id) ?? id)
			.map((s) => decodeFitbDisplayText(s));
	}

	if (isMatchingType(item.questionSnapshot.type)) {
		return normalizeMatchingCorrectPairs(item.questionSnapshot);
	}

	return item.questionSnapshot.correctAnswers || [];
}

function redactAttemptItemForRunner(item: Doc<'quizAttemptItems'>) {
	const orderedOptions =
		item.optionOrder && item.optionOrder.length > 0
			? item.optionOrder
					.map((id) => item.questionSnapshot.options.find((o) => o.id === id))
					.filter((o): o is { id: string; text: string } => Boolean(o))
			: item.questionSnapshot.options;

	return {
		_id: item._id,
		attemptId: item.attemptId,
		questionId: item.questionId,
		moduleId: item.moduleId,
		order: item.order,
		question: {
			type: item.questionSnapshot.type,
			stem: item.questionSnapshot.stem,
			options: orderedOptions,
			correctAnswerCount: (item.questionSnapshot.correctAnswers || []).length
		},
		response: item.response
	};
}

export const getClassQuizBuilderData = query({
	args: { classId: v.id('class') },
	handler: async (ctx, args) => {
		const user = await requireCurrentUser(ctx);
		const classDoc = await requireClassAccess(ctx, user, args.classId);
		const modules = await getClassPublishedModules(ctx, args.classId);
		const { tagsByModuleId, tagCollections } = await getModuleTagsForClass(
			ctx,
			args.classId,
			modules.map((m) => m._id)
		);
		const questionCountByModuleId = new Map(modules.map((m) => [m._id, m.questionCount ?? 0]));

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
					questionCount: m.questionCount ?? 0,
					tags: tagsByModuleId.get(m._id) ?? []
				})),
				tagCollections: tagCollectionsWithCounts,
				limits: {
					maxQuestionsPerAttempt: MAX_QUESTIONS_PER_ATTEMPT
				}
		};
	}
});

export const getEligibleQuestionPoolSummary = query({
	args: {
		classId: v.id('class'),
		moduleIds: v.array(v.id('module')),
		sourceFilter: v.union(v.literal('all'), v.literal('flagged'), v.literal('incomplete')),
		questionTypes: v.optional(v.array(v.string()))
	},
	handler: async (ctx, args) => {
		const user = await requireCurrentUser(ctx);
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
			byModule: Array.from(byModule.values()).sort((a, b) => a.moduleTitle.localeCompare(b.moduleTitle)),
			byType: Array.from(byType.entries())
				.map(([questionType, count]) => ({ questionType, count }))
				.sort((a, b) => a.questionType.localeCompare(b.questionType))
		};
	}
});

export const createCustomQuizAttempt = mutation({
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
		const user = await requireCurrentUser(ctx);
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
		const orderedQuestions = args.shuffleQuestions ? selected : [...selected].sort((a, b) => a.order - b.order);
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
				questionTypes: args.questionTypes && args.questionTypes.length > 0 ? args.questionTypes : undefined,
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
					explanation: question.explanation,
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

export const getAttemptRunnerBundle = query({
	args: { attemptId: v.id('quizAttempts') },
	handler: async (ctx, args) => {
		const user = await requireCurrentUser(ctx);
		const attempt = await requireAttemptOwner(ctx, user, args.attemptId);
		await requireClassAccess(ctx, user, attempt.classId);

		const items = (await ctx.db
			.query('quizAttemptItems')
			.withIndex('by_attempt_order', (q) => q.eq('attemptId', args.attemptId))
			.collect()) as Doc<'quizAttemptItems'>[];

			const classDoc = (await ctx.db.get(attempt.classId)) as Doc<'class'> | null;
		const modules = await Promise.all(
			Array.from(new Set(items.map((item) => item.moduleId))).map(async (moduleId) => {
				const module = await ctx.db.get(moduleId);
				return module ? { _id: module._id, title: module.title, emoji: module.emoji } : null;
			})
		);

		return {
			attempt: {
				_id: attempt._id,
				classId: attempt.classId,
					className: isClassDoc(classDoc) ? classDoc.name : 'Class',
				status: attempt.status as AttemptStatus,
				startedAt: attempt.startedAt,
				lastActivityAt: attempt.lastActivityAt,
				submittedAt: attempt.submittedAt,
				elapsedMs: attempt.elapsedMs,
				timeLimitSec: attempt.timeLimitSec,
				timeExpiredAt: attempt.timeExpiredAt,
				progressCounters: attempt.progressCounters,
				configSnapshot: attempt.configSnapshot
			},
			modules: modules.filter(Boolean),
			items: items.map(redactAttemptItemForRunner)
		};
	}
});

export const patchAttemptResponses = mutation({
	args: {
		attemptId: v.id('quizAttempts'),
		elapsedMs: v.optional(v.number()),
		changes: v.array(
			v.object({
				itemId: v.id('quizAttemptItems'),
				selectedOptions: v.optional(v.array(v.string())),
				textResponse: v.optional(v.string()),
				isFlagged: v.optional(v.boolean()),
				markVisited: v.optional(v.boolean()),
				timeSpentDeltaMs: v.optional(v.number())
			})
		)
	},
	handler: async (ctx, args) => {
		if (args.changes.length > MAX_PATCH_CHANGES) {
			throw new Error('Too many changes in one patch');
		}

		const user = await requireCurrentUser(ctx);
		const attempt = await requireAttemptOwner(ctx, user, args.attemptId);
		if (attempt.status !== 'in_progress') {
			throw new Error('Attempt is not editable');
		}

		const now = nowTs();
		const elapsedMsArg =
			args.elapsedMs !== undefined ? Math.max(0, clampInt(args.elapsedMs, 0, 7 * 24 * 60 * 60 * 1000)) : undefined;

		for (const change of args.changes) {
			const item = (await ctx.db.get(change.itemId)) as Doc<'quizAttemptItems'> | null;
			if (!item) continue;
			if (item.attemptId !== args.attemptId || item.userId !== user._id) {
				throw new Error('Invalid attempt item');
			}

			const nextResponse = { ...item.response };
			if (change.selectedOptions !== undefined) {
				nextResponse.selectedOptions = change.selectedOptions;
			}
			if (change.textResponse !== undefined) {
				nextResponse.textResponse = change.textResponse;
			}
			if (change.isFlagged !== undefined) {
				nextResponse.isFlagged = change.isFlagged;
			}
			if (change.markVisited && nextResponse.visitedAt === undefined) {
				nextResponse.visitedAt = now;
			}
			if (change.timeSpentDeltaMs !== undefined) {
				const delta = clampInt(change.timeSpentDeltaMs, 0, 10 * 60_000);
				nextResponse.timeSpentMs = Math.max(0, (nextResponse.timeSpentMs ?? 0) + delta);
			}

			const fitb = isFitbType(item.questionSnapshot.type);
			if (fitb && change.textResponse !== undefined) {
				nextResponse.selectedOptions = change.textResponse ? [change.textResponse] : [];
			}

			const answerPresent = fitb
				? String(nextResponse.textResponse ?? nextResponse.selectedOptions[0] ?? '').trim().length > 0
				: (nextResponse.selectedOptions || []).length > 0;

			if (answerPresent && nextResponse.answeredAt === undefined) {
				nextResponse.answeredAt = now;
			}
			if (!answerPresent) {
				nextResponse.answeredAt = undefined;
			}
			nextResponse.lastChangedAt = now;
			nextResponse.changeCount = (nextResponse.changeCount ?? 0) + 1;

			await ctx.db.patch(item._id, {
				response: nextResponse,
				updatedAt: now
			});
		}

		const freshItems = (await ctx.db
			.query('quizAttemptItems')
			.withIndex('by_attempt_order', (q) => q.eq('attemptId', args.attemptId))
			.collect()) as Doc<'quizAttemptItems'>[];
		const counters = computeAttemptCounters(freshItems);

		await ctx.db.patch(attempt._id, {
			progressCounters: counters,
			lastActivityAt: now,
			elapsedMs:
				elapsedMsArg !== undefined ? Math.max(attempt.elapsedMs ?? 0, elapsedMsArg) : attempt.elapsedMs,
			updatedAt: now
		});

		return { ok: true, progressCounters: counters };
	}
});

export const heartbeatAttempt = mutation({
	args: {
		attemptId: v.id('quizAttempts'),
		elapsedMs: v.number()
	},
	handler: async (ctx, args) => {
		const user = await requireCurrentUser(ctx);
		const attempt = await requireAttemptOwner(ctx, user, args.attemptId);
		if (attempt.status !== 'in_progress') {
			return { ok: true, ignored: true };
		}

		const now = nowTs();
		await ctx.db.patch(attempt._id, {
			lastActivityAt: now,
			elapsedMs: Math.max(attempt.elapsedMs ?? 0, Math.max(0, clampInt(args.elapsedMs, 0, 7 * 24 * 60 * 60 * 1000))),
			updatedAt: now
		});
		return { ok: true };
	}
});

export const submitAttempt = mutation({
	args: {
		attemptId: v.id('quizAttempts'),
		elapsedMs: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const user = await requireCurrentUser(ctx);
		const attempt = await requireAttemptOwner(ctx, user, args.attemptId);
		if (attempt.status !== 'in_progress') {
			if (attempt.status === 'submitted' || attempt.status === 'timed_out') {
				return { alreadySubmitted: true, status: attempt.status };
			}
			throw new Error('Attempt is not submittable');
		}

		const now = nowTs();
		const elapsedMsSubmitted =
			args.elapsedMs !== undefined ? Math.max(0, clampInt(args.elapsedMs, 0, 7 * 24 * 60 * 60 * 1000)) : undefined;
		const effectiveElapsedMs = Math.max(
			attempt.elapsedMs ?? 0,
			elapsedMsSubmitted ?? 0,
			now - attempt.startedAt
		);
		const expiryAt = attempt.timeLimitSec ? attempt.startedAt + attempt.timeLimitSec * 1000 : undefined;
		const timedOut = expiryAt !== undefined && now >= expiryAt;

		const items = (await ctx.db
			.query('quizAttemptItems')
			.withIndex('by_attempt_order', (q) => q.eq('attemptId', args.attemptId))
			.collect()) as Doc<'quizAttemptItems'>[];

		let scoreEarned = 0;
		let scorePossible = 0;
		let correctCount = 0;
		let incorrectCount = 0;
		let unansweredCount = 0;

		const byType = new Map<
			string,
			{ questionType: string; total: number; correct: number; incorrect: number; unanswered: number }
		>();
		const byModule = new Map<
			Id<'module'>,
			{ moduleId: Id<'module'>; total: number; correct: number; incorrect: number; unanswered: number }
		>();

		for (const item of items) {
			const score = scoreAttemptItem(item);
			scoreEarned += score.pointsEarned;
			scorePossible += score.pointsPossible;
			if (score.unanswered) unansweredCount += 1;
			else if (score.isCorrect) correctCount += 1;
			else incorrectCount += 1;

			const typeKey = normalizeQuestionType(item.questionSnapshot.type);
			const typeAcc =
				byType.get(typeKey) ??
				{ questionType: typeKey, total: 0, correct: 0, incorrect: 0, unanswered: 0 };
			typeAcc.total += 1;
			if (score.unanswered) typeAcc.unanswered += 1;
			else if (score.isCorrect) typeAcc.correct += 1;
			else typeAcc.incorrect += 1;
			byType.set(typeKey, typeAcc);

			const moduleAcc =
				byModule.get(item.moduleId) ?? {
					moduleId: item.moduleId,
					total: 0,
					correct: 0,
					incorrect: 0,
					unanswered: 0
				};
			moduleAcc.total += 1;
			if (score.unanswered) moduleAcc.unanswered += 1;
			else if (score.isCorrect) moduleAcc.correct += 1;
			else moduleAcc.incorrect += 1;
			byModule.set(item.moduleId, moduleAcc);

			await ctx.db.patch(item._id, {
				score: {
					...item.score,
					isCorrect: score.isCorrect,
					pointsEarned: score.pointsEarned,
					pointsPossible: score.pointsPossible
				},
				updatedAt: now
			});
		}

		const pct = scorePossible > 0 ? Math.round((scoreEarned / scorePossible) * 100) : 0;
		const passThresholdPct = clampInt(attempt.configSnapshot.passThresholdPct, 0, 100);
		const moduleIds = Array.from(byModule.keys());
		const moduleDocs = await Promise.all(moduleIds.map((moduleId) => ctx.db.get(moduleId)));
		const moduleTitleMap = new Map(
			moduleDocs.filter(isModuleDoc).map((m) => [m._id, m.title])
		);

		const byModuleSummary = Array.from(byModule.values()).map((row) => ({
			moduleId: row.moduleId,
			moduleTitle: moduleTitleMap.get(row.moduleId) ?? 'Module',
			total: row.total,
			correct: row.correct,
			incorrect: row.incorrect,
			unanswered: row.unanswered,
			accuracyPct: row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0
		}));

		const byTypeSummary = Array.from(byType.values()).map((row) => ({
			questionType: row.questionType,
			total: row.total,
			correct: row.correct,
			incorrect: row.incorrect,
			unanswered: row.unanswered,
			accuracyPct: row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0
		}));

		const resultSummary = {
			scoreEarned,
			scorePossible,
			scorePct: pct,
			correctCount,
			incorrectCount,
			unansweredCount,
			passThresholdPct,
			passed: pct >= passThresholdPct,
			byModule: byModuleSummary.sort((a, b) => a.moduleTitle.localeCompare(b.moduleTitle)),
			byType: byTypeSummary.sort((a, b) => a.questionType.localeCompare(b.questionType)),
			reviewReady: true
		};

		const finalStatus: AttemptStatus = timedOut ? 'timed_out' : 'submitted';
		await ctx.db.patch(attempt._id, {
			status: finalStatus,
			submittedAt: now,
			timeExpiredAt: timedOut ? expiryAt : undefined,
			elapsedMs: effectiveElapsedMs,
			lastActivityAt: now,
			resultSummary,
			updatedAt: now
		});

		return {
			alreadySubmitted: false,
			status: finalStatus,
			resultSummary
		};
	}
});

export const getAttemptResults = query({
	args: { attemptId: v.id('quizAttempts') },
	handler: async (ctx, args) => {
		const user = await requireCurrentUser(ctx);
		const attempt = await requireAttemptOwner(ctx, user, args.attemptId);
		if (!(attempt.status === 'submitted' || attempt.status === 'timed_out')) {
			throw new Error('Results are not available yet');
		}

		const classDoc = (await ctx.db.get(attempt.classId)) as Doc<'class'> | null;
		const items = (await ctx.db
			.query('quizAttemptItems')
			.withIndex('by_attempt_order', (q) => q.eq('attemptId', args.attemptId))
			.collect()) as Doc<'quizAttemptItems'>[];

		const moduleIds = Array.from(new Set(items.map((item) => item.moduleId)));
		const moduleDocs = await Promise.all(moduleIds.map((moduleId) => ctx.db.get(moduleId)));
		const moduleTitleMap = new Map(
			moduleDocs.filter(isModuleDoc).map((m) => [m._id, { title: m.title, emoji: m.emoji }])
		);

		return {
			attempt: {
				_id: attempt._id,
				classId: attempt.classId,
					className: isClassDoc(classDoc) ? classDoc.name : 'Class',
				status: attempt.status,
				startedAt: attempt.startedAt,
				submittedAt: attempt.submittedAt,
				elapsedMs: attempt.elapsedMs,
				timeLimitSec: attempt.timeLimitSec,
				progressCounters: attempt.progressCounters,
				configSnapshot: attempt.configSnapshot,
				resultSummary: attempt.resultSummary
			},
			reviewItems: items.map((item) => {
				const orderedOptions =
					item.optionOrder && item.optionOrder.length > 0
						? item.optionOrder
								.map((id) => item.questionSnapshot.options.find((o) => o.id === id))
								.filter((o): o is { id: string; text: string } => Boolean(o))
						: item.questionSnapshot.options;

				return {
					_id: item._id,
					order: item.order,
					questionId: item.questionId,
					moduleId: item.moduleId,
					moduleTitle: moduleTitleMap.get(item.moduleId)?.title ?? 'Module',
					moduleEmoji: moduleTitleMap.get(item.moduleId)?.emoji,
					question: {
						type: item.questionSnapshot.type,
						stem: item.questionSnapshot.stem,
						options: orderedOptions,
						explanation: item.questionSnapshot.explanation ?? ''
					},
					response: item.response,
					score: item.score,
					correctAnswerDisplay: buildCorrectAnswerDisplay(item)
				};
			})
		};
	}
});

export const getUserAttemptsForClass = query({
	args: { classId: v.id('class') },
	handler: async (ctx, args) => {
		const user = await requireCurrentUser(ctx);
		await requireClassAccess(ctx, user, args.classId);

		const attempts = (await ctx.db
			.query('quizAttempts')
			.withIndex('by_user_class', (q) =>
				q.eq('userId', user._id).eq('classId', args.classId)
			)
			.collect()) as Doc<'quizAttempts'>[];

		return attempts
			.sort((a, b) => b.startedAt - a.startedAt)
			.map((attempt) => ({
				_id: attempt._id,
				status: attempt.status,
				startedAt: attempt.startedAt,
				submittedAt: attempt.submittedAt,
				elapsedMs: attempt.elapsedMs,
				timeLimitSec: attempt.timeLimitSec,
				progressCounters: attempt.progressCounters,
				configSnapshot: attempt.configSnapshot,
				resultSummary: attempt.resultSummary
			}));
	}
});

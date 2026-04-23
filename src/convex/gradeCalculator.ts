import { v } from 'convex/values';
import { authAdminMutation } from './authQueries';
import { internalMutation, query } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import {
	initialCourses,
	initialRulesets,
	type SeedCourse,
	type SeedRuleset
} from './gradeCalculatorCatalog';

const rulesetStatusValidator = v.union(
	v.literal('draft'),
	v.literal('active'),
	v.literal('archived')
);

const courseStatusValidator = v.union(
	v.literal('draft'),
	v.literal('active'),
	v.literal('archived')
);

const calculationModeValidator = v.union(
	v.literal('points'),
	v.literal('weighted'),
	v.literal('percentage'),
	v.literal('hybrid')
);

const roundingStrategyValidator = v.union(
	v.literal('none'),
	v.literal('nearest_hundredth'),
	v.literal('nearest_tenth'),
	v.literal('nearest_whole')
);

const gradeBandValidator = v.object({
	id: v.string(),
	label: v.string(),
	minPercentage: v.number(),
	maxPercentage: v.optional(v.number()),
	colorHint: v.optional(v.string())
});

const entryCategoryValidator = v.union(
	v.literal('assignment'),
	v.literal('quiz'),
	v.literal('exam'),
	v.literal('project'),
	v.literal('lab'),
	v.literal('attendance'),
	v.literal('participation'),
	v.literal('custom')
);

const entryInputTypeValidator = v.union(
	v.literal('points'),
	v.literal('percentage'),
	v.literal('attendance'),
	v.literal('pass_fail'),
	v.literal('letter')
);

const contributionTypeValidator = v.union(v.literal('standard'), v.literal('bonus'));

const entryAggregationValidator = v.union(
	v.literal('single'),
	v.literal('set'),
	v.literal('running_total')
);

const replacementConditionValidator = v.union(v.literal('if_higher'), v.literal('always'));

const courseEntryValidator = v.object({
	id: v.string(),
	slug: v.string(),
	name: v.string(),
	shortLabel: v.optional(v.string()),
	category: entryCategoryValidator,
	inputType: entryInputTypeValidator,
	contributionType: v.optional(contributionTypeValidator),
	aggregation: entryAggregationValidator,
	weight: v.optional(v.number()),
	pointsPossible: v.optional(v.number()),
	quantity: v.optional(v.number()),
	instancePoints: v.optional(v.array(v.number())),
	instanceLabels: v.optional(v.array(v.string())),
	instances: v.optional(
		v.array(
			v.object({
				id: v.string(),
				label: v.string(),
				pointsPossible: v.optional(v.number()),
				note: v.optional(v.string())
			})
		)
	),
	dropLowestCount: v.optional(v.number()),
	required: v.boolean(),
	rules: v.optional(
		v.object({
			replacementSourceEntryIds: v.optional(v.array(v.string())),
			replacementCondition: v.optional(replacementConditionValidator),
			bonusTargetEntryId: v.optional(v.string()),
			bonusCap: v.optional(v.number()),
			attendanceValuePerSession: v.optional(v.number()),
			notes: v.optional(v.string())
		})
	),
	metadata: v.optional(v.object({}))
});

type RulesetDoc = Doc<'gradeCalculatorRulesets'>;
type CourseDoc = Doc<'gradeCalculatorCourses'>;

function slugify(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);
}

async function ensureUniqueSlug(
	ctx: { db: any },
	table: 'gradeCalculatorRulesets' | 'gradeCalculatorCourses',
	name: string
) {
	const baseSlug = slugify(name) || 'untitled';
	let candidate = baseSlug;
	let counter = 2;

	while (true) {
		const existing = await ctx.db
			.query(table)
			.withIndex('by_slug', (q: any) => q.eq('slug', candidate))
			.first();

		if (!existing || existing.deletedAt) {
			return candidate;
		}

		candidate = `${baseSlug}-${counter}`;
		counter += 1;
	}
}

function sanitizeOptionalText(value?: string) {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

function normalizeEntries(entries: SeedCourse['entries']) {
	return entries.map((entry) => ({
		...entry,
		contributionType: entry.contributionType ?? 'standard',
		metadata: {}
	}));
}

function getTrackedItemCount(entry: {
	quantity?: number;
	instanceLabels?: string[];
	instancePoints?: number[];
	instances?: Array<{ id: string }>;
}) {
	if (entry.instances && entry.instances.length > 0) return entry.instances.length;
	if (entry.quantity) return entry.quantity;
	if (entry.instanceLabels && entry.instanceLabels.length > 0) return entry.instanceLabels.length;
	if (entry.instancePoints && entry.instancePoints.length > 0) return entry.instancePoints.length;
	return 1;
}

function summarizeCourse(course: CourseDoc, ruleset: RulesetDoc | null) {
	return {
		_id: course._id,
		name: course.name,
		slug: course.slug,
		code: course.code ?? null,
		description: course.description ?? null,
		institution: course.institution ?? null,
		sourceDocument: course.sourceDocument ?? null,
		status: course.status,
		termLabel: course.termLabel ?? null,
		instructor: course.instructor ?? null,
		entryCount: course.entryCount,
		trackedItemCount: course.entries.reduce((sum, entry) => sum + getTrackedItemCount(entry), 0),
		entries: course.entries,
		ruleset: ruleset
			? {
					_id: ruleset._id,
					name: ruleset.name,
					slug: ruleset.slug,
					calculationMode: ruleset.calculationMode,
					status: ruleset.status,
					roundingStrategy: ruleset.roundingStrategy,
					passingPercentage: ruleset.passingPercentage ?? null,
					gradeBands: ruleset.gradeBands,
					policies: ruleset.policies
				}
			: null
	};
}

function buildRulesetWrite(definition: SeedRuleset) {
	return {
		name: definition.name,
		slug: definition.slug,
		description: definition.description,
		status: definition.status,
		calculationMode: definition.calculationMode,
		roundingStrategy: definition.roundingStrategy,
		gradeBands: definition.gradeBands,
		policies: definition.policies,
		metadata: {},
		updatedAt: Date.now(),
		...(definition.passingPercentage !== undefined
			? { passingPercentage: definition.passingPercentage }
			: {})
	};
}

function buildCourseWrite(
	definition: SeedCourse,
	rulesetId: Id<'gradeCalculatorRulesets'> | undefined
) {
	const entries = normalizeEntries(definition.entries);

	return {
		name: definition.name,
		slug: slugify(definition.name),
		code: definition.code,
		sourceDocument: definition.sourceDocument,
		description: definition.description,
		institution: definition.institution,
		termLabel: definition.termLabel,
		status: definition.status,
		entryCount: entries.length,
		entries,
		metadata: {},
		updatedAt: Date.now(),
		...(rulesetId ? { rulesetId } : {})
	};
}

async function upsertRulesetBySeed(ctx: { db: any }, definition: SeedRuleset) {
	const existing = await ctx.db
		.query('gradeCalculatorRulesets')
		.withIndex('by_slug', (q: any) => q.eq('slug', definition.slug))
		.first();

	const payload = buildRulesetWrite(definition);
	if (existing && !existing.deletedAt) {
		await ctx.db.patch(existing._id, payload);
		return existing._id as Id<'gradeCalculatorRulesets'>;
	}

	return (await ctx.db.insert('gradeCalculatorRulesets', payload)) as Id<'gradeCalculatorRulesets'>;
}

async function upsertCourseBySeed(
	ctx: { db: any },
	definition: SeedCourse,
	rulesetId: Id<'gradeCalculatorRulesets'> | undefined
) {
	const existingCourses = await ctx.db.query('gradeCalculatorCourses').collect();
	const slug = slugify(definition.name);
	const existing = existingCourses.find(
		(course: CourseDoc) =>
			!course.deletedAt && (course.code === definition.code || course.slug === slug)
	);

	const payload = buildCourseWrite(definition, rulesetId);
	if (existing) {
		await ctx.db.patch(existing._id, payload);
		return existing._id as Id<'gradeCalculatorCourses'>;
	}

	return (await ctx.db.insert('gradeCalculatorCourses', payload)) as Id<'gradeCalculatorCourses'>;
}

async function seedInitialCatalog(ctx: { db: any }) {
	const rulesetIdsBySlug = new Map<string, Id<'gradeCalculatorRulesets'>>();

	for (const ruleset of initialRulesets) {
		const rulesetId = await upsertRulesetBySeed(ctx, ruleset);
		rulesetIdsBySlug.set(ruleset.slug, rulesetId);
	}

	const courseIds: Id<'gradeCalculatorCourses'>[] = [];
	for (const course of initialCourses) {
		const courseId = await upsertCourseBySeed(
			ctx,
			course,
			rulesetIdsBySlug.get(course.rulesetSlug)
		);
		courseIds.push(courseId);
	}

	return {
		rulesetCount: rulesetIdsBySlug.size,
		courseCount: courseIds.length,
		entryCount: initialCourses.reduce((sum, course) => sum + course.entries.length, 0),
		trackedItemCount: initialCourses.reduce(
			(sum, course) =>
				sum +
				course.entries.reduce((courseSum, entry) => courseSum + getTrackedItemCount(entry), 0),
			0
		)
	};
}

export const getScaffoldOverview = query({
	args: {},
	handler: async (ctx) => {
		const [rulesets, courses] = await Promise.all([
			ctx.db.query('gradeCalculatorRulesets').collect(),
			ctx.db.query('gradeCalculatorCourses').collect()
		]);

		const activeRulesets = rulesets.filter((ruleset) => !ruleset.deletedAt);
		const activeCourses = courses.filter((course) => !course.deletedAt);
		const rulesetsById = new Map(activeRulesets.map((ruleset) => [ruleset._id, ruleset]));

		return {
			stats: {
				rulesetCount: activeRulesets.length,
				courseCount: activeCourses.length,
				entryCount: activeCourses.reduce((sum, course) => sum + course.entryCount, 0),
				trackedItemCount: activeCourses.reduce(
					(sum, course) =>
						sum +
						course.entries.reduce((courseSum, entry) => courseSum + getTrackedItemCount(entry), 0),
					0
				)
			},
			rulesets: activeRulesets
				.sort((a, b) => b.updatedAt - a.updatedAt)
				.map((ruleset) => ({
					_id: ruleset._id,
					name: ruleset.name,
					slug: ruleset.slug,
					status: ruleset.status,
					calculationMode: ruleset.calculationMode,
					roundingStrategy: ruleset.roundingStrategy,
					gradeBandCount: ruleset.gradeBands.length,
					passingPercentage: ruleset.passingPercentage ?? null
				})),
			courses: activeCourses
				.sort((a, b) => b.updatedAt - a.updatedAt)
				.map((course) =>
					summarizeCourse(
						course,
						course.rulesetId ? (rulesetsById.get(course.rulesetId) ?? null) : null
					)
				)
		};
	}
});

export const createRulesetDraft = authAdminMutation({
	args: {
		name: v.string(),
		description: v.optional(v.string()),
		calculationMode: v.optional(calculationModeValidator),
		roundingStrategy: v.optional(roundingStrategyValidator),
		passingPercentage: v.optional(v.number()),
		status: v.optional(rulesetStatusValidator),
		gradeBands: v.optional(v.array(gradeBandValidator))
	},
	handler: async (ctx, args) => {
		const name = args.name.trim();
		if (!name) {
			throw new Error('Ruleset name is required');
		}

		const slug = await ensureUniqueSlug(ctx, 'gradeCalculatorRulesets', name);
		const now = Date.now();

		const id = await ctx.db.insert('gradeCalculatorRulesets', {
			name,
			slug,
			status: args.status ?? 'draft',
			calculationMode: args.calculationMode ?? 'points',
			roundingStrategy: args.roundingStrategy ?? 'nearest_hundredth',
			gradeBands: args.gradeBands ?? [
				{ id: 'a', label: 'A', minPercentage: 90, colorHint: 'success' },
				{ id: 'b', label: 'B', minPercentage: 80, maxPercentage: 89.99, colorHint: 'info' },
				{ id: 'c', label: 'C', minPercentage: 70, maxPercentage: 79.99, colorHint: 'warning' },
				{ id: 'f', label: 'F', minPercentage: 0, maxPercentage: 69.99, colorHint: 'error' }
			],
			policies: {
				allowAttendance: true,
				allowBonus: true,
				allowDrops: true,
				allowReplacements: true
			},
			metadata: {},
			updatedAt: now,
			...(sanitizeOptionalText(args.description)
				? { description: sanitizeOptionalText(args.description) }
				: {}),
			...(args.passingPercentage !== undefined ? { passingPercentage: args.passingPercentage } : {})
		});

		return id;
	}
});

export const createCourseDraft = authAdminMutation({
	args: {
		name: v.string(),
		code: v.optional(v.string()),
		sourceDocument: v.optional(v.string()),
		description: v.optional(v.string()),
		institution: v.optional(v.string()),
		termLabel: v.optional(v.string()),
		instructor: v.optional(v.string()),
		status: v.optional(courseStatusValidator),
		rulesetId: v.optional(v.id('gradeCalculatorRulesets')),
		entries: v.optional(v.array(courseEntryValidator))
	},
	handler: async (ctx, args) => {
		const name = args.name.trim();
		if (!name) {
			throw new Error('Course name is required');
		}

		if (args.rulesetId) {
			const ruleset = await ctx.db.get(args.rulesetId);
			if (!ruleset || ruleset.deletedAt) {
				throw new Error('Ruleset not found');
			}
		}

		const entries = (args.entries ?? []).map((entry) => ({
			...entry,
			contributionType: entry.contributionType ?? 'standard',
			metadata: entry.metadata ?? {}
		}));
		const slug = await ensureUniqueSlug(ctx, 'gradeCalculatorCourses', name);
		const now = Date.now();

		const id = await ctx.db.insert('gradeCalculatorCourses', {
			name,
			slug,
			status: args.status ?? 'draft',
			entryCount: entries.length,
			entries,
			metadata: {},
			updatedAt: now,
			...(sanitizeOptionalText(args.code) ? { code: sanitizeOptionalText(args.code) } : {}),
			...(sanitizeOptionalText(args.sourceDocument)
				? { sourceDocument: sanitizeOptionalText(args.sourceDocument) }
				: {}),
			...(sanitizeOptionalText(args.description)
				? { description: sanitizeOptionalText(args.description) }
				: {}),
			...(sanitizeOptionalText(args.institution)
				? { institution: sanitizeOptionalText(args.institution) }
				: {}),
			...(sanitizeOptionalText(args.termLabel)
				? { termLabel: sanitizeOptionalText(args.termLabel) }
				: {}),
			...(sanitizeOptionalText(args.instructor)
				? { instructor: sanitizeOptionalText(args.instructor) }
				: {}),
			...(args.rulesetId ? { rulesetId: args.rulesetId } : {})
		});

		return id;
	}
});

export const addCourseEntryDraft = authAdminMutation({
	args: {
		courseId: v.id('gradeCalculatorCourses'),
		entry: courseEntryValidator
	},
	handler: async (ctx, args) => {
		const course = await ctx.db.get(args.courseId);
		if (!course || course.deletedAt) {
			throw new Error('Course not found');
		}

		const nextEntries = [
			...course.entries,
			{
				...args.entry,
				contributionType: args.entry.contributionType ?? 'standard',
				metadata: args.entry.metadata ?? {}
			}
		];
		await ctx.db.patch(args.courseId, {
			entries: nextEntries,
			entryCount: nextEntries.length,
			updatedAt: Date.now()
		});

		return {
			courseId: args.courseId as Id<'gradeCalculatorCourses'>,
			entryCount: nextEntries.length
		};
	}
});

export const seedInitialCatalogDrafts = authAdminMutation({
	args: {},
	handler: async (ctx) => {
		return await seedInitialCatalog(ctx);
	}
});

export const seedInitialCatalogInternal = internalMutation({
	args: {},
	handler: async (ctx) => {
		return await seedInitialCatalog(ctx);
	}
});

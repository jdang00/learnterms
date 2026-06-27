import { v } from 'convex/values';
import { action, internalQuery, mutation } from './_generated/server';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { authAdminMutation, authAdminQuery, authQuery } from './authQueries';

const quickLinkValidator = v.object({
	title: v.string(),
	description: v.string(),
	href: v.string(),
	icon: v.string()
});

type QuickLink = {
	title: string;
	description: string;
	href: string;
	icon: string;
};

type AuthedCtx = {
	db: QueryCtx['db'] | MutationCtx['db'];
	identity: { subject: string };
};

const PRIVILEGED_QUICK_LINKS: QuickLink[] = [
	{
		title: 'Admin Dashboard',
		description: 'Manage classes and settings',
		href: '/admin',
		icon: '✏️'
	},
	{
		title: 'Content Library',
		description: 'Organize notes, docs, and lectures',
		href: '/admin/library',
		icon: '📚'
	},
	{
		title: 'Question Studio',
		description: 'AI-powered question generation',
		href: '/admin/question-studio',
		icon: '✨'
	},
	{
		title: 'Class Progress',
		description: 'Track student performance',
		href: '/admin/progress',
		icon: '📊'
	},
	{
		title: 'Landing Page',
		description: 'Open the internal landing view',
		href: '/landing',
		icon: '🚀'
	}
];

const STUDENT_QUICK_LINKS: QuickLink[] = [
	{
		title: 'My Dashboard',
		description: 'Your classes and modules',
		href: '/classes',
		icon: '🏠'
	}
];

const DEFAULT_COHORT_QUICK_LINKS: QuickLink[] = [
	{
		title: 'Class Activity',
		description: 'See classmate badges and stats',
		href: '/cohort',
		icon: '🏅'
	},
	{
		title: 'Clinic',
		description: 'Open the LearnTerms clinic portal',
		href: 'https://clinic.learnterms.com/',
		icon: '🏥'
	},
	{
		title: 'Eyegnosis',
		description: 'Play the optometric puzzle game',
		href: 'https://clinic.learnterms.com/eyegnosis',
		icon: '🧩'
	}
];

async function getCurrentUser(ctx: AuthedCtx) {
	return await ctx.db
		.query('users')
		.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', ctx.identity.subject))
		.first();
}

function cloneQuickLinks(links: QuickLink[]) {
	return links.map((link) => ({ ...link }));
}

function normalizeQuickLinks(links: QuickLink[]) {
	if (links.length > 12) {
		throw new Error('Quick links cannot exceed 12 items');
	}

	return links.map((link) => {
		const title = link.title.trim();
		const description = link.description.trim();
		const href = link.href.trim();
		const icon = link.icon.trim();

		if (!title) throw new Error('Each quick link needs a title');
		if (title.length > 60) throw new Error('Quick link titles must be 60 characters or less');
		if (description.length > 120) {
			throw new Error('Quick link descriptions must be 120 characters or less');
		}
		if (!href) throw new Error('Each quick link needs a destination');
		if (href.length > 240) throw new Error('Quick link destinations must be 240 characters or less');
		const isInternalPath = href.startsWith('/') && !href.startsWith('//');
		if (!isInternalPath && !href.startsWith('https://') && !href.startsWith('http://')) {
			throw new Error('Quick link destinations must be an internal path or an http(s) URL');
		}
		if (!icon) throw new Error('Each quick link needs an icon');
		if (icon.length > 12) throw new Error('Quick link icons must be 12 characters or less');

		return { title, description, href, icon };
	});
}

function getCohortQuickLinks(cohort: Doc<'cohort'> | null) {
	return cohort?.quickLinks ? cloneQuickLinks(cohort.quickLinks) : cloneQuickLinks(DEFAULT_COHORT_QUICK_LINKS);
}

function assertCanManageCohort(user: Doc<'users'> | null, cohortId: Id<'cohort'>) {
	if (!user || !(user.role === 'dev' || user.role === 'admin')) {
		throw new Error('Unauthorized');
	}
	if (user.role === 'admin' && user.cohortId !== cohortId) {
		throw new Error('Unauthorized');
	}
}

export const validateCohortCode = action({
	args: { code: v.string() },
	handler: async (ctx, args): Promise<{ cohort: Doc<'cohort'>; school: Doc<'school'> }> => {
		const cohort = await ctx.runQuery(internal.cohort.cohortCheck, { code: args.code });
		if (!cohort) throw new Error('Invalid code');

		const school = await ctx.runQuery(internal.school.getSchoolByIdInternal, {
			id: cohort.schoolId
		});
		if (!school) throw new Error('School not found');

		return { cohort, school };
	}
});

export const joinCohort = mutation({
	args: {
		clerkUserId: v.string(),
		cohortId: v.id('cohort')
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.filter((q) => q.eq(q.field('clerkUserId'), args.clerkUserId))
			.first();

		if (!user) {
			throw new Error('User not found');
		}

		await ctx.db.patch(user._id, {
			cohortId: args.cohortId,
			updatedAt: Date.now()
		});

		return { success: true };
	}
});

export const cohortCheck = internalQuery({
	args: { code: v.string() },
	handler: async (ctx, args) => {
		const matchingCohort = ctx.db
			.query('cohort')
			.filter((q) => q.eq(q.field('classCode'), args.code))
			.unique();

		return matchingCohort;
	}
});

export const createCohort = mutation({
	args: {
		name: v.string(),
		description: v.optional(v.string()),
		metadata: v.object({}),
		updatedAt: v.number(),
		schoolId: v.id('school'),
		startYear: v.string(),
		endYear: v.string(),
		classCode: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const id = await ctx.db.insert('cohort', args);
		return id;
	}
});

export const deleteCohort = mutation({
	args: {
		cohortId: v.id('cohort')
	},
	handler: async (ctx, args) => {
		await ctx.db.delete(args.cohortId);
		return { deleted: true };
	}
});

export const getCurrentUserQuickLinks = authQuery({
	args: {},
	handler: async (ctx) => {
		const user = await getCurrentUser(ctx);
		if (!user) return [];

		const links: QuickLink[] =
			user.role === 'dev' || user.role === 'admin' || user.role === 'curator'
				? cloneQuickLinks(PRIVILEGED_QUICK_LINKS)
				: cloneQuickLinks(STUDENT_QUICK_LINKS);

		if (user.cohortId) {
			const cohort = await ctx.db.get(user.cohortId);
			links.push(...getCohortQuickLinks(cohort));
		}

		return links;
	}
});

export const getQuickLinksForCohortAdmin = authAdminQuery({
	args: {
		cohortId: v.id('cohort')
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		assertCanManageCohort(user, args.cohortId);

		const cohort = await ctx.db.get(args.cohortId);
		if (!cohort || cohort.deletedAt) throw new Error('Cohort not found');

		return {
			links: getCohortQuickLinks(cohort),
			defaultLinks: cloneQuickLinks(DEFAULT_COHORT_QUICK_LINKS),
			isCustomized: Boolean(cohort.quickLinks)
		};
	}
});

export const updateQuickLinksForCohort = authAdminMutation({
	args: {
		cohortId: v.id('cohort'),
		quickLinks: v.array(quickLinkValidator)
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		assertCanManageCohort(user, args.cohortId);

		const cohort = await ctx.db.get(args.cohortId);
		if (!cohort || cohort.deletedAt) throw new Error('Cohort not found');

		await ctx.db.patch(args.cohortId, {
			quickLinks: normalizeQuickLinks(args.quickLinks),
			updatedAt: Date.now()
		});

		return { success: true };
	}
});

export const listCohortsWithSchools = authQuery({
	args: {},
	handler: async (ctx) => {
		// Get user's role from Convex database
		const user = await ctx.db
			.query('users')
			.withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', ctx.identity.subject))
			.first();

		if (!user || user.role !== 'dev') throw new Error('Unauthorized');

		const cohorts = await ctx.db.query('cohort').collect();
		const result = await Promise.all(
			cohorts.map(async (cohort) => {
				const school = await ctx.db.get(cohort.schoolId);
				return {
					_id: cohort._id,
					name: cohort.name,
					schoolName: school?.name ?? '',
					startYear: cohort.startYear,
					endYear: cohort.endYear,
					classCode: cohort.classCode,
					stats: cohort.stats
				};
			})
		);
		return result;
	}
});

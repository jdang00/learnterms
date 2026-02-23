import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import type { Doc } from './_generated/dataModel';

type AnnouncementFeature = {
	title: string;
	description: string;
	icon: string;
	href?: string;
	hint?: string;
};

type Announcement = {
	id: string;
	title: string;
	eyebrow: string;
	description: string;
	features: AnnouncementFeature[];
	ctaLabel: string;
	ctaHref?: string;
	active: boolean;
};

const ANNOUNCEMENTS: Announcement[] = [
	{
		id: '2026-02-classes-dashboard-refresh-tests',
		eyebrow: 'New in LearnTerms',
		title: 'A faster dashboard + custom test mode',
		description:
			'Your classes experience was refreshed to help you resume faster, track activity, and build timed scored tests from modules in a class.',
		features: [
			{
				title: 'New dashboard design',
				description: 'Cleaner class browsing with updated cards, navigation, and faster entry points.',
				icon: 'sparkles'
			},
			{
				title: 'Pick up where you left off',
				description: 'Resume recent module work from the dashboard without digging through classes.',
				icon: 'history'
			},
			{
				title: 'Class activity',
				description: 'Jump to cohort activity to see badges, progress, and what is happening in class.',
				icon: 'users',
				href: '/cohort'
			},
			{
				title: 'Build your own test',
				description: 'Create timed, scored practice tests from class modules and review results afterward.',
				icon: 'clipboard'
			}
		],
		ctaLabel: 'See My Classes',
		ctaHref: '/classes',
		active: true
	}
];

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

function getCurrentActiveAnnouncement(): Announcement | null {
	return ANNOUNCEMENTS.find((a) => a.active) ?? null;
}

export const getCurrentForViewer = query({
	args: {},
	handler: async (ctx) => {
		const user = await requireCurrentUser(ctx);
		const current = getCurrentActiveAnnouncement();
		if (!current) return null;

		const seenIds = new Set(user.seenFeatureAnnouncementIds ?? []);
		if (seenIds.has(current.id)) return null;

		return current;
	}
});

export const markSeen = mutation({
	args: {
		announcementId: v.string()
	},
	handler: async (ctx, args) => {
		const user = await requireCurrentUser(ctx);
		const current = ANNOUNCEMENTS.find((a) => a.id === args.announcementId);
		if (!current) throw new Error('Announcement not found');

		const seenIds = Array.from(new Set([...(user.seenFeatureAnnouncementIds ?? []), args.announcementId]));
		await ctx.db.patch(user._id, {
			seenFeatureAnnouncementIds: seenIds,
			updatedAt: Date.now()
		});

		return { ok: true };
	}
});
type ConvexCtx = QueryCtx | MutationCtx;


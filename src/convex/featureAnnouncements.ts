import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireCurrentUser } from './access';

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
		id: '2026-09-study-tools-admin-workspaces',
		eyebrow: 'New in LearnTerms',
		title: 'Custom quiz dock + progress updates',
		description: 'Updates to quiz tools, progress, and admin pages.',
		features: [
			{
				title: 'Custom quiz dock',
				description:
					'Reorder tools, choose a preset, and move less-used actions into the overflow menu.',
				icon: 'layout'
			},
			{
				title: 'Module progress',
				description: 'See answered, correct, and mastered questions, plus what needs review.',
				icon: 'clipboard'
			},
			{
				title: 'Question highlighting',
				description: 'Highlight question text. Your highlights are saved for later.',
				icon: 'sparkles'
			},
			{
				title: 'Admin progress pages',
				description:
					'View live class activity and drill into modules, students, and question results.',
				icon: 'users'
			},
			{
				title: 'Question Studio',
				description:
					'Choose topics and question types from uploads. Review drafts and source citations before saving.',
				icon: 'sparkles'
			}
		],
		ctaLabel: 'See My Classes',
		ctaHref: '/classes',
		active: true
	},
	{
		id: '2026-02-classes-dashboard-refresh-tests',
		eyebrow: 'New in LearnTerms',
		title: 'A faster dashboard + custom test mode',
		description:
			'Your classes experience was refreshed to help you resume faster, track activity, and build timed scored tests from modules in a class.',
		features: [
			{
				title: 'New dashboard design',
				description:
					'Cleaner class browsing with updated cards, navigation, and faster entry points.',
				icon: 'sparkles'
			},
			{
				title: 'Pick up where you left off',
				description:
					'Resume recent module work from the dashboard without digging through classes.',
				icon: 'history'
			},
			{
				title: 'Class activity',
				description:
					'Jump to cohort activity to see badges, progress, and what is happening in class.',
				icon: 'users',
				href: '/cohort'
			},
			{
				title: 'Build your own test',
				description:
					'Create timed, scored practice tests from class modules and review results afterward.',
				icon: 'clipboard'
			}
		],
		ctaLabel: 'See My Classes',
		ctaHref: '/classes',
		active: false
	}
];

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

		const seenIds = Array.from(
			new Set([...(user.seenFeatureAnnouncementIds ?? []), args.announcementId])
		);
		await ctx.db.patch(user._id, {
			seenFeatureAnnouncementIds: seenIds,
			updatedAt: Date.now()
		});

		return { ok: true };
	}
});

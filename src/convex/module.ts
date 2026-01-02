import { authQuery, authAdminMutation } from './authQueries';
import { mutation } from './_generated/server';
import { v } from 'convex/values';

type TagSummary = { _id: string; name: string; color?: string };

function containsOnlyEmoji(input: string): boolean {
	const allowedJoiners = new Set(['\u200d', '\ufe0f']);
	for (const ch of Array.from(input)) {
		if (allowedJoiners.has(ch)) continue;
		if (!/\p{Extended_Pictographic}/u.test(ch)) return false;
	}
	return true;
}

async function attachTagsForModules(ctx: { db: any }, classId: string, modules: any[]) {
	if (modules.length === 0) return modules;

	try {
		const moduleIdSet = new Set(modules.map((module) => module._id));
		const links = await ctx.db
			.query('moduleTags')
			.withIndex('by_classId', (q: any) => q.eq('classId', classId))
			.collect();

		const filteredLinks = links.filter((link: any) => moduleIdSet.has(link.moduleId));
		const tagIdSet = new Set(filteredLinks.map((link: any) => link.tagId));
		const tags = await Promise.all(Array.from(tagIdSet).map((id) => ctx.db.get(id)));

		const tagMap = new Map<string, TagSummary>();
		for (const tag of tags) {
			if (tag && !tag.deletedAt && tag.classId === classId) {
				tagMap.set(tag._id, { _id: tag._id, name: tag.name, color: tag.color });
			}
		}

		const tagsByModule = new Map<string, TagSummary[]>();
		for (const link of filteredLinks) {
			const tag = tagMap.get(link.tagId);
			if (!tag) continue;
			const existing = tagsByModule.get(link.moduleId) || [];
			existing.push(tag);
			tagsByModule.set(link.moduleId, existing);
		}

		return modules.map((module) => {
			const tags = tagsByModule.get(module._id) || [];
			tags.sort((a, b) => a.name.localeCompare(b.name));
			return { ...module, tags };
		});
	} catch {
		return modules.map((module) => ({ ...module, tags: [] }));
	}
}

export const getClassModules = authQuery({
	// Enter class ID
	args: { id: v.id('class') },
	handler: async (ctx, args) => {
		const modules = await ctx.db
			.query('module')
			.withIndex('by_classId', (q) => q.eq('classId', args.id))
			.filter((q) => q.eq(q.field('status'), 'published'))
			.collect();

		// Include questionCount for user-facing display
		const modulesWithCounts = modules.map((module) => ({
			...module,
			questionCount: module.questionCount ?? 0
		}));

		const sorted = modulesWithCounts.sort((a, b) => a.order - b.order);
		return await attachTagsForModules(ctx, args.id, sorted);
	}
});

export const getAdminModule = authQuery({
	// Enter class ID
	args: { id: v.id('class') },
	handler: async (ctx, args) => {
		const modules = await ctx.db
			.query('module')
			.withIndex('by_classId', (q) => q.eq('classId', args.id))
			.collect();

		return modules.sort((a, b) => a.order - b.order);
	}
});

export const getModuleById = authQuery({
	args: { id: v.id('module') },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	}
});

export const getModuleQuestionCount = authQuery({
	args: { moduleId: v.id('module') },
	handler: async (ctx, args) => {
		const module = await ctx.db.get(args.moduleId);
		return module?.questionCount ?? 0;
	}
});

export const getAdminModulesWithQuestionCounts = authQuery({
	args: { classId: v.id('class') },
	handler: async (ctx, args) => {
		const modules = await ctx.db
			.query('module')
			.withIndex('by_classId', (q) => q.eq('classId', args.classId))
			.collect();

		// Use stored questionCount field (falls back to 0 for unbackfilled modules)
		const modulesWithCounts = modules.map((module) => ({
			...module,
			questionCount: module.questionCount ?? 0
		}));

		const sorted = modulesWithCounts.sort((a, b) => a.order - b.order);
		return await attachTagsForModules(ctx, args.classId, sorted);
	}
});

export const updateModuleOrder = authAdminMutation({
	args: {
		moduleId: v.id('module'),
		newOrder: v.number(),
		classId: v.id('class')
	},
	handler: async (ctx, args) => {
		const allModules = await ctx.db
			.query('module')
			.withIndex('by_classId', (q) => q.eq('classId', args.classId))
			.collect();

		// Sort modules by their current order to get the correct sequence
		allModules.sort((a, b) => a.order - b.order);

		const movedModule = allModules.find((m) => m._id === args.moduleId);
		if (!movedModule) return;

		// Find the current position of the moved module in the sorted array
		const oldIndex = allModules.findIndex((m) => m._id === args.moduleId);
		const newIndex = args.newOrder;

		// Remove the moved module from its current position
		allModules.splice(oldIndex, 1);
		// Insert it at the new position
		allModules.splice(newIndex, 0, movedModule);

		// Update all modules with their new order based on their position in the array
		for (let i = 0; i < allModules.length; i++) {
			await ctx.db.patch(allModules[i]._id, { order: i });
		}
	}
});

export const insertModule = authAdminMutation({
	args: {
		title: v.string(),
		emoji: v.optional(v.string()),
		description: v.string(),
		status: v.string(),
		classId: v.id('class'),
		order: v.number(),
		metadata: v.object({}),
		updatedAt: v.number()
	},
	handler: async (ctx, args) => {
		const trimmedTitle = args.title.trim();
		const trimmedEmoji = args.emoji?.trim();
		const trimmedDescription = args.description.trim();
		const trimmedStatus = args.status.trim().toLowerCase();

		if (!trimmedTitle) {
			throw new Error('Module title is required and cannot be empty');
		}
		if (!trimmedDescription) {
			throw new Error('Module description is required and cannot be empty');
		}

		if (trimmedTitle.length < 2) {
			throw new Error('Module title must be at least 2 characters long');
		}
		if (trimmedTitle.length > 100) {
			throw new Error('Module title cannot exceed 100 characters');
		}
		if (trimmedDescription.length < 10) {
			throw new Error('Module description must be at least 10 characters long');
		}
		if (trimmedDescription.length > 500) {
			throw new Error('Module description cannot exceed 500 characters');
		}

		if (trimmedEmoji != null && trimmedEmoji.length > 0) {
			const emojiCharCount = Array.from(trimmedEmoji).length;
			if (emojiCharCount > 8) {
				throw new Error('Emoji must be at most 8 characters');
			}
			if (!containsOnlyEmoji(trimmedEmoji)) {
				throw new Error('Please enter only emoji characters');
			}
		}

		const validStatuses = ['draft', 'published', 'archived'];
		if (!validStatuses.includes(trimmedStatus)) {
			throw new Error('Module status must be draft, published, or archived');
		}

		const existingModules = await ctx.db
			.query('module')
			.withIndex('by_classId', (q) => q.eq('classId', args.classId))
			.collect();

		const titleExists = existingModules.some(
			(existingModule) => existingModule.title.toLowerCase() === trimmedTitle.toLowerCase()
		);
		if (titleExists) {
			throw new Error('A module with this title already exists in this class');
		}

		const id = await ctx.db.insert('module', {
			...args,
			title: trimmedTitle,
			emoji: trimmedEmoji,
			description: trimmedDescription,
			status: trimmedStatus
		});
		return id;
	}
});

export const deleteModule = authAdminMutation({
	args: {
		moduleId: v.id('module'),
		classId: v.id('class')
	},
	handler: async (ctx, args) => {
		const moduleToDelete = await ctx.db.get(args.moduleId);
		if (!moduleToDelete || moduleToDelete.classId !== args.classId) {
			throw new Error('Module not found or access denied');
		}

		const questions = await ctx.db
			.query('question')
			.withIndex('by_moduleId', (q) => q.eq('moduleId', args.moduleId))
			.collect();

		for (const question of questions) {
			await ctx.db.delete(question._id);
		}

		const moduleTags = await ctx.db
			.query('moduleTags')
			.withIndex('by_moduleId', (q) => q.eq('moduleId', args.moduleId))
			.collect();
		for (const link of moduleTags) {
			await ctx.db.delete(link._id);
		}

		await ctx.db.delete(args.moduleId);
		return { deleted: true, questionsDeleted: questions.length };
	}
});

export const updateModule = authAdminMutation({
	args: {
		moduleId: v.id('module'),
		classId: v.id('class'),
		title: v.string(),
		emoji: v.optional(v.string()),
		description: v.string(),
		status: v.string()
	},
	handler: async (ctx, args) => {
		const moduleToUpdate = await ctx.db.get(args.moduleId);
		if (!moduleToUpdate || moduleToUpdate.classId !== args.classId) {
			throw new Error('Module not found or access denied');
		}

		const trimmedTitle = args.title.trim();
		const trimmedEmoji = args.emoji?.trim();
		const trimmedDescription = args.description.trim();
		const trimmedStatus = args.status.trim().toLowerCase();

		if (!trimmedTitle) {
			throw new Error('Module title is required and cannot be empty');
		}
		if (!trimmedDescription) {
			throw new Error('Module description is required and cannot be empty');
		}

		if (trimmedTitle.length < 2) {
			throw new Error('Module title must be at least 2 characters long');
		}
		if (trimmedTitle.length > 100) {
			throw new Error('Module title cannot exceed 100 characters');
		}
		if (trimmedDescription.length < 10) {
			throw new Error('Module description must be at least 10 characters long');
		}
		if (trimmedDescription.length > 500) {
			throw new Error('Module description cannot exceed 500 characters');
		}

		if (trimmedEmoji != null && trimmedEmoji.length > 0) {
			const emojiCharCount = Array.from(trimmedEmoji).length;
			if (emojiCharCount > 8) {
				throw new Error('Emoji must be at most 8 characters');
			}
			if (!containsOnlyEmoji(trimmedEmoji)) {
				throw new Error('Please enter only emoji characters');
			}
		}

		const validStatuses = ['draft', 'published', 'archived'];
		if (!validStatuses.includes(trimmedStatus)) {
			throw new Error('Module status must be draft, published, or archived');
		}

		const existingModules = await ctx.db
			.query('module')
			.withIndex('by_classId', (q) => q.eq('classId', args.classId))
			.collect();

		const titleExists = existingModules.some(
			(existingModule) =>
				existingModule._id !== args.moduleId &&
				existingModule.title.toLowerCase() === trimmedTitle.toLowerCase()
		);
		if (titleExists) {
			throw new Error('A module with this title already exists in this class');
		}

		await ctx.db.patch(args.moduleId, {
			title: trimmedTitle,
			emoji: trimmedEmoji,
			description: trimmedDescription,
			status: trimmedStatus,
			updatedAt: Date.now()
		});

		return { updated: true };
	}
});

export const getAllModules = authQuery({
	args: {},
	handler: async (ctx) => {
		const modules = await ctx.db.query('module').collect();
		return modules;
	}
});

/**
 * Backfill questionCount for all modules.
 * Run via CLI: npx convex run module:backfillQuestionCounts
 */
export const backfillQuestionCounts = mutation({
	args: {},
	handler: async (ctx) => {
		const modules = await ctx.db.query('module').collect();
		let updated = 0;

		for (const module of modules) {
			const questions = await ctx.db
				.query('question')
				.withIndex('by_moduleId', (q) => q.eq('moduleId', module._id))
				.collect();

			const count = questions.length;
			if (module.questionCount !== count) {
				await ctx.db.patch(module._id, { questionCount: count });
				updated++;
			}
		}

		return { totalModules: modules.length, updated };
	}
});

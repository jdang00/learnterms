import { authQuery, authAdminMutation } from './authQueries';
import { v } from 'convex/values';

function slugify(input: string) {
	const trimmed = input.trim().toLowerCase();
	const slug = trimmed.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
	return slug;
}

function normalizeColor(color?: string) {
	if (!color) return undefined;
	const trimmed = color.trim();
	if (!/^#?[0-9a-fA-F]{6}$/.test(trimmed)) {
		throw new Error('Color must be a 6-digit hex value');
	}
	return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

export const getTagsForClass = authQuery({
	args: { classId: v.id('class') },
	handler: async (ctx, args) => {
		const tags = await ctx.db
			.query('tags')
			.withIndex('by_classId', (q) => q.eq('classId', args.classId))
			.collect();

		return tags
			.filter((tag) => !tag.deletedAt)
			.sort((a, b) => a.name.localeCompare(b.name));
	}
});

export const getTagsForModule = authQuery({
	args: { moduleId: v.id('module') },
	handler: async (ctx, args) => {
		const moduleDoc = await ctx.db.get(args.moduleId);
		if (!moduleDoc) return [];

		const links = await ctx.db
			.query('moduleTags')
			.withIndex('by_moduleId', (q) => q.eq('moduleId', args.moduleId))
			.collect();

		const tags = await Promise.all(links.map((link) => ctx.db.get(link.tagId)));
		return tags
			.filter((tag) => tag && !tag.deletedAt && tag.classId === moduleDoc.classId)
			.sort((a, b) => a!.name.localeCompare(b!.name));
	}
});

export const createTag = authAdminMutation({
	args: {
		classId: v.id('class'),
		name: v.string(),
		color: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const name = args.name.trim();
		if (name.length < 2) throw new Error('Tag name must be at least 2 characters');
		if (name.length > 40) throw new Error('Tag name cannot exceed 40 characters');

		const slug = slugify(name);
		if (!slug) throw new Error('Tag name must contain letters or numbers');

		const existing = await ctx.db
			.query('tags')
			.withIndex('by_classId_slug', (q) => q.eq('classId', args.classId).eq('slug', slug))
			.first();
		if (existing && !existing.deletedAt) {
			throw new Error('A tag with this name already exists');
		}

		return await ctx.db.insert('tags', {
			name,
			slug,
			color: normalizeColor(args.color),
			classId: args.classId,
			createdAt: Date.now(),
			updatedAt: Date.now()
		});
	}
});

export const updateTag = authAdminMutation({
	args: {
		tagId: v.id('tags'),
		classId: v.id('class'),
		name: v.string(),
		color: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const tag = await ctx.db.get(args.tagId);
		if (!tag || tag.classId !== args.classId) {
			throw new Error('Tag not found or access denied');
		}

		const name = args.name.trim();
		if (name.length < 2) throw new Error('Tag name must be at least 2 characters');
		if (name.length > 40) throw new Error('Tag name cannot exceed 40 characters');

		const slug = slugify(name);
		if (!slug) throw new Error('Tag name must contain letters or numbers');

		const existing = await ctx.db
			.query('tags')
			.withIndex('by_classId_slug', (q) => q.eq('classId', args.classId).eq('slug', slug))
			.first();
		if (existing && existing._id !== args.tagId && !existing.deletedAt) {
			throw new Error('A tag with this name already exists');
		}

		await ctx.db.patch(args.tagId, {
			name,
			slug,
			color: normalizeColor(args.color),
			updatedAt: Date.now()
		});
		return { updated: true };
	}
});

export const archiveTag = authAdminMutation({
	args: {
		tagId: v.id('tags'),
		classId: v.id('class')
	},
	handler: async (ctx, args) => {
		const tag = await ctx.db.get(args.tagId);
		if (!tag || tag.classId !== args.classId) {
			throw new Error('Tag not found or access denied');
		}

		await ctx.db.patch(args.tagId, {
			deletedAt: Date.now(),
			updatedAt: Date.now()
		});

		const links = await ctx.db
			.query('moduleTags')
			.withIndex('by_tagId', (q) => q.eq('tagId', args.tagId))
			.collect();
		for (const link of links) {
			await ctx.db.delete(link._id);
		}

		return { archived: true };
	}
});

export const setModuleTags = authAdminMutation({
	args: {
		moduleId: v.id('module'),
		tagIds: v.array(v.id('tags'))
	},
	handler: async (ctx, args) => {
		const moduleDoc = await ctx.db.get(args.moduleId);
		if (!moduleDoc) throw new Error('Module not found');

		const uniqueTagIds = Array.from(new Set(args.tagIds));
		if (uniqueTagIds.length > 10) {
			throw new Error('A module can have at most 10 tags');
		}

		const tags = await Promise.all(uniqueTagIds.map((id) => ctx.db.get(id)));
		for (const tag of tags) {
			if (!tag || tag.deletedAt) throw new Error('Tag not found');
			if (tag.classId !== moduleDoc.classId) {
				throw new Error('Tag belongs to a different class');
			}
		}

		const existing = await ctx.db
			.query('moduleTags')
			.withIndex('by_moduleId', (q) => q.eq('moduleId', args.moduleId))
			.collect();
		for (const link of existing) {
			await ctx.db.delete(link._id);
		}

		for (const tagId of uniqueTagIds) {
			await ctx.db.insert('moduleTags', {
				moduleId: args.moduleId,
				tagId,
				classId: moduleDoc.classId,
				createdAt: Date.now()
			});
		}

		return { updated: true };
	}
});

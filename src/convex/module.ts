import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const getClassModules = query({
	// Enter class ID
	args: { id: v.id('class') },
	handler: async (ctx, args) => {
		const modules = await ctx.db
			.query('module')
			.filter((q) => q.eq(q.field('classId'), args.id))
			.filter((q) => q.eq(q.field('status'), 'published'))
			.collect();

		return modules.sort((a, b) => a.order - b.order);
	}
});

export const getAdminModule = query({
	// Enter class ID
	args: { id: v.id('class') },
	handler: async (ctx, args) => {
		const modules = await ctx.db
			.query('module')
			.filter((q) => q.eq(q.field('classId'), args.id))
			.collect();

		return modules.sort((a, b) => a.order - b.order);
	}
});

export const getModuleById = query({
	args: { id: v.id('module') },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	}
});

export const updateModuleOrder = mutation({
	args: {
		moduleId: v.id('module'),
		newOrder: v.number(),
		classId: v.id('class')
	},
	handler: async (ctx, args) => {
		const allModules = await ctx.db
			.query('module')
			.filter((q) => q.eq(q.field('classId'), args.classId))
			.collect();

		const movedModule = allModules.find((m) => m._id === args.moduleId);
		if (!movedModule) return;

		const oldOrder = movedModule.order;
		const newOrder = args.newOrder;

		for (const moduleItem of allModules) {
			let updatedOrder = moduleItem.order;

			if (moduleItem._id === args.moduleId) {
				updatedOrder = newOrder;
			} else if (oldOrder < newOrder) {
				if (moduleItem.order > oldOrder && moduleItem.order <= newOrder) {
					updatedOrder = moduleItem.order - 1;
				}
			} else if (oldOrder > newOrder) {
				if (moduleItem.order >= newOrder && moduleItem.order < oldOrder) {
					updatedOrder = moduleItem.order + 1;
				}
			}

			await ctx.db.patch(moduleItem._id, { order: updatedOrder });
		}
	}
});

export const insertModule = mutation({
	args: {
		title: v.string(),
		description: v.string(),
		status: v.string(),
		classId: v.id('class'),
		order: v.number(),
		metadata: v.object({}),
		updatedAt: v.number()
	},
	handler: async (ctx, args) => {
		const id = await ctx.db.insert('module', args);
		return id;
	}
});

export const deleteModule = mutation({
	args: {
		moduleId: v.id('module'),
		classId: v.id('class')
	},
	handler: async (ctx, args) => {
		const moduleToDelete = await ctx.db.get(args.moduleId);
		if (!moduleToDelete || moduleToDelete.classId !== args.classId) {
			throw new Error('Module not found or access denied');
		}

		await ctx.db.delete(args.moduleId);
		return { deleted: true };
	}
});

export const updateModule = mutation({
	args: {
		moduleId: v.id('module'),
		classId: v.id('class'),
		title: v.string(),
		description: v.string(),
		status: v.string()
	},
	handler: async (ctx, args) => {
		const moduleToUpdate = await ctx.db.get(args.moduleId);
		if (!moduleToUpdate || moduleToUpdate.classId !== args.classId) {
			throw new Error('Module not found or access denied');
		}

		await ctx.db.patch(args.moduleId, {
			title: args.title,
			description: args.description,
			status: args.status.toLowerCase(),
			updatedAt: Date.now()
		});

		return { updated: true };
	}
});

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

export const getModuleQuestionCount = query({
	args: { moduleId: v.id('module') },
	handler: async (ctx, args) => {
		const questions = await ctx.db
			.query('question')
			.withIndex('by_moduleId', (q) => q.eq('moduleId', args.moduleId))
			.collect();
		
		return questions.length;
	}
});

export const getAdminModulesWithQuestionCounts = query({
	args: { classId: v.id('class') },
	handler: async (ctx, args) => {
		const modules = await ctx.db
			.query('module')
			.filter((q) => q.eq(q.field('classId'), args.classId))
			.collect();

		const modulesWithCounts = await Promise.all(
			modules.map(async (module) => {
				const questions = await ctx.db
					.query('question')
					.withIndex('by_moduleId', (q) => q.eq('moduleId', module._id))
					.collect();
				
				return {
					...module,
					questionCount: questions.length
				};
			})
		);

		return modulesWithCounts.sort((a, b) => a.order - b.order);
	}
});

export const getAllModules = query({
	args: {},
	handler: async (ctx) => {
		const modules = await ctx.db.query('module').collect();
		return modules;
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
		// Trim whitespace from string fields
		const trimmedTitle = args.title.trim();
		const trimmedDescription = args.description.trim();
		const trimmedStatus = args.status.trim().toLowerCase();

		// Validation: Check required fields
		if (!trimmedTitle) {
			throw new Error('Module title is required and cannot be empty');
		}
		if (!trimmedDescription) {
			throw new Error('Module description is required and cannot be empty');
		}

		// Validation: Length limits
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

		// Validation: Status must be valid
		const validStatuses = ['draft', 'published', 'archived'];
		if (!validStatuses.includes(trimmedStatus)) {
			throw new Error('Module status must be draft, published, or archived');
		}

		// Validation: Check for duplicate titles within the same class
		const existingModules = await ctx.db
			.query('module')
			.filter((q) => q.eq(q.field('classId'), args.classId))
			.collect();

		const titleExists = existingModules.some(
			(existingModule) => existingModule.title.toLowerCase() === trimmedTitle.toLowerCase()
		);
		if (titleExists) {
			throw new Error('A module with this title already exists in this class');
		}

		// Insert with trimmed values
		const id = await ctx.db.insert('module', {
			...args,
			title: trimmedTitle,
			description: trimmedDescription,
			status: trimmedStatus
		});
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

		const questions = await ctx.db
			.query('question')
			.withIndex('by_moduleId', (q) => q.eq('moduleId', args.moduleId))
			.collect();

		for (const question of questions) {
			await ctx.db.delete(question._id);
		}

		await ctx.db.delete(args.moduleId);
		return { deleted: true, questionsDeleted: questions.length };
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

		// Trim whitespace from string fields
		const trimmedTitle = args.title.trim();
		const trimmedDescription = args.description.trim();
		const trimmedStatus = args.status.trim().toLowerCase();

		// Validation: Check required fields
		if (!trimmedTitle) {
			throw new Error('Module title is required and cannot be empty');
		}
		if (!trimmedDescription) {
			throw new Error('Module description is required and cannot be empty');
		}

		// Validation: Length limits
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

		// Validation: Status must be valid
		const validStatuses = ['draft', 'published', 'archived'];
		if (!validStatuses.includes(trimmedStatus)) {
			throw new Error('Module status must be draft, published, or archived');
		}

		// Validation: Check for duplicate titles within the same class (excluding current module)
		const existingModules = await ctx.db
			.query('module')
			.filter((q) => q.eq(q.field('classId'), args.classId))
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
			description: trimmedDescription,
			status: trimmedStatus,
			updatedAt: Date.now()
		});

		return { updated: true };
	}
});

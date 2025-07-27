import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
	users: defineTable({
		updatedAt: v.number(),
		deletedAt: v.optional(v.number()),
		clerkUserId: v.string(),
		cohortId: v.id('cohort'),
		name: v.string(),
		metadata: v.object({})
	}),
	school: defineTable({
		name: v.string(),
		description: v.string(),
		metadata: v.object({}),
		updatedAt: v.number(),
		deletedAt: v.optional(v.number())
	}),
	cohort: defineTable({
		name: v.string(),
		description: v.optional(v.string()),
		metadata: v.object({}),
		updatedAt: v.number(),
		deletedAt: v.optional(v.number()),
		schoolId: v.id('school'),
		startYear: v.string(),
		endYear: v.string()
	}),
	semester: defineTable({
		name: v.string(),
		description: v.optional(v.string()),
		metadata: v.object({}),
		updatedAt: v.number(),
		deletedAt: v.optional(v.number())
	}),
	class: defineTable({
		name: v.string(),
		metadata: v.object({}),
		updatedAt: v.number(),
		deletedAt: v.optional(v.number()),
		cohortId: v.id('cohort'),
		semesterId: v.id('semester'),
		code: v.string(),
		description: v.string()
	}),
	module: defineTable({
		title: v.string(),
		metadata: v.object({}),
		updatedAt: v.number(),
		deletedAt: v.optional(v.number()),
		classId: v.id('class'),
		order: v.number(),
		description: v.string(),
		status: v.string()
	}),
	question: defineTable({
		metadata: v.object({}),
		updatedAt: v.number(),
		deletedAt: v.optional(v.number()),
		moduleId: v.id('module'),
		order: v.number(),
		type: v.string(),
		stem: v.string(),
		options: v.array(v.object({ id: v.string(), text: v.string() })),
		correctAnswers: v.array(v.string()),
		explanation: v.string(),
		aiGenerated: v.boolean(),
		status: v.string()
	}),
	questionMedia: defineTable({
		url: v.string(),
		type: v.string(),
		questionId: v.id('question'),
		updatedAt: v.number(),
		deletedAt: v.optional(v.number()),
		mediaType: v.string(),
		mimeType: v.string(),
		altText: v.string(),
		caption: v.optional(v.string()),
		order: v.number(),
		metadata: v.object({})
	})
});

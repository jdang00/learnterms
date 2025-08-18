import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
	users: defineTable({
		updatedAt: v.number(),
		deletedAt: v.optional(v.number()),
		clerkUserId: v.string(),
		cohortId: v.optional(v.id('cohort')),
		name: v.string(),
		metadata: v.object({})
	}).index('by_clerkUserId', ['clerkUserId']),
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
		endYear: v.string(),
		classCode: v.optional(v.string()),
		pic_url: v.optional(v.string())
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
		description: v.string(),
		order: v.number()
	}).index('by_cohortId', ['cohortId']),
	module: defineTable({
		title: v.string(),
		emoji: v.optional(v.string()),
		metadata: v.object({}),
		updatedAt: v.number(),
		deletedAt: v.optional(v.number()),
		classId: v.id('class'),
		order: v.number(),
		description: v.string(),
		status: v.string()
	}).index('by_classId', ['classId']),
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
		explanation: v.optional(v.string()),
		aiGenerated: v.boolean(),
		status: v.string()
	}).index('by_moduleId', ['moduleId']).index('by_moduleId_order', ['moduleId', 'order']),
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
	}),
	userProgress: defineTable({
		userId: v.id('users'),
		classId: v.id('class'),
		questionId: v.id('question'),
		selectedOptions: v.array(v.string()),
		eliminatedOptions: v.array(v.string()),
		isFlagged: v.boolean(),
		isMastered: v.boolean(),
		attempts: v.number(),
		lastAttemptAt: v.optional(v.number()),
		metadata: v.object({}),
		deletedAt: v.optional(v.number()),
		updatedAt: v.number()
	})
		.index('by_user_question', ['userId', 'questionId'])
		.index('by_question_user', ['questionId', 'userId'])
		.index('by_user_class', ['userId', 'classId']),
	contentLib: defineTable({
		title: v.string(),
		description: v.optional(v.string()),
		updatedAt: v.number(),
		cohortId: v.id('cohort'),
		metadata: v.optional(
			v.object({
				originalFileName: v.optional(v.string()),
				sizeBytes: v.optional(v.number()),
				uploadthingKey: v.optional(v.string()),
				uploadthingUrl: v.optional(v.string())
			})
		),
		deletedAt: v.optional(v.number())
	}).index('by_cohortId', ['cohortId']),
	chunkContent: defineTable({
		title: v.string(),
		summary: v.string(),
		content: v.string(),
		keywords: v.array(v.string()),
		chunk_type: v.string(),
		updatedAt: v.number(),
		documentId: v.id('contentLib'),
		metadata: v.optional(v.object({})),
		deletedAt: v.optional(v.number())
	}).index('by_documentId', ['documentId'])
});

import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
	users: defineTable({
		updatedAt: v.number(),
		deletedAt: v.optional(v.number()),
		clerkUserId: v.string(),
		cohortId: v.optional(v.id('cohort')),
		name: v.string(),
		// Additional Clerk user data for analytics
		firstName: v.optional(v.string()),
		lastName: v.optional(v.string()),
		email: v.optional(v.string()),
		username: v.optional(v.string()),
		imageUrl: v.optional(v.string()),
		lastSignInAt: v.optional(v.number()),
		createdAt: v.optional(v.number()),
		lastActiveAt: v.optional(v.number()),
		metadata: v.object({}),
		// Denormalized progress stats for fast dashboard queries
		progressStats: v.optional(
			v.object({
				questionsInteracted: v.number(),
				questionsMastered: v.number(),
				totalQuestions: v.number(),
				lastActivityAt: v.optional(v.number()),
				updatedAt: v.number()
			})
		)
	})
		.index('by_clerkUserId', ['clerkUserId'])
		.index('by_cohortId', ['cohortId']),
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
		pic_url: v.optional(v.string()),
		// Denormalized stats for fast dashboard queries
		stats: v.optional(
			v.object({
				totalStudents: v.number(),
				totalQuestions: v.number(),
				totalModules: v.number(),
				averageCompletion: v.number(),
				updatedAt: v.number()
			})
		)
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
		status: v.string(),
		questionCount: v.optional(v.number())
	}).index('by_classId', ['classId']),
	tags: defineTable({
		name: v.string(),
		slug: v.string(),
		color: v.optional(v.string()),
		classId: v.id('class'),
		createdAt: v.number(),
		updatedAt: v.number(),
		deletedAt: v.optional(v.number())
	})
		.index('by_classId', ['classId'])
		.index('by_classId_slug', ['classId', 'slug']),
	moduleTags: defineTable({
		moduleId: v.id('module'),
		tagId: v.id('tags'),
		classId: v.id('class'),
		createdAt: v.number(),
		deletedAt: v.optional(v.number())
	})
		.index('by_moduleId', ['moduleId'])
		.index('by_tagId', ['tagId'])
		.index('by_classId', ['classId'])
		.index('by_moduleId_tagId', ['moduleId', 'tagId']),
	question: defineTable({
		metadata: v.object({
			generation: v.optional(
				v.object({
					model: v.string(),
					focus: v.string(),
					customPromptUsed: v.boolean()
				})
			)
		}),
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
		createdBy: v.optional(
			v.object({
				firstName: v.string(),
				lastName: v.string()
			})
		),
		status: v.string(),
		searchText: v.optional(v.string()),
		flagCount: v.optional(v.number())
	})
		.index('by_moduleId', ['moduleId'])
		.index('by_moduleId_order', ['moduleId', 'order'])
		.index('by_moduleId_flagCount', ['moduleId', 'flagCount'])
		.searchIndex('by_moduleId_searchText', {
			searchField: 'searchText',
			filterFields: ['moduleId']
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
		showOnSolution: v.optional(v.boolean()),
		metadata: v.object({
			uploadthingKey: v.optional(v.string()),
			sizeBytes: v.optional(v.number()),
			originalFileName: v.optional(v.string())
		})
	}).index('by_questionId', ['questionId']),
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
	}).index('by_documentId', ['documentId']),
	pdfProcessingJobs: defineTable({
		documentId: v.id('contentLib'),
		pdfUrl: v.string(),
		fileKey: v.optional(v.string()),
		status: v.union(
			v.literal('pending'),
			v.literal('processing'),
			v.literal('completed'),
			v.literal('failed')
		),
		progress: v.optional(v.object({
			chunksProcessed: v.number(),
			totalChunks: v.optional(v.number()),
			currentStep: v.string()
		})),
		error: v.optional(v.string()),
		retryCount: v.number(),
		createdAt: v.number(),
		updatedAt: v.number(),
		completedAt: v.optional(v.number())
	})
		.index('by_documentId', ['documentId'])
		.index('by_status', ['status'])
});

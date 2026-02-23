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
		role: v.optional(v.union(v.literal('dev'), v.literal('admin'), v.literal('curator'))),
		// DEPRECATED: Run migrations:clearPlanField then remove this field
		plan: v.optional(v.union(v.literal('pro'), v.literal('free'))),
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
		),
		// Track AI generation usage for rate limiting
		generationUsage: v.optional(
			v.object({
				count: v.number(),
				lastResetAt: v.number()
			})
		),
		// Track PDF upload usage for rate limiting
		pdfUploadUsage: v.optional(
			v.object({
				count: v.number(),
				lastResetAt: v.number()
			})
		),
		seenFeatureAnnouncementIds: v.optional(v.array(v.string()))
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
	})
		.index('by_cohortId', ['cohortId'])
		.searchIndex('by_cohortId_name', {
			searchField: 'name',
			filterFields: ['cohortId']
		})
		.searchIndex('by_cohortId_code', {
			searchField: 'code',
			filterFields: ['cohortId']
		})
		.searchIndex('by_cohortId_description', {
			searchField: 'description',
			filterFields: ['cohortId']
		}),
	module: defineTable({
		title: v.string(),
		emoji: v.optional(v.string()),
		metadata: v.object({}),
		updatedAt: v.number(),
		deletedAt: v.optional(v.number()),
		classId: v.id('class'),
		cohortId: v.optional(v.id('cohort')),
		order: v.number(),
		description: v.string(),
		status: v.string(),
		questionCount: v.optional(v.number())
	})
		.index('by_classId', ['classId'])
		.index('by_cohortId', ['cohortId'])
		.searchIndex('by_classId_cohortId_title', {
			searchField: 'title',
			filterFields: ['classId', 'cohortId']
		})
		.searchIndex('by_classId_cohortId_description', {
			searchField: 'description',
			filterFields: ['classId', 'cohortId']
		}),
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
	badgeDefinitions: defineTable({
		key: v.string(),
		name: v.string(),
		description: v.string(),
		iconKey: v.string(),
		iconColor: v.string(),
		gradient: v.object({
			from: v.string(),
			mid: v.string(),
			to: v.string()
		}),
		ownedPct: v.number(),
		scopeType: v.union(v.literal('global'), v.literal('cohort'), v.literal('class')),
		cohortId: v.optional(v.id('cohort')),
		classId: v.optional(v.id('class')),
		issuerType: v.union(
			v.literal('platform'),
			v.literal('cohort'),
			v.literal('class'),
			v.literal('event'),
			v.literal('partner')
		),
		issuerName: v.string(),
		issuerUrl: v.optional(v.string()),
		scopeLabel: v.string(),
		eligibility: v.string(),
		seasonLabel: v.optional(v.string()),
		isActive: v.boolean(),
		awardedCount: v.optional(v.number()),
		createdByUserId: v.optional(v.id('users')),
		updatedAt: v.number()
	})
		.index('by_key', ['key'])
		.index('by_isActive', ['isActive'])
		.index('by_scopeType', ['scopeType'])
		.index('by_cohortId', ['cohortId'])
		.index('by_classId', ['classId']),
	badgeRules: defineTable({
		badgeDefinitionId: v.id('badgeDefinitions'),
		name: v.optional(v.string()),
		allOf: v.array(
			v.object({
				metric: v.union(
					v.literal('questions_interacted'),
					v.literal('questions_mastered'),
					v.literal('questions_flagged'),
					v.literal('early_interactions'),
					v.literal('late_interactions'),
					v.literal('questions_created'),
					v.literal('streak_current_days'),
					v.literal('streak_best_days')
				),
				op: v.union(
					v.literal('gte'),
					v.literal('gt'),
					v.literal('eq'),
					v.literal('lte'),
					v.literal('lt')
				),
				value: v.number()
			})
		),
		isActive: v.boolean(),
		createdByUserId: v.optional(v.id('users')),
		updatedAt: v.number()
	})
		.index('by_badgeDefinitionId', ['badgeDefinitionId'])
		.index('by_isActive', ['isActive'])
		.index('by_badgeDefinitionId_isActive', ['badgeDefinitionId', 'isActive']),
	userBadgeAwards: defineTable({
		userId: v.id('users'),
		badgeDefinitionId: v.id('badgeDefinitions'),
		awardedByRuleId: v.optional(v.id('badgeRules')),
		source: v.union(v.literal('earned'), v.literal('manual')),
		cohortId: v.optional(v.id('cohort')),
		classId: v.optional(v.id('class')),
		seenAt: v.optional(v.number()),
		awardedAt: v.number(),
		updatedAt: v.number()
	})
		.index('by_userId', ['userId'])
		.index('by_userId_seenAt', ['userId', 'seenAt'])
		.index('by_badgeDefinitionId', ['badgeDefinitionId'])
		.index('by_user_badge', ['userId', 'badgeDefinitionId'])
		.index('by_cohortId', ['cohortId'])
		.index('by_cohortId_userId', ['cohortId', 'userId'])
		.index('by_classId', ['classId']),
	userBadgeMetrics: defineTable({
		userId: v.id('users'),
		scopeType: v.union(v.literal('global'), v.literal('cohort'), v.literal('class')),
		cohortId: v.optional(v.id('cohort')),
		classId: v.optional(v.id('class')),
		questionsInteracted: v.number(),
		questionsMastered: v.number(),
		questionsFlagged: v.number(),
		earlyInteractions: v.number(),
		lateInteractions: v.number(),
		questionsCreated: v.optional(v.number()),
		streakCurrentDays: v.number(),
		streakBestDays: v.number(),
		lastActivityDayKey: v.optional(v.number()),
		updatedAt: v.number()
	})
		.index('by_user_scopeType', ['userId', 'scopeType'])
		.index('by_user_scope_cohort', ['userId', 'scopeType', 'cohortId'])
		.index('by_user_scope_class', ['userId', 'scopeType', 'classId']),
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
		metadata: v.object({
			firstInteractedAt: v.optional(v.number()),
			firstInteractedHourUtc: v.optional(v.number()),
			firstInteractedHourLocal: v.optional(v.number()),
			firstInteractedUtcOffsetMinutes: v.optional(v.number())
		}),
		deletedAt: v.optional(v.number()),
		updatedAt: v.number()
	})
		.index('by_user_question', ['userId', 'questionId'])
		.index('by_question_user', ['questionId', 'userId'])
		.index('by_user_class', ['userId', 'classId'])
		.index('by_classId', ['classId']),
	quizAttempts: defineTable({
		userId: v.id('users'),
		classId: v.id('class'),
		cohortId: v.optional(v.id('cohort')),
		status: v.union(
			v.literal('in_progress'),
			v.literal('submitted'),
			v.literal('timed_out'),
			v.literal('abandoned')
		),
		mode: v.literal('custom_random_v1'),
		configSnapshot: v.object({
			moduleIds: v.array(v.id('module')),
			questionCountRequested: v.number(),
			questionCountActual: v.number(),
			sourceFilter: v.union(
				v.literal('all'),
				v.literal('flagged'),
				v.literal('incomplete')
			),
			questionTypes: v.optional(v.array(v.string())),
			shuffleQuestions: v.boolean(),
			shuffleOptions: v.boolean(),
			timeLimitSec: v.optional(v.number()),
			passThresholdPct: v.number()
		}),
		seed: v.string(),
		startedAt: v.number(),
		lastActivityAt: v.number(),
		submittedAt: v.optional(v.number()),
		timeLimitSec: v.optional(v.number()),
		elapsedMs: v.number(),
		timeExpiredAt: v.optional(v.number()),
		progressCounters: v.object({
			visitedCount: v.number(),
			answeredCount: v.number(),
			flaggedCount: v.number()
		}),
		resultSummary: v.optional(
			v.object({
				scoreEarned: v.number(),
				scorePossible: v.number(),
				scorePct: v.number(),
				correctCount: v.number(),
				incorrectCount: v.number(),
				unansweredCount: v.number(),
				passThresholdPct: v.number(),
				passed: v.boolean(),
				byModule: v.array(
					v.object({
						moduleId: v.id('module'),
						moduleTitle: v.string(),
						total: v.number(),
						correct: v.number(),
						incorrect: v.number(),
						unanswered: v.number(),
						accuracyPct: v.number()
					})
				),
				byType: v.array(
					v.object({
						questionType: v.string(),
						total: v.number(),
						correct: v.number(),
						incorrect: v.number(),
						unanswered: v.number(),
						accuracyPct: v.number()
					})
				),
				reviewReady: v.boolean()
			})
		),
		updatedAt: v.number()
	})
		.index('by_user', ['userId'])
		.index('by_user_class', ['userId', 'classId'])
		.index('by_user_class_status', ['userId', 'classId', 'status'])
		.index('by_class', ['classId'])
		.index('by_status', ['status'])
		.index('by_user_lastActivityAt', ['userId', 'lastActivityAt']),
	quizAttemptItems: defineTable({
		attemptId: v.id('quizAttempts'),
		userId: v.id('users'),
		classId: v.id('class'),
		questionId: v.id('question'),
		moduleId: v.id('module'),
		order: v.number(),
		optionOrder: v.optional(v.array(v.string())),
		questionSnapshot: v.object({
			type: v.string(),
			stem: v.string(),
			options: v.array(v.object({ id: v.string(), text: v.string() })),
			correctAnswers: v.array(v.string()),
			explanation: v.optional(v.string()),
			questionUpdatedAt: v.number()
		}),
		response: v.object({
			selectedOptions: v.array(v.string()),
			textResponse: v.optional(v.string()),
			isFlagged: v.boolean(),
			visitedAt: v.optional(v.number()),
			answeredAt: v.optional(v.number()),
			lastChangedAt: v.optional(v.number()),
			changeCount: v.number(),
			timeSpentMs: v.number()
		}),
		score: v.object({
			isCorrect: v.optional(v.boolean()),
			pointsEarned: v.optional(v.number()),
			pointsPossible: v.number()
		}),
		updatedAt: v.number()
	})
		.index('by_attempt_order', ['attemptId', 'order'])
		.index('by_attempt_question', ['attemptId', 'questionId'])
		.index('by_attempt_module', ['attemptId', 'moduleId'])
		.index('by_user_attempt', ['userId', 'attemptId']),
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
		progress: v.optional(
			v.object({
				chunksProcessed: v.number(),
				totalChunks: v.optional(v.number()),
				currentStep: v.string()
			})
		),
		error: v.optional(v.string()),
		retryCount: v.number(),
		createdAt: v.number(),
		updatedAt: v.number(),
		completedAt: v.optional(v.number())
	})
		.index('by_documentId', ['documentId'])
		.index('by_status', ['status'])
});

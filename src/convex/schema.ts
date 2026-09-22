import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

const questionStudioQuestionType = v.union(
	v.literal('learn'),
	v.literal('clinical'),
	v.literal('criticalThinking')
);

// Legacy fields remain optional so stored drafts and jobs stay readable.
const questionStudioReasoningOrder = v.union(
	v.literal('first'),
	v.literal('second'),
	v.literal('third')
);

const questionStudioSourceCitation = v.object({
	citationId: v.string(),
	pageNumber: v.number(),
	noteFile: v.string(),
	chunkTitle: v.string(),
	quote: v.optional(v.string()),
	chunkIndex: v.number()
});

const questionStudioCandidate = v.object({
	type: v.literal('multiple_choice'),
	stem: v.string(),
	options: v.array(v.string()),
	correctAnswers: v.array(v.string()),
	rationale: v.string(),
	questionType: v.optional(questionStudioQuestionType),
	reasoningOrder: v.optional(questionStudioReasoningOrder),
	topicId: v.string(),
	topicTitle: v.string(),
	sourcePageNumbers: v.array(v.number()),
	sourceCitations: v.optional(v.array(questionStudioSourceCitation)),
	duplicateRisk: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
	similarQuestionIds: v.array(v.id('question')),
	cognitiveTemplate: v.optional(v.string()),
	metadata: v.object({
		model: v.string(),
		agentThreadId: v.optional(v.string()),
		jobId: v.optional(v.id('questionStudioJobs')),
		harnessVersion: v.optional(v.string()),
		reviewMode: v.optional(v.union(v.literal('local'), v.literal('independent'))),
		curatorEditedAt: v.optional(v.number()),
		curatorRevision: v.optional(v.number()),
		sourceDocumentId: v.id('contentLib')
	})
});

const questionStudioCandidateReview = v.object({
	candidateIndex: v.number(),
	verdict: v.union(v.literal('accept'), v.literal('revise'), v.literal('reject')),
	reasons: v.array(v.string()),
	sourceSupport: v.union(v.literal('strong'), v.literal('partial'), v.literal('weak')),
	answerQuality: v.union(v.literal('clear'), v.literal('ambiguous')),
	revisedStem: v.optional(v.string()),
	revisedRationale: v.optional(v.string())
});

const quickLink = v.object({
	title: v.string(),
	description: v.string(),
	href: v.string(),
	icon: v.string(),
	hidden: v.optional(v.boolean())
});

const questionStudioGenerationPlan = v.object({
	workerBatches: v.array(
		v.object({
			taskId: v.string(),
			label: v.string(),
			plannedCount: v.number(),
			questionType: v.optional(questionStudioQuestionType),
			reasoningOrder: v.optional(questionStudioReasoningOrder),
			topicCount: v.number(),
			topicTitles: v.array(v.string()),
			sourcePages: v.array(v.number()),
			cognitiveTemplate: v.optional(v.string()),
			targetObjective: v.optional(v.string())
		})
	),
	topicAllocations: v.array(
		v.object({
			taskId: v.string(),
			topicId: v.string(),
			topicTitle: v.string(),
			plannedCount: v.number(),
			questionType: v.optional(questionStudioQuestionType),
			reasoningOrder: v.optional(questionStudioReasoningOrder),
			sourcePages: v.array(v.number()),
			notes: v.string()
		})
	),
	coverageNotes: v.array(v.string()),
	riskNotes: v.array(v.string())
});

const questionStudioLoopProgress = v.object({
	enabled: v.boolean(),
	pass: v.union(v.literal('plan'), v.literal('draft'), v.literal('gate'), v.literal('done')),
	blueprintCount: v.optional(v.number()),
	blueprintSource: v.optional(v.union(v.literal('llm'), v.literal('fallback'))),
	gatePassedCount: v.optional(v.number()),
	gateRejectedCount: v.optional(v.number()),
	selectedCount: v.optional(v.number()),
	dedupedCount: v.optional(v.number())
});

const questionStudioStageUsage = v.object({
	cachedInputTokens: v.optional(v.number()),
	cacheWriteTokens: v.optional(v.number()),
	stage: v.string(),
	calls: v.number(),
	failedCalls: v.number(),
	inputTokens: v.number(),
	outputTokens: v.number(),
	reasoningTokens: v.number(),
	costUsd: v.number(),
	costKnownCalls: v.number(),
	costEstimatedCalls: v.optional(v.number()),
	latencyMsTotal: v.number()
});

// Spend and latency accrued by the run's model calls, so the UI can report them live.
const questionStudioJobUsage = v.object({
	cachedInputTokens: v.optional(v.number()),
	cacheWriteTokens: v.optional(v.number()),
	calls: v.number(),
	failedCalls: v.number(),
	inputTokens: v.number(),
	outputTokens: v.number(),
	reasoningTokens: v.number(),
	costUsd: v.number(),
	costKnownCalls: v.number(),
	costEstimatedCalls: v.optional(v.number()),
	latencyMsTotal: v.number(),
	byStage: v.array(questionStudioStageUsage)
});

const questionStudioWorkerState = v.object({
	index: v.number(),
	startedAt: v.number(),
	finishedAt: v.optional(v.number()),
	failed: v.optional(v.boolean()),
	draftedCount: v.optional(v.number())
});

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
		// DEPRECATED: retained for existing user records from the old upload workflow.
		pdfUploadUsage: v.optional(
			v.object({
				count: v.number(),
				lastResetAt: v.number()
			})
		),
		seenFeatureAnnouncementIds: v.optional(v.array(v.string())),
		stemHighlightEnabled: v.optional(v.boolean())
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
		quickLinks: v.optional(v.array(quickLink)),
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
		order: v.number(),
		cardTheme: v.optional(
			v.object({
				base: v.string(),
				light: v.string(),
				dark: v.string(),
				patternVariant: v.optional(
					v.union(v.literal('stripes'), v.literal('blobs'), v.literal('bands'))
				),
				patternAngle: v.optional(v.number())
			})
		)
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
					customPromptUsed: v.boolean(),
					jobId: v.optional(v.id('questionStudioJobs')),
					harnessVersion: v.optional(v.string()),
					reviewMode: v.optional(v.union(v.literal('local'), v.literal('independent'))),
					curatorEditedAt: v.optional(v.number()),
					curatorRevision: v.optional(v.number()),
					sourceDocumentId: v.optional(v.id('contentLib')),
					sourcePageNumbers: v.optional(v.array(v.number())),
					sourceCitations: v.optional(
						v.array(
							v.object({
								citationId: v.string(),
								pageNumber: v.number(),
								noteFile: v.string(),
								chunkTitle: v.string(),
								quote: v.optional(v.string()),
								chunkIndex: v.number()
							})
						)
					),
					topicTitle: v.optional(v.string()),
					questionType: v.optional(questionStudioQuestionType),
					reasoningOrder: v.optional(
						v.union(v.literal('first'), v.literal('second'), v.literal('third'))
					),
					duplicateRisk: v.optional(
						v.union(v.literal('low'), v.literal('medium'), v.literal('high'))
					),
					similarQuestionIds: v.optional(v.array(v.id('question'))),
					agentThreadId: v.optional(v.string())
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
		rationale: v.optional(v.string()),
		// DEPRECATED: retained temporarily for legacy question records
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
		// Legacy URLs are retained. R2 URLs are resolved from their key on read.
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
			storageProvider: v.optional(v.literal('r2')),
			r2Key: v.optional(v.string()),
			cohortId: v.optional(v.id('cohort')),
			storageKey: v.optional(v.string()),
			// DEPRECATED: retained for existing media records from the old upload workflow.
			uploadthingKey: v.optional(v.string()),
			sizeBytes: v.optional(v.number()),
			originalFileName: v.optional(v.string())
		})
	})
		.index('by_questionId', ['questionId'])
		.index('by_questionId_deletedAt', ['questionId', 'deletedAt']),
	questionMediaUploads: defineTable({
		moduleId: v.id('module'),
		cohortId: v.id('cohort'),
		uploadedBy: v.id('users'),
		stagingKey: v.string(),
		r2Key: v.string(),
		originalFileName: v.string(),
		mimeType: v.string(),
		sizeBytes: v.number(),
		status: v.union(
			v.literal('uploading'),
			v.literal('verifying'),
			v.literal('ready'),
			v.literal('attached'),
			v.literal('abandoned')
		),
		questionId: v.optional(v.id('question')),
		expiresAt: v.number()
	}).index('by_uploadedBy_status', ['uploadedBy', 'status']),
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
					v.literal('large_quizzes_submitted'),
					v.literal('weekend_warrior_weeks'),
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
		largeQuizzesSubmitted: v.optional(v.number()),
		weekendWarriorWeeks: v.optional(v.number()),
		weekendStudyWeekKey: v.optional(v.number()),
		weekendStudyDayMask: v.optional(v.number()),
		streakCurrentDays: v.number(),
		streakBestDays: v.number(),
		lastActivityDayKey: v.optional(v.number()),
		updatedAt: v.number()
	})
		.index('by_user_scopeType', ['userId', 'scopeType'])
		.index('by_user_scope_cohort', ['userId', 'scopeType', 'cohortId'])
		.index('by_user_scope_class', ['userId', 'scopeType', 'classId']),
	// Per-student, per-module rollup of userProgress so dashboards never scan raw progress.
	userModuleStats: defineTable({
		userId: v.id('users'),
		moduleId: v.id('module'),
		classId: v.id('class'),
		questionsInteracted: v.number(),
		questionsMastered: v.number(),
		questionsFlagged: v.number(),
		lastActivityAt: v.optional(v.number()),
		updatedAt: v.number()
	})
		.index('by_user_module', ['userId', 'moduleId'])
		.index('by_moduleId', ['moduleId'])
		.index('by_classId', ['classId']),
	stemHighlights: defineTable({
		userId: v.id('users'),
		questionId: v.id('question'),
		version: v.string(),
		ranges: v.array(
			v.object({ id: v.string(), start: v.number(), end: v.number(), quote: v.string() })
		),
		updatedAt: v.number()
	})
		.index('by_user_question', ['userId', 'questionId'])
		.index('by_question', ['questionId']),
	quizDockLayouts: defineTable({
		userId: v.id('users'),
		items: v.array(
			v.object({
				id: v.string(),
				display: v.union(v.literal('icon'), v.literal('label'), v.literal('both'))
			})
		),
		overflow: v.array(v.string()),
		updatedAt: v.number()
	}).index('by_userId', ['userId']),
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
	studyQuestionState: defineTable({
		userId: v.id('users'),
		questionId: v.id('question'),
		moduleId: v.id('module'),
		version: v.string(),
		activeAttemptId: v.optional(v.id('studyAttempts')),
		activeAttemptChecks: v.optional(v.number()),
		activeAttemptRevealed: v.optional(v.boolean()),
		needsFreshEvidence: v.optional(v.boolean()),
		checkedAt: v.optional(v.number()),
		latestCorrect: v.optional(v.boolean()),
		cleanRecallCount: v.number(),
		firstCleanAt: v.optional(v.number()),
		masteredAt: v.optional(v.number()),
		lastMasteredAt: v.optional(v.number()),
		checks: v.number()
	})
		.index('by_userId_questionId', ['userId', 'questionId'])
		.index('by_userId_moduleId', ['userId', 'moduleId']),
	studyAttempts: defineTable({
		userId: v.id('users'),
		questionId: v.id('question'),
		moduleId: v.id('module'),
		version: v.string(),
		startedAt: v.number(),
		revealedAt: v.optional(v.number()),
		checks: v.number(),
		lastAnswerKey: v.optional(v.string()),
		selectedOptions: v.array(v.string())
	})
		.index('by_userId_questionId', ['userId', 'questionId'])
		.index('by_moduleId', ['moduleId']),
	studyChecks: defineTable({
		userId: v.id('users'),
		questionId: v.id('question'),
		attemptId: v.id('studyAttempts'),
		submissionId: v.string(),
		checkedAt: v.number(),
		selectedOptions: v.array(v.string()),
		isCorrect: v.boolean(),
		qualifyingRecall: v.boolean()
	})
		.index('by_attemptId_submissionId', ['attemptId', 'submissionId'])
		.index('by_userId_questionId', ['userId', 'questionId']),
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
			sourceFilter: v.union(v.literal('all'), v.literal('flagged'), v.literal('incomplete')),
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
			rationale: v.optional(v.string()),
			// DEPRECATED: retained temporarily for legacy attempt snapshots
			explanation: v.optional(v.string()),
			source: v.optional(
				v.object({
					sourceDocumentId: v.optional(v.id('contentLib')),
					sourcePageNumbers: v.optional(v.array(v.number())),
					sourceCitations: v.optional(v.array(questionStudioSourceCitation))
				})
			),
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
	gradeCalculatorRulesets: defineTable({
		name: v.string(),
		slug: v.string(),
		description: v.optional(v.string()),
		status: v.union(v.literal('draft'), v.literal('active'), v.literal('archived')),
		calculationMode: v.union(
			v.literal('points'),
			v.literal('weighted'),
			v.literal('percentage'),
			v.literal('hybrid')
		),
		roundingStrategy: v.union(
			v.literal('none'),
			v.literal('nearest_hundredth'),
			v.literal('nearest_tenth'),
			v.literal('nearest_whole')
		),
		passingPercentage: v.optional(v.number()),
		gradeBands: v.array(
			v.object({
				id: v.string(),
				label: v.string(),
				minPercentage: v.number(),
				maxPercentage: v.optional(v.number()),
				colorHint: v.optional(v.string())
			})
		),
		policies: v.object({
			allowAttendance: v.boolean(),
			allowBonus: v.boolean(),
			allowDrops: v.boolean(),
			allowReplacements: v.boolean()
		}),
		metadata: v.object({}),
		updatedAt: v.number(),
		deletedAt: v.optional(v.number())
	})
		.index('by_slug', ['slug'])
		.index('by_status', ['status']),
	gradeCalculatorCourses: defineTable({
		name: v.string(),
		slug: v.string(),
		code: v.optional(v.string()),
		sourceDocument: v.optional(v.string()),
		description: v.optional(v.string()),
		institution: v.optional(v.string()),
		termLabel: v.optional(v.string()),
		instructor: v.optional(v.string()),
		status: v.union(v.literal('draft'), v.literal('active'), v.literal('archived')),
		rulesetId: v.optional(v.id('gradeCalculatorRulesets')),
		entryCount: v.number(),
		entries: v.array(
			v.object({
				id: v.string(),
				slug: v.string(),
				name: v.string(),
				shortLabel: v.optional(v.string()),
				category: v.union(
					v.literal('assignment'),
					v.literal('quiz'),
					v.literal('exam'),
					v.literal('project'),
					v.literal('lab'),
					v.literal('attendance'),
					v.literal('participation'),
					v.literal('custom')
				),
				inputType: v.union(
					v.literal('points'),
					v.literal('percentage'),
					v.literal('attendance'),
					v.literal('pass_fail'),
					v.literal('letter')
				),
				contributionType: v.optional(v.union(v.literal('standard'), v.literal('bonus'))),
				aggregation: v.union(v.literal('single'), v.literal('set'), v.literal('running_total')),
				weight: v.optional(v.number()),
				pointsPossible: v.optional(v.number()),
				quantity: v.optional(v.number()),
				instancePoints: v.optional(v.array(v.number())),
				instanceLabels: v.optional(v.array(v.string())),
				instances: v.optional(
					v.array(
						v.object({
							id: v.string(),
							label: v.string(),
							pointsPossible: v.optional(v.number()),
							note: v.optional(v.string())
						})
					)
				),
				dropLowestCount: v.optional(v.number()),
				required: v.boolean(),
				rules: v.optional(
					v.object({
						replacementSourceEntryIds: v.optional(v.array(v.string())),
						replacementCondition: v.optional(v.union(v.literal('if_higher'), v.literal('always'))),
						bonusTargetEntryId: v.optional(v.string()),
						bonusCap: v.optional(v.number()),
						attendanceValuePerSession: v.optional(v.number()),
						notes: v.optional(v.string())
					})
				),
				metadata: v.object({})
			})
		),
		metadata: v.object({}),
		updatedAt: v.number(),
		deletedAt: v.optional(v.number())
	})
		.index('by_slug', ['slug'])
		.index('by_status', ['status'])
		.index('by_rulesetId', ['rulesetId']),
	documentIngestionJobs: defineTable({
		documentId: v.id('contentLib'),
		actor: v.string(),
		workflowId: v.optional(v.string()),
		status: v.union(
			v.literal('queued'),
			v.literal('processing'),
			v.literal('indexing'),
			v.literal('complete'),
			v.literal('failed')
		),
		createdAt: v.number(),
		checkUrl: v.optional(v.string()),
		expectedPages: v.optional(v.number()),
		reservedCents: v.optional(v.number()),
		costCents: v.optional(v.number()),
		period: v.optional(v.string()),
		artifactKey: v.optional(v.string()),
		error: v.optional(v.string())
	}).index('by_documentId', ['documentId']),
	parsingBudgets: defineTable({ period: v.string(), reservedCents: v.number() }).index(
		'by_period',
		['period']
	),
	contentLib: defineTable({
		title: v.string(),
		description: v.optional(v.string()),
		updatedAt: v.number(),
		cohortId: v.id('cohort'),
		metadata: v.optional(
			v.object({
				originalFileName: v.optional(v.string()),
				sizeBytes: v.optional(v.number()),
				// DEPRECATED: retained for existing content library records from the old upload workflow.
				uploadthingKey: v.optional(v.string()),
				uploadthingUrl: v.optional(v.string()),
				storageProvider: v.optional(v.string()),
				r2Key: v.optional(v.string()),
				mimeType: v.optional(v.string()),
				convertedPdfR2Key: v.optional(v.string()),
				convertedPdfFileName: v.optional(v.string()),
				convertedPdfSizeBytes: v.optional(v.number()),
				convertedPdfMimeType: v.optional(v.string()),
				ingestionStatus: v.optional(
					v.union(
						v.literal('not_started'),
						v.literal('indexing'),
						v.literal('indexed'),
						v.literal('mapped'),
						v.literal('failed')
					)
				),
				ingestionJobId: v.optional(v.id('documentIngestionJobs')),
				ingestionStage: v.optional(v.string()),
				ragNamespace: v.optional(v.string()),
				ragEntryId: v.optional(v.string()),
				extractionArtifactKeys: v.optional(v.array(v.string())),
				extractionProvider: v.optional(v.string()),
				extractionModel: v.optional(v.string()),
				indexedAt: v.optional(v.number()),
				mappedAt: v.optional(v.number()),
				topicMapping: v.optional(
					v.object({
						sourceIndexedAt: v.number(),
						status: v.union(v.literal('running'), v.literal('complete'), v.literal('failed')),
						startedAt: v.number(),
						error: v.optional(v.string())
					})
				),
				indexError: v.optional(v.string()),
				pageCount: v.optional(v.number()),
				topics: v.optional(
					v.array(
						v.object({
							title: v.string(),
							pageNumbers: v.array(v.number()),
							chunkCount: v.number()
						})
					)
				)
			})
		),
		deletedAt: v.optional(v.number())
	})
		.index('by_cohortId', ['cohortId'])
		.index('by_cohortId_and_title', ['cohortId', 'title']),
	questionStudioTopicMaps: defineTable({
		mappingVersion: v.optional(v.string()),
		documentId: v.id('contentLib'),
		cohortId: v.id('cohort'),
		createdFromModuleId: v.optional(v.id('module')),
		startPage: v.number(),
		endPage: v.number(),
		pageCount: v.number(),
		topics: v.array(
			v.object({
				topicId: v.string(),
				title: v.string(),
				summary: v.string(),
				pageNumbers: v.array(v.number()),
				learningObjectives: v.array(v.string()),
				keyTerms: v.array(v.string()),
				suggestedTypes: v.optional(v.array(questionStudioQuestionType)),
				suggestedOrders: v.optional(v.array(questionStudioReasoningOrder)),
				estimatedQuestionCapacity: v.number()
			})
		),
		model: v.string(),
		agentThreadId: v.optional(v.string()),
		sourceDocumentUpdatedAt: v.number(),
		sourceIndexedAt: v.optional(v.number()),
		createdByUserId: v.optional(v.id('users')),
		createdAt: v.number(),
		updatedAt: v.number(),
		deletedAt: v.optional(v.number())
	})
		.index('by_documentId', ['documentId'])
		.index('by_documentId_pageRange', ['documentId', 'startPage', 'endPage'])
		.index('by_cohortId', ['cohortId']),
	questionStudioJobs: defineTable({
		sourceMode: v.optional(v.union(v.literal('topics'), v.literal('pages'))),
		selectedPageNumbers: v.optional(v.array(v.number())),
		requestedCounts: v.optional(
			v.object({ learn: v.number(), clinical: v.number(), criticalThinking: v.number() })
		),
		sourceIndexedAt: v.optional(v.number()),
		dismissedAt: v.optional(v.number()),
		completedWorkers: v.optional(v.array(v.number())),
		workerStates: v.optional(v.array(questionStudioWorkerState)),
		usage: v.optional(questionStudioJobUsage),
		claimedWorkers: v.optional(v.array(v.number())),
		savedCandidateIndexes: v.optional(v.array(v.number())),
		thinking: v.optional(v.union(v.literal('low'), v.literal('medium'), v.literal('high'))),
		documentId: v.id('contentLib'),
		moduleId: v.id('module'),
		cohortId: v.id('cohort'),
		createdByUserId: v.id('users'),
		kind: v.union(v.literal('candidate_generation')),
		status: v.union(
			v.literal('queued'),
			v.literal('running'),
			v.literal('ready'),
			v.literal('failed')
		),
		statusText: v.string(),
		model: v.string(),
		threadId: v.optional(v.string()),
		requestedCount: v.number(),
		plan: v.optional(questionStudioGenerationPlan),
		loop: v.optional(questionStudioLoopProgress),
		blockedDuplicateCount: v.optional(v.number()),
		candidateCount: v.optional(v.number()),
		reviewCount: v.optional(v.number()),
		eventCount: v.optional(v.number()),
		completedWorkerCount: v.optional(v.number()),
		failedWorkerCount: v.optional(v.number()),
		error: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
		completedAt: v.optional(v.number())
	})
		.index('by_createdByUserId', ['createdByUserId'])
		.index('by_cohortId', ['cohortId'])
		.index('by_documentId_moduleId', ['documentId', 'moduleId']),
	questionStudioJobEvents: defineTable({
		jobId: v.id('questionStudioJobs'),
		cohortId: v.id('cohort'),
		at: v.number(),
		label: v.string(),
		detail: v.optional(v.string())
	}).index('by_jobId', ['jobId']),
	questionStudioJobCandidates: defineTable({
		jobId: v.id('questionStudioJobs'),
		cohortId: v.id('cohort'),
		index: v.number(),
		candidate: questionStudioCandidate,
		originalCandidate: v.optional(questionStudioCandidate),
		createdAt: v.number()
	})
		.index('by_jobId', ['jobId'])
		.index('by_jobId_index', ['jobId', 'index']),
	questionStudioJobReviews: defineTable({
		jobId: v.id('questionStudioJobs'),
		cohortId: v.id('cohort'),
		candidateIndex: v.number(),
		review: questionStudioCandidateReview,
		createdAt: v.number()
	})
		.index('by_jobId', ['jobId'])
		.index('by_jobId_candidateIndex', ['jobId', 'candidateIndex']),
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
	// DEPRECATED: retained so existing old workflow job documents do not break schema validation.
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

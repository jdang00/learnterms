/// <reference types="vite/client" />
import { expect, test } from 'vitest';
import { convexTest } from 'convex-test';
import polar from '@convex-dev/polar/test';
import schema from '../src/convex/schema';
import { api, internal } from '../src/convex/_generated/api';
import * as migrations from '../src/convex/migrations';
import * as moduleFunctions from '../src/convex/module';
import * as questionFunctions from '../src/convex/question';
import { syncProducts } from '../src/convex/polar';

const modules = import.meta.glob('../src/convex/**/*.ts');

async function setup() {
	const t = convexTest(schema, modules);
	polar.register(t);
	const ids = await t.run(async (ctx) => {
		const schoolId = await ctx.db.insert('school', {
			name: 'School',
			description: '',
			metadata: {},
			updatedAt: 1
		});
		const cohortId = await ctx.db.insert('cohort', {
			name: 'Cohort',
			schoolId,
			startYear: '2026',
			endYear: '2027',
			classCode: 'JOIN',
			metadata: {},
			updatedAt: 1
		});
		const otherCohortId = await ctx.db.insert('cohort', {
			name: 'Other',
			schoolId,
			startYear: '2026',
			endYear: '2027',
			classCode: 'OTHER',
			metadata: {},
			updatedAt: 1
		});
		const semesterId = await ctx.db.insert('semester', {
			name: 'Semester',
			metadata: {},
			updatedAt: 1
		});
		const classId = await ctx.db.insert('class', {
			name: 'Class',
			description: '',
			code: 'T',
			order: 0,
			cohortId,
			semesterId,
			metadata: {},
			updatedAt: 1
		});
		const otherClassId = await ctx.db.insert('class', {
			name: 'Other',
			description: '',
			code: 'O',
			order: 0,
			cohortId: otherCohortId,
			semesterId,
			metadata: {},
			updatedAt: 1
		});
		const moduleId = await ctx.db.insert('module', {
			title: 'Module',
			description: '',
			order: 0,
			classId,
			cohortId,
			status: 'published',
			questionCount: 1,
			metadata: {},
			updatedAt: 1
		});
		const questionId = await ctx.db.insert('question', {
			moduleId,
			stem: 'Question',
			type: 'multiple_choice',
			options: [{ id: 'a', text: 'A' }],
			correctAnswers: ['a'],
			rationale: 'Because',
			aiGenerated: false,
			status: 'published',
			order: 0,
			metadata: {},
			updatedAt: 1
		});
		const studentId = await ctx.db.insert('users', {
			name: 'Student',
			clerkUserId: 'student',
			email: 'student@example.invalid',
			cohortId,
			metadata: {},
			updatedAt: 1
		});
		const peerId = await ctx.db.insert('users', {
			name: 'Peer',
			clerkUserId: 'peer',
			cohortId,
			metadata: {},
			updatedAt: 1
		});
		const adminId = await ctx.db.insert('users', {
			name: 'Admin',
			clerkUserId: 'admin',
			role: 'admin',
			cohortId,
			metadata: {},
			updatedAt: 1
		});
		const devId = await ctx.db.insert('users', {
			name: 'Dev',
			clerkUserId: 'dev',
			role: 'dev',
			cohortId,
			metadata: {},
			updatedAt: 1
		});
		await ctx.db.insert('users', {
			name: 'Curator',
			clerkUserId: 'curator',
			role: 'curator',
			cohortId,
			metadata: {},
			updatedAt: 1
		});
		await ctx.db.insert('users', {
			name: 'Outside',
			clerkUserId: 'outside',
			role: 'admin',
			cohortId: otherCohortId,
			metadata: {},
			updatedAt: 1
		});
		return {
			schoolId,
			cohortId,
			otherCohortId,
			semesterId,
			classId,
			otherClassId,
			moduleId,
			questionId,
			studentId,
			peerId,
			adminId,
			devId
		};
	});
	return {
		t,
		ids,
		student: t.withIdentity({ subject: 'student' }),
		peer: t.withIdentity({ subject: 'peer' }),
		admin: t.withIdentity({ subject: 'admin' }),
		curator: t.withIdentity({ subject: 'curator' }),
		dev: t.withIdentity({ subject: 'dev' }),
		outside: t.withIdentity({ subject: 'outside' })
	};
}

test('anonymous and student callers cannot create or delete administrative records; admins retain catalogue writes', async () => {
	const { t, student, admin, ids } = await setup();
	for (const caller of [t, student]) {
		await expect(
			caller.mutation(api.school.createSchool, {
				name: 'Injected',
				description: '',
				metadata: {},
				updatedAt: 1
			})
		).rejects.toThrow('Unauthorized');
		await expect(
			caller.mutation(api.school.deleteSchool, { schoolId: ids.schoolId })
		).rejects.toThrow('Unauthorized');
		await expect(
			caller.mutation(api.semester.createSemester, { name: 'Injected', metadata: {}, updatedAt: 1 })
		).rejects.toThrow('Unauthorized');
		await expect(
			caller.mutation(api.semester.deleteSemester, { semesterId: ids.semesterId })
		).rejects.toThrow('Unauthorized');
		await expect(
			caller.mutation(api.cohort.createCohort, {
				name: 'Injected',
				schoolId: ids.schoolId,
				startYear: '2026',
				endYear: '2027',
				metadata: {},
				updatedAt: 1
			})
		).rejects.toThrow('Unauthorized');
		await expect(
			caller.mutation(api.cohort.deleteCohort, { cohortId: ids.cohortId })
		).rejects.toThrow('Unauthorized');
	}
	const schoolId = await admin.mutation(api.school.createSchool, {
		name: 'Authorized',
		description: '',
		metadata: {},
		updatedAt: 1
	});
	await admin.mutation(api.school.deleteSchool, { schoolId });
	const semesterId = await admin.mutation(api.semester.createSemester, {
		name: 'Authorized',
		metadata: {},
		updatedAt: 1
	});
	await admin.mutation(api.semester.deleteSemester, { semesterId });
	await admin.mutation(api.cohort.createCohort, {
		name: 'Authorized',
		schoolId: ids.schoolId,
		startYear: '2026',
		endYear: '2027',
		metadata: {},
		updatedAt: 1
	});
	await admin.mutation(api.cohort.deleteCohort, { cohortId: ids.cohortId });
	expect(await t.run((ctx) => ctx.db.get(ids.cohortId))).toBeNull();
});

test('maintenance and bootstrap endpoints are internal; authenticated CLI maintenance still works', async () => {
	for (const fn of [
		...Object.values(migrations),
		moduleFunctions.backfillModuleCohortIds,
		moduleFunctions.backfillQuestionCounts,
		questionFunctions.backfillQuestionSearchTextForModule,
		questionFunctions.backfillSearchTextForAllModules,
		questionFunctions.backfillQuestionRationales,
		syncProducts
	]) {
		expect(fn).toHaveProperty('isInternal', true);
		expect(fn).not.toHaveProperty('isPublic');
	}
	const { t, ids } = await setup();
	await t.mutation(internal.migrations.bootstrapDev, { clerkUserId: 'student' });
	expect((await t.run((ctx) => ctx.db.get(ids.studentId)))?.role).toBe('dev');
	await expect(t.mutation(internal.module.backfillQuestionCounts, {})).resolves.toMatchObject({
		totalModules: 1
	});
});

test('onboarding and profile sync are self-only and repeated onboarding cannot duplicate a user', async () => {
	const { t, student, ids } = await setup();
	await expect(
		t.mutation(api.users.addUser, { clerkUserId: 'student', name: 'Spoof' })
	).rejects.toThrow('Unauthorized');
	await expect(
		student.mutation(api.users.addUser, { clerkUserId: 'admin', name: 'Spoof' })
	).rejects.toThrow('Unauthorized');
	await expect(
		t.mutation(api.users.syncUserFromClerk, {
			clerkUserId: 'student',
			email: 'spoof@example.invalid'
		})
	).rejects.toThrow('Unauthorized');
	await expect(
		student.mutation(api.users.syncUserFromClerk, {
			clerkUserId: 'admin',
			email: 'spoof@example.invalid'
		})
	).rejects.toThrow('Unauthorized');
	const newcomer = t.withIdentity({ subject: 'newcomer' });
	expect(await newcomer.query(api.users.getUserById, { id: 'newcomer' })).toBeNull();
	const first = await newcomer.mutation(api.users.addUser, {
		clerkUserId: 'newcomer',
		name: 'New User'
	});
	const second = await newcomer.mutation(api.users.addUser, {
		clerkUserId: 'newcomer',
		name: 'New User'
	});
	expect(second).toBe(first);
	await student.mutation(api.users.syncUserFromClerk, {
		clerkUserId: 'student',
		firstName: 'Updated',
		email: 'updated@example.invalid'
	});
	expect(await student.query(api.users.getUserById, { id: 'student' })).toMatchObject({
		_id: ids.studentId,
		firstName: 'Updated',
		email: 'updated@example.invalid'
	});
});

test('joining requires the caller identity and correct invitation; staff cannot transfer their privileges', async () => {
	const { t, student, admin, dev, ids } = await setup();
	const join = { clerkUserId: 'student', cohortId: ids.otherCohortId, code: 'OTHER' };
	await expect(t.mutation(api.cohort.joinCohort, join)).rejects.toThrow('Unauthorized');
	await expect(admin.mutation(api.cohort.joinCohort, join)).rejects.toThrow('Unauthorized');
	await expect(student.mutation(api.cohort.joinCohort, { ...join, code: 'wrong' })).rejects.toThrow(
		'Invalid code'
	);
	await expect(
		admin.mutation(api.cohort.joinCohort, { ...join, clerkUserId: 'admin' })
	).rejects.toThrow('already joined a class');
	await expect(student.mutation(api.cohort.joinCohort, join)).rejects.toThrow(
		'already joined a class'
	);
	expect((await t.run((ctx) => ctx.db.get(ids.studentId)))?.cohortId).toBe(ids.cohortId);
	await expect(
		admin.mutation(api.authQueries.joinCohort, {
			clerkUserId: 'student',
			cohortId: ids.otherCohortId
		})
	).rejects.toThrow('Unauthorized');
	await dev.mutation(api.authQueries.joinCohort, {
		clerkUserId: 'student',
		cohortId: ids.cohortId
	});
	expect((await t.run((ctx) => ctx.db.get(ids.studentId)))?.cohortId).toBe(ids.cohortId);
});

test('progress writes and resets remain available to the owner, never other callers', async () => {
	const { t, student, peer, ids } = await setup();
	const args = {
		userId: ids.studentId,
		classId: ids.classId,
		questionId: ids.questionId,
		selectedOptions: ['a'],
		isMastered: true
	};
	for (const caller of [t, peer]) {
		await expect(caller.mutation(api.userProgress.saveUserProgress, args)).rejects.toThrow(
			'Unauthorized'
		);
		await expect(
			caller.mutation(api.userProgress.deleteUserProgress, {
				userId: ids.studentId,
				questionId: ids.questionId
			})
		).rejects.toThrow('Unauthorized');
		await expect(
			caller.mutation(api.userProgress.clearUserProgressForModule, {
				userId: ids.studentId,
				moduleId: ids.moduleId
			})
		).rejects.toThrow('Unauthorized');
	}
	await expect(
		student.mutation(api.userProgress.saveUserProgress, { ...args, classId: ids.otherClassId })
	).rejects.toThrow('Question does not belong');
	await student.mutation(api.userProgress.saveUserProgress, args);
	expect(
		await student.query(api.userProgress.checkExistingRecord, {
			userId: ids.studentId,
			questionId: ids.questionId
		})
	).toMatchObject({ isMastered: false });
	expect(
		await student.mutation(api.userProgress.deleteUserProgress, {
			userId: ids.studentId,
			questionId: ids.questionId
		})
	).toBe(true);
	await student.mutation(api.userProgress.saveUserProgress, args);
	expect(
		await student.mutation(api.userProgress.clearUserProgressForModule, {
			userId: ids.studentId,
			moduleId: ids.moduleId
		})
	).toBe(1);
	expect(await t.run((ctx) => ctx.db.query('userProgress').collect())).toMatchObject([
		{
			userId: ids.studentId,
			questionId: ids.questionId,
			selectedOptions: [],
			eliminatedOptions: [],
			isFlagged: false,
			isMastered: false,
			attempts: 0
		}
	]);
});

test('private profiles, subscriptions and progress allow self and cohort staff, reject anonymous/peers/foreign staff', async () => {
	const { t, student, peer, admin, curator, dev, outside, ids } = await setup();
	for (const caller of [t, peer, outside]) {
		await expect(caller.query(api.users.getUserById, { id: 'student' })).rejects.toThrow();
		await expect(
			caller.query(api.polar.getUserWithSubscriptionById, { userId: ids.studentId })
		).rejects.toThrow();
		await expect(
			caller.query(api.polar.getUserWithSubscriptionByClerkId, { clerkUserId: 'student' })
		).rejects.toThrow();
		await expect(
			caller.query(api.userProgress.checkExistingRecord, {
				userId: ids.studentId,
				questionId: ids.questionId
			})
		).rejects.toThrow();
		await expect(
			caller.query(api.userProgress.getProgressForClass, {
				userId: ids.studentId,
				classId: ids.classId
			})
		).rejects.toThrow();
		await expect(
			caller.query(api.userProgress.getUserProgressForModule, {
				userId: ids.studentId,
				classId: ids.classId,
				questionIds: [ids.questionId]
			})
		).rejects.toThrow();
	}
	for (const caller of [student, admin, curator, dev]) {
		expect(await caller.query(api.users.getUserById, { id: 'student' })).toMatchObject({
			email: 'student@example.invalid'
		});
		expect(
			await caller.query(api.polar.getUserWithSubscriptionById, { userId: ids.studentId })
		).toMatchObject({ isPro: false });
		expect(
			await caller.query(api.polar.getUserWithSubscriptionByClerkId, { clerkUserId: 'student' })
		).toMatchObject({ isPro: false });
		await expect(
			caller.query(api.userProgress.checkExistingRecord, {
				userId: ids.studentId,
				questionId: ids.questionId
			})
		).resolves.toBeNull();
	}
});

test('analytics cannot bypass the private-profile restrictions; intended curator dashboards work', async () => {
	const { t, student, outside, curator, ids } = await setup();
	for (const caller of [t, student, outside]) {
		await expect(
			caller.query(api.progress.getStudentsWithProgress, { cohortId: ids.cohortId })
		).rejects.toThrow('Unauthorized');
		await expect(
			caller.query(api.curatorAnalytics.getModuleOverviewAnalytics, {
				cohortId: ids.cohortId,
				moduleId: ids.moduleId
			})
		).rejects.toThrow('Unauthorized');
	}
	expect(
		await curator.query(api.progress.getStudentsWithProgress, { cohortId: ids.cohortId })
	).toHaveLength(5);
	await expect(
		curator.query(api.curatorAnalytics.getModuleOverviewAnalytics, {
			cohortId: ids.cohortId,
			moduleId: ids.moduleId
		})
	).resolves.toBeDefined();
});

test('ordinary admins cannot promote themselves or anyone to dev/admin or manage foreign users', async () => {
	const { t, admin, dev, outside, ids } = await setup();
	await expect(
		admin.mutation(api.users.updateUserRole, { userId: ids.adminId, role: 'dev' })
	).rejects.toThrow();
	await expect(
		admin.mutation(api.users.updateUserRole, { userId: ids.studentId, role: 'dev' })
	).rejects.toThrow();
	await expect(
		admin.mutation(api.users.updateUserRole, { userId: ids.studentId, role: 'admin' })
	).rejects.toThrow();
	await expect(
		outside.mutation(api.users.updateUserRole, { userId: ids.studentId, role: 'curator' })
	).rejects.toThrow();
	await admin.mutation(api.users.updateUserRole, { userId: ids.studentId, role: 'curator' });
	expect((await t.run((ctx) => ctx.db.get(ids.studentId)))?.role).toBe('curator');
	await admin.mutation(api.users.updateUserRole, { userId: ids.studentId, role: null });
	await dev.mutation(api.users.updateUserRole, { userId: ids.studentId, role: 'admin' });
	expect((await t.run((ctx) => ctx.db.get(ids.studentId)))?.role).toBe('admin');
});

test('first enrollment succeeds, repeat enrollment is safe, and only developers can self-switch', async () => {
	const { t, student, dev, ids } = await setup();
	await t.run(async (ctx) => {
		await ctx.db.patch(ids.studentId, { cohortId: undefined });
	});
	const join = { clerkUserId: 'student', cohortId: ids.cohortId, code: 'JOIN' };
	await student.mutation(api.cohort.joinCohort, join);
	await student.mutation(api.cohort.joinCohort, join);
	await expect(
		student.mutation(api.cohort.joinCohort, {
			...join,
			cohortId: ids.otherCohortId,
			code: 'OTHER'
		})
	).rejects.toThrow('already joined a class');
	await dev.mutation(api.cohort.joinCohort, {
		clerkUserId: 'dev',
		cohortId: ids.otherCohortId,
		code: 'OTHER'
	});
	expect((await t.run((ctx) => ctx.db.get(ids.devId)))?.cohortId).toBe(ids.otherCohortId);
});

test('class and module APIs enforce cohort boundaries for every non-developer role', async () => {
	const { t, student, admin, dev, ids } = await setup();
	for (const caller of [student, admin, t.withIdentity({ subject: 'curator' })]) {
		await expect(caller.query(api.class.getUserClasses, { id: ids.otherCohortId })).rejects.toThrow(
			'access denied'
		);
		await expect(caller.query(api.class.getClassById, { id: ids.otherClassId })).rejects.toThrow(
			'access denied'
		);
		await expect(
			caller.query(api.module.getClassModules, { id: ids.otherClassId })
		).rejects.toThrow('access denied');
		await expect(
			caller.query(api.class.getClassContentCounts, { classId: ids.otherClassId })
		).rejects.toThrow('access denied');
		await expect(
			caller.query(api.tags.getTagsForClass, { classId: ids.otherClassId })
		).rejects.toThrow('access denied');
	}
	for (const subject of ['outside', 'unregistered']) {
		const caller = t.withIdentity({ subject });
		await expect(caller.query(api.module.getModuleById, { id: ids.moduleId })).rejects.toThrow();
		await expect(
			caller.query(api.module.getModuleQuestionCount, { moduleId: ids.moduleId })
		).rejects.toThrow();
		await expect(
			caller.query(api.question.getQuestionsByModule, { id: ids.moduleId })
		).rejects.toThrow();
		await expect(
			caller.query(api.question.getFirstQuestionInModule, { id: ids.moduleId })
		).rejects.toThrow();
		await expect(
			caller.query(api.question.getQuestionsByModuleAdmin, { id: ids.moduleId })
		).rejects.toThrow();
		await expect(
			caller.query(api.question.searchQuestionsByModuleAdmin, { id: ids.moduleId, query: '' })
		).rejects.toThrow();
		await expect(
			caller.query(api.tags.getTagsForModule, { moduleId: ids.moduleId })
		).rejects.toThrow();
	}
	await expect(
		student.query(api.question.getQuestionsByModule, { id: ids.moduleId })
	).resolves.toHaveLength(1);
	await expect(student.query(api.module.getAdminModule, { id: ids.classId })).rejects.toThrow(
		'Unauthorized'
	);
	await expect(admin.query(api.module.getAdminModule, { id: ids.classId })).resolves.toHaveLength(
		1
	);
	await expect(dev.query(api.class.getClassById, { id: ids.otherClassId })).resolves.toMatchObject({
		_id: ids.otherClassId
	});
	await t.run((ctx) => ctx.db.patch(ids.devId, { cohortId: ids.otherCohortId }));
	await expect(
		dev.query(api.question.getQuestionsByModuleAdmin, { id: ids.moduleId })
	).resolves.toHaveLength(1);
	for (const query of [
		api.class.getAllClasses,
		api.module.getAllModules,
		api.question.getAllQuestions
	]) {
		await expect(student.query(query, {})).rejects.toThrow('Unauthorized');
		await expect(dev.query(query, {})).resolves.toBeInstanceOf(Array);
	}
});

test('foreign staff cannot edit, delete, or create content through direct requests', async () => {
	const { outside, t, ids } = await setup();
	await expect(
		outside.mutation(api.class.deleteClass, { classId: ids.classId, cohortId: ids.cohortId })
	).rejects.toThrow('Unauthorized');
	await expect(
		outside.mutation(api.module.deleteModule, { moduleId: ids.moduleId, classId: ids.classId })
	).rejects.toThrow('access denied');
	await expect(
		outside.mutation(api.tags.createTag, { classId: ids.classId, name: 'Foreign tag' })
	).rejects.toThrow('access denied');
	await expect(
		outside.mutation(api.question.deleteQuestion, {
			questionId: ids.questionId,
			moduleId: ids.moduleId
		})
	).rejects.toThrow('access denied');
	await expect(
		outside.mutation(api.question.bulkInsertQuestions, { moduleId: ids.moduleId, questions: [] })
	).rejects.toThrow('access denied');
	await expect(
		outside.mutation(api.question.duplicateQuestion, { questionId: ids.questionId })
	).rejects.toThrow('access denied');
	expect(await t.run((ctx) => ctx.db.get(ids.questionId))).not.toBeNull();
});

test('shared access helpers reject deleted users and foreign or deleted classes across modules', async () => {
	const { t, student, dev, ids } = await setup();
	await expect(
		student.query(api.customQuiz.getUserAttemptsForClass, { classId: ids.classId })
	).resolves.toEqual([]);
	await expect(
		student.query(api.customQuiz.getUserAttemptsForClass, { classId: ids.otherClassId })
	).rejects.toThrow('access denied');
	await expect(
		dev.query(api.customQuiz.getUserAttemptsForClass, { classId: ids.otherClassId })
	).resolves.toEqual([]);

	await t.run((ctx) => ctx.db.patch(ids.classId, { deletedAt: 1 }));
	await expect(
		student.query(api.customQuiz.getUserAttemptsForClass, { classId: ids.classId })
	).rejects.toThrow('access denied');

	await t.run((ctx) => ctx.db.patch(ids.studentId, { deletedAt: 1 }));
	await expect(
		student.query(api.customQuiz.getUserAttemptsForClass, { classId: ids.otherClassId })
	).rejects.toThrow('Unauthorized');
	await expect(student.query(api.featureAnnouncements.getCurrentForViewer, {})).rejects.toThrow(
		'Unauthorized'
	);
	await expect(
		student.mutation(api.r2Documents.generateUploadUrl, {
			cohortId: ids.cohortId,
			fileName: 'notes.pdf'
		})
	).rejects.toThrow('Unauthorized');
});

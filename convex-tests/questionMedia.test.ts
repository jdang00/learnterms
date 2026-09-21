import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import rateLimiter from '@convex-dev/rate-limiter/test';
import { api, internal } from '../src/convex/_generated/api';
import { setup } from './questionStudio.fixtures';
import { r2 } from '../src/convex/r2Documents';

vi.mock('../src/convex/r2Documents', () => ({
	r2: {
		generateUploadUrl: vi.fn(async (key: string) => ({ key, url: `https://r2.test/put/${key}` })),
		getUrl: vi.fn(async (key: string) => `https://r2.test/get/${key}?signed=yes`),
		store: vi.fn(async () => 'stored'),
		deleteObject: vi.fn(async () => {})
	}
}));

beforeEach(() => {
	vi.useFakeTimers();
	vi.clearAllMocks();
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

const png = Uint8Array.from(
	atob(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='
	),
	(c) => c.charCodeAt(0)
);

async function fixture() {
	const base = await setup();
	rateLimiter.register(base.t);
	const extra = await base.t.run(async (ctx) => {
		const cohort = (await ctx.db.get(base.ids.cohortId))!;
		const { _id, _creationTime, ...cohortFields } = cohort;
		const foreignCohortId = await ctx.db.insert('cohort', {
			...cohortFields,
			name: 'Other cohort'
		});
		for (const [subject, cohortId, role] of [
			['student', base.ids.cohortId, undefined],
			['outsider', foreignCohortId, 'admin'],
			['dev', foreignCohortId, 'dev']
		] as const)
			await ctx.db.insert('users', {
				name: subject,
				clerkUserId: subject,
				cohortId,
				role,
				metadata: {},
				updatedAt: 1
			});
		const module = (await ctx.db.get(base.ids.moduleId))!;
		const { _id: moduleId, _creationTime: moduleTime, ...moduleFields } = module;
		const otherModuleId = await ctx.db.insert('module', {
			...moduleFields,
			title: 'Another module'
		});
		return { otherModuleId, foreignCohortId };
	});
	const questionArgs = {
		moduleId: base.ids.moduleId,
		type: 'multiple_choice',
		stem: 'Identify this image.',
		options: [{ text: 'A' }, { text: 'B' }],
		correctAnswers: ['0'],
		rationale: 'A is correct.',
		aiGenerated: false,
		status: 'published',
		order: 0,
		metadata: {},
		updatedAt: 1
	};
	const beginArgs = {
		moduleId: base.ids.moduleId,
		fileName: '../../clinical image.png',
		mimeType: 'image/png',
		sizeBytes: png.length
	};
	const readyUpload = async () => {
		const { uploadId } = await base.owner.mutation(api.questionMediaUploads.begin, beginArgs);
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(png))
		);
		await base.owner.action(api.questionMediaActions.complete, { uploadId });
		return uploadId;
	};
	return { ...base, ...extra, questionArgs, beginArgs, readyUpload };
}

test('uploads are scoped by the module and verified into a separate immutable final key', async () => {
	const { t, ids, owner, beginArgs } = await fixture();
	const { uploadId, url } = await owner.mutation(api.questionMediaUploads.begin, beginArgs);
	const upload = (await t.run((ctx) => ctx.db.get(uploadId)))!;
	expect(upload.cohortId).toBe(ids.cohortId);
	expect(upload.uploadedBy).toBe(ids.owner);
	expect(upload.originalFileName).toBe('clinical image.png');
	expect(upload.stagingKey).toContain(`cohorts/${ids.cohortId}/classes/`);
	expect(upload.stagingKey).toContain(`/modules/${ids.moduleId}/question-media/pending/`);
	expect(upload.r2Key).toContain('/question-media/images/');
	expect(url).toContain(upload.stagingKey);
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => new Response(png))
	);
	await owner.action(api.questionMediaActions.complete, { uploadId });
	expect(r2.store).toHaveBeenCalledWith(
		expect.anything(),
		expect.any(Uint8Array),
		expect.objectContaining({ key: upload.r2Key, type: 'image/png', disposition: 'inline' })
	);
	expect((await t.run((ctx) => ctx.db.get(uploadId)))?.status).toBe('ready');
	await owner.action(api.questionMediaActions.complete, { uploadId });
	expect(r2.store).toHaveBeenCalledTimes(1);
});

test('unauthenticated users, students and other cohorts cannot upload; upload ownership is checked', async () => {
	const { t, owner, beginArgs } = await fixture();
	for (const actor of [
		t,
		t.withIdentity({ subject: 'student' }),
		t.withIdentity({ subject: 'outsider' })
	]) {
		await expect(actor.mutation(api.questionMediaUploads.begin, beginArgs)).rejects.toThrow();
	}
	const { uploadId } = await owner.mutation(api.questionMediaUploads.begin, beginArgs);
	for (const subject of ['other', 'outsider', 'student']) {
		await expect(
			t.withIdentity({ subject }).action(api.questionMediaActions.complete, { uploadId })
		).rejects.toThrow(/access denied/);
		await expect(
			t.withIdentity({ subject }).mutation(api.questionMediaUploads.discard, { uploadId })
		).rejects.toThrow(/access denied/);
	}
	expect(r2.store).not.toHaveBeenCalled();
});

test('rejects unsupported MIME types, zero/oversized images, spoofed file contents and size mismatch', async () => {
	const { owner, beginArgs } = await fixture();
	for (const override of [
		{ mimeType: 'image/svg+xml' },
		{ mimeType: 'application/pdf' },
		{ sizeBytes: 0 },
		{ sizeBytes: 8 * 1024 * 1024 + 1 }
	]) {
		await expect(
			owner.mutation(api.questionMediaUploads.begin, { ...beginArgs, ...override })
		).rejects.toThrow();
	}
	const bad = await owner.mutation(api.questionMediaUploads.begin, beginArgs);
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => new Response('<svg><script>alert(1)</script></svg>'))
	);
	await expect(
		owner.action(api.questionMediaActions.complete, { uploadId: bad.uploadId })
	).rejects.toThrow();
	const mismatch = await owner.mutation(api.questionMediaUploads.begin, {
		...beginArgs,
		sizeBytes: png.length + 1
	});
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => new Response(png))
	);
	await expect(
		owner.action(api.questionMediaActions.complete, { uploadId: mismatch.uploadId })
	).rejects.toThrow('do not match');
	const huge = await owner.mutation(api.questionMediaUploads.begin, beginArgs);
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => new Response(png, { headers: { 'content-length': String(9 * 1024 * 1024) } }))
	);
	await expect(
		owner.action(api.questionMediaActions.complete, { uploadId: huge.uploadId })
	).rejects.toThrow('exceeds');
	expect(r2.store).not.toHaveBeenCalled();
});

test('question save attaches verified images atomically and retains legacy URLs in mixed quiz reads', async () => {
	const { t, owner, questionArgs, readyUpload } = await fixture();
	const uploadId = await readyUpload();
	const questionId = await owner.mutation(api.question.insertQuestion, {
		...questionArgs,
		images: [{ uploadId, altText: 'Fundus photograph', caption: 'Right eye', showOnSolution: true }]
	});
	const legacyUrl = 'https://legacy.ufs.sh/f/original-image';
	await t.run((ctx) =>
		ctx.db.insert('questionMedia', {
			questionId,
			url: legacyUrl,
			type: 'external',
			mediaType: 'image',
			mimeType: 'image/png',
			altText: 'Legacy image',
			order: 1,
			updatedAt: 1,
			metadata: { uploadthingKey: 'original-image' }
		})
	);
	const media = await t
		.withIdentity({ subject: 'student' })
		.query(api.questionMedia.getByQuestionId, { questionId, urlRefresh: 1 });
	expect(media).toHaveLength(2);
	expect(media[0].url).toMatch(/^https:\/\/r2.test\/get\//);
	expect(media[0].showOnSolution).toBe(true);
	expect(media[1].url).toBe(legacyUrl);
	expect((await t.run((ctx) => ctx.db.get(media[0]._id)))?.url).toBe('');
	expect((await t.run((ctx) => ctx.db.get(uploadId)))?.status).toBe('attached');
	const { aiGenerated, order, metadata, updatedAt, ...editArgs } = questionArgs;
	await owner.mutation(api.question.updateQuestion, {
		...editArgs,
		questionId,
		images: [{ uploadId, altText: 'Fundus photograph' }]
	});
	expect(await owner.query(api.questionMedia.getByQuestionId, { questionId })).toHaveLength(2);
	await owner.mutation(api.questionMedia.softDelete, { mediaId: media[1]._id });
	expect(await owner.query(api.questionMedia.getByQuestionId, { questionId })).toHaveLength(1);
	expect(r2.deleteObject).not.toHaveBeenCalled();
});

test('cross-cohort reads, updates and deletes are denied for R2 and legacy media', async () => {
	const { t, owner, questionArgs, readyUpload } = await fixture();
	const uploadId = await readyUpload();
	const questionId = await owner.mutation(api.question.insertQuestion, {
		...questionArgs,
		images: [{ uploadId, altText: 'Image' }]
	});
	const [media] = await owner.query(api.questionMedia.getByQuestionId, { questionId });
	for (const actor of [t, t.withIdentity({ subject: 'outsider' })]) {
		await expect(actor.query(api.questionMedia.getByQuestionId, { questionId })).rejects.toThrow();
		await expect(
			actor.query(api.questionMedia.getByQuestionIds, { questionIds: [questionId] })
		).rejects.toThrow();
		await expect(
			actor.mutation(api.questionMedia.update, { mediaId: media._id, caption: 'Bad' })
		).rejects.toThrow();
		await expect(
			actor.mutation(api.questionMedia.softDelete, { mediaId: media._id })
		).rejects.toThrow();
	}
	await expect(
		t
			.withIdentity({ subject: 'student' })
			.mutation(api.questionMedia.update, { mediaId: media._id, caption: 'Bad' })
	).rejects.toThrow();
	expect(
		await t
			.withIdentity({ subject: 'dev' })
			.query(api.questionMedia.getByQuestionId, { questionId })
	).toHaveLength(1);
});

test('invalid attachment rolls back question creation and cannot be attached in another module or by another curator', async () => {
	const { t, owner, questionArgs, beginArgs, otherModuleId, readyUpload } = await fixture();
	const pending = await owner.mutation(api.questionMediaUploads.begin, beginArgs);
	await expect(
		owner.mutation(api.question.insertQuestion, {
			...questionArgs,
			images: [{ uploadId: pending.uploadId, altText: '' }]
		})
	).rejects.toThrow('not ready');
	expect(await t.run((ctx) => ctx.db.query('question').collect())).toHaveLength(0);
	const uploadId = await readyUpload();
	await expect(
		owner.mutation(api.question.insertQuestion, {
			...questionArgs,
			moduleId: otherModuleId,
			images: [{ uploadId, altText: '' }]
		})
	).rejects.toThrow('different module');
	await expect(
		t
			.withIdentity({ subject: 'other' })
			.mutation(api.question.insertQuestion, {
				...questionArgs,
				images: [{ uploadId, altText: '' }]
			})
	).rejects.toThrow('access denied');
	expect(await t.run((ctx) => ctx.db.query('question').collect())).toHaveLength(0);
});

test('expired and canceled uploads cannot be attached; cleanup preserves attached images and deletes temporary files', async () => {
	const { t, owner, questionArgs, readyUpload } = await fixture();
	const abandoned = await readyUpload();
	await owner.mutation(api.questionMediaUploads.discard, { uploadId: abandoned });
	await expect(
		owner.mutation(api.question.insertQuestion, {
			...questionArgs,
			images: [{ uploadId: abandoned, altText: '' }]
		})
	).rejects.toThrow('not ready');
	const expired = await readyUpload();
	await t.run((ctx) => ctx.db.patch(expired, { expiresAt: Date.now() - 1 }));
	await expect(
		owner.mutation(api.question.insertQuestion, {
			...questionArgs,
			images: [{ uploadId: expired, altText: '' }]
		})
	).rejects.toThrow('expired');
	const attached = await readyUpload();
	await owner.mutation(api.question.insertQuestion, {
		...questionArgs,
		images: [{ uploadId: attached, altText: 'Image' }]
	});
	for (const uploadId of [abandoned, expired, attached]) {
		const upload = (await t.run((ctx) => ctx.db.get(uploadId)))!;
		await t.run((ctx) => ctx.db.patch(uploadId, { expiresAt: Date.now() - 16 * 60 * 1000 }));
		vi.mocked(r2.deleteObject).mockClear();
		await t.mutation(internal.questionMediaUploads.cleanup, { uploadId });
		expect(r2.deleteObject).toHaveBeenCalledWith(expect.anything(), upload.stagingKey);
		if (uploadId === attached) expect(r2.deleteObject).toHaveBeenCalledTimes(1);
		else expect(r2.deleteObject).toHaveBeenCalledWith(expect.anything(), upload.r2Key);
		expect(await t.run((ctx) => ctx.db.get(uploadId))).toBeNull();
	}
});

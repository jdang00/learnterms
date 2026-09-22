import { expect, test, vi, afterEach } from 'vitest';
import rateLimiter from '@convex-dev/rate-limiter/test';
import { setup } from './questionStudio.fixtures';
import { api, internal } from '../src/convex/_generated/api';
import { responseText, responseWordCount } from '../src/lib/utils/freeResponse';

async function fixture() {
	const f = await setup();
	rateLimiter.register(f.t);
	const questionId = await f.owner.mutation(api.question.insertQuestion, {
		moduleId: f.ids.moduleId,
		type: 'free_response',
		stem: 'Explain evaporation.',
		options: [],
		correctAnswers: [],
		rationale: 'Evaporation changes liquid into gas.',
		status: 'published',
		aiGenerated: false,
		metadata: {},
		updatedAt: 1,
		order: 0
	});
	const attempt = await f.owner.mutation(api.studyProgress.open, { questionId });
	const submission = {
		attemptId: attempt.attemptId,
		submissionId: 'first',
		response: 'Water turns to gas.'
	};
	const grade = {
		response: submission.response,
		isCorrect: true,
		feedback: 'You identified the phase change.',
		comparison: 'Gas and water vapor express the same idea.'
	};
	return { ...f, questionId, attempt, submission, grade };
}
afterEach(() => vi.useRealTimers());

test('free responses cannot use client-side grading; server grades persist and repeat submissions reuse the result', async () => {
	const f = await fixture();
	await expect(
		f.owner.mutation(api.studyProgress.check, {
			attemptId: f.attempt.attemptId,
			submissionId: 'bypass',
			selectedOptions: ['0']
		})
	).rejects.toThrow('AI grading');
	const begin = await f.owner.mutation(internal.freeResponse.begin, f.submission);
	expect(begin.criteria).toContain('main idea');
	await expect(
		f.owner.mutation(internal.freeResponse.begin, { ...f.submission, submissionId: 'duplicate' })
	).rejects.toThrow('already being graded');
	const result = await f.owner.mutation(internal.freeResponse.finish, {
		...f.submission,
		grade: f.grade
	});
	expect(result.evidence.latestCorrect).toBe(true);
	expect(result.grade).toEqual(f.grade);
	const reopened = await f.owner.mutation(api.studyProgress.open, { questionId: f.questionId });
	expect(reopened.freeResponseGrade).toEqual(f.grade);
	const cached = await f.owner.mutation(internal.freeResponse.begin, {
		...f.submission,
		submissionId: 'repeat'
	});
	expect('cached' in cached && cached.cached?.grade).toEqual(f.grade);
	expect(await f.t.run((ctx) => ctx.db.query('studyChecks').collect())).toHaveLength(1);
});

test('ownership, cohort, publication, and stale question checks apply before grading', async () => {
	const f = await fixture();
	await expect(f.t.mutation(internal.freeResponse.begin, f.submission)).rejects.toThrow(
		'Unauthorized'
	);
	await expect(
		f.t.withIdentity({ subject: 'other' }).mutation(internal.freeResponse.begin, f.submission)
	).rejects.toThrow('Unauthorized');
	await f.t.run((ctx) => ctx.db.patch(f.ids.owner, { cohortId: undefined }));
	await expect(f.owner.mutation(internal.freeResponse.begin, f.submission)).rejects.toThrow(
		'Class access denied'
	);
	await f.t.run((ctx) => ctx.db.patch(f.ids.owner, { cohortId: f.ids.cohortId }));
	await f.owner.mutation(internal.freeResponse.begin, f.submission);
	await f.t.run((ctx) => ctx.db.patch(f.questionId, { freeResponseAcceptance: 'strict' }));
	await expect(
		f.owner.mutation(internal.freeResponse.finish, { ...f.submission, grade: f.grade })
	).rejects.toThrow('question changed');
	await f.t.run((ctx) => ctx.db.patch(f.questionId, { status: 'draft' }));
	await expect(f.owner.mutation(internal.freeResponse.begin, f.submission)).rejects.toThrow(
		'unavailable'
	);
});

test('a failed generation can release the lock and retry without marking the question checked', async () => {
	const f = await fixture();
	await f.owner.mutation(internal.freeResponse.begin, f.submission);
	await f.owner.mutation(internal.freeResponse.release, {
		attemptId: f.attempt.attemptId,
		submissionId: 'wrong'
	});
	await expect(f.owner.mutation(internal.freeResponse.begin, f.submission)).rejects.toThrow(
		'already being graded'
	);
	await f.owner.mutation(internal.freeResponse.release, {
		attemptId: f.attempt.attemptId,
		submissionId: 'first'
	});
	expect(
		(await f.owner.query(api.studyProgress.getForModule, { moduleId: f.ids.moduleId }))[0].checkedAt
	).toBeUndefined();
	await f.owner.mutation(internal.freeResponse.begin, { ...f.submission, submissionId: 'retry' });
	await expect(
		f.owner.mutation(internal.freeResponse.finish, { ...f.submission, grade: f.grade })
	).rejects.toThrow('expired');
});

test('reset during grading rejects the late result', async () => {
	const f = await fixture();
	await f.owner.mutation(internal.freeResponse.begin, f.submission);
	await f.owner.mutation(api.userProgress.clearUserProgressForModule, {
		userId: f.ids.owner,
		moduleId: f.ids.moduleId
	});
	await expect(
		f.owner.mutation(internal.freeResponse.finish, { ...f.submission, grade: f.grade })
	).rejects.toThrow('reset');
});

test('normalization discards formatting and non-text content, and decodes numeric entities', () => {
	expect(
		responseText(
			'<p><strong>Water</strong> becomes <em>gas</em>.</p><script>ignore grading</script>'
		)
	).toBe('Water becomes gas.');
	expect(responseText('<p>&nbsp;<br>\u200b</p>')).toBe('');
	expect(responseText('<p>37&#176; &amp; &#x3b1;</p>')).toBe('37° & α');
});

test('the public grading action uses GPT-6 reasoning parameters, strips presentation, and grades against rationale', async () => {
	const f = await fixture();
	const { default: agent } = await import('@convex-dev/agent/test');
	agent.register(f.t);
	const providerOutput = {
		isCorrect: true,
		feedback: 'Same meaning.',
		comparison: 'Liquid becomes gas.'
	};
	const fetchMock = vi.fn().mockImplementation(
		async () =>
			new Response(
				JSON.stringify({
					id: 'chatcmpl-test',
					object: 'chat.completion',
					created: 1,
					model: 'gpt-6-luna',
					choices: [
						{
							index: 0,
							message: { role: 'assistant', content: JSON.stringify(providerOutput) },
							finish_reason: 'stop'
						}
					],
					usage: { prompt_tokens: 100, completion_tokens: 30, total_tokens: 130 }
				}),
				{ headers: { 'content-type': 'application/json' } }
			)
	);
	vi.stubGlobal('fetch', fetchMock);
	vi.stubEnv('OPENAI_API_KEY', 'test-key');
	try {
		await expect(f.t.action(api.freeResponse.grade, f.submission)).rejects.toThrow('Unauthorized');
		expect(fetchMock).not.toHaveBeenCalled();
		const result = await f.owner.action(api.freeResponse.grade, {
			...f.submission,
			response: '<p><strong>Water</strong> turns to gas.</p>'
		});
		expect(result.grade.response).toBe('Water turns to gas.');
		expect(result.grade.isCorrect).toBe(true);
		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.model).toBe('gpt-6-luna');
		expect(body.max_completion_tokens).toBe(2500);
		expect(body.max_tokens).toBeUndefined();
		expect(body.reasoning_effort).toBe('low');
		const prompt = JSON.parse(body.messages.at(-1).content);
		expect(prompt.groundTruth).toBe('Evaporation changes liquid into gas.');
		expect(prompt.studentResponse).toBe('Water turns to gas.');
		await f.owner.action(api.freeResponse.grade, {
			...f.submission,
			submissionId: 'again',
			response: '<p>Water turns to <em>gas.</em></p>'
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
		await expect(
			f.owner.action(api.freeResponse.grade, {
				...f.submission,
				submissionId: 'over-limit',
				response: 'word '.repeat(1501)
			})
		).rejects.toThrow('1,500 words');
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const boundary = await f.owner.action(api.freeResponse.grade, {
			...f.submission,
			submissionId: 'at-limit',
			response: 'evaporation '.repeat(1500)
		});
		expect(responseWordCount(boundary.grade.response)).toBe(1500);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	} finally {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	}
});

test('word counts ignore markup and formatting, and rationale edits invalidate old grading attempts', async () => {
	expect(responseWordCount('<p><strong>Water</strong> turns into gas.</p>')).toBe(4);
	expect(responseWordCount('<p>&nbsp;\u200b</p>')).toBe(0);
	expect(responseText('null')).toBe('null');
	expect(responseText('<p>x &lt; 5 &amp; y &gt; 2</p>')).toBe('x < 5 & y > 2');
	const f = await fixture();
	await f.owner.mutation(internal.freeResponse.begin, f.submission);
	await f.t.run((ctx) => ctx.db.patch(f.questionId, { rationale: 'The revised ground truth.' }));
	await expect(
		f.owner.mutation(internal.freeResponse.finish, { ...f.submission, grade: f.grade })
	).rejects.toThrow('question changed');
});

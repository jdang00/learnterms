import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { api, internal } from '../src/convex/_generated/api';
import { convexTest, modules, schema, setup } from './questionStudio.fixtures';
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

test('reindex failure preserves extracted artifacts', async () => {
	const { t, ids } = await setup();
	await t.run((ctx) =>
		ctx.db.patch(ids.documentId, {
			metadata: {
				indexedAt: 1,
				ragEntryId: 'old',
				extractionArtifactKeys: ['old.md'],
				pageCount: 39,
				ingestionStatus: 'indexed'
			}
		})
	);
	await t.mutation(internal.ragKnowledgeInternal.updateDocumentIngestion, {
		documentId: ids.documentId,
		status: 'indexing'
	});
	await t.mutation(internal.ragKnowledgeInternal.updateDocumentIngestion, {
		documentId: ids.documentId,
		status: 'failed',
		indexError: 'OCR failed'
	});
	const doc = await t.run((ctx) => ctx.db.get(ids.documentId));
	expect(doc?.metadata?.extractionArtifactKeys).toEqual(['old.md']);
	expect(doc?.metadata?.ragEntryId).toBe('old');
	expect(doc?.metadata?.indexedAt).toBe(1);
});
test('AI telemetry converts reserved keys after the Convex boundary and survives transport failure', async () => {
	const t = convexTest(schema, modules);
	const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
	vi.stubGlobal('fetch', fetchMock);
	await t.action(internal.aiTelemetry.capture, {
		event: '$ai_generation',
		distinctId: 'test',
		properties: { ai_input_tokens: 42, ai_is_error: false, evaluation: true }
	});
	const body = JSON.parse(fetchMock.mock.calls[0][1].body);
	expect(body.properties.$ai_input_tokens).toBe(42);
	expect(body.properties.ai_input_tokens).toBeUndefined();
	expect(body.properties.product).toBe('LearnTerms');
	fetchMock.mockRejectedValue(new Error('offline'));
	await expect(
		t.action(internal.aiTelemetry.capture, {
			event: 'test',
			distinctId: 'test',
			properties: { evaluation: true }
		})
	).resolves.toBeNull();
	vi.unstubAllGlobals();
});

function claudeText(text: string) {
	return new Response(
		JSON.stringify({
			id: 'msg_test',
			type: 'message',
			role: 'assistant',
			model: 'claude-haiku-5-5',
			content: [{ type: 'text', text }],
			stop_reason: 'end_turn',
			usage: { input_tokens: 10, output_tokens: 2 }
		}),
		{ headers: { 'content-type': 'application/json' } }
	);
}

test('emoji suggestion authenticates before spending and only accepts a single emoji', async () => {
	const { default: rateLimiter } = await import('@convex-dev/rate-limiter/test');
	const { t, ids, owner } = await setup();
	rateLimiter.register(t);
	const classId = (await t.run((ctx) => ctx.db.get(ids.moduleId)))!.classId;
	const fetchMock = vi.fn().mockImplementation(async () => claudeText('👁️'));
	vi.stubGlobal('fetch', fetchMock);
	vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
	try {
		await expect(
			t.action(api.moduleEmoji.suggest, { classId, title: 'Ocular anatomy' })
		).rejects.toThrow('Sign in');
		expect(fetchMock).not.toHaveBeenCalled();
		expect(await owner.action(api.moduleEmoji.suggest, { classId, title: 'Ocular anatomy' })).toBe(
			'👁️'
		);
		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.model).toBe('claude-haiku-5-5');
		expect(body.thinking).toEqual({ type: 'disabled' });
		expect(body.output_config.effort).toBe('low');
		expect(body.max_tokens).toBe(32);
		fetchMock.mockImplementation(async () => claudeText('Use 👁️ for this module'));
		expect(
			await owner.action(api.moduleEmoji.suggest, { classId, title: 'Ocular anatomy' })
		).toBeNull();
		await t.run((ctx) => ctx.db.patch(ids.owner, { role: undefined }));
		await expect(
			owner.action(api.moduleEmoji.suggest, { classId, title: 'Ocular anatomy' })
		).rejects.toThrow('Class access denied');
		expect(fetchMock).toHaveBeenCalledTimes(2);
	} finally {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	}
});

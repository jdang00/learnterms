import { Agent } from '@convex-dev/agent';
import { MINUTE, RateLimiter } from '@convex-dev/rate-limiter';
import { components, internal } from '../_generated/api';
import type { ActionCtx } from '../_generated/server';
import { QUESTION_STUDIO_MODEL, questionStudioOpenAI } from './shared';

export async function captureTelemetry(
	ctx: ActionCtx,
	args: { event: string; distinctId: string; properties: Record<string, unknown> }
) {
	try {
		// Durable scheduling keeps telemetry HTTP latency off the generation critical path.
		await ctx.scheduler.runAfter(0, internal.aiTelemetry.capture, args);
	} catch {
		console.warn('Question telemetry unavailable');
	}
}

export const questionStudioRateLimiter = new RateLimiter(components.rateLimiter, {
	questionStudioGenerationStart: { kind: 'fixed window', rate: 6, period: 10 * MINUTE },
	questionStudioGlobalGenerationStart: { kind: 'fixed window', rate: 80, period: MINUTE },
	questionStudioTokenUsagePerUser: {
		kind: 'token bucket',
		rate: 120_000,
		period: MINUTE,
		capacity: 240_000
	},
	questionStudioGlobalTokenUsage: {
		kind: 'token bucket',
		rate: 1_000_000,
		period: MINUTE,
		capacity: 2_000_000
	}
});

export function createQuestionStudioAgent(
	model = QUESTION_STUDIO_MODEL,
	usageAlreadyReserved = false
) {
	return new Agent(components.agent, {
		name: 'Question Studio Curator',
		languageModel: questionStudioOpenAI().chat(model),
		instructions: [
			'You are a LearnTerms curriculum question curator.',
			'Use only the provided source notes and context.',
			'Prefer precise, teachable medical or course-relevant phrasing.',
			'Never invent facts that are not supported by the retrieved notes.',
			'Multiple choice questions must have one correct answer, plausible distractors, and a concise rationale.'
		].join('\n'),
		usageHandler: async (ctx, { usage, userId }) => {
			if (usageAlreadyReserved || !userId || !usage?.totalTokens) return;
			await questionStudioRateLimiter.limit(ctx, 'questionStudioTokenUsagePerUser', {
				key: userId,
				count: usage.totalTokens,
				reserve: true
			});
			await questionStudioRateLimiter.limit(ctx, 'questionStudioGlobalTokenUsage', {
				count: usage.totalTokens,
				reserve: true
			});
		}
	});
}

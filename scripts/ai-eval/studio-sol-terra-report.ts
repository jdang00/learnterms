/** Read-only aggregation of provider results; never makes model calls. */
import { mkdirSync } from 'node:fs';
const root = 'tmp/studio-sol-terra';
const destination = 'dev/benchmarks/question-studio/2026-09-21-sol-terra';
mkdirSync(destination, { recursive: true });
const ledger = await Bun.file(`${root}/ledger.json`).json();
const runs: any[] = [];
for await (const path of new Bun.Glob('*.json').scan(root)) {
	if (path === 'ledger.json') continue;
	const result = await Bun.file(`${root}/${path}`).json();
	if (result.runId && result.summary) runs.push(result);
}
runs.sort(
	(a, b) =>
		ledger.findIndex((e: any) => e.runId === a.runId) -
		ledger.findIndex((e: any) => e.runId === b.runId)
);
const measuredUsd = ledger.reduce((s: number, e: any) => s + (e.costUsd ?? 0), 0);
const unknownReservedUsd = ledger
	.filter((e: any) => e.costUsd === undefined)
	.reduce((s: number, e: any) => s + e.reservedUsd, 0);
const rates: any = {
	luna: { input: 0.2, output: 1.2 },
	terra: { input: 2, output: 12 },
	sol: { input: 4, output: 20 }
};
// Recompute conservative cold-write estimates consistently, including the first process
// which originally recorded normal uncached-read rates in its auxiliary cold fields.
const cold = (e: any) =>
	e.inputTokens === undefined
		? e.reservedUsd
		: (e.inputTokens * rates[e.model].input * 1.25 + e.outputTokens * rates[e.model].output) / 1e6;
const clean = runs.map((r) => {
	const own = ledger.filter((e: any) => e.runId === r.runId);
	const draft = ledger.filter(
		(e: any) => e.runId === (r.config.reviewOf ?? r.runId) && e.stage === 'draft'
	);
	const review = own.filter((e: any) => e.stage === 'review');
	return {
		runId: r.runId,
		config: r.config,
		fixtureHash: r.fixtureHash,
		...r.summary,
		draftCostUsd: draft.reduce((s: number, e: any) => s + (e.costUsd ?? e.reservedUsd), 0),
		reviewCostUsd: review.reduce((s: number, e: any) => s + (e.costUsd ?? e.reservedUsd), 0),
		withReviewCostUsd: [...draft, ...review].reduce(
			(s: number, e: any) => s + (e.costUsd ?? e.reservedUsd),
			0
		),
		coldDraftCostUsd: draft.reduce((s: number, e: any) => s + cold(e), 0),
		coldWithReviewCostUsd: [...draft, ...review].reduce((s: number, e: any) => s + cold(e), 0),
		reviewedSlotIds: r.reviewed?.map((q: any) => q.slotId) ?? null,
		calls: own.map(
			({
				model,
				effort,
				stage,
				status,
				inputTokens,
				outputTokens,
				reasoningTokens,
				cachedInputTokens,
				cacheWriteTokens,
				latencyMs,
				costUsd,
				reservedUsd,
				serviceTier,
				httpStatus,
				finishReason,
				error
			}: any) => ({
				model,
				effort,
				stage,
				status,
				inputTokens,
				outputTokens,
				reasoningTokens,
				cachedInputTokens,
				cacheWriteTokens,
				latencyMs,
				costUsd,
				reservedUsd,
				serviceTier,
				httpStatus,
				finishReason,
				error
			})
		)
	};
});
const cents = (n: number) => (n * 100).toFixed(2);
const seconds = (n: number) => (n / 1000).toFixed(1);
const row = (r: any) =>
	`| ${r.config.source ?? 'cardio'} | ${r.config.model} ${r.config.effort} | ${r.config.count} / ${r.config.size} | ${r.generated} → ${r.localAccepted} → ${r.reviewAccepted ?? 'failed'} | ${seconds(r.draftMs)} / ${seconds(r.withReviewMs)} | ${cents(r.draftCostUsd)} / ${cents(r.withReviewCostUsd)} |`;
const summary = {
	generatedAt: new Date().toISOString(),
	budgetUsd: 2,
	measuredUsd,
	unknownReservedUsd,
	committedUsd: measuredUsd + unknownReservedUsd,
	paidCalls: ledger.length,
	failedCalls: ledger.filter((e: any) => e.status !== 'completed').length,
	runs: clean
};
await Bun.write(`${destination}/results.json`, JSON.stringify(summary, null, 2) + '\n');
await Bun.write(
	`${destination}/measurements.md`,
	`# Measured results\n\nNew-round token-priced estimate: **$${measuredUsd.toFixed(6)}**; unknown-call reservations: **$${unknownReservedUsd.toFixed(6)}**; combined **$${(measuredUsd + unknownReservedUsd).toFixed(6)} / $2 ceiling**. ${ledger.length} paid calls, ${summary.failedCalls} failed or unresolved. This is a usage-derived estimate, not an invoice.\n\n## Drafting comparisons\n\nEvery draft comparison uses the same compact prompt, schema, source assignment and exclusions for a given source/count; requested rationales are 35–60 words. Each set is also screened by a separate Luna medium call with the writer's key hidden. Raw, local and screened counts are distinct. No repair/top-up calls are hidden in these numbers.\n\nCounts are **generated → locally accepted → automated screen accepted**. Times are **draft / draft + screen**, in seconds. Costs are **draft / draft + screen**, in cents. These are local harness times, not live Studio UI times.\n\n| Source | Model / thinking | Requested / batch size | Counts | Seconds | Cents |\n| --- | --- | --- | --- | --- | --- |\n${clean
		.filter((r) => !r.config.reviewOf)
		.map(row)
		.join(
			'\n'
		)}\n\n## Paired compact reviewers\n\nThe saved draft is reused; only the new reviewer is charged to the experimental ledger. Displayed workflow cost/time is the measured original draft plus the new review. This is a replay estimate, not a second complete live generation. Compact reviewers share the same strengthened prompt and return issue codes instead of long prose.\n\n| Draft run | Reviewer | Accepted / local candidates | Review seconds | Combined seconds | Review cents | Combined cents |\n| --- | --- | --- | --- | --- | --- | --- |\n${clean
		.filter((r) => r.config.reviewOf)
		.map(
			(r) =>
				`| ${r.config.reviewOf} | ${r.config.model} ${r.config.effort} | ${r.reviewAccepted ?? 'failed'} / ${r.localAccepted} | ${seconds(r.reviewMs)} | ${seconds(r.withReviewMs)} | ${cents(r.reviewCostUsd)} | ${cents(r.withReviewCostUsd)} |`
		)
		.join(
			'\n'
		)}\n\n## Interpretation limits\n\nAutomated acceptance is not clinical accuracy. See [quality inspections](quality-notes.md) for false passes, ambiguity, weak distractors and unsupported rationale claims. Most configurations have one sample; none supports p95 latency or a population-level quality claim. Cardiovascular tests include the existing 59-question exclusion pool; retinal tests have no exclusion pool and contain image-only excerpts. These source fixtures are deliberately imperfect. Missing topics or abstentions must not be filled using unseen images or invented facts.\n\nThe sanitized [results file](results.json) includes every call's token/cache usage and conservative cold-write estimates. Raw prompts, lecture excerpts and complete outputs stay in ignored local storage. Prices were checked against official [Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol) and [Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra) pages on September 21, 2026; Luna uses $0.20/$1.20 per million input/output tokens. Cache reads cost 0.1× input, writes 1.25× input. All requests use the standard service tier, not priority. “None” means no reasoning effort, not priority processing.\n`
);
console.log(JSON.stringify({ ...summary, runs: clean.length }));

const root = 'tmp/studio-matrix';
const files = [...new Bun.Glob('*-r*.json').scanSync(root)].sort();
const results = (await Promise.all(files.map((file) => Bun.file(`${root}/${file}`).json()))).filter(
	(r) => r.variant && r.generationMs !== undefined
);
// Reconcile against persisted per-request usage, including failures with unknown cost.
const ledger = await Bun.file(`${root}/ledger.json`).json();
for (const result of results) {
	const calls = ledger.filter((entry: any) => entry.runId === result.runId);
	result.generationCostUsd = calls
		.filter((e: any) => e.stage === 'draft')
		.reduce((s: number, e: any) => s + (e.costUsd ?? 0), 0);
	result.reviewCostUsd = calls
		.filter((e: any) => e.stage === 'review')
		.reduce((s: number, e: any) => s + (e.costUsd ?? 0), 0);
	result.costComplete = calls.length > 0 && calls.every((e: any) => e.costUsd !== undefined);
}
const rows = results
	.filter((r) => r.reviewMs !== undefined)
	.map((r) => ({
		run: r.runId,
		requested: r.count,
		raw: r.rawCount,
		local: r.localCount,
		reviewed: r.runId.endsWith('-review15') ? null : r.reviewedCount,
		reviewMeasurementValid: !r.runId.endsWith('-review15'),
		...(r.runId.endsWith('-review15')
			? { reviewInvalidReason: 'Initial whole-set schema capped the response at three reviews.' }
			: {}),
		generationSeconds: +(r.generationMs / 1000).toFixed(3),
		withReviewSeconds: +((r.generationMs + r.localMs + r.reviewMs) / 1000).toFixed(3),
		generationCents: +(r.generationCostUsd * 100).toFixed(4),
		withReviewCents: +((r.generationCostUsd + r.reviewCostUsd) * 100).toFixed(4),
		costComplete: r.costComplete,
		rationaleWords: r.accepted.length
			? Math.round(
					r.accepted.reduce((s: number, q: any) => s + q.rationale.split(/\s+/).length, 0) /
						r.accepted.length
				)
			: null,
		inputTokens: r.output.reduce((s: number, b: any) => s + (b.response?.inputTokens ?? 0), 0),
		outputTokens: r.output.reduce((s: number, b: any) => s + (b.response?.outputTokens ?? 0), 0),
		reasoningTokens: r.output.reduce(
			(s: number, b: any) => s + (b.response?.reasoningTokens ?? 0),
			0
		),
		cachedTokens: r.output.reduce(
			(s: number, b: any) => s + (b.response?.cachedInputTokens ?? 0),
			0
		)
	}));
await Bun.write(`${root}/summary.json`, JSON.stringify(rows, null, 2));
console.table(rows);
let md =
	'# Question Studio architecture experiments\n\nLocal API replay with development source excerpts and exclusions. Times include provider calls, parsing and local gates, but exclude Convex scheduling/source fetch/persistence. Paired independent reviews use the same drafts, hidden answer keys, medium reasoning, and five concurrent batches of at most three questions. Screening is not expert accuracy. Costs are token-based estimates; incomplete-cost runs are not treated as free.\n\n';
md +=
	'| Run | Raw/local/reviewed | Draft seconds | With review seconds | Draft cents | With review cents | Mean rationale words |\n|---|---:|---:|---:|---:|---:|---:|\n';
for (const r of rows)
	md += `| ${r.run} | ${r.raw}/${r.local}/${r.reviewed ?? 'invalid review schema'} | ${r.generationSeconds} | ${r.withReviewSeconds} | ${r.costComplete ? '' : 'incomplete: '}${r.generationCents} | ${r.costComplete ? '' : 'incomplete: '}${r.withReviewCents} | ${r.rationaleWords ?? '—'} |\n`;
for (const r of results) {
	md += `\n## ${r.runId}\n`;
	for (const d of r.accepted) {
		const review = r.reviewed
			?.flatMap((b: any) => b.reviews)
			.find((v: any) => v.slotId === d.slotId);
		md += `\n### ${d.slotId}\n\n${d.stem}\n\n${d.options.map((o: string, i: number) => `${i + 1}. ${o}${i === d.answerIndex ? ' **(key)**' : ''}`).join('\n')}\n\n${d.rationale}\n\nReview: ${JSON.stringify(review)}\n\nEvidence: ${d.evidence.map((e: any) => `${e.citationId}: ${e.quote}`).join('\n\n')}\n`;
	}
}
await Bun.write(`${root}/review.md`, md);

import type { CostReservation } from './types';
import { readdir } from 'node:fs/promises';
const root = 'tmp/ai-eval';
const files = await readdir(root);
const stages = [
	{ version: 'evidence-v1', suffix: '' },
	{ version: 'evidence-v2', suffix: '.evidence-v2' },
	{ version: 'evidence-v3', suffix: '.evidence-v3' }
];
const runs = [];
for (const { version, suffix } of stages) {
	for (const thinking of ['low', 'medium', 'high']) {
		const rows = await Promise.all(
			files
				.filter((name) => name.endsWith(`.${thinking}${suffix}.json`))
				.map((name) => Bun.file(`${root}/${name}`).json())
		);
		if (!rows.length) continue;
		runs.push({
			version,
			thinking,
			batches: rows.length,
			requested: rows.length * 3,
			accepted: rows.reduce((n, r) => n + (r.accepted?.length ?? 0), 0),
			failedBatches: rows.filter((r) => r.error).length,
			meanBatchSeconds: Number(
				(rows.reduce((n, r) => n + r.elapsedMs, 0) / rows.length / 1000).toFixed(2)
			)
		});
	}
}
const model: CostReservation[] = await Bun.file(`${root}/openrouter-ledger.json`).json();
const ocr: CostReservation[] = await Bun.file(`${root}/ocr-ledger.json`).json();
const external: CostReservation[] = await Bun.file(`${root}/external-reservations.json`).json();
const summary = {
	generatedAt: new Date().toISOString(),
	documents: await Bun.file(`${root}/manifest.json`).json(),
	runs,
	budget: {
		modelReportedUsd: model.reduce((n, r) => n + (r.actualUsd ?? 0), 0),
		modelAccountedCeilingUsd: model.reduce((n, r) => n + (r.actualUsd ?? r.reservedUsd), 0),
		ocrReservationUsd: ocr.reduce((n, r) => n + r.reservedUsd, 0),
		externalReservationUsd: external.reduce((n, r) => n + r.reservedUsd, 0)
	},
	manualAudit: {
		version: 'evidence-v3',
		thinking: 'medium',
		screenedDrafts: 10,
		flaggedDrafts: 2,
		flags: [
			{
				document: 'Therapeutic spectacle prescribing',
				slot: 'q3',
				issue:
					'Contrived non-monotonic binocular-control trial and insufficient multi-step reasoning.'
			},
			{
				document: 'Health policy',
				slot: 'q3',
				issue: 'Classification remains second order despite a contrived prioritization instruction.'
			}
		],
		limitation:
			'Small agent-led source audit; not an independent subject-matter-expert accuracy estimate.'
	}
};
await Bun.write('tmp/ai-eval/metrics.json', JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ runs, budget: summary.budget }, null, 2));

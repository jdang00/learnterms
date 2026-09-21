import type { CostReservation, EvaluationDocument, ModelReservation } from './types';
import { lockEvaluationBudget } from './budget';
import {
	runQualityBatch,
	evidenceForObjective,
	HARNESS_VERSION,
	thinkingLevels,
	type QualitySlot
} from '../../src/convex/questionStudio/quality';
import { callQualityModel } from '../../src/convex/questionStudio/provider';
import { QUESTION_STUDIO_MODEL } from '../../src/convex/questionStudio/shared';
const root = 'tmp/ai-eval';
lockEvaluationBudget(root);
const proc = Bun.spawn(['bunx', 'convex', 'env', 'get', 'OPENAI_API_KEY'], {
	stdout: 'pipe',
	stderr: 'pipe'
});
const key = (await new Response(proc.stdout).text()).trim();
if ((await proc.exited) || !key) throw new Error('Development OpenAI key unavailable');
const model = {
	id: QUESTION_STUDIO_MODEL,
	provider: 'openai',
	pricingDate: '2026-09-20',
	pricing: { prompt: '0.0000002', completion: '0.0000012' }
};
await Bun.write(`${root}/model.json`, JSON.stringify(model, null, 2));
const inputPrice = Number(model.pricing.prompt),
	outputPrice = Number(model.pricing.completion);
const manifest: EvaluationDocument[] = await Bun.file(`${root}/manifest.json`).json();
if (manifest.length !== 4) throw new Error('All four parsed PDFs required');
const configurations = [
	{
		prefix: '3.',
		pages: [26, 27, 29, 32, 33, 39],
		objectives: [
			'Describe how plus changes accommodative demand and convergence.',
			'Apply minimum effective plus prescribing to a new functional testing example.',
			'Integrate improvement in reading with acceptable binocular control when deciding whether plus is appropriate.'
		]
	},
	{
		prefix: 'Cardio',
		pages: [10, 11, 12, 13],
		objectives: [
			'Identify the typical origin and appearance of cholesterol emboli.',
			'Distinguish calcific and fibrin-platelet emboli using appearance and likely source.',
			'Integrate embolus appearance, obstruction severity, and likely systemic source to distinguish plausible embolic etiologies.'
		]
	},
	{
		prefix: 'Lecture',
		pages: [63, 64, 68, 69, 70, 75, 76],
		objectives: [
			'Describe characteristic features of retinal arterial macroaneurysm.',
			'Distinguish Coats disease from macular telangiectasia using age and laterality.',
			'Integrate retinal lesion location, vascular appearance, and progressive macular edema to select the supported management for macroaneurysm.'
		]
	},
	{
		prefix: 'Understanding',
		pages: [2, 4, 5, 6],
		objectives: [
			'Identify the traditional organizational structure of medical care.',
			'Apply the collaborative care rationale of multispecialty group practice to a new example.',
			'Integrate community governance and public health activities to distinguish a community health center from a traditional private group practice.'
		]
	}
];
// Retain the historical filename so prior spend remains inside the shared budget.
const ledgerPath = `${root}/openrouter-ledger.json`;
const ledger: ModelReservation[] = (await Bun.file(ledgerPath).exists())
	? await Bun.file(ledgerPath).json()
	: [];
const ocrLedger: CostReservation[] = await Bun.file(`${root}/ocr-ledger.json`).json();
const otherReservations: CostReservation[] = (await Bun.file(
	`${root}/external-reservations.json`
).exists())
	? await Bun.file(`${root}/external-reservations.json`).json()
	: [];
const ocrReserve =
	ocrLedger.reduce((s, r) => s + r.reservedUsd, 0) +
	otherReservations.reduce((s, r) => s + r.reservedUsd, 0);
for (const doc of manifest) {
	const config = configurations.find((c) => doc.name.startsWith(c.prefix))!;
	const pages = await Bun.file(`${root}/${doc.hash}.pages.json`).json();
	const slots: QualitySlot[] = config.objectives.map((objective, i) => ({
		slotId: `q${i + 1}`,
		topicId: `topic${i + 1}`,
		topicTitle: objective,
		objective,
		questionType: (['learn', 'clinical', 'criticalThinking'] as const)[i],
		evidence: evidenceForObjective(pages, config.pages, objective, doc.name)
	}));
	for (const thinking of thinkingLevels.filter(
		(level) => !process.argv.includes('--medium-only') || level === 'medium'
	)) {
		const path = `${root}/${doc.hash}.${thinking}.${HARNESS_VERSION}.json`;
		if (await Bun.file(path).exists()) continue;
		console.log(`Evaluating ${thinking}: ${doc.name}`);
		const start = Date.now();
		try {
			const batches = [];
			for (const slot of slots)
				batches.push(
					await runQualityBatch(
						[slot],
						async (request) => {
							// Character count is a conservative token upper bound for these English sources, plus schema overhead.
							const reservation =
								(request.prompt.length + request.system.length + 16000) * inputPrice * 1.25 +
								request.maxOutputTokens * outputPrice;
							const spent = ledger.reduce((s, r) => s + (r.actualUsd ?? r.reservedUsd), 0);
							if (spent + reservation + ocrReserve > 3)
								throw new Error('Combined $3 evaluation ceiling reached');
							const entry: ModelReservation = {
								doc: doc.name,
								thinking,
								stage: request.stage,
								maxOutputTokens: request.maxOutputTokens,
								reservedUsd: reservation,
								at: new Date().toISOString()
							};
							ledger.push(entry);
							await Bun.write(ledgerPath, JSON.stringify(ledger, null, 2));
							try {
								const response = await callQualityModel(request, key);
								entry.actualUsd = response.costUsd;
								entry.status = 'completed';
								await Bun.write(ledgerPath, JSON.stringify(ledger, null, 2));
								return response;
							} catch (error) {
								entry.status = 'failed_reserved';
								await Bun.write(ledgerPath, JSON.stringify(ledger, null, 2));
								throw error;
							}
						},
						{ draftingEffortOverride: thinking }
					)
				);
			const result = {
				accepted: batches.flatMap((batch) => batch.accepted),
				rejected: batches.flatMap((batch) => batch.rejected),
				calls: batches.flatMap((batch) => batch.calls)
			};
			await Bun.write(
				path,
				JSON.stringify(
					{
						doc: doc.name,
						thinking,
						harnessVersion: HARNESS_VERSION,
						slots,
						elapsedMs: Date.now() - start,
						...result
					},
					null,
					2
				)
			);
			console.log(
				`${thinking}: ${result.accepted.length}/3 accepted, ${result.calls.length} calls, ${(Date.now() - start) / 1000}s`
			);
		} catch (error) {
			console.error(String(error));
			await Bun.write(
				path,
				JSON.stringify({
					doc: doc.name,
					thinking,
					error: String(error),
					elapsedMs: Date.now() - start
				})
			);
		}
	}
}
console.log(
	'Accounted model spend ceiling:',
	ledger.reduce((s, r) => s + (r.actualUsd ?? r.reservedUsd), 0),
	'OCR conservative reservation:',
	ocrReserve
);

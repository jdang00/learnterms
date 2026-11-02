import type { ModelReservation } from './types';
import { renameSync } from 'node:fs';
import { lockEvaluationBudget } from './budget';
import {
	runQualityBatch,
	evidenceForObjective,
	HARNESS_VERSION,
	type QualityCall,
	type QualitySlot,
	type StagePolicy,
	type ThinkingLevel
} from '../../src/convex/questionStudio/quality';
import {
	callAgentTurn,
	callQualityModel,
	estimateClaudeCost,
	type AgentTurnRequest
} from '../../src/convex/questionStudio/provider';
import { runAgentBatch } from '../../src/convex/questionStudio/agent/batch';
import { runLeanBatch, type LeanOptions } from '../../src/convex/questionStudio/lean';
import {
	formatExemplar,
	type Exemplar,
	type ExemplarSource
} from '../../src/convex/questionStudio/exemplars';
import { LEARN_DRAFTING_EFFORT } from '../../src/convex/questionStudio/shared';
import {
	CLAUDE_HAIKU,
	CLAUDE_OPUS,
	CLAUDE_SONNET,
	STAGE_MODELS,
	type ClaudeModel
} from '../../src/convex/aiModels';

// Usage: bun run eval:questions '[{"draft":"sonnet","review":"sonnet","repair":"opus","reviewEffort":"medium"}]'
//   [--repeat=2] [--ceiling=40]. repair and the efforts are optional; omitted values use production policy.
// Agent pipeline: {"pipeline":"agent","draft":"sonnet","review":"default","verification":"solve","exemplars":"bank"}.
// Lean pipeline (one draft, one editor, no repair): {"pipeline":"lean","gate":"editor","draft":"sonnet",
//   "review":"opus","exemplars":"bank"} plus optional "advisor":"opus" and "preCue":true.
// "reviewEffort" also sets the lean editor's effort.
const tiers: Record<string, ClaudeModel> = {
	haiku: CLAUDE_HAIKU,
	sonnet: CLAUDE_SONNET,
	opus: CLAUDE_OPUS
};
const flag = (name: string) =>
	process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=')[1];
const ceiling = Number(flag('ceiling') ?? 40);
const repeat = Number(flag('repeat') ?? 1);
const sweep: Array<{
	draft: string;
	review: string;
	repair?: string;
	draftEffort?: ThinkingLevel;
	reviewEffort?: ThinkingLevel;
	pipeline?: 'agent' | 'lean';
	gate?: LeanOptions['gate'];
	advisor?: string;
	preCue?: boolean;
	verification?: 'solve' | 'audit';
	exemplars?: 'bank' | 'live' | 'curated' | 'none';
	cueProbe?: boolean;
	leanRepair?: boolean;
}> = JSON.parse(
	process.argv.slice(2).find((arg) => arg.startsWith('[')) ??
		JSON.stringify([{ draft: 'sonnet', review: 'opus' }])
);
const root = 'tmp/ai-eval';
lockEvaluationBudget(root);
const proc = Bun.spawn(['bunx', 'convex', 'env', 'get', 'ANTHROPIC_API_KEY'], {
	stdout: 'pipe',
	stderr: 'pipe'
});
const key = (await new Response(proc.stdout).text()).trim();
if ((await proc.exited) || !key) throw new Error('Development Anthropic key unavailable');
const manifest: Array<{ name: string; hash: string }> = await Bun.file(
	`${root}/manifest.json`
).json();
if (manifest.length !== 4) throw new Error('All four parsed PDFs required');
const fixtures = [
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
// Anthropic spend is a separate wallet from the earlier OpenAI/OpenRouter ledger.
const ledgerPath = `${root}/anthropic-ledger.json`;
const ledger: Array<ModelReservation & { model: string; config: string }> = (await Bun.file(
	ledgerPath
).exists())
	? await Bun.file(ledgerPath).json()
	: [];
const spent = () => ledger.reduce((s, r) => s + (r.actualUsd ?? r.reservedUsd), 0);
// Serialize writes and replace the file atomically so parallel slots never interleave snapshots.
let ledgerWrites = Promise.resolve();
const saveLedger = () =>
	(ledgerWrites = ledgerWrites.then(async () => {
		await Bun.write(`${ledgerPath}.tmp`, JSON.stringify(ledger, null, 2));
		renameSync(`${ledgerPath}.tmp`, ledgerPath);
	}));
async function loadExemplars(kind = 'none'): Promise<ExemplarSource | undefined> {
	if (kind === 'bank' || kind === 'live') {
		const retrieve = './exemplars/retrieve.ts';
		const { createOfflineExemplarSource } = await import(retrieve);
		// bank: top tier only (v33–v36). live: the production tier policy, including design rows.
		return createOfflineExemplarSource(
			'tmp/exemplar-bank/bank.json',
			kind === 'live' ? { tiers: 'live' } : {}
		);
	}
	if (kind !== 'curated') return undefined;
	const curated: Array<Exemplar & { correctAnswers: string[]; className: string }> = await Bun.file(
		'tmp/human-exemplars/exemplars.json'
	).json();
	const bank = curated.map((e) => ({
		...e,
		shape: e.shape ?? 'other',
		subject: e.className,
		correctIndex: e.options.indexOf(e.correctAnswers[0])
	}));
	return async (query) =>
		bank
			.filter((e) => e.questionType === query.questionType && !query.exclude?.includes(e.id))
			.slice(0, query.limit ?? 3);
}
const makeTurnCaller = (config: string, docName: string) => async (request: AgentTurnRequest) => {
	// Characters bound tokens; price the whole conversation as a cold cache write.
	const reservedUsd = estimateClaudeCost(request.model, {
		input: 0,
		cacheWrite: request.system.length + JSON.stringify(request.messages).length + 8000,
		output: request.maxOutputTokens
	});
	if (spent() + reservedUsd > ceiling)
		throw new Error(`$${ceiling} Anthropic evaluation ceiling reached`);
	const entry: (typeof ledger)[number] = {
		doc: docName,
		config,
		model: request.model,
		thinking: request.effort,
		stage: request.stage,
		maxOutputTokens: request.maxOutputTokens,
		reservedUsd,
		at: new Date().toISOString()
	};
	ledger.push(entry);
	await saveLedger();
	try {
		const response = await callAgentTurn({ ...request, timeoutMs: 240_000 }, key);
		entry.actualUsd = response.costUsd;
		entry.status = 'completed';
		return response;
	} catch (error) {
		const usage = (error as { usage?: { costUsd?: number; httpStatus?: number } }).usage;
		// Invalid requests are rejected before any processing and are not billed.
		const unbilled = usage?.httpStatus === 400;
		entry.actualUsd = unbilled ? 0 : usage?.costUsd;
		entry.status = unbilled
			? 'rejected_400'
			: usage?.costUsd === undefined
				? 'failed_reserved'
				: 'failed';
		throw error;
	} finally {
		await saveLedger();
	}
};
const makeCaller = (config: string, docName: string) => async (request: QualityCall) => {
	const model = request.model ?? STAGE_MODELS.review;
	// Characters bound tokens for these English sources; price as a cold cache write.
	const chars = request.prompt.length + request.system.length + (request.context?.length ?? 0);
	const reservedUsd =
		estimateClaudeCost(model, {
			input: 0,
			cacheWrite: chars + 16000,
			output: request.maxOutputTokens
		}) +
		// The advisor reads the drafter's whole context and writes up to its 3,000-token cap.
		(request.advisor
			? estimateClaudeCost(request.advisor, {
					input: 0,
					cacheWrite: chars + 16000,
					output: 3000
				})
			: 0);
	if (spent() + reservedUsd > ceiling)
		throw new Error(`$${ceiling} Anthropic evaluation ceiling reached`);
	const entry: (typeof ledger)[number] = {
		doc: docName,
		config,
		model,
		thinking: request.thinking,
		stage: request.stage,
		maxOutputTokens: request.maxOutputTokens,
		reservedUsd,
		at: new Date().toISOString()
	};
	ledger.push(entry);
	await saveLedger();
	try {
		const response = await callQualityModel({ ...request, timeoutMs: 240_000 }, key);
		entry.actualUsd = response.costUsd;
		entry.status = 'completed';
		return response;
	} catch (error) {
		const usage = (error as { usage?: { costUsd?: number; httpStatus?: number } }).usage;
		// Invalid requests are rejected before any processing and are not billed.
		const unbilled = usage?.httpStatus === 400;
		entry.actualUsd = unbilled ? 0 : usage?.costUsd;
		entry.status = unbilled
			? 'rejected_400'
			: usage?.costUsd === undefined
				? 'failed_reserved'
				: 'failed';
		throw error;
	} finally {
		await saveLedger();
	}
};

for (const entry of sweep) {
	const { draft, review, repair, draftEffort, reviewEffort } = entry;
	const exemplars = await loadExemplars(entry.exemplars);
	// review "default" keeps the production per-type reviewer (STAGE_MODELS).
	if (![draft, review === 'default' ? draft : review, repair ?? draft].every((tier) => tiers[tier]))
		throw new Error(`Unknown tier in ${draft}/${review}/${repair}`);
	const stages: StagePolicy = {
		draft: { model: tiers[draft], effort: draftEffort },
		review: { model: tiers[review], effort: reviewEffort },
		...(repair ? { repair: { model: tiers[repair] } } : {})
	};
	const label = [
		draft,
		review,
		...(repair ? [`fix${repair}`] : []),
		...(draftEffort ? [`d${draftEffort}`] : []),
		...(reviewEffort ? [`r${reviewEffort}`] : []),
		...(entry.pipeline === 'agent' ? ['agent', entry.verification ?? 'solve'] : []),
		...(entry.pipeline === 'lean' ? ['lean', entry.gate ?? 'editor'] : []),
		...(entry.advisor ? [`adv${entry.advisor}`] : []),
		...(entry.preCue ? ['precue'] : []),
		...(entry.leanRepair ? ['fix'] : []),
		...(entry.exemplars && entry.exemplars !== 'none' ? [`ex${entry.exemplars}`] : []),
		...(entry.cueProbe ? ['cue'] : [])
	].join('-');
	for (let run = 1; run <= repeat; run++) {
		const config = `${label}-r${run}`;
		for (const doc of manifest) {
			const fixture = fixtures.find((c) => doc.name.startsWith(c.prefix))!;
			const path = `${root}/${doc.hash}.${config}.${HARNESS_VERSION}.json`;
			if (await Bun.file(path).exists()) continue;
			console.log(`${config}: ${doc.name}`);
			const pages = await Bun.file(`${root}/${doc.hash}.pages.json`).json();
			const sourcePages = pages.filter((p: { pageNumber: number }) =>
				fixture.pages.includes(p.pageNumber)
			);
			const slots: QualitySlot[] = fixture.objectives.map((objective, i) => ({
				slotId: `q${i + 1}`,
				topicId: `topic${i + 1}`,
				topicTitle: objective,
				objective,
				questionType: (['learn', 'clinical', 'criticalThinking'] as const)[i],
				evidence: evidenceForObjective(pages, fixture.pages, objective, doc.name)
			}));
			const call = makeCaller(config, doc.name);
			if (exemplars && entry.pipeline !== 'agent') {
				const shown: string[] = [];
				for (const slot of slots) {
					const found = await exemplars({
						questionType: slot.questionType,
						objective: slot.objective,
						context: slot.evidence[0]?.text.slice(0, 600),
						limit: 2,
						exclude: shown
					});
					shown.push(...found.map((e) => e.id));
					slot.examples = found.map(formatExemplar);
				}
			}
			const started = Date.now();
			// Production runs one worker per type, in parallel, with the source prefix cached.
			const batches = await Promise.all(
				slots.map(async (slot) => {
					const slotStarted = Date.now();
					const learn = slot.questionType === 'learn';
					const result =
						entry.pipeline === 'lean'
							? await runLeanBatch([slot], call, {
									stages,
									gate: entry.gate ?? 'editor',
									advisor: entry.advisor ? tiers[entry.advisor] : undefined,
									preCue: entry.preCue,
									canRepair: entry.leanRepair ? () => true : undefined
								})
							: entry.pipeline === 'agent'
								? await runAgentBatch([slot], {
										turn: makeTurnCaller(config, doc.name),
										call,
										exemplars,
										sourcePages,
										stages,
										verification: entry.verification
									})
								: await runQualityBatch([slot], call, {
										stages,
										sourcePages,
										sessionId: `eval:${doc.hash}:${config}:${slot.slotId}`,
										...(learn
											? {
													referenceLearn: true,
													fastLearnReview: true,
													draftingEffortOverride: LEARN_DRAFTING_EFFORT
												}
											: {}),
										cueProbe: entry.cueProbe
									});
					return { ...result, elapsedMs: Date.now() - slotStarted };
				})
			);
			const result = {
				doc: doc.name,
				config,
				stages,
				harnessVersion: HARNESS_VERSION,
				slots,
				elapsedMs: Date.now() - started,
				slotElapsedMs: batches.map((b) => b.elapsedMs),
				accepted: batches.flatMap((b) => b.accepted),
				rejected: batches.flatMap((b) => b.rejected),
				corrections: batches.flatMap((b) => b.corrections),
				calls: batches.flatMap((b) => b.calls.map(({ object: _object, ...c }) => c))
			};
			await Bun.write(path, JSON.stringify(result, null, 2));
			console.log(
				`  ${result.accepted.length}/3 accepted, ${result.calls.length} calls, ${(result.elapsedMs / 1000).toFixed(1)}s, ledger $${spent().toFixed(4)}`
			);
		}
	}
}
console.log(`Anthropic evaluation spend (reserved where unknown): $${spent().toFixed(4)}`);

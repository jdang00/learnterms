import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';

const [jobId, directory] = process.argv.slice(2);
if (!jobId || !directory) throw new Error('Usage: bun dev/benchmarks/question-studio/capture.ts JOB_ID OUTPUT_DIRECTORY');
async function convex(...args: string[]) {
	const proc = Bun.spawn(['bunx', 'convex', ...args], { stdout: 'pipe', stderr: 'pipe' });
	const [output, error, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
	if (code !== 0) throw new Error(error);
	return JSON.parse(output);
}
const job = await convex('run', 'questionStudio/jobs:getGenerationJobInternal', JSON.stringify({ jobId }));
if (!job || job._id !== jobId) throw new Error('Job not found');
await mkdir(directory, { recursive: true });
await Bun.write(`${directory}/job.json`, JSON.stringify(job, null, 2) + '\n');
if (!job.completedAt || !['ready', 'failed'].includes(job.status)) {
	console.log(JSON.stringify({ id: jobId, status: job.status, elapsedSeconds: (Date.now() - job.createdAt) / 1000, candidates: job.candidateCount, workers: job.workerStates, usage: job.usage }, null, 2));
	process.exit(0);
}
const events = (await convex('data', 'questionStudioJobEvents', '--limit', '200', '--format', 'json'))
	.filter((event: any) => event.jobId === jobId).sort((a: any, b: any) => a.at - b.at);
if (events.length !== job.eventCount) throw new Error(`Incomplete event export: ${events.length}/${job.eventCount}`);
const workers = job.workerStates ?? [];
const start = Math.min(...workers.map((w: any) => w.startedAt));
const end = Math.max(...workers.map((w: any) => w.finishedAt));
const workerStages = (job.usage?.byStage ?? []).filter((s: any) => s.stage !== 'plan');
const workerModelMs = workerStages.reduce((sum: number, s: any) => sum + s.latencyMsTotal, 0);
const workerMs = workers.reduce((sum: number, w: any) => sum + w.finishedAt - w.startedAt, 0);
const summary = {
	jobId, status: job.status, requested: job.requestedCount, accepted: job.candidateCount,
	wallMs: job.completedAt - job.createdAt,
	firstCandidateMs: Math.min(...workers.filter((w: any) => w.draftedCount > 0).map((w: any) => w.finishedAt)) - job.createdAt,
	setupMs: start - job.createdAt, workerSpanMs: end - start, finalizationMs: job.completedAt - end,
	aggregateWorkerMs: workerMs, aggregateWorkerModelMs: workerModelMs, aggregateNonModelWorkerMs: workerMs - workerModelMs,
	acceptedByType: job.candidates.reduce((types: Record<string, number>, candidate: any) => {
		types[candidate.questionType] = (types[candidate.questionType] ?? 0) + 1; return types;
	}, {}),
	usage: job.usage, workerNotes: job.workerNotes,
	repairs: events.filter((e: any) => e.label === 'Repair requested').map((e: any) => e.detail),
	workers: workers.map((w: any) => ({ index: w.index, startMs: w.startedAt - job.createdAt, durationMs: w.finishedAt - w.startedAt, accepted: w.draftedCount }))
};
const hashes: Record<string, string> = {};
for (const file of [...new Bun.Glob('src/convex/questionStudio/*.ts').scanSync(), 'src/convex/documentParsing.ts', 'src/convex/aiTelemetry.ts']) {
	hashes[file] = createHash('sha256').update(await Bun.file(file).text()).digest('hex');
}
const manifest = { capturedAt: new Date().toISOString(), deployment: process.env.CONVEX_DEPLOYMENT, jobId,
	gitHead: Bun.spawnSync(['git', 'rev-parse', 'HEAD']).stdout.toString().trim(), sourceHashes: hashes };
for (const [name, value] of Object.entries({ events, summary, manifest })) {
	await Bun.write(`${directory}/${name}.json`, JSON.stringify(value, null, 2) + '\n');
}
console.log(JSON.stringify(summary, null, 2));

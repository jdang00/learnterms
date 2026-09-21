/** End-to-end development-only generation; never saves candidates to a module. */
const expectedDeployment = 'dev:rightful-crane-34';
if (
	process.env.CONVEX_DEPLOYMENT?.split(/\s/)[0] !== expectedDeployment ||
	process.env.CONVEX_DEPLOY_KEY
)
	throw new Error(
		'This harness is restricted to rightful-crane-34 development without a deploy-key override'
	);
const count = Number(process.argv[2] ?? 15);
if (![10, 15].includes(count)) throw new Error('Use 10 or 15 questions');
const label = process.argv[3] ?? `live-${count}-${Date.now()}`;
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Invalid run label');
const root = `tmp/studio-matrix/${label}`;
if (await Bun.file(`${root}/job-id.json`).exists()) throw new Error('Run already exists');
const context = await Bun.file('tmp/studio-matrix/context.json').json();
const identity = JSON.stringify({ subject: 'user_2llwaw0rTyEWsvTBUbcZg3iqLj5' });
async function run(fn: string, args: unknown) {
	const proc = Bun.spawn(
		[
			'bunx',
			'convex',
			'run',
			'--codegen',
			'disable',
			'--identity',
			identity,
			fn,
			JSON.stringify(args)
		],
		{ stdout: 'pipe', stderr: 'pipe' }
	);
	const [out, err] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text()
	]);
	if (await proc.exited) throw new Error(err);
	return JSON.parse(out);
}
const documentId = context.document._id,
	moduleId = context.module._id;
const counts = { learn: count, clinical: 0, criticalThinking: 0 };
const jobId = await run('questionStudio:createGenerationJob', {
	documentId,
	moduleId,
	requestedCount: count,
	counts,
	sourceMode: 'pages',
	selectedPageNumbers: Array.from({ length: 18 }, (_, i) => i + 3),
	sourceIndexedAt: context.document.metadata.indexedAt
});
await Bun.write(
	`${root}/job-id.json`,
	JSON.stringify({ jobId, deployment: expectedDeployment, documentId, moduleId })
);
console.log('started', jobId);
await run('questionStudio:generateCandidates', { documentId, moduleId, jobId, counts, topics: [] });
let job;
for (let poll = 0; poll < 35; poll++) {
	job = await run('questionStudio:getGenerationJob', { jobId });
	if (['ready', 'failed'].includes(job.status)) break;
	await Bun.sleep(1500);
}
await Bun.write(`${root}/job.json`, JSON.stringify(job, null, 2));
const events = await run('questionStudio:getGenerationJobActivity', { jobId });
await Bun.write(`${root}/events.json`, JSON.stringify(events, null, 2));
const summary = {
	jobId,
	status: job.status,
	requested: count,
	candidates: job.candidates.length,
	wallMs: job.completedAt ? job.completedAt - job.createdAt : null,
	usage: job.usage,
	harnessVersion: job.candidates[0]?.metadata.harnessVersion,
	sourceIndexedAt: job.sourceIndexedAt,
	selectedPageNumbers: job.selectedPageNumbers
};
await Bun.write(`${root}/summary.json`, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary));

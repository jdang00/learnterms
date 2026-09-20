import type { CostReservation, OcrReservation } from './types';
import { lockEvaluationBudget } from './budget';
import { inspectPdf, extractPdf, OcrRequestError } from '../../src/convex/pdfExtraction';
import { readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
	parseOcrPages,
	serializePages,
	PARSER_VERSION,
	MAX_PDF_BYTES,
	MAX_PDF_PAGES
} from '../../src/convex/documentParsing';
const folder = process.argv[2];
if (!folder) throw new Error('Usage: bun scripts/ai-eval/parse.ts <PDF folder>');
const root = 'tmp/ai-eval';
lockEvaluationBudget(root);
await Bun.$`mkdir -p ${root}`.quiet();
const keyProcess = Bun.spawn(['bunx', 'convex', 'env', 'get', 'DATALAB_API_KEY'], {
	stdout: 'pipe',
	stderr: 'pipe'
});
const apiKey = (await new Response(keyProcess.stdout).text()).trim();
if ((await keyProcess.exited) || !apiKey) throw new Error('Development OCR key unavailable');
const manifest = [];
for (const name of (await readdir(folder)).filter((n) => n.endsWith('.pdf')).sort()) {
	const bytes = await Bun.file(`${folder}/${name}`).arrayBuffer();
	const hash = createHash('sha256').update(new Uint8Array(bytes)).digest('hex');
	const cache = `${root}/${hash}.datalab-v2.ocr.json`;
	const count = await inspectPdf(bytes);
	if (bytes.byteLength > MAX_PDF_BYTES || count > MAX_PDF_PAGES)
		throw new Error('PDF outside preflight limits');
	let ocr;
	if (await Bun.file(cache).exists()) ocr = await Bun.file(cache).json();
	else {
		// Reserve an intentionally conservative $0.006/page BEFORE the paid call; persist across restarts.
		const ledgerPath = `${root}/ocr-ledger.json`;
		const ledger: OcrReservation[] = (await Bun.file(ledgerPath).exists())
			? await Bun.file(ledgerPath).json()
			: [];
		const reserve = count * 0.006;
		if (ledger.reduce((sum, r) => sum + r.reservedUsd, 0) + reserve > 1.55)
			throw new Error('OCR evaluation budget exhausted');
		const modelLedger: CostReservation[] = (await Bun.file(
			`${root}/openrouter-ledger.json`
		).exists())
			? await Bun.file(`${root}/openrouter-ledger.json`).json()
			: [];
		const external: CostReservation[] = (await Bun.file(
			`${root}/external-reservations.json`
		).exists())
			? await Bun.file(`${root}/external-reservations.json`).json()
			: [];
		const committed = [...ledger, ...modelLedger, ...external].reduce(
			(sum, r) => sum + (r.actualUsd ?? r.reservedUsd),
			0
		);
		if (committed + reserve > 3) throw new Error('Combined $3 evaluation ceiling reached');
		ledger.push({ hash, name, pages: count, reservedUsd: reserve, at: new Date().toISOString() });
		await Bun.write(ledgerPath, JSON.stringify(ledger, null, 2));
		console.log(`Parsing ${name}: ${count} pages`);
		try {
			({ ocr } = await extractPdf(apiKey, new Blob([bytes], { type: 'application/pdf' }), count));
		} catch (error) {
			if (error instanceof OcrRequestError && error.status === 429) {
				ledger[ledger.length - 1].reservedUsd = 0;
				ledger[ledger.length - 1].status = 'http_429_no_processing';
				await Bun.write(ledgerPath, JSON.stringify(ledger, null, 2));
			}
			throw error;
		}
		await Bun.write(cache, JSON.stringify(ocr));
	}
	const pages = parseOcrPages(ocr, count);
	await Bun.write(`${root}/${hash}.pages.json`, JSON.stringify(pages, null, 2));
	await Bun.write(`${root}/${hash}.md`, serializePages(pages));
	manifest.push({
		name,
		hash,
		pages: count,
		bytes: bytes.byteLength,
		model: ocr.model,
		parserVersion: PARSER_VERSION,
		sparsePages: pages.filter((p) => p.text.length < 100).map((p) => p.pageNumber),
		imagePages: pages.filter((p) => p.imageCount).map((p) => p.pageNumber),
		chars: pages.reduce((s, p) => s + p.text.length, 0)
	});
	await Bun.write(`${root}/manifest.json`, JSON.stringify(manifest, null, 2));
	console.log(
		`Validated ${count} pages; ${pages.filter((p) => p.warnings.length).length} pages need visual caution`
	);
}

/** Server-only REST integration. POST is deliberately never retried automatically. */
import type { OcrDocument, OcrPage } from './documentParsing';
import { pageMarkdown } from './documentParsing';
export const DATALAB_MODEL = 'datalab-convert-fast-v1';
export const DATALAB_OPTIONS = {
	mode: 'fast',
	output_format: 'json',
	include_markdown_in_chunks: 'true',
	paginate: 'true',
	disable_image_extraction: 'true',
	disable_image_captions: 'true',
	save_checkpoint: 'false',
	skip_cache: 'false',
	additional_config: JSON.stringify({
		keep_pageheader_in_output: true,
		keep_pagefooter_in_output: true
	})
} as const;
export type DatalabResult = {
	status?: string;
	success?: boolean;
	request_check_url?: string;
	request_id?: string;
	json?: unknown;
	markdown?: string;
	result_url?: string;
	page_count?: number;
	metadata?: { failed_pages?: unknown[] };
	cost_breakdown?: { final_cost_cents?: number };
	parse_quality_score?: number | null;
	[key: string]: unknown;
};
export class OcrRequestError extends Error {
	constructor(
		message: string,
		public status: number
	) {
		super(message);
	}
}
function record(x: unknown): x is Record<string, unknown> {
	return !!x && typeof x === 'object' && !Array.isArray(x);
}
export function validatePollingUrl(value: string) {
	const u = new URL(value);
	if (
		!['https://www.datalab.to', 'https://api.datalab.to'].includes(u.origin) ||
		!/^\/api\/v1\/convert\/[\w-]+$/.test(u.pathname) ||
		u.username ||
		u.password ||
		u.search
	)
		throw new Error('Unexpected Datalab polling URL');
	return u;
}
export async function submitDatalab(key: string, source: string | Blob) {
	// Regional file URLs require URL-encoded fields, not multipart/form-data.
	const f = typeof source === 'string' ? new URLSearchParams() : new FormData();
	if (typeof source === 'string') {
		f.set('file_url', source);
		f.set('processing_location', 'us');
	} else (f as FormData).set('file', source, 'document.pdf');
	for (const [k, v] of Object.entries(DATALAB_OPTIONS)) f.set(k, v);
	const r = await fetch('https://www.datalab.to/api/v1/convert', {
		method: 'POST',
		headers: { 'X-API-Key': key },
		body: f,
		redirect: 'error',
		signal: AbortSignal.timeout(60000)
	});
	if (!r.ok)
		throw new OcrRequestError(
			`Document submission failed (${r.status}). No automatic paid retry was made.`,
			r.status
		);
	const job = (await r.json()) as DatalabResult;
	if (!job.success || !job.request_check_url)
		throw new Error('Datalab did not accept the document');
	validatePollingUrl(job.request_check_url);
	return job;
}
export async function pollDatalab(key: string, url: string): Promise<DatalabResult> {
	const r = await fetch(validatePollingUrl(url), {
		headers: { 'X-API-Key': key },
		redirect: 'error',
		signal: AbortSignal.timeout(30000)
	});
	if (!r.ok) throw new OcrRequestError(`Document status unavailable (${r.status})`, r.status);
	let result = (await r.json()) as DatalabResult;
	if (result.result_url) {
		const u = new URL(result.result_url);
		// Signed regional downloads carry their own authorization. Never forward the API key.
		if (
			u.protocol !== 'https:' ||
			u.username ||
			u.password ||
			!/(^|\.)datalab\.to$|(^|\.)r2\.cloudflarestorage\.com$|(^|\.)amazonaws\.com$/.test(u.hostname)
		)
			throw new Error('Unexpected result download host');
		const download = await fetch(u, { redirect: 'error', signal: AbortSignal.timeout(60000) });
		if (!download.ok) throw new Error('Could not download parsed document');
		result = {
			...(await download.json()),
			...Object.fromEntries(Object.entries(result).filter(([, v]) => v != null))
		};
	}
	if (result.success === false || result.status === 'failed')
		throw new Error('Document conversion failed. Please review the source PDF.');
	return result;
}
export function normalizeDatalab(result: DatalabResult, expectedPages: number): OcrDocument {
	if (
		result.status !== 'complete' ||
		result.success !== true ||
		result.page_count !== expectedPages ||
		result.metadata?.failed_pages?.length
	)
		throw new Error('Datalab returned missing or failed pages; existing index preserved');
	const json = typeof result.json === 'string' ? JSON.parse(result.json) : result.json;
	if (!record(json) || !Array.isArray(json.children) || json.children.length !== expectedPages)
		throw new Error('Datalab page structure does not match PDF');
	const pages: OcrPage[] = json.children.map((p: unknown, index: number) => {
		if (
			!record(p) ||
			p.block_type !== 'Page' ||
			typeof p.id !== 'string' ||
			!new RegExp(`^/page/${index}/Page/[0-9]+$`).test(p.id) ||
			!Array.isArray(p.children)
		)
			throw new Error('Datalab page order mismatch');
		const blocks = p.children.map((b: unknown) => {
			if (!record(b) || typeof b.id !== 'string' || b.page !== index || b.inference_failed === true)
				throw new Error('Datalab block extraction incomplete');
			return {
				id: b.id,
				type: String(b.block_type ?? 'Text'),
				markdown: typeof b.markdown === 'string' ? b.markdown : '',
				bbox: Array.isArray(b.bbox) ? b.bbox.filter((n): n is number => typeof n === 'number') : [],
				sectionHierarchy: record(b.section_hierarchy) ? b.section_hierarchy : {}
			};
		});
		const markdown = pageMarkdown({ blocks });
		// Image payloads are sometimes included in JSON despite disable_image_extraction. Retain geometry, not base64.
		return {
			index,
			markdown,
			blocks,
			images: blocks.filter((b) => /Picture|Figure|Image/.test(b.type)),
			tables: blocks.filter((b) => b.type === 'Table').map((b) => ({ id: b.id, bbox: b.bbox })),
			dimensions: { bbox: p.bbox }
		};
	});
	return {
		pages,
		model: DATALAB_MODEL,
		usage_info: {
			pages_processed: expectedPages,
			cost_cents: result.cost_breakdown?.final_cost_cents ?? null,
			parse_quality_score: result.parse_quality_score ?? null
		}
	};
}

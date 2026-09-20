'use node';
import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { r2 } from './r2Documents';
import { inspectPdf } from './pdfExtraction';
import { MAX_PDF_BYTES, parseOcrPages } from './documentParsing';
import { submitDatalab, pollDatalab, normalizeDatalab, OcrRequestError } from './datalab';
function key() {
	const k = process.env.DATALAB_API_KEY;
	if (!k) throw new Error('Document processing is not configured');
	return k;
}
export const submit = internalAction({
	args: { jobId: v.id('documentIngestionJobs') },
	returns: v.null(),
	handler: async (ctx, args) => {
		const job = await ctx.runQuery(internal.documentIngestion.getJob, args);
		if (job.checkUrl || job.artifactKey) return null;
		const doc = await ctx.runQuery(internal.ragKnowledgeInternal.getDocumentForRagIngestion, {
			documentId: job.documentId
		});
		if (!doc || doc.metadata?.ingestionJobId !== args.jobId || !doc.metadata.r2Key)
			throw new Error('Source document unavailable');
		const apiKey = key(),
			url = await r2.getUrl(doc.metadata.r2Key, { expiresIn: 3600 });
		const r = await fetch(url, { signal: AbortSignal.timeout(60000) });
		if (!r.ok) throw new Error('Could not read the source PDF');
		if (Number(r.headers.get('content-length') ?? 0) > MAX_PDF_BYTES)
			throw new Error('PDF exceeds 30 MB');
		const bytes = await r.arrayBuffer(),
			expectedPages = await inspectPdf(bytes);
		await ctx.runMutation(internal.documentIngestion.reserve, { jobId: args.jobId, expectedPages });
		const result = await submitDatalab(apiKey, url).catch(async (error: unknown) => {
			// Explicit validation/auth rejections cannot have started conversion. Ambiguous
			// timeouts and server failures retain their reservation to prevent duplicate billing.
			if (error instanceof OcrRequestError && [400, 401, 403, 413, 415, 422].includes(error.status))
				await ctx.runMutation(internal.documentIngestion.releaseRejected, { jobId: args.jobId });
			throw error;
		});
		await ctx.runMutation(internal.documentIngestion.progress, {
			jobId: args.jobId,
			status: 'processing',
			checkUrl: result.request_check_url
		});
		return null;
	}
});
export const poll = internalAction({
	args: { jobId: v.id('documentIngestionJobs') },
	returns: v.boolean(),
	handler: async (ctx, args) => {
		const job = await ctx.runQuery(internal.documentIngestion.getJob, args);
		if (job.artifactKey) return true;
		if (!job.checkUrl || !job.expectedPages) throw new Error('No accepted parsing request');
		const result = await pollDatalab(key(), job.checkUrl);
		if (result.status !== 'complete') return false;
		const ocr = normalizeDatalab(result, job.expectedPages);
		parseOcrPages(ocr, job.expectedPages);
		const artifactKey = `document-ingestion/${args.jobId}/datalab.json`;
		await r2.store(ctx, Buffer.from(JSON.stringify(ocr)), {
			key: artifactKey,
			type: 'application/json'
		});
		await ctx.runMutation(internal.documentIngestion.progress, {
			jobId: args.jobId,
			status: 'indexing',
			artifactKey,
			costCents: result.cost_breakdown?.final_cost_cents
		});
		return true;
	}
});

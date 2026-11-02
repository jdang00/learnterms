// Cached OpenRouter embeddings for the exemplar bank. Vectors live in tmp/exemplar-bank/embeddings.jsonl
// keyed by a hash of model + text; every paid call is appended to tmp/exemplar-bank/ledger.jsonl.
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { EMBEDDING_DIMENSION, EMBEDDING_MODEL } from '../../../src/convex/aiModels';

export const BANK_DIR = 'tmp/exemplar-bank';
const CACHE_PATH = join(BANK_DIR, 'embeddings.jsonl');
const LEDGER_PATH = join(BANK_DIR, 'ledger.jsonl');
/** text-embedding-3-large list price, USD per million input tokens. */
const PRICE_PER_MILLION = 0.13;
export const EMBEDDING_BUDGET_USD = 1;

const cache = new Map<string, Float32Array>();
let cacheLoaded = false;
let apiKey: string | undefined;

export function textHash(text: string) {
	return createHash('sha256').update(`${EMBEDDING_MODEL}\n${text}`).digest('hex').slice(0, 32);
}

function loadCache() {
	if (cacheLoaded) return;
	cacheLoaded = true;
	if (!existsSync(CACHE_PATH)) return;
	for (const line of readFileSync(CACHE_PATH, 'utf8').split('\n')) {
		if (!line) continue;
		const { hash, vector } = JSON.parse(line) as { hash: string; vector: string };
		const bytes = Buffer.from(vector, 'base64');
		cache.set(hash, new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4));
	}
}

export function ledgerSpend() {
	if (!existsSync(LEDGER_PATH)) return 0;
	return readFileSync(LEDGER_PATH, 'utf8')
		.split('\n')
		.filter(Boolean)
		.reduce((sum, line) => sum + (JSON.parse(line) as { costUsd: number }).costUsd, 0);
}

async function openRouterKey() {
	if (apiKey) return apiKey;
	apiKey = process.env.OPENROUTER_API_KEY?.trim();
	if (!apiKey) {
		const result = Bun.spawnSync(['bunx', 'convex', 'env', 'get', 'OPENROUTER_API_KEY'], {
			stdout: 'pipe',
			stderr: 'pipe'
		});
		apiKey = result.stdout.toString().trim();
	}
	if (!apiKey)
		throw new Error('OPENROUTER_API_KEY is not available from env or the dev deployment');
	return apiKey;
}

async function requestEmbeddings(texts: string[], label: string) {
	const spent = ledgerSpend();
	const estimate = (texts.join(' ').length / 3.5 / 1e6) * PRICE_PER_MILLION;
	if (spent + estimate > EMBEDDING_BUDGET_USD) {
		throw new Error(
			`Embedding budget exceeded: $${spent.toFixed(4)} spent, next batch ~$${estimate.toFixed(4)}`
		);
	}
	const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${await openRouterKey()}`,
			'Content-Type': 'application/json',
			'X-OpenRouter-Title': 'LearnTerms exemplar bank'
		},
		body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts, dimensions: EMBEDDING_DIMENSION })
	});
	if (!response.ok)
		throw new Error(`OpenRouter embeddings ${response.status}: ${await response.text()}`);
	const body = (await response.json()) as {
		data: { index: number; embedding: number[] }[];
		usage?: { prompt_tokens?: number; total_tokens?: number; cost?: number };
	};
	const tokens = body.usage?.prompt_tokens ?? body.usage?.total_tokens ?? 0;
	const costUsd = body.usage?.cost ?? (tokens / 1e6) * PRICE_PER_MILLION;
	mkdirSync(dirname(LEDGER_PATH), { recursive: true });
	appendFileSync(
		LEDGER_PATH,
		`${JSON.stringify({ at: new Date().toISOString(), label, model: EMBEDDING_MODEL, inputs: texts.length, tokens, costUsd })}\n`
	);
	return body.data.sort((a, b) => a.index - b.index).map((item) => item.embedding);
}

/** Embeds texts through the disk cache; only uncached texts are sent, in batches. */
export async function embedTexts(texts: string[], label = 'embed'): Promise<Float32Array[]> {
	loadCache();
	const missing = [...new Set(texts.filter((text) => !cache.has(textHash(text))))];
	const batchSize = 96;
	for (let start = 0; start < missing.length; start += batchSize) {
		const batch = missing.slice(start, start + batchSize);
		const vectors = await requestEmbeddings(batch, label);
		mkdirSync(BANK_DIR, { recursive: true });
		const lines = batch.map((text, index) => {
			const vector = Float32Array.from(vectors[index]);
			if (vector.length !== EMBEDDING_DIMENSION) {
				throw new Error(`Expected ${EMBEDDING_DIMENSION} dims, got ${vector.length}`);
			}
			const hash = textHash(text);
			cache.set(hash, vector);
			return JSON.stringify({ hash, vector: Buffer.from(vector.buffer).toString('base64') });
		});
		appendFileSync(CACHE_PATH, `${lines.join('\n')}\n`);
		if (missing.length > batchSize) {
			console.log(`embedded ${Math.min(start + batchSize, missing.length)}/${missing.length}`);
		}
	}
	return texts.map((text) => cache.get(textHash(text))!);
}

export function cachedEmbedding(text: string) {
	loadCache();
	return cache.get(textHash(text));
}

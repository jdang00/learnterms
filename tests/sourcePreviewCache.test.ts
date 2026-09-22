import { describe, expect, test } from 'bun:test';
import { createSourcePreviewCache } from '../src/lib/admin/sourcePreviewCache';
import { withPdfRenderSlot } from '../src/lib/admin/pdfRenderQueue';
import type { SourcePreviewBatch } from '../src/lib/admin/sourceContext';

const preview = (revision = 1): SourcePreviewBatch => ({
	pages: [{ pageNumber: 1, text: 'Source text' }],
	pageNumbers: [1],
	pageCharacterCounts: [{ pageNumber: 1, characters: 11 }],
	nextOffset: null,
	sourceIndexedAt: revision
});

describe('source preview reuse', () => {
	test('hover and selection share the pending request and subsequent opens reuse it', async () => {
		let calls = 0;
		let finish!: (result: SourcePreviewBatch) => void;
		const cache = createSourcePreviewCache(async () => {
			calls++;
			return new Promise((resolve) => {
				finish = resolve;
			});
		});
		const hover = cache.get('document', 1);
		expect(cache.get('document', 1)).toBe(hover);
		finish(preview());
		await hover;
		expect(await cache.get('document', 1)).toEqual(preview());
		expect(calls).toBe(1);
	});
	test('reindexing invalidates cached pages; an older failed request cannot evict newer pages', async () => {
		let calls = 0;
		let rejectOld!: (error: Error) => void;
		const cache = createSourcePreviewCache(async () => {
			calls++;
			if (calls === 1)
				return new Promise((_, reject) => {
					rejectOld = reject;
				});
			return preview(2);
		});
		const old = cache.get('document', 1).catch(() => null);
		const current = cache.get('document', 2);
		rejectOld(new Error('Old request failed'));
		await old;
		expect(await cache.get('document', 2)).toEqual(await current);
		expect(calls).toBe(2);
	});
	test('failed loads can retry, and only three recently used documents are retained', async () => {
		let calls = 0;
		const cache = createSourcePreviewCache(async () => {
			if (++calls === 1) throw new Error('Temporary failure');
			return preview();
		});
		await expect(cache.get('a', 1)).rejects.toThrow('Temporary failure');
		await cache.get('a', 1);
		await cache.get('b', 1);
		await cache.get('c', 1);
		await cache.get('a', 1);
		await cache.get('d', 1);
		expect(calls).toBe(5);
		await cache.get('b', 1);
		expect(calls).toBe(6);
		cache.clear();
		await cache.get('b', 1);
		expect(calls).toBe(7);
	});
});

test('the selected PDF page gets the next render slot ahead of queued thumbnails', async () => {
	const release: Array<() => void> = [];
	const active = Array.from({ length: 3 }, () =>
		withPdfRenderSlot(() => new Promise<void>((resolve) => release.push(resolve)))
	);
	const order: string[] = [];
	const thumbnail = withPdfRenderSlot(async () => {
		order.push('thumbnail');
	});
	const selected = withPdfRenderSlot(async () => {
		order.push('selected');
	}, true);
	for (const resolve of release) resolve();
	await Promise.all([...active, thumbnail, selected]);
	expect(order).toEqual(['selected', 'thumbnail']);
});

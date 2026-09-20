import { test, expect, spyOn } from 'bun:test';
import { normalizeDatalab, validatePollingUrl, submitDatalab } from '../src/convex/datalab';
const result = {
	status: 'complete',
	success: true,
	page_count: 1,
	json: {
		children: [
			{
				id: '/page/0/Page/0',
				block_type: 'Page',
				children: [
					{
						id: '/page/0/Text/1',
						page: 0,
						block_type: 'Text',
						markdown: 'Source text',
						bbox: [1, 2, 3, 4]
					}
				]
			}
		]
	}
};
test('preserves page and block evidence', () => {
	const o = normalizeDatalab(result, 1);
	expect(o.pages?.[0].markdown).toBe('Source text');
	expect(o.pages?.[0].blocks?.[0].bbox).toEqual([1, 2, 3, 4]);
});
test('rejects failed, incomplete and reordered output', () => {
	expect(() => normalizeDatalab({ ...result, success: false }, 1)).toThrow();
	expect(() => normalizeDatalab(result, 2)).toThrow();
	expect(() =>
		normalizeDatalab(
			{ ...result, json: { children: [{ ...result.json.children[0], id: '/page/1/Page/1' }] } },
			1
		)
	).toThrow();
});
test('rejects unexpected credential destinations', () => {
	for (const url of [
		'https://example.com/api/v1/convert/a',
		'http://www.datalab.to/api/v1/convert/a',
		'https://www.datalab.to/api/v1/convert/a?key=bad'
	])
		expect(() => validatePollingUrl(url)).toThrow();
});
test('regional file URL requests avoid rejected multipart encoding', async () => {
	const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
		Response.json({
			success: true,
			request_check_url: 'https://www.datalab.to/api/v1/convert/test'
		})
	);
	try {
		await submitDatalab('test-key', 'https://example.com/sample.pdf');
		const body = fetchSpy.mock.calls[0][1]?.body;
		expect(body).toBeInstanceOf(URLSearchParams);
		if (!(body instanceof URLSearchParams)) throw new Error('Expected URL-encoded request');
		expect(body.get('processing_location')).toBe('us');
		expect(body.get('file_url')).toBe('https://example.com/sample.pdf');
	} finally {
		fetchSpy.mockRestore();
	}
});

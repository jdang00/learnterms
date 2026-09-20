import { test, expect } from 'bun:test';
import { normalizeDatalab } from '../../src/convex/datalab';
test.skipIf(!(await Bun.file('tmp/ocr-comparison/structure.json').exists()))(
	'saved live sample retains both citations without image payloads',
	async () => {
		const f = Bun.file('tmp/ocr-comparison/structure.json');

		const o = normalizeDatalab(await f.json(), 7);
		expect(o.pages?.[1].markdown).toContain('JAMA');
		expect(o.pages?.[5].markdown).toContain('Maher');
		expect(JSON.stringify(o)).not.toContain('/9j/');
	}
);

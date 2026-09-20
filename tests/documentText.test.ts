import { expect, test } from 'bun:test';
import { cleanSourceMarkdown, pageMarkdown, parseStoredPages } from '../src/convex/documentParsing';

test('old extraction notes disappear without losing text, citations or image locations', () => {
	const markdown = `<!-- page:1 -->\n\nBefore\n\n![diagram](figure.png)\n\nAfter | 6.00 D\n\nJAMA 2020\n\n[Source extraction note: Sparse extracted text; inspect the original page.]\n[Source extraction note: Contains images: questions must not depend on unseen visual details.]\n\n---\n\n<!-- page:2 -->\n\nMaher citation\n\n[Source extraction note: Low OCR confidence; inspect numerical values and labels.]`;
	const pages = parseStoredPages(markdown);
	expect(pages.map((p) => p.pageNumber)).toEqual([1, 2]);
	expect(pages[0].text).toContain('Before\n\n[Image]\n\nAfter | 6.00 D');
	expect(pages[0].text).toContain('JAMA 2020');
	expect(pages[1].text).toBe('Maher citation');
	expect(cleanSourceMarkdown(markdown)).not.toContain('Source extraction note:');
	expect(pages[0].text.match(/\[Image\]/g)).toHaveLength(1);
	expect(cleanSourceMarkdown(cleanSourceMarkdown(markdown))).toBe(cleanSourceMarkdown(markdown));
});

test('structured image blocks have a marker even when the parser supplies no image Markdown', () => {
	const block = (type: string, markdown: string) => ({
		id: type,
		type,
		markdown,
		bbox: [],
		sectionHierarchy: {}
	});
	expect(
		pageMarkdown({
			blocks: [block('Text', 'Before'), block('Picture', ''), block('Text', 'After')]
		})
	).toBe('Before\n\n[Image]\n\nAfter');
});

test('legacy image-only diagnostics retain an indicator on the correct page', () => {
	const pages = parseStoredPages(
		'<!-- page:1 -->\nText\n[Source extraction note: Contains images: questions must not depend on unseen visual details.]\n\n---\n\n<!-- page:2 -->\nOther page'
	);
	expect(pages[0].text).toContain('[Image]');
	expect(pages[1].text).toBe('Other page');
	expect(
		cleanSourceMarkdown('[Source extraction note: an actual quotation in the document]')
	).toContain('an actual quotation');
});

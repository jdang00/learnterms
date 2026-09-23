import katex from 'katex';

export type DeckPreviewPage = {
	pageNumber: number;
	heading?: string;
	imageCount: number;
	tableCount: number;
};

type DeckSection = {
	pageNumber?: number;
	text: string;
};

export function isLocalArtifactLink(href: string) {
	const value = href.trim().toLowerCase();
	return (
		value.endsWith('.md') ||
		value.endsWith('.markdown') ||
		value.endsWith('.json') ||
		value.includes('.md#') ||
		value.includes('.markdown#') ||
		value.includes('.json#') ||
		value.startsWith('./') ||
		value.startsWith('../')
	);
}

export function stripPreviewArtifactReferences(markdown: string) {
	return markdown
		.split('\n')
		.filter((line) => {
			const trimmed = line.trim();
			if (!trimmed) return true;
			return (
				!/^#{1,6}\s+Extracted tables\s*$/i.test(trimmed) &&
				!/^!?\[[^\]]*\]\((?:\.{1,2}\/)?[^)]*\.(?:md|markdown|json)\s*\)$/i.test(trimmed) &&
				!/^!?[\w\s.-]*tbl[-_\s]*\d+[^)]*\.(?:md|markdown|json)["')\s]*$/i.test(trimmed) &&
				!/^(?:\.{1,2}\/)?[^/\s]+\.(?:md|markdown|json)$/i.test(trimmed)
			);
		})
		.join('\n')
		.replace(/!?\[[^\]]*\]\((?:\.{1,2}\/)?[^)]*\.(?:md|markdown|json)\s*\)/gi, '')
		.replace(/\(?\b[\w.-]*tbl[-_\s]*\d+[\w.-]*\.(?:md|markdown|json)["')]*\)?/gi, '')
		.replace(/[ \t]{2,}/g, ' ')
		.replace(/\n{3,}/g, '\n\n');
}

export function extractTableLabels(markdown: string) {
	const labels: string[] = [];
	const lines = markdown.split('\n');
	for (let index = 0; index < lines.length; index++) {
		const line = lines[index];
		const nextLine = lines[index + 1] ?? '';
		const isTableStart =
			/^\s*\|.+\|\s*$/.test(line) &&
			/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(nextLine);
		if (!isTableStart) continue;

		let label = '';
		for (let cursor = index - 1; cursor >= Math.max(0, index - 8); cursor--) {
			const trimmed = lines[cursor].trim();
			if (!trimmed) continue;
			const match = trimmed.match(/^#{0,6}\s*(Table\s+\d+[A-Za-z]?)\b/i);
			if (match) {
				label = match[1].replace(/\s+/g, ' ');
				break;
			}
		}
		labels.push(label || `Table ${labels.length + 1}`);
	}
	return labels;
}

export function resolveTableLabels(labels: string[]) {
	const normalized = labels.map((label) => label.trim()).filter(Boolean);
	const uniqueLabels = new Set(normalized.map((label) => label.toLowerCase()));
	const hasRepeatedGeneratedLabel = normalized.length > 1 && uniqueLabels.size === 1;
	if (hasRepeatedGeneratedLabel) {
		return normalized.map((_, index) => `Table ${index + 1}`);
	}
	return normalized.map((label, index) => label || `Table ${index + 1}`);
}

export function stripStandaloneTableHeadings(markdown: string) {
	return markdown
		.split('\n')
		.filter((line) => !/^#{0,6}\s*Table\s+\d+[A-Za-z]?\s*$/i.test(line.trim()))
		.join('\n')
		.replace(/\n{3,}/g, '\n\n');
}

function isGenericPageHeading(value: string | undefined) {
	return !value || /^Page \d+$/i.test(value.trim());
}

function isSlideArtifactLine(value: string) {
	const line = value.trim();
	return (
		!line ||
		/^\d+$/.test(line) ||
		/^<!--\s*page:\d+\s*-->$/.test(line) ||
		/^!\[img-\d+\.(?:jpe?g|png|webp|gif)\]\(img-\d+\.(?:jpe?g|png|webp|gif)\)$/i.test(line) ||
		/^img-\d+\.(?:jpe?g|png|webp|gif)$/i.test(line)
	);
}

function isHeadingContinuation(value: string) {
	const line = value.trim();
	return (
		line.length > 0 &&
		line.length <= 48 &&
		!/^[-*+]\s+/.test(line) &&
		!/^#{1,6}\s+/.test(line) &&
		!/^!\[/.test(line) &&
		!/^<!--/.test(line) &&
		!/[.!?:;]$/.test(line)
	);
}

function mergeWrappedHeadings(markdown: string) {
	const lines = markdown.split('\n');
	const nextLines: string[] = [];

	for (let index = 0; index < lines.length; index++) {
		const headingMatch = lines[index].match(/^(#{1,6})\s+(.+?)\s*$/);
		if (!headingMatch) {
			nextLines.push(lines[index]);
			continue;
		}

		const parts = [headingMatch[2].trim()];
		let cursor = index + 1;
		while (
			cursor < lines.length &&
			isHeadingContinuation(lines[cursor]) &&
			parts.join(' ').length < 90
		) {
			parts.push(lines[cursor].trim());
			cursor++;
		}

		nextLines.push(`${headingMatch[1]} ${parts.join(' ')}`);
		index = cursor - 1;
	}

	return nextLines.join('\n');
}

function normalizeSlideText(value: string) {
	const withoutArtifacts = value
		.split('\n')
		.filter((line) => !isSlideArtifactLine(line))
		.join('\n');

	return mergeWrappedHeadings(withoutArtifacts)
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

function splitLongSlide(slide: string, maxChars = 800) {
	if (slide.length <= maxChars) return [slide];
	const lines = slide.split('\n');
	const heading = lines.find((line) => /^#{1,3}\s+\S/.test(line.trim())) ?? '';
	const body = lines.filter((line) => line !== heading);
	const slides: string[] = [];
	let current = heading;

	for (const line of body) {
		const paragraphParts =
			line.length > maxChars ? (line.match(/.{1,520}(?:\s+|$)/g) ?? [line]) : [line];
		for (const part of paragraphParts) {
			const nextLine = part.trimEnd();
			const next = current ? `${current}\n${nextLine}` : nextLine;
			if (next.length > maxChars && current.trim() && current !== heading) {
				slides.push(current.trim());
				current = heading ? `${heading}\n${nextLine}` : nextLine;
			} else {
				current = next;
			}
		}
	}
	if (current.trim()) slides.push(current.trim());
	return slides;
}

function splitLongSlideByParagraphs(slide: string, maxChars = 800) {
	if (slide.length <= maxChars) return [slide];
	const blocks = slide.split(/\n{2,}/);
	const heading = blocks.find((block) => /^#{1,3}\s+\S/.test(block.trim())) ?? '';
	const body = blocks.filter((block) => block !== heading);
	const slides: string[] = [];
	let current = heading;

	for (const block of body) {
		const next = current ? `${current}\n\n${block}` : block;
		if (next.length > maxChars && current.trim() && current !== heading) {
			slides.push(current.trim());
			current = heading ? `${heading}\n${block}` : block;
		} else {
			current = next;
		}
	}
	if (current.trim()) slides.push(current.trim());
	return slides.flatMap((part) => splitLongSlide(part, maxChars));
}

function parseDeckSections(markdown: string): DeckSection[] {
	const rawSections = markdown.split(/\n\s*---\s*\n/g);
	const sections = rawSections.map((section) => {
		const pageMatch = section.match(/<!--\s*page:(\d+)\s*-->/);
		return {
			pageNumber: pageMatch ? Number(pageMatch[1]) : undefined,
			text: normalizeSlideText(section)
		};
	});

	if (sections.length > 1) return sections;
	return normalizeSlideText(markdown)
		.split(/\n(?=#{1,2}\s+\S)/g)
		.map((text) => ({ text: text.trim() }));
}

function splitSectionByHeadings(section: string) {
	const parts = section
		.split(/\n(?=#\s+\S)/g)
		.map((part) => part.trim())
		.filter(Boolean);
	return parts.length > 0 ? parts : [section];
}

function splitMarkdownIntoSlides(markdown: string, pages: DeckPreviewPage[]) {
	const pageByNumber = new Map(pages.map((page) => [page.pageNumber, page]));
	const sections = parseDeckSections(markdown);
	const slides = sections.flatMap((section, index) => {
		const page =
			section.pageNumber !== undefined ? pageByNumber.get(section.pageNumber) : pages[index];
		const hasUsefulText = section.text.replace(/^#{1,6}\s+.+$/gm, '').trim().length > 0;
		const fallbackHeading = !isGenericPageHeading(page?.heading) ? page?.heading : undefined;

		if (!section.text && !fallbackHeading) return [];
		if (!section.text && fallbackHeading) return [`# ${fallbackHeading}`];

		return splitSectionByHeadings(section.text).flatMap((part) => {
			const hasHeading = /^#{1,3}\s+\S/m.test(part);
			if (!hasUsefulText && !fallbackHeading && !hasHeading) return [];
			const withHeading = hasHeading || !fallbackHeading ? part : `# ${fallbackHeading}\n\n${part}`;
			return splitLongSlideByParagraphs(withHeading);
		});
	});

	return slides.length > 0 ? slides : [normalizeSlideText(markdown)];
}

export function buildMarpDeckMarkdown(args: {
	title: string;
	markdown: string;
	pages: DeckPreviewPage[];
}) {
	const slides = splitMarkdownIntoSlides(args.markdown, args.pages);
	const hasTitleSlide = slides[0] && /^#\s+\S/.test(slides[0].trim());
	const titleSlide = `# ${args.title}`;
	const contentSlides = hasTitleSlide ? slides : [titleSlide, ...slides];

	const frontmatter = [
		'---',
		'marp: true',
		'theme: default',
		'paginate: true',
		'size: 16:9',
		'backgroundColor: #ffffff',
		'color: #1f2937',
		'style: |',
		'  section { font-size: 24px; line-height: 1.35; padding: 58px 76px; }',
		'  h1 { font-size: 38px; line-height: 1.08; margin-bottom: 0.55em; }',
		'  h2 { font-size: 32px; line-height: 1.12; margin-bottom: 0.5em; }',
		'  p, li { font-size: 24px; line-height: 1.35; }',
		'---',
		''
	].join('\n');
	const body = contentSlides
		.map((slide) => normalizeSlideText(slide))
		.filter(Boolean)
		.join('\n\n---\n\n');

	return `${frontmatter}${body}`;
}

export function renderLatex(markdown: string) {
	const protectedBlocks: string[] = [];
	const protect = (value: string) => {
		const token = `@@LT_PROTECTED_${protectedBlocks.length}@@`;
		protectedBlocks.push(value);
		return token;
	};

	let next = markdown.replace(/```[\s\S]*?```/g, protect).replace(/`[^`\n]+`/g, protect);

	next = next
		.replace(/(^|\n)([ \t]*)\\\(([\s\S]*?)\\\)([ \t]*)(?=\n|$)/g, (match, lead, indent, source) => {
			if (source.includes('\n\n')) return match;
			return `${lead}${indent}\\[${source}\\]`;
		})
		.replace(
			/(^|\n)([ \t]*)\$([^\n$]{1,800}?)(?<!\\)\$([ \t]*)(?=\n|$)/g,
			(match, lead, indent, source) => {
				if (!/[\\^_=+\-*/{}()[\]]/.test(source)) return match;
				return `${lead}${indent}$$${source}$$`;
			}
		);

	const escapeAttribute = (value: string) =>
		value
			.replace(/&/g, '&amp;')
			.replace(/"/g, '&quot;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');

	const renderMath = (source: string, displayMode: boolean) => {
		try {
			const cleanSource = source.trim();
			const rendered = katex.renderToString(cleanSource, {
				displayMode,
				throwOnError: false,
				strict: false,
				trust: false,
				output: 'htmlAndMathml'
			});
			if (!displayMode) return rendered;
			return `<div class="math-block"><button type="button" class="math-copy" data-latex="${escapeAttribute(cleanSource)}" aria-label="Copy LaTeX" title="Copy LaTeX"><span class="math-copy-icon" aria-hidden="true"></span></button>${rendered}</div>`;
		} catch {
			return source;
		}
	};

	next = next
		.replace(/\\\[([\s\S]+?)\\\]/g, (_match, source) => renderMath(source, true))
		.replace(/\$\$([\s\S]+?)\$\$/g, (_match, source) => renderMath(source, true))
		.replace(/\\\(([\s\S]+?)\\\)/g, (_match, source) => renderMath(source, false))
		.replace(/(^|[^\\])\$([^\n$]{1,500}?)(?<!\\)\$/g, (_match, prefix, source) => {
			if (!/[\\^_=+\-*/{}()[\]]/.test(source)) return `${prefix}$${source}$`;
			return `${prefix}${renderMath(source, false)}`;
		});

	return next.replace(
		/@@LT_PROTECTED_(\d+)@@/g,
		(_match, index) => protectedBlocks[Number(index)] ?? ''
	);
}

export function styleTag(css: string) {
	return `<${'style'}>${css}</${'style'}>`;
}

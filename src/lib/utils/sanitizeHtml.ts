import sanitizeHtmlLib from 'sanitize-html';

const ALLOWED_TAGS = [
	'a',
	'blockquote',
	'br',
	'button',
	'code',
	'div',
	'em',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'hr',
	'li',
	'mark',
	'ol',
	'p',
	'pre',
	's',
	'section',
	'span',
	'strong',
	'sub',
	'sup',
	'table',
	'tbody',
	'td',
	'th',
	'thead',
	'tr',
	'u',
	'ul',
	'annotation',
	'math',
	'menclose',
	'mfrac',
	'mi',
	'mmultiscripts',
	'mn',
	'mo',
	'mover',
	'mpadded',
	'mphantom',
	'mroot',
	'mrow',
	'ms',
	'mspace',
	'msqrt',
	'mstyle',
	'msub',
	'msubsup',
	'msup',
	'mtable',
	'mtd',
	'mtext',
	'mtr',
	'munder',
	'munderover',
	'semantics'
];

const ALLOWED_ATTRIBUTES: sanitizeHtmlLib.IOptions['allowedAttributes'] = {
	a: ['href', 'target', 'rel'],
	button: ['aria-label', 'class', 'data-latex', 'data-table-index', 'title', 'type'],
	'*': ['aria-hidden', 'class', 'style'],
	annotation: ['encoding'],
	math: ['display', 'xmlns']
};

const ALLOWED_STYLES: sanitizeHtmlLib.IOptions['allowedStyles'] = {
	'*': {
		'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/]
	}
};

export function sanitizeHtml(value: string | undefined | null): string {
	return sanitizeHtmlLib(String(value ?? ''), {
		allowedTags: ALLOWED_TAGS,
		allowedAttributes: ALLOWED_ATTRIBUTES,
		allowedStyles: ALLOWED_STYLES,
		allowedSchemes: ['http', 'https', 'mailto', 'tel'],
		allowedSchemesAppliedToAttributes: ['href']
	});
}

const DECK_ALLOWED_TAGS = [...ALLOWED_TAGS, 'svg', 'foreignObject'];

const DECK_ALLOWED_ATTRIBUTES: sanitizeHtmlLib.IOptions['allowedAttributes'] = {
	...ALLOWED_ATTRIBUTES,
	'*': ['aria-hidden', 'class', 'style', 'id', 'data-marpit-svg', 'data-size'],
	svg: ['viewBox', 'preserveAspectRatio', 'data-marpit-svg', 'xmlns', 'width', 'height'],
	foreignObject: ['width', 'height']
};

// Marp's inline-SVG output relies on case-sensitive tags (foreignObject) and
// attributes (viewBox), so the shared sanitizer's lowercasing must be disabled
// for slide-deck HTML.
export function sanitizeDeckHtml(value: string | undefined | null): string {
	return sanitizeHtmlLib(String(value ?? ''), {
		parser: { lowerCaseTags: false, lowerCaseAttributeNames: false },
		allowedTags: DECK_ALLOWED_TAGS,
		allowedAttributes: DECK_ALLOWED_ATTRIBUTES,
		allowedStyles: ALLOWED_STYLES,
		allowedSchemes: ['http', 'https', 'mailto', 'tel'],
		allowedSchemesAppliedToAttributes: ['href']
	});
}

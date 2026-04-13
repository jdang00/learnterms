import sanitizeHtmlLib from 'sanitize-html';

const ALLOWED_TAGS = [
	'a',
	'blockquote',
	'br',
	'code',
	'em',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'li',
	'mark',
	'ol',
	'p',
	'pre',
	's',
	'span',
	'strong',
	'sub',
	'sup',
	'u',
	'ul'
];

const ALLOWED_ATTRIBUTES: sanitizeHtmlLib.IOptions['allowedAttributes'] = {
	a: ['href', 'target', 'rel'],
	'*': ['style']
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

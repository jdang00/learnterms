import { browser } from '$app/environment';
import createDOMPurify from 'dompurify';

let domPurify: ReturnType<typeof createDOMPurify> | null = null;

export function sanitizeHtml(value: string | undefined | null): string {
	const raw = String(value ?? '');
	if (!browser) {
		return raw
			.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
			.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
			.replace(/\son[a-z]+\s*=\s*(["'])[\s\S]*?\1/gi, '')
			.replace(/\s(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, ' $1="#"');
	}
	domPurify ??= createDOMPurify(window);
	return domPurify.sanitize(raw);
}

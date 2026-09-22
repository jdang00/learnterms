export const NOTE_LIMIT = 3000;
export const NOTE_STORAGE_LIMIT = 40000;
export type NoteNode = {
	type: string;
	text?: string;
	content?: NoteNode[];
	marks?: { type: string }[];
	attrs?: { start: number };
};
export const EMPTY_NOTE = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });
export type NoteSnapshot = { content: string; revision: number };
export type NoteSaveResult = NoteSnapshot & { status: 'saved' | 'conflict' };

// Share the same bounded, formatting-only document language between the editor and server.
// Reconstruct every node; arbitrary HTML, links, images, and attributes are never stored/rendered.
export function normalizeNote(raw: string) {
	if (raw.length > NOTE_STORAGE_LIMIT)
		throw new Error('This note has too much formatting. Simplify it and try again.');
	let input: unknown;
	try {
		input = JSON.parse(raw);
	} catch {
		throw new Error('Invalid note document.');
	}
	let nodes = 0;
	let text = '';
	function visit(value: unknown, parent: string, depth: number): NoteNode {
		if (!value || typeof value !== 'object' || Array.isArray(value) || ++nodes > 500 || depth > 10)
			throw new Error('Invalid or overly complex note.');
		const n = value as Record<string, unknown>;
		const allowed: Record<string, string[]> = {
			root: ['doc'],
			doc: ['paragraph', 'bulletList', 'orderedList'],
			paragraph: ['text', 'hardBreak'],
			bulletList: ['listItem'],
			orderedList: ['listItem'],
			listItem: ['paragraph', 'bulletList', 'orderedList']
		};
		if (typeof n.type !== 'string' || !allowed[parent]?.includes(n.type))
			throw new Error('Unsupported note formatting.');
		const out: NoteNode = { type: n.type };
		if (n.type === 'text') {
			if (typeof n.text !== 'string' || !n.text.length) throw new Error('Invalid note text.');
			out.text = n.text;
			text += n.text;
			if (n.marks !== undefined) {
				if (!Array.isArray(n.marks) || n.marks.length > 4) throw new Error('Invalid formatting.');
				out.marks = n.marks.map((mark) => {
					if (!mark || !['bold', 'italic', 'underline', 'strike'].includes(mark.type))
						throw new Error('Unsupported note formatting.');
					return { type: String(mark.type) };
				});
			}
		} else if (n.type === 'hardBreak') text += '\n';
		else {
			if (n.content !== undefined && !Array.isArray(n.content))
				throw new Error('Invalid note content.');
			const children = (n.content ?? []) as unknown[];
			if (n.type !== 'paragraph' && !children.length) throw new Error('Invalid empty block.');
			if (n.type === 'listItem' && (children[0] as NoteNode)?.type !== 'paragraph')
				throw new Error('A list item must start with a paragraph.');
			if (children.length)
				out.content = children.map((child) => visit(child, n.type as string, depth + 1));
			if (n.type === 'paragraph') text += '\n';
			if (n.type === 'orderedList') {
				const start = (n.attrs as { start?: unknown } | undefined)?.start ?? 1;
				if (typeof start !== 'number' || !Number.isInteger(start) || start < 1 || start > 999)
					throw new Error('Invalid list numbering.');
				out.attrs = { start };
			}
		}
		return out;
	}
	const doc = visit(input, 'root', 0);
	const count = Array.from(text.replace(/\n$/, '')).length;
	if (count > NOTE_LIMIT)
		throw new Error(`Notes are limited to ${NOTE_LIMIT.toLocaleString()} characters.`);
	return {
		content: text.trim() ? JSON.stringify(doc) : EMPTY_NOTE,
		count: text.trim() ? count : 0
	};
}

/** Loaded on demand so pages don't ship Tiptap until an editor mounts. */
export async function loadEditorExtensions() {
	const [{ default: StarterKit }, { default: Highlight }] = await Promise.all([
		import('@tiptap/starter-kit'),
		import('@tiptap/extension-highlight')
	]);
	return [
		StarterKit.configure({
			link: {
				openOnClick: false,
				HTMLAttributes: {
					class: 'text-primary-ink underline'
				}
			}
		}),
		Highlight
	];
}

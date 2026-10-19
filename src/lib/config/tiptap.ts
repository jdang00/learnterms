import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';

export const getEditorExtensions = () => [
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

/** Same extensions, loaded on demand so editors don't ship Tiptap with the page. */
export async function loadEditorExtensions() {
	const [{ default: StarterKitModule }, { default: HighlightModule }] = await Promise.all([
		import('@tiptap/starter-kit'),
		import('@tiptap/extension-highlight')
	]);
	return [
		StarterKitModule.configure({
			link: {
				openOnClick: false,
				HTMLAttributes: {
					class: 'text-primary-ink underline'
				}
			}
		}),
		HighlightModule
	];
}

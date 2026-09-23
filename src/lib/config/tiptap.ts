import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';

export const getEditorExtensions = () => [
	StarterKit.configure({
		link: {
			openOnClick: false,
			HTMLAttributes: {
				class: 'text-primary underline'
			}
		}
	}),
	Highlight
];

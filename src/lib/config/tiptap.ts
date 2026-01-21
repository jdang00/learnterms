import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';

// StarterKit already includes: Bold, Italic, Strike, Code, Blockquote, BulletList, OrderedList, ListItem, etc.
// We only need to add extensions that are NOT in StarterKit
export const getEditorExtensions = () => [
	StarterKit.configure({
		// Ensure no conflicts with our custom extensions
		link: false,
		underline: false,
	}),
	Underline,
	Link.configure({
		openOnClick: false,
		HTMLAttributes: {
			class: 'text-primary underline',
		},
	}),
	Highlight,
];

import StarterKit from '@tiptap/starter-kit';
import Strike from '@tiptap/extension-strike';
import Blockquote from '@tiptap/extension-blockquote';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import Code from '@tiptap/extension-code';

export const getEditorExtensions = () => [
	StarterKit,
	Underline,
	Strike,
	Code,
	Blockquote,
	BulletList,
	OrderedList,
	ListItem,
	Link,
	Highlight,
];

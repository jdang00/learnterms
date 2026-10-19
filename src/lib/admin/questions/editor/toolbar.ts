import type { LucideIcon } from '@lucide/svelte';
import type { Editor } from 'svelte-tiptap';
import Bold from '@lucide/svelte/icons/bold';
import Italic from '@lucide/svelte/icons/italic';
import UnderlineIcon from '@lucide/svelte/icons/underline';
import StrikethroughIcon from '@lucide/svelte/icons/strikethrough';
import CodeIcon from '@lucide/svelte/icons/code';
import HighlighterIcon from '@lucide/svelte/icons/highlighter';
import LinkIcon from '@lucide/svelte/icons/link';
import QuoteIcon from '@lucide/svelte/icons/quote';
import ListIcon from '@lucide/svelte/icons/list';
import ListOrderedIcon from '@lucide/svelte/icons/list-ordered';

export type ToolbarItem = {
	name: string;
	command: () => void;
	icon: LucideIcon;
	active: () => boolean;
};

/** Formatting commands for a TipTap editor, read lazily so the editor can mount later. */
export function createToolbarCommands(getEditor: () => Editor | undefined) {
	const withEditor = (command: (editor: Editor) => void) => () => {
		const currentEditor = getEditor();
		if (!currentEditor) return;
		command(currentEditor);
	};

	const promptForLink = withEditor((currentEditor) => {
		const url = prompt('Enter URL:');
		if (!url) return;
		currentEditor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
	});

	const unsetLink = withEditor((currentEditor) => {
		currentEditor.chain().focus().extendMarkRange('link').unsetLink().run();
	});

	const isActive = (name: string, attrs = {}) => getEditor()?.isActive(name, attrs) ?? false;

	const commands = {
		toggleBold: withEditor((currentEditor) => currentEditor.chain().focus().toggleBold().run()),
		toggleItalic: withEditor((currentEditor) => currentEditor.chain().focus().toggleItalic().run()),
		toggleUnderline: withEditor((currentEditor) =>
			currentEditor.chain().focus().toggleUnderline().run()
		),
		toggleStrike: withEditor((currentEditor) => currentEditor.chain().focus().toggleStrike().run()),
		toggleCode: withEditor((currentEditor) => currentEditor.chain().focus().toggleCode().run()),
		toggleHighlight: withEditor((currentEditor) =>
			currentEditor.chain().focus().toggleHighlight().run()
		),
		toggleBlockquote: withEditor((currentEditor) =>
			currentEditor.chain().focus().toggleBlockquote().run()
		),
		toggleBulletList: withEditor((currentEditor) =>
			currentEditor.chain().focus().toggleBulletList().run()
		),
		toggleOrderedList: withEditor((currentEditor) =>
			currentEditor.chain().focus().toggleOrderedList().run()
		),
		setLink: promptForLink,
		unsetLink
	};

	const menuItems = (): ToolbarItem[] => [
		{ name: 'bold', command: commands.toggleBold, icon: Bold, active: () => isActive('bold') },
		{
			name: 'italic',
			command: commands.toggleItalic,
			icon: Italic,
			active: () => isActive('italic')
		},
		{
			name: 'underline',
			command: commands.toggleUnderline,
			icon: UnderlineIcon,
			active: () => isActive('underline')
		},
		{
			name: 'strike',
			command: commands.toggleStrike,
			icon: StrikethroughIcon,
			active: () => isActive('strike')
		},
		{ name: 'code', command: commands.toggleCode, icon: CodeIcon, active: () => isActive('code') },
		{
			name: 'highlight',
			command: commands.toggleHighlight,
			icon: HighlighterIcon,
			active: () => isActive('highlight')
		},
		{
			name: 'link',
			command: () => (isActive('link') ? commands.unsetLink() : commands.setLink()),
			icon: LinkIcon,
			active: () => isActive('link')
		},
		{
			name: 'blockquote',
			command: commands.toggleBlockquote,
			icon: QuoteIcon,
			active: () => isActive('blockquote')
		},
		{
			name: 'bullet-list',
			command: commands.toggleBulletList,
			icon: ListIcon,
			active: () => isActive('bulletList')
		},
		{
			name: 'ordered-list',
			command: commands.toggleOrderedList,
			icon: ListOrderedIcon,
			active: () => isActive('orderedList')
		}
	];

	return { commands, isActive, menuItems };
}

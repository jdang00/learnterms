<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import type { Editor } from 'svelte-tiptap';
	import type { Readable } from 'svelte/store';
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
	import { loadEditorExtensions } from '#lib/config/tiptap.js';
	import { Button } from '#lib/components/ui/button/index.js';
	let {
		value = $bindable(''),
		label,
		disabled = false
	}: { value?: string; label: string; disabled?: boolean } = $props();
	let editor = $state<Readable<Editor>>();
	let Content = $state.raw<(typeof import('svelte-tiptap'))['EditorContent']>();
	type ToolbarItem = {
		name: string;
		command: () => void;
		icon:
			| typeof Bold
			| typeof Italic
			| typeof UnderlineIcon
			| typeof StrikethroughIcon
			| typeof CodeIcon
			| typeof HighlighterIcon
			| typeof LinkIcon
			| typeof QuoteIcon
			| typeof ListIcon
			| typeof ListOrderedIcon;
		active: () => boolean;
	};

	function createToolbarCommands(getEditor: () => Editor | undefined) {
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
			toggleItalic: withEditor((currentEditor) =>
				currentEditor.chain().focus().toggleItalic().run()
			),
			toggleUnderline: withEditor((currentEditor) =>
				currentEditor.chain().focus().toggleUnderline().run()
			),
			toggleStrike: withEditor((currentEditor) =>
				currentEditor.chain().focus().toggleStrike().run()
			),
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
			{
				name: 'code',
				command: commands.toggleCode,
				icon: CodeIcon,
				active: () => isActive('code')
			},
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

	const toolbar = createToolbarCommands(() => $editor);
	onMount(() => {
		let disposed = false;
		void (async () => {
			const [{ createEditor, EditorContent }, extensions] = await Promise.all([
				import('svelte-tiptap'),
				loadEditorExtensions()
			]);
			if (disposed) return;
			Content = EditorContent;
			editor = createEditor({
				extensions,
				content: value,
				editable: !disabled,
				editorProps: {
					attributes: {
						class: 'prose prose-sm max-w-none focus:outline-hidden min-h-[5rem] p-3 tiptap-content',
						'aria-label': label,
						role: 'textbox',
						'aria-multiline': 'true'
					}
				},
				onUpdate: ({ editor }) => {
					value = editor.isEmpty ? '' : editor.getHTML();
				}
			});
		})();
		return () => {
			disposed = true;
		};
	});
	let appliedValue: string | undefined;
	$effect(() => {
		const incoming = value;
		const current = $editor;
		if (!current || incoming === appliedValue) return;
		appliedValue = incoming;
		untrack(() => {
			if (current.getHTML() !== incoming && !(current.isEmpty && !incoming))
				current.commands.setContent(incoming, { emitUpdate: false });
		});
	});
	$effect(() => {
		const editable = !disabled;
		const current = $editor;
		if (current && current.isEditable !== editable)
			untrack(() => current.setEditable(editable, false));
	});
</script>

<div class="min-w-0 overflow-hidden surface focus-within:border-primary">
	{#if $editor && Content}
		<div
			class="flex flex-wrap gap-1 border-b border-border bg-muted/50 p-1"
			role="group"
			aria-label={`${label} formatting`}
		>
			{#each toolbar.menuItems() as item (item.name)}
				<Button
					variant="ghost"
					tone={item.active() ? 'primary' : 'neutral'}
					size="xs"
					shape="square"
					{disabled}
					onclick={item.command}
					tooltip={item.name}
					aria-label={item.name}
					aria-pressed={item.active()}><item.icon size={14} /></Button
				>
			{/each}
		</div>
		<Content editor={$editor} />
	{/if}
</div>

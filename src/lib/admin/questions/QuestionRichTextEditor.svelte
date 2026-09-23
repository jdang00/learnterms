<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { createEditor, Editor, EditorContent } from 'svelte-tiptap';
	import type { Readable } from 'svelte/store';
	import {
		Bold,
		Italic,
		Underline as UnderlineIcon,
		Strikethrough as StrikethroughIcon,
		Code as CodeIcon,
		Highlighter as HighlighterIcon,
		Link as LinkIcon,
		Quote as QuoteIcon,
		List as ListIcon,
		ListOrdered as ListOrderedIcon
	} from 'lucide-svelte';
	import { getEditorExtensions } from '$lib/config/tiptap';
	let {
		value = $bindable(''),
		label,
		disabled = false
	}: { value?: string; label: string; disabled?: boolean } = $props();
	let editor = $state<Readable<Editor>>();
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
		editor = createEditor({
			extensions: getEditorExtensions(),
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

<div
	class="min-w-0 overflow-hidden rounded-2xl border border-base-300 bg-base-100 focus-within:border-primary"
>
	{#if $editor}
		<div
			class="flex flex-wrap gap-1 border-b border-base-300 bg-base-200/50 p-1"
			role="group"
			aria-label={`${label} formatting`}
		>
			{#each toolbar.menuItems() as item (item.name)}
				<button
					type="button"
					class="btn btn-ghost btn-xs btn-square {item.active() ? 'btn-active text-primary' : ''}"
					{disabled}
					onclick={item.command}
					title={item.name}
					aria-label={item.name}
					aria-pressed={item.active()}><item.icon size={14} /></button
				>
			{/each}
		</div>
		<EditorContent editor={$editor} />
	{/if}
</div>

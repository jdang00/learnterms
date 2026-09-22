<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { Editor, Extension } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import { Plugin } from '@tiptap/pm/state';
	import { Bold, Italic, Underline, List, ListOrdered, Undo2, Redo2 } from 'lucide-svelte';
	import {
		EMPTY_NOTE,
		NOTE_LIMIT,
		normalizeNote,
		type NoteSnapshot,
		type NoteSaveResult
	} from '$lib/question-notes/document';

	let {
		snapshot,
		save,
		draftKey
	}: {
		snapshot: NoteSnapshot;
		save: (content: string, expectedRevision: number) => Promise<NoteSaveResult>;
		draftKey: string;
	} = $props();
	let host: HTMLDivElement;
	let editor = $state.raw<Editor>();
	let content = $state(EMPTY_NOTE);
	let savedContent = $state(EMPTY_NOTE);
	let revision = $state(0);
	let count = $state(0);
	let saving = $state(false);
	let error = $state('');
	let limitError = $state('');
	let conflict = $state<NoteSnapshot | null>(null);
	let toolbarRevision = $state(0);
	let initialized = $state(false);
	const dirty = $derived(content !== savedContent);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let pending: Promise<boolean> | undefined;
	const key = untrack(() => `lt:questionNoteDraft:${draftKey}`);
	const persist = untrack(() => save);

	function cacheDraft() {
		try {
			if (content === savedContent) localStorage.removeItem(key);
			else localStorage.setItem(key, JSON.stringify({ content, revision }));
		} catch {
			/* Server saving still works without local storage. */
		}
	}
	function replaceDocument(value: string) {
		const normalized = normalizeNote(value);
		content = normalized.content;
		count = normalized.count;
		editor?.commands.setContent(JSON.parse(content), { emitUpdate: false });
		limitError = '';
	}
	async function drain(): Promise<boolean> {
		if (conflict) return false;
		saving = true;
		error = '';
		try {
			while (content !== savedContent) {
				const sent = content;
				const response = await persist(sent, revision);
				if (response.status === 'conflict') {
					conflict = response;
					return false;
				}
				revision = response.revision;
				savedContent = response.content;
				cacheDraft();
			}
			return true;
		} catch {
			error = 'Could not save your note. Your text is still here—please retry.';
			return false;
		} finally {
			saving = false;
		}
	}
	export async function flush(): Promise<boolean> {
		clearTimeout(timer);
		if (pending) return pending;
		pending = drain();
		try {
			return await pending;
		} finally {
			pending = undefined;
		}
	}
	function changed() {
		if (!editor) return;
		const normalized = normalizeNote(JSON.stringify(editor.getJSON()));
		content = normalized.content;
		count = normalized.count;
		limitError = '';
		error = '';
		cacheDraft();
		clearTimeout(timer);
		timer = setTimeout(() => void flush(), 650);
	}
	onMount(() => {
		savedContent = snapshot.content;
		revision = snapshot.revision;
		replaceDocument(snapshot.content);
		try {
			const draft = JSON.parse(localStorage.getItem(key) ?? 'null');
			if (
				draft &&
				Number.isSafeInteger(draft.revision) &&
				draft.revision >= 0 &&
				typeof draft.content === 'string'
			) {
				replaceDocument(draft.content);
				if (content !== snapshot.content && draft.revision !== snapshot.revision)
					conflict = snapshot;
			}
		} catch {
			/* Ignore malformed local recovery data. */
		}
		editor = new Editor({
			element: host,
			extensions: [
				StarterKit.configure({
					heading: false,
					blockquote: false,
					code: false,
					codeBlock: false,
					horizontalRule: false,
					link: false,
					trailingNode: false
				}),
				Extension.create({
					name: 'noteLimit',
					addProseMirrorPlugins() {
						return [
							new Plugin({
								filterTransaction(transaction) {
									if (!transaction.docChanged) return true;
									try {
										normalizeNote(JSON.stringify(transaction.doc.toJSON()));
										return true;
									} catch (cause) {
										limitError = cause instanceof Error ? cause.message : 'This note is too long.';
										return false;
									}
								}
							})
						];
					}
				})
			],
			content: JSON.parse(content),
			editorProps: {
				attributes: {
					class: 'prose prose-sm max-w-none min-h-full p-3 outline-none break-words',
					role: 'textbox',
					'aria-label': 'Your note',
					'aria-multiline': 'true',
					'data-private': 'true'
				}
			},
			onUpdate: changed,
			onTransaction: () => toolbarRevision++
		});
		initialized = true;
		if (content !== savedContent && !conflict) timer = setTimeout(() => void flush(), 650);
		return () => {
			clearTimeout(timer);
			cacheDraft();
			void flush();
			editor?.destroy();
		};
	});
	$effect(() => {
		const incoming = snapshot;
		if (initialized && !dirty && !saving && incoming.revision > revision) {
			untrack(() => {
				revision = incoming.revision;
				savedContent = incoming.content;
				replaceDocument(incoming.content);
			});
		}
	});
	function useLatest() {
		if (!conflict) return;
		revision = conflict.revision;
		savedContent = conflict.content;
		replaceDocument(conflict.content);
		conflict = null;
		cacheDraft();
	}
	function keepMine() {
		if (!conflict) return;
		revision = conflict.revision;
		savedContent = conflict.content;
		conflict = null;
		cacheDraft();
		void flush();
	}
	const buttons = [
		{
			name: 'Bold',
			mark: 'bold',
			icon: Bold,
			run: () => editor?.chain().focus().toggleBold().run()
		},
		{
			name: 'Italic',
			mark: 'italic',
			icon: Italic,
			run: () => editor?.chain().focus().toggleItalic().run()
		},
		{
			name: 'Underline',
			mark: 'underline',
			icon: Underline,
			run: () => editor?.chain().focus().toggleUnderline().run()
		},
		{
			name: 'Bullet list',
			mark: 'bulletList',
			icon: List,
			run: () => editor?.chain().focus().toggleBulletList().run()
		},
		{
			name: 'Numbered list',
			mark: 'orderedList',
			icon: ListOrdered,
			run: () => editor?.chain().focus().toggleOrderedList().run()
		}
	];
	function isActive(mark: string) {
		toolbarRevision;
		return editor?.isActive(mark) ?? false;
	}
</script>

<svelte:window
	onbeforeunload={(event) => {
		if (dirty) {
			event.preventDefault();
			event.returnValue = '';
		}
	}}
/>
<div
	class="flex min-h-72 flex-1 flex-col rounded-xl border border-base-300 overflow-hidden ph-no-capture ph-mask"
>
	<div
		class="flex flex-wrap gap-1 border-b border-base-300 bg-base-200/50 p-2"
		role="group"
		aria-label="Note formatting"
	>
		{#each buttons as button}<button
				type="button"
				class="btn btn-sm btn-square {isActive(button.mark) ? 'btn-primary btn-soft' : 'btn-ghost'}"
				aria-label={button.name}
				title={button.name}
				aria-pressed={isActive(button.mark)}
				disabled={!editor}
				onclick={button.run}><button.icon size={16} /></button
			>{/each}
		<span class="flex-1"></span>
		<button
			type="button"
			class="btn btn-sm btn-square btn-ghost"
			aria-label="Undo"
			disabled={!editor}
			onclick={() => editor?.chain().focus().undo().run()}><Undo2 size={16} /></button
		>
		<button
			type="button"
			class="btn btn-sm btn-square btn-ghost"
			aria-label="Redo"
			disabled={!editor}
			onclick={() => editor?.chain().focus().redo().run()}><Redo2 size={16} /></button
		>
	</div>
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div
		bind:this={host}
		class="note-editor min-h-0 flex-1 cursor-text overflow-y-auto"
		onclick={(event) => {
			if (event.target === host) editor?.commands.focus('end');
		}}
	></div>
</div>
<div class="mt-2 flex justify-between gap-3 text-xs text-base-content/60">
	<span role="status"
		>{saving
			? 'Saving…'
			: conflict
				? 'Conflicting edit'
				: error
					? 'Not saved'
					: dirty
						? 'Unsaved changes'
						: 'Saved'}</span
	>
	<span class:!text-warning={count > NOTE_LIMIT - 200}
		>{count.toLocaleString()} / {NOTE_LIMIT.toLocaleString()}</span
	>
</div>
{#if limitError}<p role="alert" class="mt-2 text-sm text-error">{limitError}</p>{/if}
{#if error}<div role="alert" class="mt-3 text-sm text-error">
		{error}<button class="btn btn-sm btn-ghost ml-1" onclick={() => void flush()}>Retry save</button
		>
	</div>{/if}
{#if conflict}<div class="mt-3 rounded-xl bg-warning/10 p-3 text-sm" role="alert">
		<p>This note changed in another tab or device. Choose which version to keep.</p>
		<div class="flex flex-wrap gap-2 mt-2">
			<button class="btn btn-sm" onclick={useLatest}>Use saved version</button><button
				class="btn btn-sm btn-warning btn-soft"
				onclick={keepMine}>Keep my version</button
			>
		</div>
	</div>{/if}

<style>
	.note-editor :global(p) {
		margin-block: 0.5em;
	}
	.note-editor :global(ul),
	.note-editor :global(ol) {
		margin-block: 0.5em;
		padding-left: 1.5em;
	}
	.note-editor :global(ul) {
		list-style: disc;
	}
	.note-editor :global(ol) {
		list-style: decimal;
	}
</style>

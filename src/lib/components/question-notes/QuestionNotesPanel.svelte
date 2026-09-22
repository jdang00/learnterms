<script lang="ts">
	import { untrack } from 'svelte';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api';
	import type { Id } from '../../../convex/_generated/dataModel';
	import QuestionNoteEditor from './QuestionNoteEditor.svelte';
	let { questionId, userKey }: { questionId: Id<'question'>; userKey: string } = $props();
	const client = useConvexClient();
	const note = useQuery(api.questionNotes.get, () => ({ questionId }));
	let editor = $state<QuestionNoteEditor>();
	// This component is keyed by question and user; every write retains its original destination.
	const destination = untrack(() => questionId);
	export async function flush() {
		return editor ? editor.flush() : true;
	}
</script>

{#if note.error}<p role="alert" class="text-sm text-error">
		Could not load your note. Close and reopen Notes to retry.
	</p>
{:else if note.data}<QuestionNoteEditor
		bind:this={editor}
		snapshot={note.data}
		draftKey={`${userKey}:${questionId}`}
		save={(content, expectedRevision) =>
			client.mutation(api.questionNotes.save, {
				questionId: destination,
				content,
				expectedRevision
			})}
	/>
{:else}<p role="status" class="text-sm text-base-content/60">Loading your note…</p>{/if}

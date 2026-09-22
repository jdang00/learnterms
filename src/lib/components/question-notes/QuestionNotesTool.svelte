<script lang="ts">
	import { StickyNote } from 'lucide-svelte';
	import { untrack } from 'svelte';
	import { getQuizCommands } from '$lib/components/quiz-dock/commands.svelte';
	import SidePanel from '$lib/components/side-panel/SidePanel.svelte';
	import { sidePanel } from '$lib/components/side-panel/state.svelte';
	import type { Id } from '../../../convex/_generated/dataModel';
	import type QuestionNotesPanel from './QuestionNotesPanel.svelte';
	let { questionId, userKey }: { questionId: Id<'question'>; userKey: string } = $props();
	const registry = getQuizCommands();
	let Panel = $state<typeof QuestionNotesPanel>();
	let error = $state('');

	$effect(() => {
		if (sidePanel.current !== 'notes' || Panel) return;
		import('./QuestionNotesPanel.svelte')
			.then((module) => (Panel = module.default))
			.catch(() => (error = 'Could not load Notes. Close and reopen to retry.'));
	});
	$effect(() =>
		untrack(() =>
			registry?.register({
				id: 'notes',
				name: 'Notes',
				description: 'Your private rich-text note for this question',
				scope: 'question',
				icon: StickyNote,
				tone: 'info',
				look: { variant: 'ghost', tone: 'info' },
				label: () => 'Notes',
				active: () => sidePanel.current === 'notes',
				run: () => sidePanel.toggle('notes')
			})
		)
	);
</script>

<SidePanel id="notes" title="Notes" icon={StickyNote} focus="[contenteditable=true]">
	<div class="flex min-h-0 flex-1 flex-col px-4 pb-4">
		<p class="mb-3 px-1 text-xs text-base-content/50">Private to you · saved with this question</p>
		{#if Panel}
			<!-- Each question gets a fresh editor; the old one saves as it unmounts. -->
			{#key `${userKey}:${questionId}`}<Panel {questionId} {userKey} />{/key}
		{:else if error}<p role="alert" class="text-sm text-error">{error}</p>{/if}
	</div>
</SidePanel>

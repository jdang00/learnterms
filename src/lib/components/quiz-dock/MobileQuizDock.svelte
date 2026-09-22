<script lang="ts">
	import { CircleHelp, MessageSquareText, Paperclip, Settings } from 'lucide-svelte';
	import QuestionSources from '$lib/components/QuestionSources.svelte';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import { untrack } from 'svelte';
	import QuizDock from './QuizDock.svelte';
	import { getQuizCommands } from './commands.svelte';
	import { getDockPreferences } from './dockPreferences.svelte';
	import type { Doc, Id } from '../../../convex/_generated/dataModel';
	import { getRationale, hasRationale } from '$lib/utils/rationale';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';
	import { useQuestionMedia } from '$lib/utils/useQuestionMedia.svelte';

	let { qs = $bindable(), currentlySelected } = $props();

	let isSettingsModalOpen = $state(false);
	let showAttachments = $state(false);
	let isAttachmentViewerOpen = $state(false);
	let selectedAttachment = $state<Doc<'questionMedia'> | null>(null);

	const mediaQuery = useQuestionMedia(() => currentlySelected?._id as Id<'question'> | undefined);

	const media = $derived({
		data: (mediaQuery.data ?? []).filter(
			(attachment) => qs.showSolution || !attachment.showOnSolution
		),
		isLoading: mediaQuery.isLoading
	});

	$effect(() => {
		if (!selectedAttachment) return;
		const current = media.data.find((item) => item._id === selectedAttachment?._id);
		if (!current && !media.isLoading) {
			selectedAttachment = null;
			isAttachmentViewerOpen = false;
		} else if (
			current &&
			(current.url !== selectedAttachment.url || current.updatedAt !== selectedAttachment.updatedAt)
		) {
			selectedAttachment = current;
		}
	});

	const canShowRationale = $derived.by(() => hasRationale(currentlySelected));
	const sanitizedRationale = $derived(sanitizeHtml(getRationale(currentlySelected)));

	$effect(() => {
		if (!qs.showSolution || !canShowRationale) {
			qs.isModalOpen = false;
		}
	});

	function openAttachments() {
		if (media.data.length === 1) {
			selectedAttachment = media.data[0];
			isAttachmentViewerOpen = true;
		} else if (media.data.length > 1) {
			showAttachments = true;
		}
	}

	const registry = getQuizCommands();
	const preferences = getDockPreferences();

	$effect(() =>
		untrack(() =>
			registry?.register(
				{
					id: 'settings',
					name: 'Settings',
					tone: 'neutral',
					look: { variant: 'ghost', tone: 'neutral' },
					scope: 'preference',
					icon: Settings,
					description: 'Open quiz settings',
					label: () => 'Settings',
					run: () => {
						isSettingsModalOpen = true;
					}
				},
				{
					id: 'attachments',
					name: 'Attachments',
					tone: 'info',
					look: { variant: 'soft', tone: 'info' },
					scope: 'question',
					icon: Paperclip,
					description: 'Images attached to this question',
					label: () => 'View attachments',
					visible: () => media.data.length > 0,
					run: openAttachments
				},
				{
					id: 'rationale',
					name: 'Rationale',
					tone: 'success',
					look: { variant: 'soft', tone: 'success' },
					scope: 'question',
					icon: MessageSquareText,
					description: 'Why the answer is right',
					label: () => 'Rationale',
					visible: () => qs.showSolution && canShowRationale,
					run: () => {
						qs.isModalOpen = true;
					}
				}
			)
		)
	);

	const rationaleDocked = $derived(
		preferences?.layout.items.some((item) => item.id === 'rationale') ?? false
	);
</script>

<QuizDock surface="mobile" source="mobile" />

<dialog
	class="modal modal-bottom sm:modal-middle max-w-full p-0 sm:p-4"
	class:modal-open={qs.isModalOpen}
>
	<div class="modal-box rounded-t-3xl sm:rounded-2xl max-h-[65vh]">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
				onclick={() => (qs.isModalOpen = false)}>✕</button
			>
		</form>
		<h3 class="text-lg font-bold">Rationale</h3>
		{#if canShowRationale}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<div class="py-4 tiptap-content">{@html sanitizedRationale}</div>
			<QuestionSources source={currentlySelected?.metadata?.generation} />
		{/if}
	</div>
</dialog>

<dialog class="modal max-w-full p-4" class:modal-open={showAttachments}>
	<div class="modal-box max-w-sm w-full rounded-2xl">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
				onclick={() => (showAttachments = false)}>✕</button
			>
		</form>
		<h3 class="font-semibold text-lg">Attachments ({media.data.length})</h3>
		<div class="grid grid-cols-2 gap-3 mt-3">
			{#each media.data as attachment (attachment._id)}
				<button
					class="group border-2 border-base-300 rounded-lg overflow-hidden cursor-pointer hover:border-primary hover:shadow-md transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-primary"
					onclick={() => {
						selectedAttachment = attachment;
						isAttachmentViewerOpen = true;
						showAttachments = false;
					}}
					aria-label={`View attachment: ${attachment.altText}`}
				>
					<div class="relative">
						<img
							src={attachment.url}
							alt={attachment.altText}
							class="w-full h-24 object-cover group-hover:brightness-110 transition-all duration-200"
						/>
						{#if attachment.caption}
							<div
								class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2"
							>
								<p class="text-white text-xs truncate">{attachment.caption}</p>
							</div>
						{/if}
					</div>
				</button>
			{/each}
		</div>
	</div>
</dialog>

<dialog class="modal max-w-full p-4" class:modal-open={isAttachmentViewerOpen}>
	<div class="modal-box max-w-4xl w-full rounded-2xl">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
				onclick={() => {
					isAttachmentViewerOpen = false;
					selectedAttachment = null;
				}}>✕</button
			>
		</form>
		{#if selectedAttachment}
			<h3 class="font-bold text-lg mb-3">{selectedAttachment.altText}</h3>
			<img
				src={selectedAttachment.url}
				alt={selectedAttachment.altText}
				class="w-full max-h-[70vh] object-contain"
			/>
			{#if selectedAttachment.caption}
				<div class="mt-3">
					<p class="text-sm text-base-content/70">{selectedAttachment.caption}</p>
				</div>
			{/if}
		{/if}
	</div>
</dialog>

<SettingsModal bind:qs bind:isOpen={isSettingsModalOpen} />

{#if qs.showSolution && canShowRationale && !qs.isModalOpen && !rationaleDocked}
	<button
		class="fixed right-4 z-[60] md:hidden btn btn-sm btn-soft rounded-full border border-base-300/70 bg-base-100/85 backdrop-blur-xs normal-case shadow-xs"
		style="bottom: calc(env(safe-area-inset-bottom, 0px) + 6.25rem);"
		onclick={() => (qs.isModalOpen = true)}
		aria-label="Show rationale"
	>
		<CircleHelp size={14} />
		<span class="ml-1">Rationale</span>
	</button>
{/if}

<script lang="ts">
	import { ChevronUp, MessageSquareText, Paperclip, Settings } from 'lucide-svelte';
	import { fly } from 'svelte/transition';
	import ImageViewer from '$lib/components/ImageViewer.svelte';
	import Sheet from '$lib/components/Sheet.svelte';
	import { sheetDrag } from '$lib/utils/sheetDrag';
	import QuestionSources from '$lib/components/QuestionSources.svelte';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import { untrack } from 'svelte';
	import QuizDock from './QuizDock.svelte';
	import { getQuizCommands } from './commands.svelte';
	import type { Id } from '../../../convex/_generated/dataModel';
	import { getRationale, hasRationale } from '$lib/utils/rationale';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';
	import { useQuestionMedia } from '$lib/utils/useQuestionMedia.svelte';

	let { qs = $bindable(), currentlySelected } = $props();

	let isSettingsModalOpen = $state(false);
	let isAttachmentViewerOpen = $state(false);
	let attachmentIndex = $state(0);

	const mediaQuery = useQuestionMedia(() => currentlySelected?._id as Id<'question'> | undefined);

	const media = $derived({
		data: (mediaQuery.data ?? []).filter(
			(attachment) => qs.showSolution || !attachment.showOnSolution
		),
		isLoading: mediaQuery.isLoading
	});

	const canShowRationale = $derived.by(() => hasRationale(currentlySelected));
	const sanitizedRationale = $derived(sanitizeHtml(getRationale(currentlySelected)));
	const rationalePreview = $derived(
		typeof DOMParser === 'undefined'
			? ''
			: (new DOMParser().parseFromString(sanitizedRationale, 'text/html').body.textContent ?? '')
					.replace(/\s+/g, ' ')
					.trim()
	);
	// Swipe the peek up to open the full rationale.
	const peekDrag = {
		onmove: () => {},
		onend: (dy: number, velocity: number) => {
			if (dy < -24 || velocity < -0.4) qs.isModalOpen = true;
		}
	};

	$effect(() => {
		if (!qs.showSolution || !canShowRationale) {
			qs.isModalOpen = false;
		}
	});

	function openAttachments() {
		if (!media.data.length) return;
		attachmentIndex = 0;
		isAttachmentViewerOpen = true;
	}

	const registry = getQuizCommands();

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
</script>

{#snippet rationalePeek()}
	{#if qs.showSolution && canShowRationale && !qs.isModalOpen}
		<div class="px-3 pb-2" transition:fly={{ y: 12, duration: 180 }}>
			<div
				role="button"
				tabindex="0"
				class="flex min-h-12 w-full cursor-pointer items-center gap-2.5 rounded-2xl border border-base-300 bg-base-100 px-4 py-2 text-left shadow-lg active:bg-base-200"
				aria-label="Show rationale"
				use:sheetDrag={peekDrag}
				onclick={() => (qs.isModalOpen = true)}
				onkeydown={(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						qs.isModalOpen = true;
					}
				}}
			>
				<span class="shrink-0 text-sm font-semibold text-success">Why</span>
				<span class="min-w-0 flex-1 truncate text-sm text-base-content/70">{rationalePreview}</span>
				<ChevronUp size={18} class="shrink-0 text-base-content/50" />
			</div>
		</div>
	{/if}
{/snippet}

<QuizDock
	surface="mobile"
	source="mobile"
	above={rationalePeek}
	celebrate={qs.checkResult === 'Correct!'}
/>

<Sheet bind:open={qs.isModalOpen} title="Rationale" expandable width="sm:max-w-xl">
	{#if canShowRationale}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		<div class="tiptap-content pb-2">{@html sanitizedRationale}</div>
		<QuestionSources
			source={currentlySelected?.metadata?.source ?? currentlySelected?.metadata?.generation}
		/>
	{/if}
</Sheet>

<ImageViewer images={media.data} bind:open={isAttachmentViewerOpen} bind:index={attachmentIndex} />

<SettingsModal bind:qs bind:isOpen={isSettingsModalOpen} />

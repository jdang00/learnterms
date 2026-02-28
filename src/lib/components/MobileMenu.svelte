<script lang="ts">
	let { qs = $bindable(), currentlySelected, classId, moduleId } = $props();
	let isSettingsModalOpen = $state(false);
	import {
		Eye,
		ArrowLeft,
		ArrowRight,
		ListRestart,
		Flag,
		BookmarkCheck,
		Shuffle,
		Settings,
		Check,
		ArrowUpWideNarrow,
		Pencil,
		Paperclip,
		CircleHelp
	} from 'lucide-svelte';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import { useClerkContext } from 'svelte-clerk/client';
	import { useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api.js';
	import type { Doc, Id } from '../../convex/_generated/dataModel';
	import { QUESTION_TYPES } from '$lib/utils/questionType';
	import { captureQuestionAnswered } from '$lib/analytics/questionAnswered';

	const clerk = useClerkContext();
	const clerkUser = $derived(clerk.user);
	const userDataQuery = useQuery(api.users.getUserById, () =>
		clerkUser ? { id: clerkUser.id } : 'skip'
	);
	const canEdit = $derived(
		userDataQuery.data?.role === 'dev' ||
			userDataQuery.data?.role === 'admin' ||
			userDataQuery.data?.role === 'curator'
	);

	let showAttachments = $state(false);
	let isAttachmentViewerOpen = $state(false);
	let selectedAttachment = $state<Doc<'questionMedia'> | null>(null);

	// useQuery at top level with skip pattern
	const mediaQuery = useQuery((api as any).questionMedia.getByQuestionId, () =>
		currentlySelected?._id ? { questionId: currentlySelected._id as Id<'question'> } : 'skip'
	);

	// Derive media from the query result
	const media = $derived({
		data: mediaQuery.data ?? [],
		isLoading: mediaQuery.isLoading,
		error: mediaQuery.error
	});

	const hasRationale = $derived.by(() => {
		const explanation = currentlySelected?.explanation;
		if (typeof explanation !== 'string') return false;
		const normalized = explanation.trim().toLowerCase();
		return normalized.length > 0 && normalized !== 'undefined' && normalized !== 'null';
	});

	$effect(() => {
		if (!qs.showSolution || !hasRationale) {
			qs.isModalOpen = false;
		}
	});

	async function handleClear() {
		qs.selectedAnswers = [];
		qs.eliminatedAnswers = [];
		qs.checkResult = '';

		if (qs.saveProgressFunction) {
			await qs.saveProgressFunction();
		}
	}

	async function handleCheck() {
		if (currentlySelected) {
			const selectedAnswers = [...qs.selectedAnswers];
			const eliminatedOptions = [...qs.eliminatedAnswers];
			const correctAnswers = currentlySelected.correctAnswers || [];
			let isCorrect = false;

			if (currentlySelected.type === QUESTION_TYPES.FILL_IN_THE_BLANK) {
				const text = selectedAnswers[0] || '';
				qs.checkFillInTheBlank(text, currentlySelected);
				setTimeout(() => {
					captureQuestionAnswered({
						questionId: currentlySelected._id,
						moduleId: currentlySelected.moduleId,
						classId: classId,
						questionType: currentlySelected.type,
						selectedOptions: selectedAnswers,
						eliminatedOptions: eliminatedOptions,
						isCorrect: qs.checkResult === 'Correct!',
						submissionSource: 'mobile'
					});
				}, 1);
			} else if (currentlySelected.type === QUESTION_TYPES.MATCHING) {
				qs.checkMatching(currentlySelected);
				isCorrect =
					correctAnswers.length === selectedAnswers.length &&
					correctAnswers.every((answer: string) => selectedAnswers.includes(answer));
				captureQuestionAnswered({
					questionId: currentlySelected._id,
					moduleId: currentlySelected.moduleId,
					classId: classId,
					questionType: currentlySelected.type,
					selectedOptions: selectedAnswers,
					eliminatedOptions: eliminatedOptions,
					isCorrect,
					submissionSource: 'mobile'
				});
			} else {
				const sortedCorrect = [...correctAnswers].sort();
				const sortedSelected = [...selectedAnswers].sort();
				isCorrect =
					sortedCorrect.length === sortedSelected.length &&
					sortedCorrect.every((answer: string, index: number) => answer === sortedSelected[index]);
				qs.checkAnswer(correctAnswers, selectedAnswers);
				captureQuestionAnswered({
					questionId: currentlySelected._id,
					moduleId: currentlySelected.moduleId,
					classId: classId,
					questionType: currentlySelected.type,
					selectedOptions: selectedAnswers,
					eliminatedOptions: eliminatedOptions,
					isCorrect,
					submissionSource: 'mobile'
				});
			}
		}
		qs.scheduleSave?.();
	}

	async function handleFlag() {
		qs.toggleFlag();
	}

	async function handleNext() {
		await qs.goToNextQuestion();
	}

	async function handlePrevious() {
		await qs.goToPreviousQuestion();
	}

	function handleShuffle() {
		qs.toggleShuffle();
	}

	function handleShowFlagged() {
		qs.toggleSortByFlagged();
	}

	function handleShowIncomplete() {
		qs.toggleShowIncomplete();
	}

	function openAttachments() {
		if (media && media.data && media.data.length > 0) {
			if (media.data.length === 1) {
				selectedAttachment = media.data[0];
				isAttachmentViewerOpen = true;
			} else {
				showAttachments = true;
			}
		}
	}

	function closeAttachmentsGrid() {
		showAttachments = false;
	}

	function handleAttachmentClick(attachment: Doc<'questionMedia'>) {
		selectedAttachment = attachment;
		isAttachmentViewerOpen = true;
	}
</script>

<div
	class="fixed bottom-0 left-0 w-full bg-base-100 shadow-lg border-t border-base-300 rounded-t-2xl z-50 flex gap-3 items-center px-4 py-4 md:hidden flex-wrap justify-center"
>
	<div class="dropdown dropdown-top">
		<div tabindex="0" role="button" class="btn btn-sm btn-soft btn-accent btn-circle m-1">
			<ArrowUpWideNarrow />
		</div>
		<ul tabindex="-1" class="dropdown-content menu bg-base-100 rounded-2xl z-1 w-52 p-2 shadow-sm">
			<li>
				<button class="text-error" onclick={() => (qs.isResetModalOpen = true)}
					><ListRestart size="18" />Reset</button
				>
			</li>
			<li>
				<button class="" onclick={handleShuffle}
					><Shuffle size="18" /> {qs.isShuffled ? 'Unshuffle' : 'Shuffle'}
				</button>
			</li>
			<li>
				<button onclick={handleShowFlagged}
					><Flag size="16" />{qs.showFlagged ? 'Show All' : 'Show Flagged'}</button
				>
			</li>
			<li>
				<button onclick={handleShowIncomplete}>
					<BookmarkCheck size="16" />
					{qs.showIncomplete ? 'Show All' : 'Show Incomplete'}
				</button>
			</li>
			{#if canEdit && currentlySelected}
				<li>
					<a
						href={`/admin/${classId}/module/${moduleId}?edit=${currentlySelected._id}`}
						target="_blank"
						rel="noopener noreferrer"
					>
						<Pencil size="16" /> Edit
					</a>
				</li>
			{/if}
			<li>
				<button onclick={() => (isSettingsModalOpen = true)}>
					<Settings size="16" />Settings
				</button>
			</li>
		</ul>
	</div>
	<button class="btn btn-outline btn-sm rounded-full" onclick={handleClear}>Clear</button>
	<button class="btn btn-outline btn-success btn-sm btn-circle" onclick={handleCheck}><Check size={18} /></button>
	<button
		class="btn btn-sm btn-circle {qs.currentQuestionFlagged ? 'btn-warning' : 'btn-warning btn-outline'}"
		aria-label={qs.currentQuestionFlagged ? 'Remove flag' : 'Flag question'}
		onclick={handleFlag}
	>
		<Flag size={18} />
	</button>

	<button
		class="btn btn-outline btn-sm btn-circle {qs.showSolution ? 'btn-success' : ''}"
		onclick={() => qs.handleSolution()}
		aria-label={qs.showSolution ? 'Hide answer highlights' : 'Reveal answer highlights'}
	>
		<Eye size={18} />
	</button>

	{#if media && media.data && media.data.length > 0}
		<button
			class="btn btn-soft btn-info btn-sm btn-circle"
			onclick={openAttachments}
			aria-label="View attachments"
		>
			<Paperclip size={18} />
		</button>
	{/if}

	<button
		class="btn btn-outline btn-sm"
		style="border-radius: 9999px 50% 50% 9999px;"
		onclick={handlePrevious}
		disabled={!qs.canGoPrevious()}
	>
		<ArrowLeft size={20} />
	</button>
	<button
		class="btn btn-outline btn-sm"
		style="border-radius: 50% 9999px 9999px 50%;"
		onclick={handleNext}
		disabled={!qs.canGoNext()}
	>
		<ArrowRight size={20} />
	</button>

	<dialog class="modal modal-bottom sm:modal-middle max-w-full p-0 sm:p-4" class:modal-open={qs.isModalOpen}>
		<div class="modal-box rounded-t-3xl sm:rounded-2xl max-h-[65vh]">
			<form method="dialog">
				<button
					class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
					onclick={() => (qs.isModalOpen = false)}>✕</button
				>
			</form>
			<h3 class="text-lg font-bold">Rationale</h3>
			{#if hasRationale}
				<div class="py-4 tiptap-content">{@html currentlySelected.explanation}</div>
			{/if}
		</div>
	</dialog>

	<dialog class="modal max-w-full p-4" class:modal-open={showAttachments}>
		<div class="modal-box max-w-sm w-full rounded-2xl">
			<form method="dialog">
				<button
					class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
					onclick={closeAttachmentsGrid}>✕</button
				>
			</form>
			<h3 class="font-semibold text-lg">
				Attachments {media?.data ? `(${media.data.length})` : ''}
			</h3>
			<div class="grid grid-cols-2 gap-3 mt-3">
				{#each media.data as attachment (attachment._id)}
					<button
						class="group border-2 border-base-300 rounded-lg overflow-hidden cursor-pointer hover:border-primary hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
						onclick={() => {
							handleAttachmentClick(attachment);
							closeAttachmentsGrid();
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
</div>

{#if qs.showSolution && hasRationale && !qs.isModalOpen}
	<button
		class="fixed right-4 z-[60] md:hidden btn btn-sm btn-soft rounded-full border border-base-300/70 bg-base-100/85 backdrop-blur-sm normal-case shadow-sm"
		style="bottom: calc(env(safe-area-inset-bottom, 0px) + 6.25rem);"
		onclick={() => (qs.isModalOpen = true)}
		aria-label="Show rationale"
	>
		<CircleHelp size={14} />
		<span class="ml-1">Rationale</span>
	</button>
{/if}

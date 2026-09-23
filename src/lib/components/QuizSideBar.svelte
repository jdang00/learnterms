<script lang="ts">
	import ModuleProgress from './ModuleProgress.svelte';
	import QuestionSources from '$lib/components/QuestionSources.svelte';
	import { PanelRight, Eye, Info, ChevronLeft, Settings } from 'lucide-svelte';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import QuestionAttachmentsSidebar from '$lib/components/QuestionAttachmentsSidebar.svelte';
	import QuizToolsBar from '$lib/components/quiz-dock/QuizToolsBar.svelte';
	import { getRationale, hasRationale } from '$lib/utils/rationale';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ProgressRing from './ProgressRing.svelte';

	let { qs = $bindable(), module, currentlySelected, classId } = $props();
	let hideSidebar = $state(false);
	let isInfoModalOpen = $state(false);
	let isSolutionModalOpen = $state(false);
	let isSettingsModalOpen = $state(false);
	const ring = $derived.by(() => {
		const summary = qs.getCompletionSummary?.();
		if (!summary?.total) return null;
		const pct = (n: number) => Math.round((n / summary.total) * 100);
		return {
			correct: pct(summary.correct),
			review: pct(summary.incorrect),
			answered: summary.completion
		};
	});
	const sanitizedRationale = $derived(sanitizeHtml(getRationale(currentlySelected)));

	async function goToModuleSelection() {
		await goto(resolve('/classes'), { state: { classId } });
	}
</script>

<div
	class="
	 hidden lg:flex lg:flex-col relative
	 overflow-y-auto overflow-x-hidden
	 border border-base-300
	 rounded-4xl
	 p-3 px-4
	 transition-all duration-200 ease-out
	 bg-base-100/80 backdrop-blur-md
	 shrink-0 h-full
	 {hideSidebar ? 'w-[72px]' : 'w-[min(22rem,30vw)] xl:w-[min(24rem,28vw)]'}

	"
>
	<button
		class="btn btn-ghost btn-square btn-sm rounded-full w-9 h-9 absolute top-6 left-5"
		onclick={() => (hideSidebar = !hideSidebar)}
		aria-label="Toggle sidebar"
	>
		<PanelRight
			size={18}
			class="transition-transform duration-300 {hideSidebar ? 'rotate-180' : ''}"
		/>
	</button>

	{#if !hideSidebar}
		<div class="p-4 md:p-5 lg:p-6 pt-12 mt-8">
			<h4 class="font-bold text-sm tracking-wide text-secondary -ms-6">
				<button
					type="button"
					class="btn btn-ghost text-secondary font-bold rounded-full"
					onclick={goToModuleSelection}
				>
					<ChevronLeft size={16} /> Back
				</button>
			</h4>
			<h2 class="mt-2 flex min-w-0 items-start gap-3 text-xl font-semibold leading-tight">
				<span class="text-2xl shrink-0">{module.data?.emoji || '📘'}</span>
				<span class="min-w-0 break-normal text-balance">{module.data.title}</span>
			</h2>
			<p class="text-base-content/70 mt-2 break-words hyphens-auto">{module.data.description}</p>

			<div class="mt-6">
				{#if qs.getCompletionSummary}
					<ModuleProgress
						summary={qs.getCompletionSummary()}
						currentId={currentlySelected?._id}
						onclick={() => qs.openCompletion()}
						onreset={() => (qs.isResetModalOpen = true)}
					/>
				{:else}
					<p class="mb-2 text-base-content/60">{qs.getProgressPercentage()}% done.</p>
					<progress
						class="progress progress-success w-full"
						value={qs.getProgressPercentage()}
						max="100"
						aria-label="Module progress"
					></progress>
				{/if}
			</div>

			<div class="mt-5">
				<QuizToolsBar variant="panel" />
			</div>
		</div>

		<div class="flex flex-col justify-center m-4">
			<QuestionAttachmentsSidebar
				questionId={currentlySelected?._id}
				showSolution={qs.showSolution}
				solutionOnlyBehavior="blur"
			/>

			{#if hasRationale(currentlySelected)}
				<div class="card mt-6 rounded-2xl border border-base-300 bg-base-100">
					<div class="card-body">
						<div class="flex flex-row flex-wrap justify-between border-b pb-2">
							<h2 class="card-title">Rationale</h2>
							<div class="flex flex-row">
								<kbd class="kbd kbd-sm hidden xl:block self-center me-1">tab</kbd>
								<button class="btn btn-ghost btn-circle" onclick={() => qs.handleSolution()}>
									<Eye />
								</button>
							</div>
						</div>
						<div
							class={`mt-2 break-words hyphens-auto transition-[filter] duration-300 ${qs.showSolution ? 'blur-none' : 'blur-xs select-none'}`}
							inert={!qs.showSolution}
							aria-hidden={!qs.showSolution}
						>
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							<div class="tiptap-content">{@html sanitizedRationale}</div>
							<QuestionSources
								source={currentlySelected?.metadata?.source ??
									currentlySelected?.metadata?.generation}
							/>
						</div>
					</div>
				</div>
			{/if}

			<div class="flex flex-row mt-6 justify-center">
				<button
					class="btn btn-soft btn-sm rounded-full"
					onclick={() => (isSettingsModalOpen = true)}
				>
					<Settings size={16} />
					<span class="ml-1 hidden sm:inline">Settings</span>
				</button>
			</div>
		</div>
	{:else}
		<div class="mt-16 justify-self-center flex flex-col items-center space-y-4 ms-1">
			<div class="flex flex-col items-center space-y-4">
				<button
					type="button"
					class="group flex items-center justify-center font-bold text-secondary-content bg-secondary text-center w-full rounded-full transition-colors"
					onclick={goToModuleSelection}
				>
					<span class="group-hover:hidden">{module.data.order + 1}</span>
					<span class="hidden group-hover:inline-flex items-center justify-center"
						><ChevronLeft size={24} /></span
					>
				</button>

				<button
					class="btn btn-circle btn-lg btn-soft btn-primary"
					onclick={() => (isInfoModalOpen = true)}><Info /></button
				>

				<button
					type="button"
					onclick={() => qs.openCompletion?.()}
					title="View module progress"
					aria-label="View module progress"
					class="rounded-full"
				>
					<ProgressRing
						correct={ring?.correct ?? 0}
						review={ring?.review ?? 0}
						label={ring?.answered ?? qs.getProgressPercentage()}
					/>
				</button>
				<button
					class="btn btn-circle btn-lg btn-soft"
					onclick={async () => {
						if (!qs.showSolution) await qs.handleSolution();
						if (qs.showSolution) isSolutionModalOpen = true;
					}}><Eye /></button
				>

				<QuestionAttachmentsSidebar
					questionId={currentlySelected?._id}
					showSolution={qs.showSolution}
					solutionOnlyBehavior="blur"
					collapsed={true}
				/>

				<QuizToolsBar variant="rail" />
			</div>

			<div class="border-t border-base-300 w-full my-2"></div>

			<button
				class="btn btn-circle btn-lg mt-3 btn-soft"
				onclick={() => (isSettingsModalOpen = true)}
				title="Settings"
			>
				<Settings />
			</button>
		</div>
	{/if}
</div>

<dialog class="modal max-w-full p-4" class:modal-open={isInfoModalOpen}>
	<div class="modal-box rounded-2xl">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
				onclick={() => (isInfoModalOpen = false)}>✕</button
			>
		</form>
		<h3 class="font-bold">Module Information</h3>
		<p class="py-4"></p>
		<p class="font-2xl font-semibold">Module {module.data.order + 1}: {module.data.title}</p>
		<p class="text-base-content/70">{module.data.description}</p>
		<div class="modal-action">
			<button class="btn rounded-full" onclick={() => (isInfoModalOpen = false)}>Close</button>
		</div>
	</div>
</dialog>

<dialog class="modal max-w-full p-4" class:modal-open={isSolutionModalOpen}>
	<div class="modal-box rounded-2xl">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
				onclick={() => (isSolutionModalOpen = false)}>✕</button
			>
		</form>
		<h3 class="text-lg font-bold">Rationale</h3>
		{#if hasRationale(currentlySelected)}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<div class="py-4 tiptap-content">{@html sanitizedRationale}</div>
			<QuestionSources
				source={currentlySelected?.metadata?.source ?? currentlySelected?.metadata?.generation}
			/>
		{/if}
	</div>
</dialog>

<SettingsModal bind:qs bind:isOpen={isSettingsModalOpen} />

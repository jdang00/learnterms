<script lang="ts">
	import ModuleProgress from './ModuleProgress.svelte';
	import QuestionSources from '$lib/components/QuestionSources.svelte';
	import PanelRight from '@lucide/svelte/icons/panel-right';
	import Eye from '@lucide/svelte/icons/eye';
	import Info from '@lucide/svelte/icons/info';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Settings from '@lucide/svelte/icons/settings';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import QuestionAttachmentsSidebar from '$lib/components/QuestionAttachmentsSidebar.svelte';
	import QuizToolsBar from '$lib/components/quiz-dock/QuizToolsBar.svelte';
	import { getRationale, hasRationale } from '$lib/utils/rationale';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ProgressRing from './ProgressRing.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Kbd } from '$lib/components/ui/kbd';
	import { Progress } from '$lib/components/ui/progress';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';

	let { qs = $bindable(), module, currentlySelected, classId } = $props();
	let hideSidebar = $state(false);
	let isInfoModalOpen = $state(false);
	let isSolutionModalOpen = $state(false);
	let isSettingsModalOpen = $state(false);
	let descriptionExpanded = $state(false);
	let descriptionEl = $state<HTMLParagraphElement>();
	let descriptionClamped = $state(false);

	$effect(() => {
		const el = descriptionEl;
		void module.data.description;
		if (!el || descriptionExpanded) return;
		const measure = () => (descriptionClamped = el.scrollHeight > el.clientHeight + 1);
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(el);
		return () => observer.disconnect();
	});
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
	 border border-border
	 rounded-4xl
	 {hideSidebar ? 'p-3' : 'p-6'}
	 transition-all duration-200 ease-out
	 bg-background/80 backdrop-blur-md
	 shrink-0 h-full
	 {hideSidebar ? 'w-[72px]' : 'w-[min(22rem,30vw)] xl:w-[min(24rem,28vw)]'}

	"
>
	{#snippet sidebarToggle()}
		<Button
			variant="ghost"
			tone="neutral"
			shape="circle"
			class="size-9"
			onclick={() => (hideSidebar = !hideSidebar)}
			aria-label="Toggle sidebar"
		>
			<PanelRight
				size={18}
				class="transition-transform duration-300 {hideSidebar ? 'rotate-180' : ''}"
			/>
		</Button>
	{/snippet}

	{#if !hideSidebar}
		<div class="px-2 pt-3">
			<div class="flex items-center gap-1">
				<Button
					variant="ghost"
					tone="secondary"
					size="sm"
					class="-ms-1 me-auto font-bold"
					onclick={goToModuleSelection}
				>
					<ChevronLeft size={16} /> Back
				</Button>
				<Button
					variant="ghost"
					tone="neutral"
					shape="circle"
					class="size-9"
					onclick={() => (isSettingsModalOpen = true)}
					aria-label="Settings"
				>
					<Settings size={18} />
				</Button>
				{@render sidebarToggle()}
			</div>
			<h2 class="mt-3 flex min-w-0 items-start gap-3 text-xl font-semibold leading-tight">
				<span class="text-2xl shrink-0">{module.data?.emoji || '📘'}</span>
				<span class="min-w-0 break-normal text-balance">{module.data.title}</span>
			</h2>
			{#if module.data.description}
				<p
					bind:this={descriptionEl}
					class="mt-2 text-sm text-foreground/70 break-words hyphens-auto {descriptionExpanded
						? ''
						: 'line-clamp-2'}"
				>
					{module.data.description}
				</p>
				{#if descriptionClamped || descriptionExpanded}
					<Button
						variant="link"
						tone="neutral"
						size="xs"
						class="mt-1 text-xs font-medium text-foreground/60 hover:text-foreground"
						aria-expanded={descriptionExpanded}
						onclick={() => (descriptionExpanded = !descriptionExpanded)}
						>{descriptionExpanded ? 'Show less' : 'Show more'}</Button
					>
				{/if}
			{/if}

			<div class="mt-5">
				{#if qs.getCompletionSummary}
					<ModuleProgress
						summary={qs.getCompletionSummary()}
						currentId={currentlySelected?._id}
						onclick={() => qs.openCompletion()}
						onreset={() => (qs.isResetModalOpen = true)}
					/>
				{:else}
					<p class="mb-2 text-foreground/60">{qs.getProgressPercentage()}% done.</p>
					<Progress
						tone="success"
						value={qs.getProgressPercentage()}
						max={100}
						aria-label="Module progress"
					/>
				{/if}
			</div>

			<div class="mt-5">
				<QuizToolsBar variant="panel" />
			</div>
		</div>

		<div class="flex flex-col justify-center px-2 pb-2">
			<QuestionAttachmentsSidebar
				questionId={currentlySelected?._id}
				showSolution={qs.showSolution}
				solutionOnlyBehavior="blur"
			/>

			{#if hasRationale(currentlySelected)}
				<Card.Root class="mt-5 gap-0 text-base">
					<Card.Content class="gap-2">
						<div class="flex flex-row flex-wrap justify-between border-b pb-2">
							<h2 class="flex items-center gap-2 text-lg font-semibold">Rationale</h2>
							<div class="flex flex-row">
								<Kbd class="me-1 hidden self-center xl:inline-flex">tab</Kbd>
								<Button
									variant="ghost"
									tone="neutral"
									shape="circle"
									onclick={() => qs.handleSolution()}
								>
									<Eye />
								</Button>
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
					</Card.Content>
				</Card.Root>
			{/if}
		</div>
	{:else}
		<div class="flex flex-col items-center space-y-4">
			{@render sidebarToggle()}
			<div class="flex flex-col items-center space-y-4">
				<button
					type="button"
					class="group flex items-center justify-center font-bold text-secondary-foreground bg-secondary text-center w-full rounded-full transition-colors"
					onclick={goToModuleSelection}
				>
					<span class="group-hover:hidden">{module.data.order + 1}</span>
					<span class="hidden group-hover:inline-flex items-center justify-center"
						><ChevronLeft size={24} /></span
					>
				</button>

				<Button variant="soft" shape="circle" size="lg" onclick={() => (isInfoModalOpen = true)}
					><Info /></Button
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
				<Button
					variant="soft"
					tone="neutral"
					shape="circle"
					size="lg"
					onclick={async () => {
						if (!qs.showSolution) await qs.handleSolution();
						if (qs.showSolution) isSolutionModalOpen = true;
					}}><Eye /></Button
				>

				<QuestionAttachmentsSidebar
					questionId={currentlySelected?._id}
					showSolution={qs.showSolution}
					solutionOnlyBehavior="blur"
					collapsed={true}
				/>

				<QuizToolsBar variant="rail" />
			</div>

			<div class="border-t border-border w-full my-2"></div>

			<Button
				variant="soft"
				tone="neutral"
				shape="circle"
				size="lg"
				class="mt-3"
				onclick={() => (isSettingsModalOpen = true)}
				title="Settings"
			>
				<Settings />
			</Button>
		</div>
	{/if}
</div>

<Dialog.Root bind:open={isInfoModalOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Module Information</Dialog.Title>
		</Dialog.Header>
		<div>
			<p class="font-2xl font-semibold">Module {module.data.order + 1}: {module.data.title}</p>
			<p class="text-foreground/70">{module.data.description}</p>
		</div>
		<Dialog.Footer>
			<Button variant="soft" tone="neutral" onclick={() => (isInfoModalOpen = false)}>Close</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={isSolutionModalOpen}>
	<Dialog.Content class="max-h-[90dvh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Rationale</Dialog.Title>
		</Dialog.Header>
		{#if hasRationale(currentlySelected)}
			<div>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<div class="tiptap-content">{@html sanitizedRationale}</div>
				<QuestionSources
					source={currentlySelected?.metadata?.source ?? currentlySelected?.metadata?.generation}
				/>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<SettingsModal bind:qs bind:isOpen={isSettingsModalOpen} />

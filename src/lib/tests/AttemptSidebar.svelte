<script lang="ts">
	import { RadialProgress } from '$lib/components/ui/radial-progress';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Progress } from '$lib/components/ui/progress';
	import QuestionAttachmentsSidebar from '$lib/components/QuestionAttachmentsSidebar.svelte';
	import { formatClock } from '$lib/utils/format';
	import PanelRight from '@lucide/svelte/icons/panel-right';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Clock from '@lucide/svelte/icons/clock';
	import Flag from '@lucide/svelte/icons/flag';
	import Wifi from '@lucide/svelte/icons/wifi';
	import WifiOff from '@lucide/svelte/icons/wifi-off';
	import { syncStatusIcon, syncStatusLabel, type AttemptRunnerState } from './attempt.svelte';

	let {
		runner,
		className,
		hidden = $bindable(false),
		onBack
	}: {
		runner: AttemptRunnerState;
		className: string;
		hidden?: boolean;
		onBack: () => void;
	} = $props();
</script>

<div
	class="hidden lg:flex lg:flex-col relative overflow-y-auto overflow-x-hidden border border-border rounded-4xl p-3 px-4 transition-all duration-200 ease-out bg-background/80 backdrop-blur-md shadow-lg shrink-0 h-full
	{hidden ? 'w-[72px]' : 'w-[min(22rem,30vw)] xl:w-[min(24rem,28vw)]'}"
>
	<Button
		variant="ghost"
		tone="neutral"
		size="sm"
		shape="circle"
		class="absolute top-6 left-5 size-9"
		onclick={() => (hidden = !hidden)}
		aria-label="Toggle sidebar"
	>
		<PanelRight size={18} class="transition-transform duration-300 {hidden ? 'rotate-180' : ''}" />
	</Button>

	{#if !hidden}
		<div class="p-4 md:p-5 lg:p-6 pt-12 mt-8">
			<h4 class="font-bold text-sm tracking-wide text-secondary-ink -ms-6">
				<Button variant="ghost" tone="secondary" class="font-bold" onclick={onBack}>
					<ChevronLeft size={16} />
					{className}
				</Button>
			</h4>
			<h2 class="font-semibold text-2xl mt-2 flex items-start gap-3 min-w-0">
				<span class="text-2xl shrink-0">📝</span>
				<span class="break-words hyphens-auto overflow-hidden">Test Mode</span>
			</h2>
			<p class="text-foreground/60 mt-2 text-sm">
				Answer all questions, then submit to see your score.
			</p>

			<div class="mt-6">
				<p class="text-foreground/60 mb-2">
					{runner.answeredCount} of {runner.itemCount} answered
				</p>
				<Progress
					class="w-full transition-colors"
					value={runner.answeredCount}
					max={runner.itemCount}
				/>
			</div>

			<div class="grid grid-cols-2 gap-2 text-sm mt-5">
				<div class="surface-sm p-3">
					<div class="text-xs text-foreground/50">Answered</div>
					<div class="font-bold text-lg">
						{runner.answeredCount}<span class="text-foreground/40 text-sm font-normal">
							/ {runner.itemCount}</span
						>
					</div>
				</div>
				<div class="surface-sm p-3">
					<div class="text-xs text-foreground/50 flex items-center gap-1">
						<Flag size={10} />
						Flagged
					</div>
					<div class="font-bold text-lg {runner.flaggedCount > 0 ? 'text-warning-ink' : ''}">
						{runner.flaggedCount}
					</div>
				</div>
			</div>
		</div>

		<div class="flex flex-col justify-center m-4">
			<Card.Root class="py-0 shadow-xl">
				<Card.Content class="p-4">
					<div class="flex items-center gap-2 mb-1">
						<Clock size={14} class="text-foreground/50" />
						<span class="label-caps">Timer</span>
					</div>
					<div class="text-3xl font-bold tabular-nums">
						{formatClock(runner.elapsedMsLocal)}
					</div>
					{#if runner.remainingMs !== null}
						<div
							class="text-sm mt-1 {runner.remainingMs <= 60_000
								? 'text-error-ink font-semibold animate-pulse'
								: 'text-foreground/60'}"
						>
							{runner.remainingMs <= 60_000 ? 'Hurry! ' : ''}{formatClock(runner.remainingMs)} remaining
						</div>
					{:else}
						<div class="text-xs mt-1 text-foreground/40">No time limit</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<div class="flex items-center justify-center gap-2 mt-4 text-xs">
				{#if runner.syncStatus === 'offline'}
					<WifiOff size={12} class="text-warning" />
				{:else}
					<Wifi size={12} class={syncStatusIcon(runner.syncStatus)} />
				{/if}
				<span class={syncStatusIcon(runner.syncStatus)}>{syncStatusLabel(runner.syncStatus)}</span>
			</div>
			{#if runner.syncError}
				<div class="text-error-ink text-xs text-center mt-1">{runner.syncError}</div>
			{/if}

			<QuestionAttachmentsSidebar
				questionId={runner.currentItem?.questionId}
				showSolution={false}
				solutionOnlyBehavior="hide"
				showHiddenNote={true}
			/>
		</div>
	{:else}
		<div class="mt-16 justify-self-center flex flex-col items-center space-y-4 ms-1">
			<button
				type="button"
				class="group flex items-center justify-center font-bold text-secondary-foreground bg-secondary text-center w-full rounded-full transition-colors"
				onclick={onBack}
			>
				<span class="group-hover:hidden">📝</span>
				<span class="hidden group-hover:inline-flex items-center justify-center"
					><ChevronLeft size={24} /></span
				>
			</button>

			<div class="text-center">
				<div class="text-xs font-bold tabular-nums">{formatClock(runner.elapsedMsLocal)}</div>
				{#if runner.remainingMs !== null}
					<div class="text-[10px] text-foreground/50 tabular-nums">
						{formatClock(runner.remainingMs)}
					</div>
				{/if}
			</div>

			<RadialProgress
				value={runner.answeredCount}
				max={Math.max(1, runner.itemCount || 1)}
				thickness={3}
				label="Questions answered"
				class="text-xs"
			>
				{runner.answeredCount}
			</RadialProgress>

			<div class="border-t border-border w-full my-2"></div>

			<div class="flex flex-col items-center text-xs text-foreground/50 gap-1">
				<Wifi size={12} class={syncStatusIcon(runner.syncStatus)} />
			</div>

			<QuestionAttachmentsSidebar
				questionId={runner.currentItem?.questionId}
				showSolution={false}
				solutionOnlyBehavior="hide"
				collapsed={true}
			/>
		</div>
	{/if}
</div>

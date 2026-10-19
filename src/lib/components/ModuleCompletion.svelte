<script lang="ts">
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fly, scale, slide } from 'svelte/transition';
	import { backOut, cubicOut } from 'svelte/easing';
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { Confetti } from 'svelte-confetti';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Check from '@lucide/svelte/icons/check';
	import CircleDashed from '@lucide/svelte/icons/circle-dashed';
	import Flag from '@lucide/svelte/icons/flag';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Trophy from '@lucide/svelte/icons/trophy';
	import X from '@lucide/svelte/icons/x';
	import { Button } from '#lib/components/ui/button/index.js';
	import type { AnswerStatus, ModuleSummary } from '#lib/utils/moduleCompletion.js';

	let {
		title,
		emoji = '📘',
		summary,
		celebrate = false,
		saveError = '',
		onretry,
		onreview,
		onresume,
		onreset,
		onback
	}: {
		title: string;
		emoji?: string;
		summary: ModuleSummary;
		celebrate?: boolean;
		saving?: boolean;
		saveError?: string;
		onretry: () => void;
		onreview: (questionId: string) => void;
		onresume: () => void;
		onreset: () => void;
		onback: () => void;
	} = $props();

	type Filter = 'all' | AnswerStatus | 'flagged';
	let filter = $state<Filter>('all');
	let selectedId = $state<string | null>(null);
	let mounted = $state(false);
	let introDone = $state(false);
	let burst = $state(0);
	let heading: HTMLHeadingElement;

	const reduced = $derived(prefersReducedMotion.current);
	const selectedResult = $derived(summary.results.find((r) => r.questionId === selectedId));

	const pct = (n: number) => (summary.total ? (n / summary.total) * 100 : 0);
	const sweep = { duration: 1100, easing: cubicOut };
	const arcs = {
		answered: new Tween(0, sweep),
		correct: new Tween(0, sweep),
		mastered: new Tween(0, sweep),
		checked: new Tween(0, sweep)
	};
	const ringSegments = [
		{ arc: arcs.answered, cls: 'stroke-warning' },
		{ arc: arcs.correct, cls: 'stroke-success' },
		{ arc: arcs.mastered, cls: 'stroke-mastered' }
	];

	const counts = $derived({
		mastered: summary.mastered,
		correct: summary.results.filter((r) => r.status === 'correct').length,
		incorrect: summary.incorrect,
		unanswered: summary.unanswered,
		flagged: summary.flagged
	});
	type StatKey = keyof typeof counts;
	const countUp: Record<StatKey, Tween<number>> = {
		mastered: new Tween(0, sweep),
		correct: new Tween(0, sweep),
		incorrect: new Tween(0, sweep),
		unanswered: new Tween(0, sweep),
		flagged: new Tween(0, sweep)
	};

	$effect(() => {
		if (!mounted) return;
		const opts = { duration: reduced ? 0 : 1100 };
		void arcs.answered.set(pct(summary.answered), opts);
		void arcs.correct.set(pct(summary.correct), opts);
		void arcs.mastered.set(
			pct(summary.results.filter((r) => r.status === 'mastered').length),
			opts
		);
		void arcs.checked.set(summary.completion, opts);
		for (const key of Object.keys(countUp) as StatKey[]) void countUp[key].set(counts[key], opts);
	});

	// 0 in progress, 1 complete, 2 all correct, 3 mastered; confetti fires on open and on each step up.
	const level = $derived(
		!summary.isComplete ? 0 : summary.isMastered ? 3 : summary.isAllCorrect ? 2 : 1
	);
	let lastLevel = -1;
	$effect(() => {
		if (!mounted) return;
		if (lastLevel === -1 ? level > 0 || celebrate : level > lastLevel) burst += 1;
		lastLevel = level;
	});

	const numberOf = $derived(
		new Map(summary.results.map((result, i) => [result.questionId as string, i + 1]))
	);
	const visibleResults = $derived(
		summary.results.filter(
			(result) =>
				filter === 'all' ||
				(filter === 'flagged'
					? result.flagged
					: filter === 'mastered'
						? result.isMastered
						: result.status === filter)
		)
	);
	const nextReview = $derived(
		summary.results.find((r) => r.status === 'incorrect') ??
			summary.results.find((r) => r.status === 'unanswered')
	);
	const remaining = $derived(summary.incorrect + summary.unanswered);

	const statusStyle: Record<AnswerStatus, { label: string; cell: string; chip: string }> = {
		mastered: {
			label: 'Mastered',
			cell: 'bg-mastered text-mastered-foreground border-mastered shadow-sm shadow-mastered/20',
			chip: 'bg-mastered/12 text-mastered-ink'
		},
		correct: {
			label: 'Correct',
			cell: 'bg-success/75 text-success-foreground border-success/40',
			chip: 'bg-success/15 text-success-ink'
		},
		incorrect: {
			label: 'Needs review',
			cell: 'bg-error/75 text-error-foreground border-error/40',
			chip: 'bg-error/15 text-error-ink'
		},
		unanswered: {
			label: 'Unanswered',
			cell: 'bg-background text-foreground/55 border-border border-dashed',
			chip: 'bg-muted text-foreground/65'
		}
	};

	const tiles: {
		key: StatKey;
		label: string;
		icon: typeof Trophy;
		tone: string;
		active: string;
	}[] = [
		{
			key: 'mastered',
			label: 'Mastered overall',
			icon: Trophy,
			tone: 'text-mastered-ink',
			active: 'border-mastered/50 bg-mastered/10 ring-mastered/20'
		},
		{
			key: 'correct',
			label: 'Correct',
			icon: Check,
			tone: 'text-success',
			active: 'border-success/50 bg-success/10 ring-success/20'
		},
		{
			key: 'incorrect',
			label: 'Needs review',
			icon: X,
			tone: 'text-error',
			active: 'border-error/50 bg-error/10 ring-error/20'
		},
		{
			key: 'unanswered',
			label: 'Unanswered',
			icon: CircleDashed,
			tone: 'text-foreground/50',
			active: 'border-foreground/30 bg-muted ring-foreground/10'
		},
		{
			key: 'flagged',
			label: 'Flagged',
			icon: Flag,
			tone: 'text-warning',
			active: 'border-warning/50 bg-warning/10 ring-warning/20'
		}
	];

	const emptyText: Record<Filter, string> = {
		all: 'No questions in this module yet.',
		mastered: 'Mastery builds automatically across completed module runs.',
		correct: 'No correct answers waiting on a second recall.',
		incorrect: 'Nothing needs review.',
		unanswered: 'Every question has an answer.',
		flagged: 'No flagged questions.'
	};

	const subline = $derived(
		summary.isMastered
			? 'Every question is mastered. Your mastery carries over when you reset this module.'
			: summary.isAllCorrect
				? 'Every answer is correct. Mastery builds as you return for another module run.'
				: summary.isComplete
					? `${summary.incorrect} ${summary.incorrect === 1 ? 'answer needs' : 'answers need'} another look.`
					: `${summary.unanswered} ${summary.unanswered === 1 ? 'question' : 'questions'} left to check.`
	);

	onMount(() => {
		mounted = true;
		heading?.focus({ preventScroll: true });
		const intro = setTimeout(() => (introDone = true), 900);
		return () => {
			clearTimeout(intro);
		};
	});
</script>

{#if burst && !reduced}
	{#key burst}
		<div
			class="pointer-events-none fixed inset-x-0 -top-12 z-50 flex h-screen justify-center overflow-hidden"
			aria-hidden="true"
		>
			<Confetti
				x={[-5, 5]}
				y={[0, 0.1]}
				delay={[0, 1400]}
				duration={3600}
				amount={level === 3 ? 180 : level === 2 ? 130 : 90}
				fallDistance="100vh"
				colorArray={['var(--success)', 'var(--primary)', 'var(--warning)', 'var(--secondary)']}
			/>
		</div>
	{/key}
{/if}

<section
	class="h-full overflow-y-auto bg-background px-4 py-6 sm:px-8 sm:py-10"
	aria-label="Module progress overview"
>
	<div
		class="mx-auto max-w-3xl"
		in:fly={{ y: reduced ? 0 : 14, duration: reduced ? 0 : 400, easing: cubicOut }}
	>
		<Button
			variant="ghost"
			tone="neutral"
			size="sm"
			class="group -ms-3 gap-1 transition-all hover:gap-2"
			onclick={onback}
		>
			<ArrowLeft
				size={16}
				class="transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none"
			/> Back to questions
		</Button>

		<div
			class="relative mt-4 overflow-hidden rounded-3xl border bg-background p-5 shadow-xs sm:p-7 {summary.isMastered
				? 'border-mastered/30'
				: 'border-border'}"
		>
			<div
				class="pointer-events-none absolute inset-0"
				style:background="radial-gradient(circle at 15% 0%, color-mix(in oklab, var({summary.isMastered
					? '--color-success'
					: '--color-primary'}) 10%, transparent), transparent 65%)"
			></div>

			<div class="relative flex flex-col gap-7 sm:flex-row sm:items-center sm:gap-9">
				<div
					class="relative size-44 shrink-0 self-center rounded-full sm:self-auto {summary.isMastered
						? 'ring-glow'
						: ''}"
				>
					{#if burst && !reduced}
						{#key burst}
							<div class="pointer-events-none absolute left-1/2 top-1/2" aria-hidden="true">
								<Confetti
									amount={level === 3 ? 70 : 45}
									x={[-1.6, 1.6]}
									y={[-1.2, 1.6]}
									duration={1800}
									colorArray={['var(--success)', 'var(--primary)', 'var(--warning)']}
								/>
							</div>
						{/key}
					{/if}
					<svg viewBox="0 0 120 120" class="size-full -rotate-90" aria-hidden="true">
						<circle cx="60" cy="60" r="52" fill="none" stroke-width="11" class="stroke-muted" />
						{#each ringSegments as segment (segment.cls)}
							<circle
								cx="60"
								cy="60"
								r="52"
								fill="none"
								stroke-width="11"
								pathLength="100"
								class={segment.cls}
								stroke-dasharray="{segment.arc.current} 100"
							/>
						{/each}
					</svg>
					<div
						class="absolute inset-0 grid place-content-center text-center"
						role="img"
						aria-label={`${summary.completion}% checked, ${summary.mastered} of ${summary.total} mastered`}
					>
						{#if summary.isMastered}
							<span in:scale={{ duration: reduced ? 0 : 500, start: 0.3, easing: backOut }}>
								<Trophy size={22} class="trophy-wiggle mx-auto mb-0.5 text-mastered-ink" />
							</span>
						{/if}
						<span class="text-4xl font-semibold tracking-tight tabular-nums"
							>{Math.round(arcs.checked.current)}<span class="text-xl text-foreground/45">%</span
							></span
						>
						<span class="text-xs text-foreground/60">checked</span>
					</div>
				</div>

				<div class="min-w-0 flex-1">
					<div class="flex items-start gap-3">
						<span
							class="shrink-0 text-4xl leading-none"
							in:scale={{ duration: reduced ? 0 : 550, delay: 120, start: 0.3, easing: backOut }}
							>{emoji}</span
						>
						<div class="min-w-0">
							<h1 bind:this={heading} tabindex="-1" class="title-page outline-none">
								{summary.isMastered
									? 'Module mastered'
									: summary.isAllCorrect
										? 'All answers correct'
										: summary.isComplete
											? 'Module complete'
											: 'Your progress'}
							</h1>
							<p class="mt-0.5 truncate text-sm text-foreground/55">{title}</p>
						</div>
					</div>
					<p class="mt-4 text-pretty text-foreground/75">{subline}</p>

					<div class="mt-5 flex flex-wrap gap-2">
						{#if nextReview}
							<Button
								size="sm"
								class="group gap-1 px-4 shadow-sm shadow-primary/25 transition-all hover:gap-2"
								onclick={() => onreview(nextReview.questionId)}
							>
								Review {remaining} remaining
								<ArrowRight
									size={15}
									class="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
								/>
							</Button>
						{/if}
						<Button variant="ghost" tone="neutral" size="sm" class="gap-1.5 px-4" onclick={onresume}
							><RotateCcw size={14} /> Review all</Button
						>
					</div>
				</div>
			</div>
		</div>

		{#if saveError}
			<div
				class="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-error/10 px-4 py-3 text-sm text-error-ink"
				role="alert"
				transition:slide={{ duration: reduced ? 0 : 200 }}
			>
				<span>{saveError}</span>
				<Button variant="soft" tone="error" size="xs" onclick={onretry}>Try saving again</Button>
			</div>
		{/if}

		<div
			class="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5"
			role="group"
			aria-label="Filter questions"
		>
			{#each tiles as tile, i (tile.key)}
				{@const active = filter === tile.key}
				<button
					type="button"
					class="group rounded-2xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none motion-reduce:hover:translate-y-0 {active
						? `ring-4 ${tile.active}`
						: 'border-border bg-background hover:border-foreground/20'}"
					aria-pressed={active}
					onclick={() => (filter = active ? 'all' : tile.key)}
					in:fly={{
						y: reduced ? 0 : 10,
						duration: reduced ? 0 : 350,
						delay: reduced ? 0 : 150 + i * 60,
						easing: cubicOut
					}}
				>
					<span class="flex items-center justify-between">
						<tile.icon
							size={16}
							class="{tile.tone} transition-transform group-hover:scale-110 motion-reduce:transition-none"
						/>
						{#if active}<span class="text-[11px] text-foreground/50">Showing</span>{/if}
					</span>
					<span class="mt-2 block text-2xl font-semibold tabular-nums"
						>{Math.round(countUp[tile.key].current)}</span
					>
					<span class="block text-xs text-foreground/60">{tile.label}</span>
				</button>
			{/each}
		</div>

		<div class="mt-5 surface p-5 shadow-xs sm:p-6">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h2 class="font-semibold">
					Questions{#if filter !== 'all'}<span class="font-normal text-foreground/55"
							>: {filter === 'flagged' ? 'flagged' : statusStyle[filter].label.toLowerCase()}</span
						>{/if}
				</h2>
				{#if filter !== 'all'}
					<span class="inline-flex" in:scale={{ duration: reduced ? 0 : 150, start: 0.8 }}>
						<Button variant="ghost" tone="neutral" size="xs" onclick={() => (filter = 'all')}
							>Show all {summary.total}</Button
						>
					</span>
				{/if}
			</div>

			<div
				class="mt-4 grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-2"
				aria-label="Question results"
			>
				{#each visibleResults as result, i (result.questionId)}
					{@const number = numberOf.get(result.questionId)}
					{@const selected = selectedId === result.questionId}
					{@const label = `Question ${number}: ${statusStyle[result.status].label.toLowerCase()}${result.flagged ? ', flagged' : ''}${result.cleanRecallCount === 1 ? ', 1 of 2 completed runs' : ''}`}
					<button
						animate:flip={{ duration: reduced ? 0 : 280 }}
						in:scale={{
							duration: reduced ? 0 : 260,
							delay: reduced || introDone ? 0 : 250 + Math.min(i * 14, 500),
							start: 0.4,
							easing: backOut
						}}
						class="relative aspect-square rounded-full border text-xs font-semibold tabular-nums transition-all hover:-translate-y-0.5 hover:scale-110 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none {result.flagged
							? 'bg-warning text-warning-foreground border-warning'
							: statusStyle[result.status].cell} {selected
							? 'scale-110 ring-2 ring-foreground/70 ring-offset-2 ring-offset-background'
							: ''}"
						aria-label={label}
						title={label}
						onclick={() => (selectedId = selected ? null : result.questionId)}
						aria-pressed={selected}
					>
						{number}
						{#if result.status !== 'mastered' && result.cleanRecallCount === 1}
							<span
								class="absolute -bottom-0.5 left-1/2 h-1 w-3 -translate-x-1/2 rounded-full bg-mastered ring-2 ring-background"
							></span>
						{/if}
					</button>
				{:else}
					<p class="col-span-full py-4 text-center text-sm text-foreground/55">
						{emptyText[filter]}
					</p>
				{/each}
			</div>

			<p class="mt-4 text-xs text-foreground/50">
				Mastery builds automatically when you answer from memory across completed module runs at
				least 30 minutes apart. Reset the module when you want to study it again; your mastery is
				kept. Flags are reminders and don't affect mastery.
			</p>

			{#if selectedResult}
				{@const style = statusStyle[selectedResult.status]}
				<div
					class="mt-5 surface-muted p-4 text-sm"
					aria-label="Question mastery details"
					transition:slide={{ duration: reduced ? 0 : 220, easing: cubicOut }}
				>
					<div class="flex flex-wrap items-center justify-between gap-2">
						<div class="flex items-center gap-2">
							<h3 class="font-semibold">Question {numberOf.get(selectedResult.questionId)}</h3>
							<span class="rounded-full px-2 py-0.5 text-xs font-medium {style.chip}"
								>{style.label}</span
							>
							{#if selectedResult.flagged}<span
									class="inline-flex items-center gap-1 rounded-full bg-warning px-2 py-0.5 text-xs text-warning-foreground"
									><Flag size={10} fill="currentColor" /> Flagged</span
								>{/if}
						</div>
						<span class="flex items-center gap-1.5 text-xs text-foreground/60">
							{#each [0, 1] as step (step)}
								<span
									class="h-1.5 w-6 rounded-full transition-colors duration-500 {step <
									selectedResult.cleanRecallCount
										? 'bg-mastered'
										: 'bg-muted-strong'}"
								></span>
							{/each}
							{selectedResult.cleanRecallCount} of 2 completed runs
						</span>
					</div>
					<ul class="mt-3 space-y-1 text-foreground/70">
						{#if selectedResult.isMastered}
							<li>Mastered across two completed module runs, at least 30 minutes apart.</li>
						{:else}
							{#if selectedResult.needsFreshEvidence}<li>
									This question changed. Mastery will build again in future module runs.
								</li>{/if}
							{#if selectedResult.status === 'unanswered'}<li>No checked answer yet.</li>{/if}
							{#if selectedResult.status === 'incorrect'}<li>
									The latest checked answer was incorrect. Mastery will build again in future module
									runs.
								</li>{/if}
							{#if selectedResult.activeAttemptRevealed}<li>
									The answer was revealed before checking in this run.
								</li>{/if}
							{#if selectedResult.activeAttemptChecks > 1}<li>
									{selectedResult.activeAttemptChecks - 1}
									{selectedResult.activeAttemptChecks === 2 ? 'retry' : 'retries'} in this run. Mastery
									uses your first check, before revealing the answer.
								</li>{/if}
							<li>Your progress updates automatically when you finish the module.</li>
						{/if}
						{#if selectedResult.flagged}<li>
								Flagged for review. This does not affect mastery.
							</li>{/if}
					</ul>
					<div class="mt-4 flex flex-wrap gap-2">
						<Button
							variant="ghost"
							tone="neutral"
							size="sm"
							onclick={() => onreview(selectedResult.questionId)}>Review question</Button
						>
					</div>
				</div>
			{/if}
		</div>

		{#if summary.isComplete}
			<div class="mt-6 flex justify-center">
				<Button
					variant="ghost"
					tone="neutral"
					size="sm"
					class="gap-1.5 text-foreground/55 hover:text-error-ink"
					onclick={onreset}><RotateCcw size={14} /> Reset module progress</Button
				>
			</div>
		{/if}
	</div>
</section>

<style>
	.ring-glow {
		animation: ring-glow 2.4s ease-in-out 1s 2;
	}
	@keyframes ring-glow {
		50% {
			filter: drop-shadow(0 0 18px color-mix(in oklab, var(--success) 55%, transparent));
		}
	}
	:global(.trophy-wiggle) {
		animation: trophy-wiggle 0.9s ease-in-out 0.5s 2;
		transform-origin: 50% 90%;
	}
	@keyframes trophy-wiggle {
		0%,
		100% {
			transform: rotate(0);
		}
		25% {
			transform: rotate(-12deg);
		}
		60% {
			transform: rotate(10deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.ring-glow,
		:global(.trophy-wiggle) {
			animation: none;
		}
	}
</style>

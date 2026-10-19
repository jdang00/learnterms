<script lang="ts">
	import { RadialProgress } from '#lib/components/ui/radial-progress/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Progress } from '#lib/components/ui/progress/index.js';
	import { formatClock } from '#lib/utils/format.js';
	import { resolve } from '$app/paths';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Clock from '@lucide/svelte/icons/clock';
	import Target from '@lucide/svelte/icons/target';
	import Flag from '@lucide/svelte/icons/flag';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import XCircle from '@lucide/svelte/icons/x-circle';
	import MinusCircle from '@lucide/svelte/icons/minus-circle';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Plus from '@lucide/svelte/icons/plus';
	import type { Id } from '../../convex/_generated/dataModel';
	import { friendlyStatus, friendlyTypeName, type AttemptResults } from './results';

	let {
		attempt,
		classId,
		onReview
	}: { attempt: AttemptResults['attempt']; classId: Id<'class'>; onReview: () => void } = $props();
	const summary = $derived(attempt.resultSummary);
	const passThreshold = $derived(summary?.passThresholdPct ?? 70);
</script>

<!-- Summary view - scrollable page layout -->
<div class="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20">
	<div class="max-w-5xl mx-auto space-y-6">
		<div class="flex items-center justify-between gap-3 flex-wrap">
			<div>
				<Button
					href={resolve('/classes')}
					variant="ghost"
					tone="secondary"
					size="sm"
					class="mb-2 font-bold"
				>
					<ChevronLeft size={16} /> Back to Class
				</Button>
				<h1 class="title-page">Your Results</h1>
				<p class="text-sm text-foreground/50 mt-1">
					{friendlyStatus(attempt.status)} · {attempt.className ?? 'Test'}
				</p>
			</div>
			<div class="flex gap-2">
				<Button
					href={resolve('/classes/[classId]/tests/new', { classId })}
					variant="ghost"
					tone="neutral"
					size="sm"
				>
					<Plus size={16} />
					New Test
				</Button>
			</div>
		</div>

		<!-- Score hero card -->
		<Card.Root class="py-0 shadow-xs overflow-hidden">
			<Card.Content class="p-6 sm:p-8">
				<div class="flex flex-col sm:flex-row items-center sm:items-start gap-8">
					<div class="flex flex-col items-center text-center shrink-0">
						<RadialProgress
							value={summary?.scorePct ?? 0}
							tone={summary?.passed ? 'success' : 'error'}
							thickness={8}
							label="Score"
							class="size-40 text-4xl font-bold"
						>
							{summary?.scorePct ?? 0}%
						</RadialProgress>
						<Badge
							variant="solid"
							tone={summary?.passed ? 'success' : 'error'}
							size="md"
							class="mt-4 px-5 text-sm"
						>
							{summary?.passed ? 'Passed' : 'Not Passed'}
						</Badge>
					</div>

					<div class="flex-1 w-full">
						<div class="grid grid-cols-3 gap-3">
							<div class="rounded-xl border border-success/20 bg-success/5 p-4 text-center">
								<CheckCircle2 class="mx-auto text-success mb-1" size={20} />
								<div class="font-bold text-2xl text-success-ink">
									{summary?.correctCount ?? 0}
								</div>
								<div class="text-xs text-foreground/50">Correct</div>
							</div>
							<div class="rounded-xl border border-error/20 bg-error/5 p-4 text-center">
								<XCircle class="mx-auto text-error mb-1" size={20} />
								<div class="font-bold text-2xl text-error-ink">
									{summary?.incorrectCount ?? 0}
								</div>
								<div class="text-xs text-foreground/50">Incorrect</div>
							</div>
							<div class="surface-sm p-4 text-center">
								<MinusCircle class="mx-auto text-foreground/30 mb-1" size={20} />
								<div class="font-bold text-2xl">{summary?.unansweredCount ?? 0}</div>
								<div class="text-xs text-foreground/50">Skipped</div>
							</div>
						</div>

						<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
							<div class="surface-sm p-3 flex items-center gap-2">
								<Target size={14} class="text-foreground/40 shrink-0" />
								<div>
									<div class="text-xs text-foreground/40">Pass at</div>
									<div class="font-semibold">{summary?.passThresholdPct ?? 0}%</div>
								</div>
							</div>
							<div class="surface-sm p-3 flex items-center gap-2">
								<Clock size={14} class="text-foreground/40 shrink-0" />
								<div>
									<div class="text-xs text-foreground/40">Time</div>
									<div class="font-semibold tabular-nums">
										{formatClock(attempt.elapsedMs)}
									</div>
								</div>
							</div>
							<div class="surface-sm p-3 flex items-center gap-2">
								<Flag size={14} class="text-foreground/40 shrink-0" />
								<div>
									<div class="text-xs text-foreground/40">Flagged</div>
									<div class="font-semibold">
										{attempt.progressCounters?.flaggedCount ?? 0}
									</div>
								</div>
							</div>
							<div class="surface-sm p-3 flex items-center gap-2">
								<BookOpen size={14} class="text-foreground/40 shrink-0" />
								<div>
									<div class="text-xs text-foreground/40">Questions</div>
									<div class="font-semibold">
										{attempt.configSnapshot?.questionCountActual ?? '—'}
									</div>
								</div>
							</div>
						</div>

						{#if attempt.configSnapshot?.moduleIds?.length > 0 || attempt.timeLimitSec}
							<div class="flex flex-wrap gap-2 mt-3">
								{#if attempt.timeLimitSec}
									<Badge variant="soft" size="sm">
										<Clock size={10} class="mr-1" />
										{Math.round(attempt.timeLimitSec / 60)} min limit
									</Badge>
								{:else}
									<Badge variant="soft" size="sm">Untimed</Badge>
								{/if}
								<Badge variant="soft" size="sm">
									{attempt.configSnapshot.moduleIds.length}
									{attempt.configSnapshot.moduleIds.length === 1 ? 'module' : 'modules'}
								</Badge>
							</div>
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Review CTA -->
		<Button
			size="lg"
			class="h-14 w-full gap-2 group shadow-lg hover:shadow-xl transition-all duration-200"
			onclick={onReview}
		>
			<BookOpen size={20} class="transition-transform group-hover:scale-110" />
			Review Your Answers
		</Button>

		<!-- Breakdowns -->
		<div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
			<Card.Root class="py-0 shadow-xs">
				<Card.Content class="p-8">
					<h2 class="flex items-center gap-2 text-base font-semibold">
						<BarChart3 size={16} class="text-foreground/50" />
						By Module
					</h2>
					{#if !summary?.byModule?.length}
						<p class="text-sm text-foreground/50">No module data available.</p>
					{:else}
						<div class="space-y-2">
							{#each summary.byModule as row (row.moduleId)}
								<div class="surface-sm p-3">
									<div class="flex items-center justify-between gap-2">
										<div class="font-medium text-sm">{row.moduleTitle}</div>
										<Badge
											variant="soft"
											size="md"
											tone={row.accuracyPct >= passThreshold ? 'success' : 'error'}
										>
											{row.accuracyPct}%
										</Badge>
									</div>
									<div class="flex gap-3 text-xs text-foreground/50 mt-1.5">
										<span class="text-success-ink">{row.correct} correct</span>
										<span class="text-error-ink">{row.incorrect} incorrect</span>
										{#if row.unanswered > 0}
											<span>{row.unanswered} skipped</span>
										{/if}
									</div>
									<Progress
										class="mt-2"
										value={row.accuracyPct}
										max={100}
										tone={row.accuracyPct >= passThreshold ? 'success' : 'error'}
									/>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root class="py-0 shadow-xs">
				<Card.Content class="p-8">
					<h2 class="flex items-center gap-2 text-base font-semibold">
						<BarChart3 size={16} class="text-foreground/50" />
						By Question Type
					</h2>
					{#if !summary?.byType?.length}
						<p class="text-sm text-foreground/50">No type data available.</p>
					{:else}
						<div class="space-y-2">
							{#each summary.byType as row (row.questionType)}
								<div class="surface-sm p-3">
									<div class="flex items-center justify-between gap-2">
										<div class="font-medium text-sm">
											{friendlyTypeName(row.questionType)}
										</div>
										<Badge
											variant="soft"
											size="md"
											tone={row.accuracyPct >= passThreshold ? 'success' : 'error'}
										>
											{row.accuracyPct}%
										</Badge>
									</div>
									<div class="flex gap-3 text-xs text-foreground/50 mt-1.5">
										<span class="text-success-ink">{row.correct} correct</span>
										<span class="text-error-ink">{row.incorrect} incorrect</span>
										{#if row.unanswered > 0}
											<span>{row.unanswered} skipped</span>
										{/if}
									</div>
									<Progress
										class="mt-2"
										value={row.accuracyPct}
										max={100}
										tone={row.accuracyPct >= passThreshold ? 'success' : 'error'}
									/>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>

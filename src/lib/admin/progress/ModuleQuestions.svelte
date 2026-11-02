<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Flag from '@lucide/svelte/icons/flag';
	import { api } from '../../../convex/_generated/api';
	import type { Id } from '../../../convex/_generated/dataModel';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import * as ButtonGroup from '#lib/components/ui/button-group/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { plainText, relativeTime } from './utils';

	const PAGE = 10;
	let {
		cohortId,
		moduleId,
		cohortSize,
		now
	}: { cohortId: Id<'cohort'>; moduleId: Id<'module'>; cohortSize: number; now: number } = $props();
	let offset = $state(0);
	const questions = useQuery(
		api.curatorAnalytics.getModuleQuestionAnalyticsPage,
		() => ({ cohortId, moduleId, pageSize: PAGE, pageOffset: offset }),
		{ keepPreviousData: true }
	);
	const pct = (count: number) => (cohortSize > 0 ? Math.min(100, (count / cohortSize) * 100) : 0);
</script>

{#if questions.error}
	<Alert.Root tone="error" role="alert">
		<Alert.Description>Questions could not load. {questions.error.message}</Alert.Description>
	</Alert.Root>
{:else if !questions.data}
	<div class="space-y-2">
		{#each [1, 2, 3, 4] as row (row)}<Skeleton class="h-14" />{/each}
	</div>
{:else if !questions.data.items.length}
	<p class="py-10 text-center text-sm text-muted-foreground">No questions in this module yet.</p>
{:else}
	<ol class="divide-y divide-muted">
		{#each questions.data.items as question (question.questionId)}
			<li class="grid grid-cols-[2rem_minmax(0,1fr)_5.5rem] items-start gap-3 py-3">
				<span class="pt-0.5 font-mono text-xs text-muted-foreground"
					>{String(question.order + 1).padStart(2, '0')}</span
				>
				<span class="min-w-0">
					<span class="line-clamp-2 text-sm">{plainText(question.stem)}</span>
					<span class="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
						<span class="capitalize">{question.type.replaceAll('_', ' ')}</span>
						{#if question.lastInteractionAt}<span aria-hidden="true">·</span>{relativeTime(
								question.lastInteractionAt,
								now
							)}{/if}
						{#if question.flaggedCount}<Badge
								variant="soft"
								tone="warning"
								size="xs"
								class="gap-0.5 tabular-nums"><Flag size={10} />{question.flaggedCount}</Badge
							>{/if}
					</span>
				</span>
				<span class="pt-1 text-right">
					<span class="block text-xs font-medium tabular-nums"
						>{question.interactionCount}<span class="text-muted-foreground">/{cohortSize}</span
						></span
					>
					<span class="mt-1 block h-1 overflow-hidden rounded-full bg-muted-strong">
						<span
							class="block h-full rounded-full bg-primary transition-[width] duration-700"
							style="width: {pct(question.interactionCount)}%"
						></span>
					</span>
				</span>
			</li>
		{/each}
	</ol>
	<div class="flex items-center justify-between pt-3">
		<span class="text-xs text-muted-foreground tabular-nums"
			>{offset + 1}–{Math.min(offset + PAGE, questions.data.total)} of {questions.data.total}</span
		>
		<ButtonGroup.Root>
			<Button
				variant="soft"
				tone="neutral"
				size="xs"
				shape="circle"
				aria-label="Previous questions"
				disabled={offset === 0}
				onclick={() => (offset = Math.max(0, offset - PAGE))}><ChevronLeft size={15} /></Button
			>
			<Button
				variant="soft"
				tone="neutral"
				size="xs"
				shape="circle"
				aria-label="Next questions"
				disabled={!questions.data.hasMore}
				onclick={() => (offset += PAGE)}><ChevronRight size={15} /></Button
			>
		</ButtonGroup.Root>
	</div>
{/if}

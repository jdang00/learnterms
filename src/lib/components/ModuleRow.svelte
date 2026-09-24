<script lang="ts">
	import { ChevronRight, Flag } from 'lucide-svelte';
	import { resolve } from '$app/paths';
	import type { Id } from '../../convex/_generated/dataModel';
	import {
		moduleState,
		moduleStatusLabel,
		type ModuleProgressSummary
	} from '$lib/utils/classProgress';

	interface Props {
		module: {
			_id: Id<'module'>;
			title: string;
			emoji?: string | null;
			questionCount?: number;
			tags?: { _id: Id<'tags'>; name: string; color?: string }[];
		};
		classId: Id<'class'>;
		position: number;
		progress?: ModuleProgressSummary;
	}

	let { module, classId, position, progress }: Props = $props();

	const total = $derived(progress?.total ?? module.questionCount ?? 0);
	const stage = $derived(progress ? moduleState(progress) : null);
	const pct = (n: number) => (total ? (n / total) * 100 : 0);
	const statusTone = {
		empty: 'text-base-content/40',
		new: 'text-base-content/45',
		started: 'text-base-content/70',
		answered: 'text-base-content/70',
		mastered:
			'font-medium text-[color-mix(in_oklab,var(--color-success)_60%,var(--color-base-content))]'
	} as const;
</script>

<a
	href={resolve('/classes/[classId]/modules/[moduleId]', { classId, moduleId: module._id })}
	class="group flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-base-200/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary active:bg-base-200 sm:gap-4"
>
	<span class="hidden w-6 shrink-0 font-mono text-xs text-base-content/40 tabular-nums sm:block"
		>{String(position).padStart(2, '0')}</span
	>
	<span class="shrink-0 text-2xl leading-none">{module.emoji || '📘'}</span>
	<span class="min-w-0 flex-1">
		<span
			class="block text-[0.95rem] leading-snug font-semibold text-base-content line-clamp-2 sm:truncate"
			>{module.title}</span
		>
		<span class="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-base-content/55">
			<span class="tabular-nums">{total} {total === 1 ? 'question' : 'questions'}</span>
			{#if progress?.flagged}
				<span
					class="inline-flex items-center gap-1 text-[color-mix(in_oklab,var(--color-warning)_70%,var(--color-base-content))] tabular-nums"
				>
					<Flag size={11} />
					{progress.flagged} flagged
				</span>
			{/if}
			{#if module.tags?.length}
				<span class="flex items-center gap-1">
					{#each module.tags.slice(0, 5) as tag (tag._id)}
						<span
							class="size-2 rounded-full"
							style:background-color={tag.color || '#94a3b8'}
							title={tag.name}
						></span>
					{/each}
					<span class="sr-only">Tags: {module.tags.map((tag) => tag.name).join(', ')}</span>
				</span>
			{/if}
		</span>
	</span>

	{#if progress && stage !== 'empty'}
		<span
			class="hidden h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-base-content/10 md:flex"
			aria-hidden="true"
		>
			<span class="h-full bg-emerald-800" style:width="{pct(progress.mastered)}%"></span>
			<span class="h-full bg-success/60" style:width="{pct(progress.answered - progress.mastered)}%"
			></span>
		</span>
	{/if}
	{#if progress && stage}
		<span class="w-24 shrink-0 text-right text-xs tabular-nums {statusTone[stage]}"
			>{moduleStatusLabel(progress)}</span
		>
	{/if}
	<ChevronRight
		size={18}
		class="shrink-0 text-base-content/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none"
	/>
</a>

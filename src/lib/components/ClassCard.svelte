<script lang="ts">
	import { ArrowRight } from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import ColorMark from './ColorMark.svelte';
	import type { ClassWithSemester } from '../types';
	import {
		briefDescription,
		classActionLabel,
		classColor,
		moduleState,
		summarizeClassProgress,
		type ClassOverview
	} from '$lib/utils/classProgress';

	interface Props {
		classItem: ClassWithSemester;
		onSelect: (classItem: ClassWithSemester) => void;
		// undefined while the overview loads
		progress?: ClassOverview;
		loading?: boolean;
	}

	let { classItem, onSelect, progress, loading = false }: Props = $props();

	const color = $derived(classColor(classItem));
	const counts = $derived(progress ? summarizeClassProgress(progress.modules) : null);
	const progressLabel = $derived.by(() => {
		if (!counts) return '';
		if (!counts.modules) return 'No modules yet';
		const started = `${counts.started} of ${counts.modules} ${counts.modules === 1 ? 'module' : 'modules'} started`;
		return counts.mastered ? `${started} · ${counts.mastered} mastered` : started;
	});
	const blurb = $derived(classItem.description ? briefDescription(classItem.description) : null);
	// The class's own module emojis, in order, give each card a face.
	const emojis = $derived([
		...new Set((progress?.modules ?? []).map((m) => m.emoji).filter((e): e is string => !!e))
	]);
	const cellClass = {
		empty: 'bg-base-content/5',
		new: 'bg-base-content/10',
		started: 'bg-success/60',
		answered: 'bg-success/60',
		mastered: 'bg-emerald-800'
	} as const;
</script>

<button
	in:fade={{ duration: 300 }}
	type="button"
	onclick={() => onSelect(classItem)}
	aria-label={`Open class ${classItem.name}`}
	style:--class-color={color}
	class="class-card group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 text-left transition-[border-color,translate,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:hover:translate-y-0"
>
	<span class="class-card-head flex items-center gap-3 px-5 py-4">
		<ColorMark {color} class="size-9 text-base-content" />
		<span class="min-w-0 flex-1">
			<span class="block font-mono text-xs text-base-content/60">{classItem.code}</span>
			<span class="line-clamp-2 block text-lg leading-snug font-semibold text-base-content"
				>{classItem.name}</span
			>
		</span>
		{#if emojis.length}
			<span class="hidden shrink-0 items-center sm:flex" aria-hidden="true">
				{#each emojis.slice(0, 3) as emoji, i (emoji)}
					<span
						class="class-card-chip grid size-8 place-items-center rounded-full bg-base-100 text-base leading-none {i
							? '-ms-2'
							: ''}">{emoji}</span
					>
				{/each}
				{#if emojis.length > 3}
					<span
						class="class-card-chip -ms-2 grid size-8 place-items-center rounded-full bg-base-100 text-[0.65rem] font-semibold text-base-content/60 tabular-nums"
						>+{emojis.length - 3}</span
					>
				{/if}
			</span>
		{/if}
	</span>

	<span class="flex flex-1 flex-col gap-3 px-5 pt-3.5 pb-4">
		{#if blurb}
			<span
				class="line-clamp-2 text-sm leading-relaxed text-base-content/65"
				title={blurb.truncated ? classItem.description : undefined}>{blurb.text}</span
			>
		{/if}

		{#if progress && counts && counts.modules > 0}
			<span
				class="grid grid-cols-[repeat(auto-fill,minmax(10px,1fr))] gap-[3px]"
				aria-hidden="true"
			>
				{#each progress.modules as module (module.moduleId)}
					<span class="aspect-square rounded-[3px] {cellClass[moduleState(module)]}"></span>
				{/each}
			</span>
		{:else if loading && !progress}
			<span class="block h-2.5 w-full skeleton rounded-full"></span>
		{/if}

		<span class="mt-auto flex items-center justify-between gap-3">
			<span class="min-w-0 text-xs text-base-content/60 tabular-nums">
				{progressLabel}
			</span>
			<span
				class="class-card-cta inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium text-base-content transition-[gap] group-hover:gap-2.5 motion-reduce:transition-none"
			>
				{counts ? classActionLabel(counts) : 'Open'}
				<ArrowRight size={14} />
			</span>
		</span>
	</span>
</button>

<style>
	/* Flat wash of the class color; mixing into base-100 keeps it right in both themes. */
	.class-card-head {
		background: color-mix(in oklab, var(--class-color) 16%, var(--color-base-100));
		border-bottom: 1px solid color-mix(in oklab, var(--class-color) 28%, transparent);
	}

	.class-card-chip {
		box-shadow: 0 0 0 2px color-mix(in oklab, var(--class-color) 16%, var(--color-base-100));
	}

	.class-card-cta {
		background: color-mix(in oklab, var(--class-color) 18%, var(--color-base-100));
	}

	.class-card:hover {
		border-color: color-mix(in oklab, var(--class-color) 55%, transparent);
	}

	.class-card:hover .class-card-cta {
		background: color-mix(in oklab, var(--class-color) 30%, var(--color-base-100));
	}
</style>

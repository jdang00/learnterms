<script lang="ts">
	import { BookOpen, GraduationCap, Layers, Loader2 } from 'lucide-svelte';
	import type { CohortClassSearchItem, CohortModuleSearchItem } from './types';

	interface Props {
		searchQuery?: string;
		activeCohortId?: string;
		classes?: CohortClassSearchItem[];
		modules?: CohortModuleSearchItem[];
		isLoadingClasses?: boolean;
		isLoadingModules?: boolean;
		hasSearchError?: boolean;
		onOpenClass?: (classId: string) => void;
		onOpenModule?: (classId: string, moduleId: string) => void;
	}

	let {
		searchQuery = '',
		activeCohortId = '',
		classes = [],
		modules = [],
		isLoadingClasses = false,
		isLoadingModules = false,
		hasSearchError = false,
		onOpenClass,
		onOpenModule
	}: Props = $props();

	const hasQuery = $derived.by(() => searchQuery.trim().length > 0);
	const queryLength = $derived.by(() => searchQuery.trim().length);
	const isLoading = $derived.by(() => isLoadingClasses || isLoadingModules);
	const hasResults = $derived.by(() => classes.length > 0 || modules.length > 0);
</script>

<section class="space-y-2">
	<div class="px-3 pt-1">
		<p class="text-[11px] font-medium uppercase tracking-wider text-base-content/35">
			Search Cohort
		</p>
	</div>

	{#if !hasQuery}
		<p class="px-3 py-2 text-sm text-base-content/45">
			Type 2+ characters for classes, 3+ for modules.
		</p>
	{:else if !activeCohortId}
		<p class="px-3 py-2 text-sm text-base-content/45">
			Switch to a cohort to search classes and modules.
		</p>
	{:else if queryLength < 2}
		<p class="px-3 py-2 text-sm text-base-content/45">
			Type at least 2 characters to search classes.
		</p>
	{:else if queryLength < 3 && classes.length === 0}
		<p class="px-3 py-2 text-sm text-base-content/45">
			No class matches yet. Type one more character to include modules.
		</p>
	{:else if isLoading && !hasResults}
		<div class="flex items-center gap-2 px-3 py-2 text-sm text-base-content/45">
			<Loader2 size={14} class="animate-spin" />
			<span>Searching classes and modules…</span>
		</div>
	{:else if !hasResults && hasSearchError}
		<p class="px-3 py-2 text-sm text-base-content/45">
			Search is temporarily unavailable. Try again in a moment.
		</p>
	{:else if !hasResults}
		<p class="px-3 py-2 text-sm text-base-content/45">No class or module matches in this cohort.</p>
	{:else}
		{#if classes.length > 0}
			<div class="space-y-1">
				<p class="px-3 text-[10px] uppercase tracking-wide text-base-content/30">Classes</p>
				{#each classes as classItem (classItem._id)}
					<button
						type="button"
						class="group flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-left transition-colors duration-100 hover:bg-base-200/60"
						onclick={() => onOpenClass?.(classItem._id)}
						data-power-item="true"
					>
						<span
							class="flex h-7 w-7 items-center justify-center rounded-lg bg-base-200 text-base-content/55"
						>
							<GraduationCap size={14} />
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-[13px] font-semibold leading-snug"
								>{classItem.name}</span
							>
							<span class="block truncate text-[11px] text-base-content/50">
								{classItem.code}
								{#if classItem.semesterName}
									· {classItem.semesterName}
								{/if}
							</span>
						</span>
					</button>
				{/each}
			</div>
		{/if}

		{#if modules.length > 0}
			<div class="space-y-1">
				<p class="px-3 text-[10px] uppercase tracking-wide text-base-content/30">Modules</p>
				{#each modules as moduleItem (moduleItem._id)}
					<button
						type="button"
						class="group flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-left transition-colors duration-100 hover:bg-base-200/60"
						onclick={() => onOpenModule?.(moduleItem.classId, moduleItem._id)}
						data-power-item="true"
					>
						<span
							class="flex h-7 w-7 items-center justify-center rounded-lg bg-base-200 text-base-content/55"
						>
							{#if moduleItem.emoji}
								{moduleItem.emoji}
							{:else}
								<BookOpen size={14} />
							{/if}
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-[13px] font-semibold leading-snug"
								>{moduleItem.title}</span
							>
							<span class="block truncate text-[11px] text-base-content/50"
								>{moduleItem.className} · {moduleItem.classCode}</span
							>
						</span>
						<span class="badge badge-ghost badge-xs rounded-full text-[10px]">
							<Layers size={10} />
							{moduleItem.questionCount}
						</span>
					</button>
				{/each}
			</div>
		{/if}
	{/if}
</section>

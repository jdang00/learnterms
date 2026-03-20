<script lang="ts">
	import { Check, School, Users, BookOpen, BarChart3, Hash, KeyRound, Layers, GraduationCap } from 'lucide-svelte';
	import type { CohortItem } from './types';

	interface Props {
		isVisible?: boolean;
		cohorts?: CohortItem[];
		activeCohortId?: string;
		searchQuery?: string;
		isSwitching?: boolean;
		onSwitch?: (cohortId: string) => void | Promise<void>;
	}

	let {
		isVisible = false,
		cohorts = [],
		activeCohortId = '',
		searchQuery = '',
		isSwitching = false,
		onSwitch
	}: Props = $props();

	const filteredCohorts = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return cohorts;
		return cohorts.filter((cohort) =>
			`${cohort.name} ${cohort.schoolName ?? ''} ${cohort._id}`.toLowerCase().includes(query)
		);
	});
</script>

{#if isVisible}
	<section class="space-y-2">
		<div class="px-3 pt-1">
			<p class="text-[11px] font-medium uppercase tracking-wider text-base-content/35">
				Switch Cohort
			</p>
		</div>

		{#if filteredCohorts.length > 0}
			{#each filteredCohorts as cohort (cohort._id)}
				<button
					type="button"
					class="group w-full rounded-xl px-3 py-2.5 text-left transition-colors duration-100
						{activeCohortId === cohort._id
							? 'bg-primary/8 ring-1 ring-primary/20'
							: 'hover:bg-base-200/60'}"
					onclick={() => onSwitch?.(cohort._id)}
					disabled={isSwitching}
					data-power-item="true"
				>
					<div class="flex items-start gap-2.5">
						<div class="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center">
							{#if activeCohortId === cohort._id}
								<Check size={14} class="text-primary" />
							{:else}
								<GraduationCap size={12} class="text-base-content/25" />
							{/if}
						</div>
						<div class="min-w-0 flex-1 space-y-1">
							<div class="flex items-baseline justify-between gap-2">
								<p class="text-[13px] font-semibold leading-snug break-words
									{activeCohortId === cohort._id ? 'text-primary' : ''}">{cohort.name}</p>
								{#if cohort.startYear && cohort.endYear}
									<span class="shrink-0 text-[10px] tabular-nums text-base-content/35">{cohort.startYear}–{cohort.endYear}</span>
								{/if}
							</div>

							{#if cohort.schoolName}
								<div class="flex items-start gap-1.5 text-base-content/45">
									<School size={11} class="mt-px shrink-0" />
									<span class="text-[11px] leading-snug break-words">{cohort.schoolName}</span>
								</div>
							{/if}

								<div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-base-content/30">
									<span class="flex items-center gap-1">
										<Users size={10} class="shrink-0" />
										{cohort.stats?.totalStudents ?? '—'}
									</span>
									<span class="flex items-center gap-1">
										<BookOpen size={10} class="shrink-0" />
										{cohort.stats?.totalQuestions ?? '—'}
									</span>
									<span class="flex items-center gap-1">
										<Layers size={10} class="shrink-0" />
										{cohort.stats?.totalModules ?? '—'}
									</span>
									<span class="flex items-center gap-1">
										<BarChart3 size={10} class="shrink-0" />
										{cohort.stats?.averageCompletion != null
											? `${Math.round(cohort.stats.averageCompletion)}%`
											: '—'}
									</span>
									{#if cohort.classCode}
										<span class="flex items-center gap-1">
											<KeyRound size={10} class="shrink-0" />
										{cohort.classCode}
									</span>
								{/if}
							</div>

							<div class="flex items-center gap-1 text-base-content/20">
								<Hash size={9} class="shrink-0" />
								<span class="font-mono text-[9px] break-all leading-tight">{cohort._id}</span>
							</div>
						</div>
					</div>
					</button>
			{/each}
		{:else if !searchQuery.trim()}
			<p class="px-3 py-4 text-sm text-base-content/45">No cohorts available</p>
		{/if}
	</section>
{/if}

<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import School from '@lucide/svelte/icons/school';
	import Users from '@lucide/svelte/icons/users';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import Hash from '@lucide/svelte/icons/hash';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Layers from '@lucide/svelte/icons/layers';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import { Command } from 'bits-ui';
	import { POWER_HEADING_CLASS } from './styles';
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
	<Command.Group value="switch-cohort">
		<Command.GroupHeading class={POWER_HEADING_CLASS}>Switch Cohort</Command.GroupHeading>
		<Command.GroupItems class="space-y-1">
			{#if filteredCohorts.length > 0}
				{#each filteredCohorts as cohort (cohort._id)}
					<Command.Item
						value="cohort:{cohort._id}"
						class="group w-full cursor-pointer rounded-xl px-3 py-2.5 text-left outline-hidden transition-colors duration-100 data-disabled:pointer-events-none data-disabled:opacity-50
						{activeCohortId === cohort._id
							? 'bg-primary/8 ring-1 ring-primary/20 data-selected:bg-primary/12'
							: 'data-selected:bg-muted/60'}"
						onSelect={() => onSwitch?.(cohort._id)}
						disabled={isSwitching}
					>
						<div class="flex items-start gap-2.5">
							<div class="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center">
								{#if activeCohortId === cohort._id}
									<Check size={14} class="text-primary" />
								{:else}
									<GraduationCap size={12} class="text-foreground/25" />
								{/if}
							</div>
							<div class="min-w-0 flex-1 space-y-1">
								<div class="flex items-baseline justify-between gap-2">
									<p
										class="text-[13px] font-semibold leading-snug break-words
									{activeCohortId === cohort._id ? 'text-primary-ink' : ''}"
									>
										{cohort.name}
									</p>
									{#if cohort.startYear && cohort.endYear}
										<span class="shrink-0 text-[10px] tabular-nums text-foreground/35"
											>{cohort.startYear}–{cohort.endYear}</span
										>
									{/if}
								</div>

								{#if cohort.schoolName}
									<div class="flex items-start gap-1.5 text-foreground/45">
										<School size={11} class="mt-px shrink-0" />
										<span class="text-[11px] leading-snug break-words">{cohort.schoolName}</span>
									</div>
								{/if}

								<div
									class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-foreground/30"
								>
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

								<div class="flex items-center gap-1 text-foreground/20">
									<Hash size={9} class="shrink-0" />
									<span class="font-mono text-[9px] break-all leading-tight">{cohort._id}</span>
								</div>
							</div>
						</div>
					</Command.Item>
				{/each}
			{:else if !searchQuery.trim()}
				<p class="px-3 py-4 text-sm text-foreground/45">No cohorts available</p>
			{/if}
		</Command.GroupItems>
	</Command.Group>
{/if}

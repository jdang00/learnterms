<script lang="ts">
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import Layers from '@lucide/svelte/icons/layers';
	import { Command } from 'bits-ui';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { POWER_HEADING_CLASS, POWER_ITEM_CLASS, POWER_NOTE_CLASS } from './styles';
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

<Command.Group value="search-cohort">
	<Command.GroupHeading class={POWER_HEADING_CLASS}>Search Cohort</Command.GroupHeading>
	<Command.GroupItems class="space-y-1">
		{#if !hasQuery}
			<p class={POWER_NOTE_CLASS}>Type 2+ characters for classes, 3+ for modules.</p>
		{:else if !activeCohortId}
			<p class={POWER_NOTE_CLASS}>Switch to a cohort to search classes and modules.</p>
		{:else if queryLength < 2}
			<p class={POWER_NOTE_CLASS}>Type at least 2 characters to search classes.</p>
		{:else if queryLength < 3 && classes.length === 0}
			<p class={POWER_NOTE_CLASS}>
				No class matches yet. Type one more character to include modules.
			</p>
		{:else if isLoading && !hasResults}
			<div class="flex items-center gap-2 {POWER_NOTE_CLASS}">
				<Spinner class="size-3.5" />
				<span>Searching classes and modules…</span>
			</div>
		{:else if !hasResults && hasSearchError}
			<p class={POWER_NOTE_CLASS}>Search is temporarily unavailable. Try again in a moment.</p>
		{:else if !hasResults}
			<p class={POWER_NOTE_CLASS}>No class or module matches in this cohort.</p>
		{:else}
			{#if classes.length > 0}
				<p class="px-3 label-caps">Classes</p>
				{#each classes as classItem (classItem._id)}
					<Command.Item
						value="class:{classItem._id}"
						class={POWER_ITEM_CLASS}
						onSelect={() => onOpenClass?.(classItem._id)}
					>
						<span
							class="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground/55"
						>
							<GraduationCap size={14} />
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-[13px] font-semibold leading-snug"
								>{classItem.name}</span
							>
							<span class="block truncate text-[11px] text-foreground/50">
								{classItem.code}
								{#if classItem.semesterName}
									· {classItem.semesterName}
								{/if}
							</span>
						</span>
					</Command.Item>
				{/each}
			{/if}

			{#if modules.length > 0}
				<p class="px-3 pt-1 label-caps">Modules</p>
				{#each modules as moduleItem (moduleItem._id)}
					<Command.Item
						value="module:{moduleItem._id}"
						class={POWER_ITEM_CLASS}
						onSelect={() => onOpenModule?.(moduleItem.classId, moduleItem._id)}
					>
						<span
							class="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground/55"
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
							<span class="block truncate text-[11px] text-foreground/50"
								>{moduleItem.className} · {moduleItem.classCode}</span
							>
						</span>
						<Badge size="xs" class="text-[10px]">
							<Layers size={10} />
							{moduleItem.questionCount}
						</Badge>
					</Command.Item>
				{/each}
			{/if}
		{/if}
	</Command.GroupItems>
</Command.Group>

<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base, resolve } from '$app/paths';
	import { useQuery } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api';
	import type { Id } from '../../../convex/_generated/dataModel';
	import Search from '@lucide/svelte/icons/search';
	import Keyboard from '@lucide/svelte/icons/keyboard';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import { Command } from 'bits-ui';
	import { theme } from '$lib/theme.svelte';
	import { modifierKeyLabel } from '$lib/utils/platform';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Kbd } from '$lib/components/ui/kbd';
	import PowerBarCohortSearchSection from './PowerBarCohortSearchSection.svelte';
	import PowerBarCohortSection from './PowerBarCohortSection.svelte';
	import PowerBarQuickLinksSection from './PowerBarQuickLinksSection.svelte';
	import PowerBarSettingsSection from './PowerBarSettingsSection.svelte';
	import { POWER_HEADING_CLASS, POWER_NOTE_CLASS } from './styles';
	import type {
		CohortClassSearchItem,
		CohortItem,
		CohortModuleSearchItem,
		QuickLinkItem
	} from './types';
	import {
		QUIZ_PREFERENCE_CHANGED_EVENT,
		QUIZ_PREFERENCE_KEYS,
		readQuizPreference,
		writeQuizPreference,
		type QuizPreferenceChangedDetail
	} from './preferences';

	type CommandItem = {
		id: string;
		title: string;
		description: string;
		kind: 'cohort' | 'class' | 'module' | 'link' | 'setting';
		searchText: string;
		onSelect: () => void | Promise<void>;
	};

	interface Props {
		isOpen?: boolean;
		canSwitchCohorts?: boolean;
		cohorts?: CohortItem[];
		activeCohortId?: string;
		isSwitchingCohort?: boolean;
		quickLinks?: QuickLinkItem[];
		onSwitchCohort?: (cohortId: string) => void | Promise<void>;
	}

	let {
		isOpen = $bindable(false),
		canSwitchCohorts = false,
		cohorts = [],
		activeCohortId = '',
		isSwitchingCohort = false,
		quickLinks = [],
		onSwitchCohort
	}: Props = $props();

	let searchQuery = $state('');
	let debouncedSearchQuery = $state('');
	let searchInputRef = $state<HTMLInputElement | null>(null);
	let autoNextEnabled = $state(true);
	let optionsShuffleEnabled = $state(false);

	const normalizedSearchQuery = $derived.by(() => debouncedSearchQuery.trim().toLowerCase());

	const classSearchQuery = useQuery(api.class.searchClassesByCohort, () =>
		isOpen && activeCohortId && normalizedSearchQuery.length >= 2
			? {
					cohortId: activeCohortId as Id<'cohort'>,
					query: normalizedSearchQuery,
					limit: 8
				}
			: 'skip'
	);

	const moduleSearchQuery = useQuery(api.module.searchModulesByCohort, () =>
		isOpen && activeCohortId && normalizedSearchQuery.length >= 3
			? {
					cohortId: activeCohortId as Id<'cohort'>,
					query: normalizedSearchQuery,
					limit: 10
				}
			: 'skip'
	);

	const cohortClassResults = $derived.by(
		() => (classSearchQuery.data ?? []) as CohortClassSearchItem[]
	);
	const cohortModuleResults = $derived.by(
		() => (moduleSearchQuery.data ?? []) as CohortModuleSearchItem[]
	);
	const hasSearchError = $derived.by(
		() => Boolean(classSearchQuery.error) || Boolean(moduleSearchQuery.error)
	);

	function syncPreferencesFromStorage() {
		autoNextEnabled = readQuizPreference(QUIZ_PREFERENCE_KEYS.autoNextEnabled, true);
		optionsShuffleEnabled = readQuizPreference(QUIZ_PREFERENCE_KEYS.optionsShuffleEnabled, false);
	}

	function setAutoNext(enabled: boolean) {
		autoNextEnabled = enabled;
		writeQuizPreference(QUIZ_PREFERENCE_KEYS.autoNextEnabled, enabled);
	}

	function setShuffleAnswers(enabled: boolean) {
		optionsShuffleEnabled = enabled;
		writeQuizPreference(QUIZ_PREFERENCE_KEYS.optionsShuffleEnabled, enabled);
	}

	function goToLink(href: string) {
		if (typeof window === 'undefined') return;
		isOpen = false;
		window.location.assign(href.startsWith('http') ? href : `${base}${href}`);
	}

	async function goToClass(classId: string) {
		isOpen = false;
		await goto(resolve('/classes'), { state: { classId } });
	}

	function goToModule(classId: string, moduleId: string) {
		goToLink(`/classes/${classId}/modules/${moduleId}`);
	}

	function buildSearchScore(query: string, value: string): number {
		if (!query) return 0;
		if (value === query) return 400;
		if (value.startsWith(query)) return 300;
		if (value.includes(` ${query}`)) return 220;
		if (value.includes(query)) return 160;
		return 0;
	}

	const commandItems = $derived.by(() => {
		const items: CommandItem[] = [];

		if (canSwitchCohorts) {
			for (const cohort of cohorts) {
				const stats = cohort.stats;
				const statsSummary = [
					stats?.totalStudents != null ? `${stats.totalStudents} students` : '',
					stats?.totalQuestions != null ? `${stats.totalQuestions} questions` : '',
					stats?.totalModules != null ? `${stats.totalModules} modules` : ''
				]
					.filter(Boolean)
					.join(' · ');
				items.push({
					id: `cohort:${cohort._id}`,
					title: `Switch cohort: ${cohort.name}`,
					description:
						statsSummary || cohort.schoolName || cohort.classCode || 'Switch active cohort context',
					kind: 'cohort',
					searchText:
						`${cohort.name} ${cohort.schoolName ?? ''} ${cohort._id} ${cohort.classCode ?? ''} ${statsSummary}`
							.toLowerCase()
							.trim(),
					onSelect: () => onSwitchCohort?.(cohort._id)
				});
			}
		}

		for (const classItem of cohortClassResults) {
			items.push({
				id: `class:${classItem._id}`,
				title: `Class: ${classItem.name}`,
				description: `${classItem.code}${classItem.semesterName ? ` · ${classItem.semesterName}` : ''}`,
				kind: 'class',
				searchText:
					`${classItem.name} ${classItem.code} ${classItem.description} ${classItem.semesterName ?? ''}`
						.toLowerCase()
						.trim(),
				onSelect: () => goToClass(classItem._id)
			});
		}

		for (const moduleItem of cohortModuleResults) {
			items.push({
				id: `module:${moduleItem._id}`,
				title: `Module: ${moduleItem.title}`,
				description: `${moduleItem.className} · ${moduleItem.classCode}`,
				kind: 'module',
				searchText:
					`${moduleItem.title} ${moduleItem.description} ${moduleItem.className} ${moduleItem.classCode} ${moduleItem.status}`
						.toLowerCase()
						.trim(),
				onSelect: () => goToModule(moduleItem.classId, moduleItem._id)
			});
		}

		for (const link of quickLinks) {
			items.push({
				id: `link:${link.href}`,
				title: link.title,
				description: link.description,
				kind: 'link',
				searchText: `${link.title} ${link.description} ${link.href}`.toLowerCase(),
				onSelect: () => goToLink(link.href)
			});
		}

		items.push({
			id: 'setting:theme:light',
			title: 'Theme: Light',
			description: 'Switch interface to light mode',
			kind: 'setting',
			searchText: 'theme light mode appearance'.toLowerCase(),
			onSelect: () => theme.set('light')
		});
		items.push({
			id: 'setting:theme:dark',
			title: 'Theme: Dark',
			description: 'Switch interface to dark mode',
			kind: 'setting',
			searchText: 'theme dark mode appearance'.toLowerCase(),
			onSelect: () => theme.set('dark')
		});
		items.push({
			id: 'setting:auto-next',
			title: `Auto Next: ${autoNextEnabled ? 'On' : 'Off'}`,
			description: 'Toggle automatic advance after a correct answer',
			kind: 'setting',
			searchText: 'auto next automatic advance quiz setting'.toLowerCase(),
			onSelect: () => setAutoNext(!autoNextEnabled)
		});
		items.push({
			id: 'setting:shuffle-answers',
			title: `Shuffle Answers: ${optionsShuffleEnabled ? 'On' : 'Off'}`,
			description: 'Toggle randomized answer option order',
			kind: 'setting',
			searchText: 'shuffle answers options random quiz setting'.toLowerCase(),
			onSelect: () => setShuffleAnswers(!optionsShuffleEnabled)
		});

		return items;
	});

	const topResult = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return null;

		const ranked = commandItems
			.map((item) => {
				const titleScore = buildSearchScore(query, item.title.toLowerCase());
				const bodyScore = buildSearchScore(query, item.searchText);
				const kindBoost =
					item.kind === 'module'
						? 6
						: item.kind === 'class'
							? 5
							: item.kind === 'cohort'
								? 4
								: item.kind === 'link'
									? 3
									: 2;
				return { item, score: titleScore + bodyScore + kindBoost };
			})
			.filter((entry) => entry.score > 0)
			.sort((a, b) => b.score - a.score);

		return ranked[0]?.item ?? null;
	});

	async function executeCommand(item: CommandItem | null) {
		if (!item) return;
		await item.onSelect();
	}

	$effect(() => {
		if (!isOpen) return;
		searchQuery = '';
		debouncedSearchQuery = '';
		setTimeout(() => searchInputRef?.focus(), 0);
	});

	$effect(() => {
		if (!isOpen) return;
		const nextQuery = searchQuery;
		const handle = setTimeout(() => {
			debouncedSearchQuery = nextQuery;
		}, 260);
		return () => clearTimeout(handle);
	});

	let modifierKey = $state('Ctrl');
	onMount(() => {
		modifierKey = modifierKeyLabel();
		syncPreferencesFromStorage();

		const handleHotkey = (event: KeyboardEvent) => {
			if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
			event.preventDefault();
			isOpen = !isOpen;
		};

		const handlePreferenceUpdate = (event: Event) => {
			const custom = event as CustomEvent<QuizPreferenceChangedDetail>;
			if (custom.detail.key === QUIZ_PREFERENCE_KEYS.autoNextEnabled) {
				autoNextEnabled = custom.detail.value;
			}
			if (custom.detail.key === QUIZ_PREFERENCE_KEYS.optionsShuffleEnabled) {
				optionsShuffleEnabled = custom.detail.value;
			}
		};

		window.addEventListener('keydown', handleHotkey);
		window.addEventListener(QUIZ_PREFERENCE_CHANGED_EVENT, handlePreferenceUpdate);
		return () => {
			window.removeEventListener('keydown', handleHotkey);
			window.removeEventListener(QUIZ_PREFERENCE_CHANGED_EVENT, handlePreferenceUpdate);
		};
	});
</script>

<Dialog.Root bind:open={isOpen}>
	<!-- Phones get a full-screen panel that stops above the keyboard so the results can scroll. -->
	<Dialog.Content
		showCloseButton={false}
		aria-describedby={undefined}
		class="pt-safe top-0 left-0 flex h-[calc(100dvh-var(--keyboard-inset,0px))] max-h-none w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 shadow-2xl sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[min(80vh,40rem)] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-border sm:pt-0"
	>
		<Dialog.Title class="sr-only">Search LearnTerms</Dialog.Title>
		<!-- Results are filtered and ranked here and in the sections, so Command only handles
		     selection, arrow keys and Enter. -->
		<Command.Root shouldFilter={false} loop class="flex min-h-0 flex-1 flex-col">
			<div class="flex shrink-0 items-center gap-2.5 border-b border-border px-4">
				<Search size={15} class="shrink-0 text-foreground/40" />
				<Command.Input
					class="h-12 w-full bg-transparent text-sm outline-hidden placeholder:text-foreground/40"
					placeholder="Search cohorts, classes, modules, links, settings..."
					bind:value={searchQuery}
					bind:ref={searchInputRef}
				/>
				<Kbd class="hidden opacity-40 sm:inline-flex">esc</Kbd>
				<Button
					variant="ghost"
					tone="neutral"
					size="sm"
					class="-mr-2 shrink-0 sm:hidden"
					onclick={() => (isOpen = false)}
				>
					Cancel
				</Button>
			</div>

			<Command.List
				class="min-h-0 flex-1 scroll-py-3 overflow-y-auto overscroll-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3"
			>
				<Command.Viewport class="space-y-4">
					{#if searchQuery.trim()}
						<Command.Group value="top-result">
							<Command.GroupHeading class={POWER_HEADING_CLASS}>Top Result</Command.GroupHeading>
							<Command.GroupItems>
								{#if topResult}
									<Command.Item
										value="top:{topResult.id}"
										class="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-primary/25 bg-primary/8 px-4 py-3 text-left ring-1 ring-primary/15 outline-hidden transition-colors duration-100 data-selected:border-primary/40 data-selected:bg-primary/10"
										onSelect={() => executeCommand(topResult)}
									>
										<span
											class="flex h-7 w-7 items-center justify-center rounded-full bg-primary/12 text-primary-ink"
										>
											<Sparkles size={14} />
										</span>
										<span class="min-w-0 flex-1">
											<span class="block truncate text-[13px] font-semibold">{topResult.title}</span
											>
											<span class="block truncate text-[11px] text-foreground/50"
												>{topResult.description}</span
											>
										</span>
										<Badge size="xs" class="capitalize">{topResult.kind}</Badge>
									</Command.Item>
								{:else}
									<p class={POWER_NOTE_CLASS}>
										No direct matches yet. Try a cohort, quick link, or setting.
									</p>
								{/if}
							</Command.GroupItems>
						</Command.Group>
					{/if}

					<PowerBarCohortSearchSection
						{searchQuery}
						{activeCohortId}
						classes={cohortClassResults}
						modules={cohortModuleResults}
						isLoadingClasses={classSearchQuery.isLoading}
						isLoadingModules={moduleSearchQuery.isLoading}
						{hasSearchError}
						onOpenClass={goToClass}
						onOpenModule={goToModule}
					/>

					<PowerBarCohortSection
						isVisible={canSwitchCohorts}
						{cohorts}
						{activeCohortId}
						{searchQuery}
						isSwitching={isSwitchingCohort}
						onSwitch={onSwitchCohort}
					/>

					<PowerBarQuickLinksSection
						{quickLinks}
						{searchQuery}
						onNavigate={() => (isOpen = false)}
					/>

					<PowerBarSettingsSection
						{searchQuery}
						isDarkMode={theme.isDark}
						{autoNextEnabled}
						{optionsShuffleEnabled}
						onSetTheme={(mode) => theme.set(mode)}
						onSetAutoNext={setAutoNext}
						onSetShuffleAnswers={setShuffleAnswers}
					/>
				</Command.Viewport>
			</Command.List>
		</Command.Root>

		<div
			class="hidden shrink-0 items-center justify-between border-t border-border px-4 py-2 sm:flex"
		>
			<div class="flex items-center gap-2 text-[11px] text-foreground/40">
				<Keyboard size={12} />
				<span>{modifierKey} K</span>
				<span>·</span>
				<span>Arrow keys</span>
				<span>·</span>
				<span>Enter</span>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>

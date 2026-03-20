<script lang="ts">
	import { onMount } from 'svelte';
	import { useQuery } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api';
	import type { Id } from '../../../convex/_generated/dataModel';
	import { Search, Command, Sparkles } from 'lucide-svelte';
	import { isDark, theme } from '$lib/theme.svelte';
	import PowerBarCohortSearchSection from './PowerBarCohortSearchSection.svelte';
	import PowerBarCohortSection from './PowerBarCohortSection.svelte';
	import PowerBarQuickLinksSection from './PowerBarQuickLinksSection.svelte';
	import PowerBarSettingsSection from './PowerBarSettingsSection.svelte';
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
	let dialogRef: HTMLDialogElement | null = null;
	let searchInputRef: HTMLInputElement | null = null;
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
		window.location.assign(href);
	}

	function goToClass(classId: string) {
		goToLink(`/classes?classId=${classId}`);
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

	function getNavigableItems() {
		if (!dialogRef) return [];
		return Array.from(
			dialogRef.querySelectorAll<HTMLElement>('[data-power-item="true"]:not([disabled])')
		).filter((item) => item.offsetParent !== null);
	}

	function moveFocus(direction: 1 | -1) {
		const items = getNavigableItems();
		if (items.length === 0) return;

		const active = document.activeElement as HTMLElement | null;
		const activeIndex = items.findIndex((item) => item === active);
		const nextIndex =
			activeIndex === -1
				? direction === 1
					? 0
					: items.length - 1
				: (activeIndex + direction + items.length) % items.length;

		items[nextIndex]?.focus();
	}

	function handleDialogKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			isOpen = false;
			return;
		}

		if (event.key === 'Enter' && event.target === searchInputRef && topResult) {
			event.preventDefault();
			void executeCommand(topResult);
			return;
		}

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			moveFocus(1);
			return;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			moveFocus(-1);
		}
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

	onMount(() => {
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

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
	class="modal max-w-full p-4"
	class:modal-open={isOpen}
	onkeydown={handleDialogKeydown}
	bind:this={dialogRef}
>
	<div class="modal-box w-full max-w-2xl rounded-2xl border border-base-300 p-0 shadow-2xl">
		<div class="flex items-center gap-2.5 border-b border-base-300 px-4">
			<Search size={15} class="shrink-0 text-base-content/40" />
			<input
				type="text"
				class="h-12 w-full bg-transparent text-sm outline-none placeholder:text-base-content/40"
				placeholder="Search cohorts, classes, modules, links, settings..."
				bind:value={searchQuery}
				bind:this={searchInputRef}
			/>
			<kbd class="kbd kbd-xs opacity-40">esc</kbd>
		</div>

		<div class="max-h-[min(70vh,34rem)] space-y-4 overflow-y-auto p-3">
			{#if searchQuery.trim()}
				<section class="space-y-2">
					<div class="px-3 pt-1">
						<p class="text-[11px] font-medium uppercase tracking-wider text-base-content/35">
							Top Result
						</p>
					</div>
					{#if topResult}
						<button
							type="button"
							class="group flex w-full items-center gap-3 rounded-xl border border-primary/25 bg-primary/8 px-4 py-3 text-left ring-1 ring-primary/15 transition-colors duration-100 hover:border-primary/40 hover:bg-primary/10"
							onclick={() => executeCommand(topResult)}
							data-power-item="true"
						>
							<span
								class="flex h-7 w-7 items-center justify-center rounded-full bg-primary/12 text-primary"
							>
								<Sparkles size={14} />
							</span>
							<span class="min-w-0 flex-1">
								<span class="block truncate text-[13px] font-semibold">{topResult.title}</span>
								<span class="block truncate text-[11px] text-base-content/50"
									>{topResult.description}</span
								>
							</span>
							<span class="badge badge-ghost badge-xs rounded-full capitalize"
								>{topResult.kind}</span
							>
						</button>
					{:else}
						<p class="px-3 py-2 text-sm text-base-content/45">
							No direct matches yet. Try a cohort, quick link, or setting.
						</p>
					{/if}
				</section>
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

			<PowerBarQuickLinksSection {quickLinks} {searchQuery} onNavigate={() => (isOpen = false)} />

			<PowerBarSettingsSection
				{searchQuery}
				isDarkMode={$isDark}
				{autoNextEnabled}
				{optionsShuffleEnabled}
				onSetTheme={(mode) => theme.set(mode)}
				onSetAutoNext={setAutoNext}
				onSetShuffleAnswers={setShuffleAnswers}
			/>
		</div>

		<div class="flex items-center justify-between border-t border-base-300 px-4 py-2">
			<div class="flex items-center gap-2 text-[11px] text-base-content/40">
				<Command size={12} />
				<span>Cmd/Ctrl+K</span>
				<span>·</span>
				<span>Arrow keys</span>
				<span>·</span>
				<span>Tab</span>
				<span>·</span>
				<span>Enter</span>
			</div>
		</div>
	</div>

	<form method="dialog" class="modal-backdrop">
		<button onclick={() => (isOpen = false)}>close</button>
	</form>
</dialog>

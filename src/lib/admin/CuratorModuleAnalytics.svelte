<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { Id } from '../../convex/_generated/dataModel';
	import {
		Activity,
		BookOpen,
		CalendarDays,
		ChevronDown,
		ChevronLeft,
		ChevronRight,
		Clock3,
		Flag,
		Layers,
		Users
	} from 'lucide-svelte';

	let { cohortId }: { cohortId: Id<'cohort'> } = $props();

	const STORAGE_KEY = 'curator-analytics-selection';
	const questionPageSize = 8;

	function loadSavedSelection(): { semesterId: string; classId: string; moduleId: string } {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) return JSON.parse(saved);
		} catch {}
		return { semesterId: '', classId: '', moduleId: '' };
	}

	function saveSelection() {
		try {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					semesterId: selectedSemesterId,
					classId: selectedClassId,
					moduleId: selectedModuleId
				})
			);
		} catch {}
	}

	const saved = loadSavedSelection();
	let selectedSemesterId = $state(saved.semesterId);
	let selectedClassId = $state(saved.classId);
	let selectedModuleId = $state(saved.moduleId);
	let questionOffset = $state(0);

	let semesterOpen = $state(false);
	let classOpen = $state(false);
	let moduleOpen = $state(false);
	let classSearch = $state('');
	let moduleSearch = $state('');

	let showAllParticipants = $state(false);
	let showAllHotspots = $state(false);
	let showAllRecent = $state(false);

	const semesters = useQuery(api.progress.getSemestersForCohort, () => ({ cohortId }));

	const selectorOptions = useQuery(api.curatorAnalytics.getModuleSelectorOptions, () => ({
		cohortId,
		semesterId: selectedSemesterId ? (selectedSemesterId as Id<'semester'>) : undefined,
		classId: selectedClassId ? (selectedClassId as Id<'class'>) : undefined
	}));

	const moduleOverview = useQuery(api.curatorAnalytics.getModuleOverviewAnalytics, () => {
		if (!selectedModuleId) return 'skip';
		return {
			cohortId,
			moduleId: selectedModuleId as Id<'module'>,
			participantsLimit: 12,
			recentLimit: 20,
			flagLimit: 20
		};
	});

	const questionPage = useQuery(api.curatorAnalytics.getModuleQuestionAnalyticsPage, () => {
		if (!selectedModuleId) return 'skip';
		return {
			cohortId,
			moduleId: selectedModuleId as Id<'module'>,
			pageSize: questionPageSize,
			pageOffset: questionOffset
		};
	});

	let questionPageCache = $state<typeof questionPage.data | null>(null);

	$effect(() => {
		if (questionPage.data) {
			questionPageCache = questionPage.data;
		}
	});

	$effect(() => {
		if (!selectorOptions.data) return;

		const classIds = new Set(selectorOptions.data.classes.map((c) => c._id));
		if (selectedClassId && !classIds.has(selectedClassId as Id<'class'>)) {
			selectedClassId = '';
			selectedModuleId = '';
			questionOffset = 0;
			questionPageCache = null;
			saveSelection();
		}

		const moduleIds = new Set(selectorOptions.data.modules.map((m) => m._id));
		if (selectedModuleId && !moduleIds.has(selectedModuleId as Id<'module'>)) {
			selectedModuleId = '';
			questionOffset = 0;
			questionPageCache = null;
			saveSelection();
		}
	});

	const selectedSemesterName = $derived(
		(semesters.data ?? []).find((s) => s._id === selectedSemesterId)?.name ?? 'Semester'
	);

	const selectedClassName = $derived(
		(selectorOptions.data?.classes ?? []).find((c) => c._id === selectedClassId)?.name ?? 'Class'
	);

	const selectedModuleName = $derived(
		(selectorOptions.data?.modules ?? []).find((m) => m._id === selectedModuleId)?.title ??
			'Module'
	);

	const searchedClasses = $derived(
		(selectorOptions.data?.classes ?? []).filter(
			(c) =>
				c.name.toLowerCase().includes(classSearch.toLowerCase()) ||
				c.code.toLowerCase().includes(classSearch.toLowerCase())
		)
	);

	const searchedModules = $derived(
		(selectorOptions.data?.modules ?? []).filter((m) =>
			m.title.toLowerCase().includes(moduleSearch.toLowerCase())
		)
	);

	const questionData = $derived(questionPage.data ?? questionPageCache);

	const currentPage = $derived(Math.floor(questionOffset / questionPageSize) + 1);
	const totalPages = $derived(questionData ? Math.ceil(questionData.total / questionPageSize) : 0);

	const pageNumbers = $derived.by(() => {
		if (totalPages <= 1) return [];
		const pages: (number | 'ellipsis')[] = [];
		if (totalPages <= 7) {
			for (let i = 1; i <= totalPages; i++) pages.push(i);
		} else {
			pages.push(1);
			if (currentPage > 3) pages.push('ellipsis');
			const start = Math.max(2, currentPage - 1);
			const end = Math.min(totalPages - 1, currentPage + 1);
			for (let i = start; i <= end; i++) pages.push(i);
			if (currentPage < totalPages - 2) pages.push('ellipsis');
			pages.push(totalPages);
		}
		return pages;
	});

	const visibleParticipants = $derived(
		moduleOverview.data
			? showAllParticipants
				? moduleOverview.data.participants
				: moduleOverview.data.participants.slice(0, 5)
			: []
	);

	const visibleHotspots = $derived(
		moduleOverview.data
			? showAllHotspots
				? moduleOverview.data.mostFlaggedQuestions
				: moduleOverview.data.mostFlaggedQuestions.slice(0, 4)
			: []
	);

	const visibleRecent = $derived(
		moduleOverview.data
			? showAllRecent
				? moduleOverview.data.recentActivity
				: moduleOverview.data.recentActivity.slice(0, 5)
			: []
	);

	const maxParticipantInteractions = $derived(
		moduleOverview.data
			? Math.max(...moduleOverview.data.participants.map((p) => p.interactions), 1)
			: 1
	);

	function goToPage(page: number) {
		questionOffset = (page - 1) * questionPageSize;
	}

	function onSemesterSelect(value: string) {
		selectedSemesterId = value;
		selectedClassId = '';
		selectedModuleId = '';
		questionOffset = 0;
		questionPageCache = null;
		semesterOpen = false;
		saveSelection();
	}

	function onClassSelect(value: string) {
		selectedClassId = value;
		selectedModuleId = '';
		questionOffset = 0;
		questionPageCache = null;
		classOpen = false;
		saveSelection();
	}

	function onModuleSelect(value: string) {
		selectedModuleId = value;
		questionOffset = 0;
		questionPageCache = null;
		showAllParticipants = false;
		showAllHotspots = false;
		showAllRecent = false;
		moduleOpen = false;
		saveSelection();
	}

	function stripHtml(html: string): string {
		return html.replace(/<[^>]*>/g, '').trim();
	}

	function truncate(text: string, maxLength: number = 84): string {
		const cleanText = stripHtml(text);
		return cleanText.length > maxLength ? `${cleanText.slice(0, maxLength)}...` : cleanText;
	}

	function formatRelativeTime(timestamp: number | null | undefined): string {
		if (!timestamp) return 'Never';
		const diff = Date.now() - timestamp;
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);
		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days < 30) return `${days}d ago`;
		return new Date(timestamp).toLocaleDateString();
	}

	function formatDateTime(timestamp: number | null | undefined): string {
		if (!timestamp) return 'Never';
		return new Date(timestamp).toLocaleString();
	}

	function initials(name: string): string {
		return name
			.split(' ')
			.map((part) => part[0] || '')
			.join('')
			.slice(0, 2)
			.toUpperCase();
	}

	function formatQuestionType(type: string): string {
		return type.replace(/_/g, ' ');
	}
</script>

<div class="space-y-4">
	<!-- Module Selector -->
	<div class="p-3 bg-base-100 rounded-2xl border border-base-300">
		<div class="flex flex-wrap items-center gap-2">
			<div class="relative">
				<button
					type="button"
					class="btn btn-sm btn-ghost rounded-full gap-2"
					onclick={() => {
						semesterOpen = !semesterOpen;
						classOpen = false;
						moduleOpen = false;
					}}
				>
					<CalendarDays size={14} class="text-base-content/60" />
					<span class="text-sm">{selectedSemesterName}</span>
					<ChevronDown size={12} />
				</button>
				{#if semesterOpen}
					<div class="fixed inset-0 z-10" onclick={() => (semesterOpen = false)} role="none"></div>
					<div
						class="absolute top-full left-0 mt-1 z-20 w-56 bg-base-100 rounded-2xl shadow-lg border border-base-300 p-1"
					>
						<ul class="max-h-60 overflow-y-auto">
							<li>
								<button
									type="button"
									class="w-full text-left text-sm px-3 py-1.5 rounded hover:bg-base-200"
									class:bg-primary={!selectedSemesterId}
									class:text-primary-content={!selectedSemesterId}
									onclick={() => onSemesterSelect('')}
								>
									All semesters
								</button>
							</li>
							{#each semesters.data ?? [] as semester}
								<li>
									<button
										type="button"
										class="w-full text-left text-sm px-3 py-1.5 rounded hover:bg-base-200"
										class:bg-primary={selectedSemesterId === semester._id}
										class:text-primary-content={selectedSemesterId === semester._id}
										onclick={() => onSemesterSelect(semester._id)}
									>
										{semester.name}
									</button>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>

			<span class="text-base-content/30">/</span>

			<div class="relative">
				<button
					type="button"
					class="btn btn-sm btn-ghost rounded-full gap-2"
					class:btn-disabled={!selectorOptions.data || selectorOptions.data.classes.length === 0}
					onclick={() => {
						if (!selectorOptions.data || selectorOptions.data.classes.length === 0) return;
						classOpen = !classOpen;
						moduleOpen = false;
						semesterOpen = false;
						classSearch = '';
					}}
				>
					<BookOpen size={14} class="text-base-content/60" />
					<span class="text-sm truncate max-w-[180px]">{selectedClassName}</span>
					<ChevronDown size={12} />
				</button>
				{#if classOpen}
					<div class="fixed inset-0 z-10" onclick={() => (classOpen = false)} role="none"></div>
					<div
						class="absolute top-full left-0 mt-1 z-20 w-72 bg-base-100 rounded-2xl shadow-lg border border-base-300 p-2"
					>
						<input
							type="text"
							placeholder="Search classes..."
							class="input input-sm input-bordered rounded-full w-full mb-1"
							bind:value={classSearch}
						/>
						<ul class="max-h-56 overflow-y-auto">
							{#each searchedClasses as classItem}
								<li>
									<button
										type="button"
										class="w-full text-left text-sm px-3 py-1.5 rounded hover:bg-base-200 flex items-center gap-2"
										class:bg-primary={selectedClassId === classItem._id}
										class:text-primary-content={selectedClassId === classItem._id}
										onclick={() => onClassSelect(classItem._id)}
									>
										<span class="truncate">{classItem.name}</span>
										<span class="badge badge-ghost badge-xs">{classItem.code}</span>
									</button>
								</li>
							{/each}
							{#if searchedClasses.length === 0}
								<li class="text-xs text-base-content/50 px-3 py-2">No matches</li>
							{/if}
						</ul>
					</div>
				{/if}
			</div>

			<span class="text-base-content/30">/</span>

			<div class="relative">
				<button
					type="button"
					class="btn btn-sm btn-ghost rounded-full gap-2"
					class:btn-disabled={!selectedClassId ||
						!selectorOptions.data ||
						selectorOptions.data.modules.length === 0}
					onclick={() => {
						if (
							!selectedClassId ||
							!selectorOptions.data ||
							selectorOptions.data.modules.length === 0
						) {
							return;
						}
						moduleOpen = !moduleOpen;
						classOpen = false;
						semesterOpen = false;
						moduleSearch = '';
					}}
				>
					<Layers size={14} class="text-base-content/60" />
					<span class="text-sm truncate max-w-[180px]">{selectedModuleName}</span>
					<ChevronDown size={12} />
				</button>
				{#if moduleOpen}
					<div class="fixed inset-0 z-10" onclick={() => (moduleOpen = false)} role="none"></div>
					<div
						class="absolute top-full left-0 mt-1 z-20 w-72 bg-base-100 rounded-2xl shadow-lg border border-base-300 p-2"
					>
						<input
							type="text"
							placeholder="Search modules..."
							class="input input-sm input-bordered rounded-full w-full mb-1"
							bind:value={moduleSearch}
						/>
						<ul class="max-h-56 overflow-y-auto">
							{#each searchedModules as module}
								<li>
									<button
										type="button"
										class="w-full text-left text-sm px-3 py-1.5 rounded hover:bg-base-200"
										class:bg-primary={selectedModuleId === module._id}
										class:text-primary-content={selectedModuleId === module._id}
										onclick={() => onModuleSelect(module._id)}
									>
										{module.emoji ? `${module.emoji} ` : ''}{module.title}
									</button>
								</li>
							{/each}
							{#if searchedModules.length === 0}
								<li class="text-xs text-base-content/50 px-3 py-2">No matches</li>
							{/if}
						</ul>
					</div>
				{/if}
			</div>

			<div class="flex-1"></div>

			{#if selectorOptions.isLoading}
				<div class="badge badge-ghost badge-sm gap-1">
					<span class="loading loading-spinner loading-xs"></span>
					Syncing
				</div>
			{:else if selectedModuleId && moduleOverview.data}
				<div class="badge badge-success badge-sm gap-1">
					<span class="w-1.5 h-1.5 rounded-full bg-success-content"></span>
					{moduleOverview.data.module.questionCount} questions
				</div>
			{:else}
				<div class="badge badge-ghost badge-sm">Pick module</div>
			{/if}
		</div>
	</div>

	{#if selectorOptions.error}
		<div class="alert alert-error">
			Failed to load class/module options: {selectorOptions.error.message}
		</div>
	{/if}

	<!-- Content -->
	{#if !selectedModuleId}
		<div class="bg-base-100 rounded-2xl border border-base-300 p-8 text-center text-base-content/50">
			<BookOpen size={28} class="mx-auto mb-2 opacity-40" />
			<p class="text-sm">Select a class and module to view analytics.</p>
		</div>
	{:else if moduleOverview.isLoading && !moduleOverview.data}
		<div class="bg-base-100 rounded-2xl border border-base-300 p-10 flex justify-center">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if moduleOverview.error}
		<div class="alert alert-error">
			Failed to load module analytics: {moduleOverview.error.message}
		</div>
	{:else if moduleOverview.data}
		<!-- Module Header + Inline Stats -->
		<div class="bg-base-100 rounded-2xl border border-base-300">
			<div class="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-base-300">
				<div class="min-w-0">
					<h3 class="font-semibold text-sm">
						{moduleOverview.data.module.emoji
							? `${moduleOverview.data.module.emoji} `
							: ''}{moduleOverview.data.module.title}
					</h3>
					<p class="text-xs text-base-content/50">
						{moduleOverview.data.module.className} &middot; {moduleOverview.data.module.semesterName}
					</p>
				</div>
				<div class="flex flex-wrap items-center gap-3 text-xs">
					<span class="flex items-center gap-1 text-base-content/70">
						<Users size={12} />
						{moduleOverview.data.totals.participants}/{moduleOverview.data.totals.studentsInCohort}
						<span class="text-base-content/50">({moduleOverview.data.totals.participationRate}%)</span>
					</span>
					<span class="flex items-center gap-1 text-base-content/70">
						<Activity size={12} />
						{moduleOverview.data.totals.totalInteractions} touches
					</span>
					<span class="flex items-center gap-1 text-warning">
						<Flag size={12} />
						{moduleOverview.data.totals.totalFlags} flags
					</span>
					<span class="flex items-center gap-1 text-base-content/50">
						<Clock3 size={12} />
						{moduleOverview.data.totals.questionsWithNoInteractions} untouched
					</span>
				</div>
			</div>

			<!-- Questions Table -->
			<div class="relative">
				{#if questionPage.isLoading}
					<div class="absolute top-2 right-2 z-10 badge badge-ghost badge-xs gap-1">
						<span class="loading loading-spinner loading-xs"></span>
					</div>
				{/if}

				{#if !questionData}
					<div class="p-4 space-y-2">
						{#each Array(6) as _}
							<div class="skeleton h-8 w-full"></div>
						{/each}
					</div>
				{:else}
					<div class="overflow-x-auto">
						<table class="table table-sm">
							<thead>
								<tr>
									<th class="w-[46%]">Question</th>
									<th>Type</th>
									<th>Tried</th>
									<th>Flagged</th>
									<th>Last</th>
								</tr>
							</thead>
							<tbody>
								{#each questionData.items as question (question.questionId)}
									<tr>
										<td>
											<div class="text-xs font-medium">Q{question.order + 1}</div>
											<div
												class="text-xs text-base-content/50 truncate max-w-xs"
												title={stripHtml(question.stem)}
											>
												{truncate(question.stem, 100)}
											</div>
										</td>
										<td class="capitalize text-xs text-base-content/70">{formatQuestionType(question.type)}</td>
										<td class="text-xs">{question.interactionCount} <span class="text-base-content/40">({question.interactionRate}%)</span></td>
										<td class="text-xs">{question.flaggedCount} <span class="text-base-content/40">({question.flagRate}%)</span></td>
										<td class="text-xs text-base-content/60" title={formatDateTime(question.lastInteractionAt)}>
											{formatRelativeTime(question.lastInteractionAt)}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>

			<!-- Pagination -->
			{#if totalPages > 1}
				<div class="px-4 py-2 border-t border-base-300 flex items-center justify-between">
					<span class="text-xs text-base-content/50">
						Page {currentPage} of {totalPages}
					</span>
					<div class="flex items-center gap-1">
						<button
							class="btn btn-xs btn-ghost rounded-full"
							disabled={currentPage === 1}
							onclick={() => goToPage(currentPage - 1)}
						>
							<ChevronLeft size={12} />
						</button>
						{#each pageNumbers as page}
							{#if page === 'ellipsis'}
								<button class="btn btn-xs btn-ghost rounded-full btn-disabled">...</button>
							{:else}
								<button
									class="btn btn-xs btn-ghost rounded-full"
									class:btn-active={page === currentPage}
									onclick={() => goToPage(page)}
								>
									{page}
								</button>
							{/if}
						{/each}
						<button
							class="btn btn-xs btn-ghost rounded-full"
							disabled={currentPage === totalPages}
							onclick={() => goToPage(currentPage + 1)}
						>
							<ChevronRight size={12} />
						</button>
					</div>
				</div>
			{/if}
		</div>

		<!-- Insights Grid -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<!-- Participants -->
			<div class="bg-base-100 rounded-2xl border border-base-300 flex flex-col max-h-[26rem]">
				<div class="px-4 py-3 border-b border-base-300 shrink-0">
					<div class="flex items-center justify-between">
						<h4 class="text-sm font-semibold flex items-center gap-2">
							<Users size={14} class="text-primary" />
							Participants
						</h4>
						<span class="text-xs text-base-content/50">
							{moduleOverview.data.totals.participants} of {moduleOverview.data.totals.studentsInCohort}
						</span>
					</div>
				</div>
				<div class="p-4 flex-1 overflow-y-auto">
					{#if moduleOverview.data.participants.length === 0}
						<div class="flex flex-col items-center justify-center py-8 text-base-content/40">
							<Users size={24} class="mb-2" />
							<p class="text-xs">No activity yet</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each visibleParticipants as participant}
								<div class="flex items-center gap-3">
									<div class="avatar shrink-0">
										<div class="w-8 h-8 rounded-full">
											{#if participant.imageUrl}
												<img src={participant.imageUrl} alt={participant.name} />
											{:else}
												<div class="bg-neutral text-neutral-content w-full h-full flex items-center justify-center text-[10px] font-medium">
													{initials(participant.name)}
												</div>
											{/if}
										</div>
									</div>
									<div class="flex-1 min-w-0">
										<div class="flex items-center justify-between gap-2">
											<span class="text-xs font-medium truncate">{participant.name}</span>
											<span class="text-[10px] text-base-content/40 shrink-0">{formatRelativeTime(participant.lastAttemptAt)}</span>
										</div>
										<div class="flex items-center gap-2 mt-1">
											<div class="flex-1 bg-base-200 rounded-full h-1.5 overflow-hidden">
												<div
													class="h-full rounded-full bg-primary/70"
													style="width: {Math.round((participant.interactions / maxParticipantInteractions) * 100)}%"
												></div>
											</div>
											<span class="text-[10px] text-base-content/50 tabular-nums shrink-0">{participant.interactions}</span>
											{#if participant.flagged > 0}
												<span class="text-[10px] text-warning tabular-nums shrink-0">{participant.flagged} flagged</span>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
						{#if moduleOverview.data.participants.length > 5}
							<button
								class="btn btn-ghost btn-xs w-full mt-3"
								onclick={() => (showAllParticipants = !showAllParticipants)}
							>
								{showAllParticipants ? 'Show less' : `+${moduleOverview.data.participants.length - 5} more`}
							</button>
						{/if}
					{/if}
				</div>
			</div>

			<!-- Flagged Hotspots -->
			<div class="bg-base-100 rounded-2xl border border-base-300 flex flex-col max-h-[26rem]">
				<div class="px-4 py-3 border-b border-base-300 shrink-0">
					<div class="flex items-center justify-between">
						<h4 class="text-sm font-semibold flex items-center gap-2">
							<Flag size={14} class="text-warning" />
							Flagged Hotspots
						</h4>
						{#if moduleOverview.data.totals.totalFlags > 0}
							<span class="badge badge-warning badge-xs">{moduleOverview.data.totals.totalFlags}</span>
						{/if}
					</div>
				</div>
				<div class="p-4 flex-1 overflow-y-auto">
					{#if visibleHotspots.length === 0}
						<div class="flex flex-col items-center justify-center py-8 text-base-content/40">
							<Flag size={24} class="mb-2" />
							<p class="text-xs">No flags reported</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each visibleHotspots as question}
								<div class="rounded-2xl bg-warning/5 border border-warning/15 p-3">
									<div class="flex items-start justify-between gap-2">
										<p class="text-xs font-medium leading-snug line-clamp-2" title={stripHtml(question.stem)}>
											<span class="text-warning font-semibold">Q{question.order + 1}</span>
											{truncate(question.stem, 60)}
										</p>
										<span class="badge badge-warning badge-xs shrink-0 mt-0.5">{question.flaggedCount}</span>
									</div>
									<div class="flex items-center gap-3 mt-2">
										<div class="flex-1 bg-base-200 rounded-full h-1.5 overflow-hidden">
											<div class="h-full rounded-full bg-warning/70" style="width: {question.flagRate}%"></div>
										</div>
										<span class="text-[10px] text-base-content/50 shrink-0">{question.flagRate}% flagged</span>
									</div>
								</div>
							{/each}
						</div>
						{#if moduleOverview.data.mostFlaggedQuestions.length > 4}
							<button
								class="btn btn-ghost btn-xs w-full mt-3"
								onclick={() => (showAllHotspots = !showAllHotspots)}
							>
								{showAllHotspots ? 'Show less' : `+${moduleOverview.data.mostFlaggedQuestions.length - 4} more`}
							</button>
						{/if}
					{/if}
				</div>
			</div>

			<!-- Recent Activity -->
			<div class="bg-base-100 rounded-2xl border border-base-300 flex flex-col max-h-[26rem]">
				<div class="px-4 py-3 border-b border-base-300 shrink-0">
					<h4 class="text-sm font-semibold flex items-center gap-2">
						<Activity size={14} class="text-info" />
						Recent Activity
					</h4>
				</div>
				<div class="p-4 flex-1 overflow-y-auto">
					{#if visibleRecent.length === 0}
						<div class="flex flex-col items-center justify-center py-8 text-base-content/40">
							<Activity size={24} class="mb-2" />
							<p class="text-xs">No activity yet</p>
						</div>
					{:else}
						<div class="space-y-0">
							{#each visibleRecent as activity, i}
								<div class="flex gap-3 {i > 0 ? 'pt-3' : ''}">
									<div class="flex flex-col items-center">
										<div class="avatar shrink-0">
											<div class="w-8 h-8 rounded-full">
												{#if activity.userImageUrl}
													<img src={activity.userImageUrl} alt={activity.userName} />
												{:else}
													<div class="bg-neutral text-neutral-content w-full h-full flex items-center justify-center text-[10px] font-medium">
														{initials(activity.userName)}
													</div>
												{/if}
											</div>
										</div>
										{#if i < visibleRecent.length - 1}
											<div class="w-px flex-1 bg-base-300 mt-1.5"></div>
										{/if}
									</div>
									<div class="pb-3 min-w-0 flex-1">
										<div class="flex items-center justify-between gap-2">
											<span class="text-xs font-medium truncate">{activity.userName}</span>
											<span class="text-[10px] text-base-content/40 shrink-0" title={formatDateTime(activity.timestamp)}>
												{formatRelativeTime(activity.timestamp)}
											</span>
										</div>
										<p class="text-xs text-base-content/60 mt-1 leading-relaxed" title={stripHtml(activity.questionStem)}>
											Attempted <span class="font-medium text-base-content/70">Q{activity.questionOrder + 1}</span>: {truncate(activity.questionStem, 45)}
										</p>
									</div>
								</div>
							{/each}
						</div>
						{#if moduleOverview.data.recentActivity.length > 5}
							<button
								class="btn btn-ghost btn-xs w-full mt-2"
								onclick={() => (showAllRecent = !showAllRecent)}
							>
								{showAllRecent ? 'Show less' : `+${moduleOverview.data.recentActivity.length - 5} more`}
							</button>
						{/if}
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

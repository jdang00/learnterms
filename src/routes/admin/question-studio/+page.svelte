<script lang="ts">
	import { ArrowLeft, ChevronDown, BookOpen, Layers, FolderOpen } from 'lucide-svelte';
	import QuestionsGeneration from '$lib/admin/QuestionGeneration.svelte';
	import DocumentBrowser from '$lib/admin/DocumentBrowser.svelte';
	import type { PageData } from './$types';
	import type { Id, Doc } from '../../../convex/_generated/dataModel';
	import { api } from '../../../convex/_generated/api';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import type { ClassWithSemester } from '$lib/types';
	import { pickDefaultSemesterName, setLastSemesterName } from '$lib/utils/semester';
	import { useClerkContext } from 'svelte-clerk';

	let { data }: { data: PageData } = $props();
	const client = useConvexClient();
	let selectedText: string = $state('');
	let charCount: number = $derived(selectedText.length);
	let wordCount: number = $derived(
		selectedText.trim() ? selectedText.trim().split(/\s+/).length : 0
	);
	let selectedClass: ClassWithSemester | null = $state(null);
	let selectedModuleId: Id<'module'> | null = $state(null);
	let selectedModuleTitle: string = $state('');

	const clerk = useClerkContext();
	const clerkUser = $derived(clerk.user);

	const convexUser = useQuery(
		api.users.getUserById,
		() => clerkUser ? { id: clerkUser.id } : 'skip'
	);

	const semesters = useQuery(
		api.semester.getAllSemesters,
		() => clerkUser ? {} : 'skip'
	);

	const classes = useQuery(
		api.class.getUserClasses,
		() => convexUser.data?.cohortId ? { id: convexUser.data.cohortId as Id<'cohort'> } : 'skip'
	);

	const modules = useQuery(
		api.module.getClassModules,
		() => selectedClass ? { id: selectedClass._id } : 'skip'
	);
	let currentSemester = $state('');
	let classSearch = $state('');
	let moduleSearch = $state('');
	let classOpen = $state(false);
	let moduleOpen = $state(false);

	type GeneratedQuestionInput = {
		type: string;
		stem: string;
		options: { text: string }[];
		correctAnswers: string[];
		explanation: string;
		aiGenerated: boolean;
		status: string;
		order: number;
		metadata: {};
		updatedAt: number;
	};

	let generatedQuestions = $state<GeneratedQuestionInput[]>([]);
	let isSaving = $state(false);

	async function saveGenerated() {
		if (!selectedModuleId || generatedQuestions.length === 0) return;
		isSaving = true;
		try {
			const reordered = generatedQuestions.map((q, idx) => ({ ...q, order: idx }));
			await client.mutation(api.question.bulkInsertQuestions, {
				moduleId: selectedModuleId,
				questions: reordered
			});
			generatedQuestions = [];
		} finally {
			isSaving = false;
		}
	}

	$effect(() => {
		if (semesters.data && !currentSemester) {
			currentSemester = pickDefaultSemesterName(semesters.data);
		}
	});

	$effect(() => {
		if (currentSemester) setLastSemesterName(currentSemester);
	});

	$effect(() => {
		if (currentSemester !== (selectedClass as ClassWithSemester)?.semester?.name) {
			selectedClass = null;
			selectedModuleId = null;
			selectedModuleTitle = '';
		}
	});

	const filteredClasses = $derived(
		!classes.data || !currentSemester
			? classes.data
			: classes.data.filter((c) => (c as ClassWithSemester).semester?.name === currentSemester)
	);

	const searchedClasses = $derived(
		!filteredClasses
			? []
			: filteredClasses.filter((c) =>
				c.name.toLowerCase().includes(classSearch.toLowerCase()) ||
				(c.code?.toLowerCase().includes(classSearch.toLowerCase()) ?? false)
			)
	);

	const searchedModules = $derived(
		!modules.data
			? []
			: modules.data.filter((m) =>
				m.title.toLowerCase().includes(moduleSearch.toLowerCase())
			)
	);

	const isReady = $derived(selectedClass && selectedModuleId);
</script>

<div class="min-h-screen bg-base-200/30">
	<div class="max-w-[1800px] mx-auto p-4 sm:p-6">
		<div class="flex items-center gap-4 mb-6">
			<a class="btn btn-ghost btn-sm rounded-full gap-2" href="/admin">
				<ArrowLeft size={16} />
				<span class="hidden sm:inline">Back</span>
			</a>
			<div class="h-6 w-px bg-base-300"></div>
			<div>
				<h1 class="text-xl font-semibold">Question Studio</h1>
				<p class="text-xs text-base-content/60 hidden sm:block">Generate questions from your content</p>
			</div>
		</div>

		<div class="flex flex-wrap items-center gap-2 mb-6 p-3 bg-base-100 rounded-2xl border border-base-300">
			<div class="dropdown">
				<div tabindex="0" role="button" class="btn btn-sm btn-ghost rounded-full gap-2">
					<FolderOpen size={14} class="text-base-content/60" />
					<span class="text-sm">{currentSemester || 'Semester'}</span>
					<ChevronDown size={12} />
				</div>
				{#if semesters.data}
					<ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-2xl z-10 w-56 p-1 shadow-lg border border-base-300">
						{#each semesters.data as semester (semester._id)}
							<li>
								<button
									class="text-sm"
									class:active={currentSemester === semester.name}
									onclick={() => {
										currentSemester = semester.name;
										selectedClass = null;
										selectedModuleId = null;
										selectedModuleTitle = '';
									}}
								>
									{semester.name}
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<span class="text-base-content/30">/</span>

			<div class="relative">
				<button
					type="button"
					class="btn btn-sm btn-ghost rounded-full gap-2"
					class:btn-disabled={!currentSemester}
					onclick={() => { classOpen = !classOpen; classSearch = ''; }}
				>
					<BookOpen size={14} class="text-base-content/60" />
					<span class="text-sm truncate max-w-[140px]">{selectedClass?.name || 'Class'}</span>
					<ChevronDown size={12} />
				</button>
				{#if classOpen && filteredClasses && filteredClasses.length > 0}
					<div class="fixed inset-0 z-10" onclick={() => { classOpen = false; }} role="none"></div>
					<div class="absolute top-full left-0 mt-1 z-20 w-64 bg-base-100 rounded-2xl shadow-lg border border-base-300 p-2">
						<input
							type="text"
							placeholder="Search classes..."
							class="input input-sm input-bordered rounded-full w-full mb-1"
							bind:value={classSearch}
						/>
						<ul class="max-h-52 overflow-y-auto">
							{#each searchedClasses as c (c._id)}
								<li>
									<button
										type="button"
										class="w-full text-left text-sm px-3 py-1.5 rounded hover:bg-base-200 flex items-center gap-2"
										class:bg-primary={selectedClass?._id === c._id}
										class:text-primary-content={selectedClass?._id === c._id}
										onclick={() => {
											selectedClass = c as ClassWithSemester;
											selectedModuleId = null;
											selectedModuleTitle = '';
											classOpen = false;
										}}
									>
										<span class="truncate">{c.name}</span>
										{#if c.code}
											<span class="badge badge-ghost badge-xs">{c.code}</span>
										{/if}
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
					class:btn-disabled={!selectedClass}
					onclick={() => { moduleOpen = !moduleOpen; moduleSearch = ''; }}
				>
					<Layers size={14} class="text-base-content/60" />
					<span class="text-sm truncate max-w-[140px]">{selectedModuleTitle || 'Module'}</span>
					<ChevronDown size={12} />
				</button>
				{#if moduleOpen && modules.data && modules.data.length > 0}
					<div class="fixed inset-0 z-10" onclick={() => { moduleOpen = false; }} role="none"></div>
					<div class="absolute top-full left-0 mt-1 z-20 w-64 bg-base-100 rounded-2xl shadow-lg border border-base-300 p-2">
						<input
							type="text"
							placeholder="Search modules..."
							class="input input-sm input-bordered rounded-full w-full mb-1"
							bind:value={moduleSearch}
						/>
						<ul class="max-h-52 overflow-y-auto">
							{#each searchedModules as m (m._id)}
								<li>
									<button
										type="button"
										class="w-full text-left text-sm px-3 py-1.5 rounded hover:bg-base-200 truncate"
										class:bg-primary={selectedModuleId === m._id}
										class:text-primary-content={selectedModuleId === m._id}
										onclick={() => {
											selectedModuleId = m._id;
											selectedModuleTitle = m.title;
											moduleOpen = false;
										}}
									>
										{m.title}
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

			{#if isReady}
				<div class="badge badge-success badge-sm gap-1">
					<span class="w-1.5 h-1.5 rounded-full bg-success-content"></span>
					Ready
				</div>
			{:else}
				<div class="badge badge-ghost badge-sm">Select destination</div>
			{/if}
		</div>

		<div class="grid grid-cols-1 xl:grid-cols-12 gap-4">
			<div class="xl:col-span-4 2xl:col-span-3">
				<div class="bg-base-100 rounded-2xl border border-base-300 h-[calc(100vh-220px)] overflow-hidden">
					{#if convexUser.isLoading}
						<div class="p-4 space-y-2">
							{#each Array(5) as _}
								<div class="skeleton h-12 w-full"></div>
							{/each}
						</div>
					{:else if convexUser.error}
						<div class="p-4">
							<div class="alert alert-error alert-sm">Error loading user</div>
						</div>
					{:else if convexUser.data && !convexUser.data.cohortId}
						<div class="p-4">
							<div class="alert alert-warning alert-sm">No cohort assigned</div>
						</div>
					{:else if convexUser.data}
						<DocumentBrowser
							cohortId={convexUser.data.cohortId as Id<'cohort'>}
							bind:selectedText
						/>
					{/if}
				</div>
			</div>

			<div class="xl:col-span-8 2xl:col-span-9">
				<div class="bg-base-100 rounded-2xl border border-base-300 h-[calc(100vh-220px)] overflow-hidden">
					<QuestionsGeneration
						material={selectedText}
						{wordCount}
						{charCount}
						canGenerate={Boolean(selectedClass && selectedModuleId)}
						destinationSummary={selectedClass && selectedModuleId
							? `${selectedClass.name} → ${selectedModuleTitle}`
							: ''}
						onAddSelected={async ({ questions }: { questions: GeneratedQuestionInput[] }) => {
							generatedQuestions = questions;
							await saveGenerated();
						}}
					/>
				</div>
			</div>
		</div>
	</div>
</div>

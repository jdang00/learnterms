<script lang="ts">
	import { ArrowLeft, CalendarDays, ChevronDown } from 'lucide-svelte';
	import QuestionsGeneration from '$lib/admin/QuestionGeneration.svelte';
	import DocumentBrowser from '$lib/admin/DocumentBrowser.svelte';
	import type { PageData } from './$types';
	import type { Id, Doc } from '../../../convex/_generated/dataModel';
	import { api } from '../../../convex/_generated/api';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { Check } from 'lucide-svelte';
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
	let modules = $state<{ isLoading: boolean; error: any; data?: Doc<'module'>[] }>({
		isLoading: false,
		error: null,
		data: []
	});

	// Clerk + Convex user
	const clerk = useClerkContext();
	const clerkUser = $derived(clerk.user);
	let convexUser = $state<{ isLoading: boolean; error: any; data?: Doc<'users'> | null }>({
		isLoading: true,
		error: null,
		data: undefined
	});
	$effect(() => {
		if (clerkUser) {
			const q = useQuery(api.users.getUserById, { id: clerkUser.id });
			convexUser = q;
		} else {
			convexUser = { isLoading: true, error: null, data: undefined };
		}
	});

	// Semester selection
	const semesters = useQuery(api.semester.getAllSemesters, {});
	let currentSemester = $state('');

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

	function removeGenerated(index: number) {
		generatedQuestions = generatedQuestions.filter((_, i) => i !== index);
	}

	function optionLetter(i: number) {
		return String.fromCharCode('A'.charCodeAt(0) + i);
	}

	let userContentLib = $state<{ isLoading: boolean; error: any; data?: Doc<'contentLib'>[] }>({
		isLoading: false,
		error: null,
		data: []
	});
	$effect(() => {
		const cohortId = convexUser.data?.cohortId as Id<'cohort'> | undefined;
		if (cohortId) {
			const q = useQuery(api.contentLib.getContentLibByCohort, { cohortId });
			userContentLib = q;
		} else {
			userContentLib = { isLoading: true, error: null, data: [] };
		}
	});

	let classes = $state<{ isLoading: boolean; error: any; data?: Doc<'class'>[] }>({
		isLoading: false,
		error: null,
		data: []
	});

	$effect(() => {
		const cohortId = convexUser.data?.cohortId as Id<'cohort'> | undefined;
		if (cohortId) {
			const q = useQuery(api.class.getUserClasses, {
				id: cohortId
			});
			classes = q;
		} else {
			classes = { isLoading: false, error: null, data: [] };
		}
	});

	$effect(() => {
		if (selectedClass) {
			const q = useQuery(api.module.getClassModules, { id: selectedClass._id });
			modules = q;
		} else {
			modules = { isLoading: false, error: null, data: [] };
		}
	});

	// Semester initialization and persistence
	$effect(() => {
		if (semesters.data && !currentSemester) {
			currentSemester = pickDefaultSemesterName(semesters.data);
		}
	});

	$effect(() => {
		if (currentSemester) setLastSemesterName(currentSemester);
	});

	// Clear class and module selection when semester changes
	$effect(() => {
		if (currentSemester !== (selectedClass as ClassWithSemester)?.semester?.name) {
			selectedClass = null;
			selectedModuleId = null;
			selectedModuleTitle = '';
		}
	});

	// Filter classes by selected semester
	const filteredClasses = $derived(
		!classes.data || !currentSemester
			? classes.data
			: classes.data.filter((c) => (c as ClassWithSemester).semester?.name === currentSemester)
	);
</script>

<div class="min-h-screen p-4 sm:p-6 lg:p-10 max-w-full mx-auto flex flex-col w-full">
	<a class="btn mb-4 btn-ghost self-start" href="/admin"><ArrowLeft size={16} />Back</a>
	<h1 class="text-3xl font-bold text-base-content">Question Studio</h1>
	<p class="text-base text-base-content/70">Create or generate questions with your documents.</p>

	<!-- Compact Selection Bar -->
	<div class="mt-4">
		<div class="card bg-base-100 border border-base-300 rounded-lg">
			<div class="p-4">
				<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 items-end">
					<!-- Semester Selection -->
					<div class="form-control">
						<div class="label">
							<span class="label-text font-medium text-sm">Semester</span>
						</div>
						{#if semesters.data}
							<div class="flex items-center gap-2">
								<button
									class="btn btn-outline btn-xs flex-1 justify-between"
									popovertarget="semester-popover"
									style="anchor-name: --semester-anchor"
									disabled={semesters.isLoading}
								>
									<div class="flex items-center gap-2">
										<CalendarDays size={14} />
										<span class="text-sm truncate">{currentSemester || 'Select semester'}</span>
									</div>
									<ChevronDown size={12} />
								</button>

								<ul
									class="dropdown menu w-48 rounded-lg bg-base-100 shadow-lg border border-base-300"
									popover
									id="semester-popover"
									style="position-anchor: --semester-anchor"
								>
									{#each semesters.data as semester (semester._id)}
										<li>
											<button
												onclick={() => {
													currentSemester = semester.name;
													selectedClass = null;
													selectedModuleId = null;
													selectedModuleTitle = '';
												}}
												class="flex items-center gap-2 hover:bg-base-200 transition-colors duration-150 text-sm"
											>
												<CalendarDays size={14} />
												<span>{semester.name}</span>
											</button>
										</li>
									{/each}
								</ul>
							</div>
						{:else}
							<div class="text-xs text-base-content/60">Loading...</div>
						{/if}
					</div>

					<!-- Class Selection -->
					<div class="form-control">
						<div class="label"><span class="label-text text-sm">Class</span></div>
						<select
							id="select-class"
							class="select select-bordered select-sm w-full"
							aria-label="Class"
							disabled={classes.isLoading || !currentSemester}
							onchange={(e) => {
								const id = (e.target as HTMLSelectElement).value as Id<'class'>;
								const cls = (filteredClasses || []).find((c) => c._id === id) as ClassWithSemester | undefined;
								selectedClass = cls ?? null;
								selectedModuleId = null;
								selectedModuleTitle = '';
							}}
						>
							<option disabled selected={selectedClass == null} value="">Select a class</option>
							{#each filteredClasses || [] as c (c._id)}
								<option value={c._id} selected={selectedClass?._id === c._id}>
									{c.name}{c.code ? ` (${c.code})` : ''}
								</option>
							{/each}
						</select>
					</div>

					<!-- Module Selection -->
					<div class="form-control">
						<div class="label"><span class="label-text text-sm">Module</span></div>
						<select
							id="select-module"
							class="select select-bordered select-sm w-full"
							aria-label="Module"
							disabled={!selectedClass || modules.isLoading || !modules.data || modules.data.length === 0}
							onchange={(e) => {
								const id = (e.target as HTMLSelectElement).value as Id<'module'>;
								const m = (modules.data || []).find((mm) => mm._id === id);
								selectedModuleId = m?._id ?? null;
								selectedModuleTitle = m?.title ?? '';
							}}
						>
							<option disabled selected={selectedModuleId == null} value="">Select a module</option>
							{#if modules.isLoading}
								<option value="">Loading modules...</option>
							{:else if modules.error}
								<option value="">Error loading modules</option>
							{:else if modules.data && modules.data.length > 0}
								{#each modules.data as m (m._id)}
									<option value={m._id} selected={selectedModuleId === m._id}>{m.title}</option>
								{/each}
							{:else if selectedClass}
								<option value="">No modules</option>
							{/if}
						</select>
					</div>

					<!-- Destination Summary -->
					<div class="form-control col-span-2 lg:col-span-1">
						<div class="label"><span class="label-text text-sm">Destination</span></div>
						<div class="text-xs text-base-content/70 bg-base-200 rounded px-3 py-2 min-h-8 truncate">
							{selectedClass ? selectedClass.name : '—'} • {selectedModuleTitle || '—'}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 2xl:grid-cols-6 gap-6 lg:gap-10 mt-6 flex-1">
		<!-- Document Browser - More spacious column -->
		<div class="2xl:col-span-2">
			<div class="card bg-base-100 border border-base-300 rounded-xl min-h-96">
				{#if convexUser.data?.cohortId}
					<DocumentBrowser
						cohortId={convexUser.data.cohortId as Id<'cohort'>}
						initialLib={userContentLib.data}
						bind:selectedText
					/>
				{:else}
					<div class="p-6 space-y-2">
						{#each Array(6) as _}
							<div class="skeleton h-10 w-full"></div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Question Generation - Very spacious column -->
		<div class="2xl:col-span-4">
			<div class="card bg-base-100 border border-base-300 rounded-xl min-h-96">
				<QuestionsGeneration
					material={selectedText}
					{wordCount}
					{charCount}
					canGenerate={Boolean(selectedClass && selectedModuleId)}
					destinationSummary={selectedClass && selectedModuleId
						? `${selectedClass.name} • ${selectedModuleTitle}`
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

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
				<!-- Mobile: Stack vertically, Desktop: Grid layout -->
				<div class="flex flex-col gap-4 lg:grid lg:grid-cols-4 lg:gap-4">
					<!-- Semester Selection -->
					<div class="form-control">
						<div class="label">
							<span class="label-text font-medium text-sm">Semester</span>
						</div>
						{#if semesters.data}
							<div class="flex items-center gap-2">
								<div class="dropdown flex-1">
									<div tabindex="0" role="button" class="btn btn-outline btn-sm flex-1 justify-between">
										<div class="flex items-center gap-2">
											<CalendarDays size={14} />
											<span class="text-sm truncate">{currentSemester || 'Select semester'}</span>
										</div>
										<ChevronDown size={12} />
									</div>
									<ul tabindex="0" class="dropdown-content menu menu-lg bg-base-100 rounded-box z-1 w-80 p-2 shadow-sm">
										{#each semesters.data as semester (semester._id)}
											<li>
												<button
													onclick={() => {
														currentSemester = semester.name;
														selectedClass = null;
														selectedModuleId = null;
														selectedModuleTitle = '';
													}}
													class="flex items-center gap-2 hover:bg-base-200 transition-colors duration-150 text-sm w-full text-left"
												>
													<CalendarDays size={14} />
													<span>{semester.name}</span>
												</button>
											</li>
										{/each}
									</ul>
								</div>
							</div>
						{:else}
							<div class="text-xs text-base-content/60">Loading...</div>
						{/if}
					</div>

					<!-- Class Selection -->
					<div class="form-control">
						<div class="label"><span class="label-text text-sm">Class</span></div>
						{#if classes.isLoading || !currentSemester}
							<div class="text-xs text-base-content/60">Loading...</div>
						{:else}
							<div class="flex items-center gap-2">
								<div class="dropdown flex-1">
									<div tabindex="0" role="button" class="btn btn-outline btn-sm flex-1 justify-between">
										<span class="text-sm truncate">
											{selectedClass ? `${selectedClass.name}${selectedClass.code ? ` (${selectedClass.code})` : ''}` : 'Select a class'}
										</span>
										<ChevronDown size={12} />
									</div>
									<ul tabindex="-1" class="dropdown-content menu menu-lg bg-base-100 rounded-box z-1 w-80 p-2 shadow-sm">
										{#each filteredClasses || [] as c (c._id)}
											<li>
												<button
													onclick={() => {
														selectedClass = c as ClassWithSemester;
														selectedModuleId = null;
														selectedModuleTitle = '';
													}}
													class="flex items-center gap-2 hover:bg-base-200 transition-colors duration-150 text-sm w-full text-left"
												>
													<span>{c.name}{c.code ? ` (${c.code})` : ''}</span>
												</button>
											</li>
										{/each}
									</ul>
								</div>
							</div>
						{/if}
					</div>

					<!-- Module Selection -->
					<div class="form-control">
						<div class="label"><span class="label-text text-sm">Module</span></div>
						{#if !selectedClass}
							<div class="text-xs text-base-content/60">Select a class first</div>
						{:else if modules.isLoading}
							<div class="text-xs text-base-content/60">Loading modules...</div>
						{:else if modules.error}
							<div class="text-xs text-error">Error loading modules</div>
						{:else if modules.data && modules.data.length > 0}
							<div class="flex items-center gap-2">
								<div class="dropdown flex-1">
									<div tabindex="0" role="button" class="btn btn-outline btn-sm flex-1 justify-between">
										<span class="text-sm truncate">
											{selectedModuleId ? selectedModuleTitle : 'Select a module'}
										</span>
										<ChevronDown size={12} />
									</div>
									<ul tabindex="0" class="dropdown-content menu menu-lg bg-base-100 rounded-box z-1 w-80 p-2 shadow-sm">
										{#each modules.data as m (m._id)}
											<li>
												<button
													onclick={() => {
														selectedModuleId = m._id;
														selectedModuleTitle = m.title;
													}}
													class="flex items-center gap-2 hover:bg-base-200 transition-colors duration-150 text-sm w-full text-left"
												>
													<span>{m.title}</span>
												</button>
											</li>
										{/each}
									</ul>
								</div>
							</div>
						{:else}
							<div class="text-xs text-base-content/60">No modules</div>
						{/if}
					</div>

					<!-- Destination Summary -->
					<div class="form-control">
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
				{#if convexUser.isLoading}
					<div class="p-6 space-y-2">
						<div class="text-sm text-base-content/70 mb-4">Loading user data...</div>
						{#each Array(6) as _}
							<div class="skeleton h-10 w-full"></div>
						{/each}
					</div>
				{:else if convexUser.error}
					<div class="p-6">
						<div class="alert alert-error">
							<span>Error loading user data: {convexUser.error.toString()}</span>
						</div>
					</div>
				{:else if convexUser.data && !convexUser.data.cohortId}
					<div class="p-6">
						<div class="alert alert-warning">
							<span>No cohort assigned. Please contact an administrator to assign you to a cohort.</span>
						</div>
					</div>
				{:else if !convexUser.isLoading && !convexUser.error && !convexUser.data}
					<div class="p-6">
						<div class="alert alert-error">
							<span>Account not found in database. Please contact an administrator to complete your account setup.</span>
							<div class="mt-2 text-xs opacity-70">
								User ID: {clerkUser?.id}
							</div>
						</div>
					</div>
				{:else}
					<DocumentBrowser
						cohortId={convexUser.data!.cohortId as Id<'cohort'>}
						bind:selectedText
					/>
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

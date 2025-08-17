<script lang="ts">
	import { ArrowLeft } from 'lucide-svelte';
	import QuestionsGeneration from '$lib/admin/QuestionGeneration.svelte';
	import DocumentBrowser from '$lib/admin/DocumentBrowser.svelte';
	import type { PageData } from './$types';
	import type { Id, Doc } from '../../../convex/_generated/dataModel';
	import { api } from '../../../convex/_generated/api';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { Check } from 'lucide-svelte';
	import type { ClassWithSemester } from '$lib/types';

	let { data }: { data: PageData } = $props();
	const userData = data.userData;
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

	const userContentLib = useQuery(
		api.contentLib.getContentLibByCohort,
		{
			cohortId: userData?.cohortId as Id<'cohort'>
		},
		{ initialData: data.cohortLib }
	);

	let classes = $state<{ isLoading: boolean; error: any; data?: Doc<'class'>[] }>({
		isLoading: false,
		error: null,
		data: []
	});

	$effect(() => {
		if (userData?.cohortId) {
			const q = useQuery(api.class.getUserClasses, {
				id: userData.cohortId as Id<'cohort'>
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
</script>

<div class="min-h-screen p-8 max-w-7xl mx-auto flex flex-col w-full">
	<a class="btn mb-4 btn-ghost self-start" href="/admin"><ArrowLeft size={16} />Back</a>
	<h1 class="text-3xl font-bold text-base-content">Question Studio</h1>
	<p class="text-base text-base-content/70">Create or generate questions with your documents.</p>

	<div class="mt-6">
		<div class="card bg-base-100 border border-base-300 rounded-xl">
			<div class="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
				<div class="form-control">
					<div class="label"><span class="label-text">Class</span></div>
					<select
						id="select-class"
						class="select select-bordered w-full"
						aria-label="Class"
						disabled={classes.isLoading}
						onchange={(e) => {
							const id = (e.target as HTMLSelectElement).value as Id<'class'>;
							const cls = (classes.data || []).find((c) => c._id === id) as ClassWithSemester | undefined;
							selectedClass = cls ?? null;
							selectedModuleId = null;
							selectedModuleTitle = '';
						}}
					>
						<option disabled selected={selectedClass == null} value="">Select a class</option>
						{#each classes.data || [] as c (c._id)}
							<option value={c._id} selected={selectedClass?._id === c._id}>
								{c.name}{c.code ? ` (${c.code})` : ''}
							</option>
						{/each}
					</select>
				</div>
				<div class="form-control">
					<div class="label"><span class="label-text">Module</span></div>
					<select
						id="select-module"
						class="select select-bordered w-full"
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
				<div class="form-control">
					<div class="label"><span class="label-text">Destination</span></div>
					<div class="text-sm text-base-content/70">
						{selectedClass ? selectedClass.name : '—'} • {selectedModuleTitle || '—'}
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4 flex-1 min-h-0">
		<div class="card bg-base-100 border border-base-300 rounded-xl h-full">
			<DocumentBrowser
				cohortId={userData?.cohortId as Id<'cohort'>}
				initialLib={userContentLib.data}
				bind:selectedText
			/>
		</div>
		<div class="card bg-base-100 border border-base-300 rounded-xl h-full">
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
	{#if generatedQuestions.length > 0}
		<div class="mt-4 flex items-center gap-3">
			<div class="text-sm text-base-content/70">Generated: {generatedQuestions.length}</div>
			<button class="btn btn-primary btn-sm" disabled={isSaving} onclick={saveGenerated}>
				{#if isSaving}
					<span class="loading loading-spinner loading-xs"></span>
					Saving...
				{:else}
					Save to Module
				{/if}
			</button>
			<button
				class="btn btn-ghost btn-sm"
				onclick={() => {
					generatedQuestions = [];
				}}>Clear</button>
		</div>

		<div class="mt-4 grid grid-cols-1 gap-4">
			{#each generatedQuestions as q, i}
				<div class="border border-base-300 rounded-lg p-4 bg-base-100">
					<div class="flex items-start justify-between gap-3">
						<div class="text-sm text-base-content/70">#{i + 1}</div>
						<button class="btn btn-ghost btn-xs" onclick={() => removeGenerated(i)}>Remove</button>
					</div>
					<div class="mt-2 font-medium">{q.stem}</div>
					<div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
						{#each q.options as opt, oi}
							<div class="flex items-start gap-2 p-2 rounded-md border border-base-200">
								<div class="font-mono text-xs w-6 text-center">{optionLetter(oi)}</div>
								<div class="flex-1 text-sm">{opt.text}</div>
								{#if q.correctAnswers.includes(String(oi))}
									<div class="text-success" title="Correct"><Check size={16} /></div>
								{/if}
							</div>
						{/each}
					</div>
					<div class="mt-3 text-sm text-base-content/70">
						<span class="font-medium">Explanation:</span>
						{#if q.explanation}
							<span class="ms-1">{q.explanation}</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<script lang="ts">
    import { ArrowLeft, ArrowRight } from 'lucide-svelte';
import QuestionsGeneration from '$lib/admin/QuestionGeneration.svelte';
import ClassList from '$lib/components/ClassList.svelte';
	import DocumentBrowser from '$lib/admin/DocumentBrowser.svelte';
	import ModuleCard from '$lib/components/ModuleCard.svelte';
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
let destView: 'classes' | 'modules' = $state('classes');
let selectedClass: ClassWithSemester | null = $state(null);
let selectedModuleId: Id<'module'> | null = $state(null);
let selectedModuleTitle: string = $state('');
let step: 'destination' | 'content' = $state('destination');
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

const classesQuery = useQuery(api.class.getUserClasses, {
    id: (userData?.cohortId as Id<'cohort'>) || ''
});

$effect(() => {
    if (selectedClass && destView === 'modules') {
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

    {#if step === 'destination'}
        <div class="grid grid-cols-1 gap-6 mt-6 flex-1 min-h-0">
            <div class="card bg-base-100 border border-base-300 rounded-xl h-full">
                <div class="h-full grid grid-rows-[auto_1fr]">
                    <div class="p-4 border-b border-base-300">
                        <h2 class="text-lg font-semibold">Destination</h2>
                        <p class="text-sm text-base-content/70">Pick class and module</p>
                    </div>
                    <div class="h-[60vh] sm:h-[65vh] lg:h-[70vh] overflow-y-auto overflow-x-hidden p-4">
                        {#if destView === 'classes'}
                            <ClassList classes={{ data: classesQuery.data || [], isLoading: classesQuery.isLoading, error: classesQuery.error }} onSelectClass={(c) => { selectedClass = c; destView = 'modules'; }} title="Classes" variant="grid" />
                        {:else if destView === 'modules' && selectedClass}
                            <div class="space-y-4">
                                <div class="flex items-center gap-3">
                                    <button class="btn btn-ghost btn-sm" onclick={() => { destView = 'classes'; selectedClass = null; selectedModuleId = null; }} aria-label="Back to classes">&larr; Back</button>
                                    <h3 class="text-lg font-semibold text-base-content">{selectedClass.name}</h3>
                                    {#if selectedClass.code}
                                        <div class="text-xs text-base-content/60 font-mono">{selectedClass.code}</div>
                                    {/if}
                                </div>
                                {#if modules.isLoading}
                                    <div class="space-y-2">
                                        {#each Array(6) as _}
                                            <div class="skeleton h-12 w-full"></div>
                                        {/each}
                                    </div>
                                {:else if modules.error}
                                    <div class="alert alert-error"><span>Error loading modules</span></div>
                                {:else if !modules.data || modules.data.length === 0}
                                    <div class="rounded-lg bg-base-100 shadow-sm border border-base-300 p-8">
                                        <div class="text-center py-6">
                                            <div class="text-4xl mb-3">📘</div>
                                            <h3 class="text-base font-semibold mb-1">No modules yet</h3>
                                            <p class="text-sm text-base-content/70">Modules will appear here once added to this class.</p>
                                        </div>
                                    </div>
                                {:else}
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {#each modules.data as module (module._id)}
                                            <ModuleCard {module} classId={selectedClass._id} onSelect={(m) => { selectedModuleId = m._id; selectedModuleTitle = m.title; step = 'content'; }} />
                                        {/each}
                                    </div>
                                {/if}
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    {:else}
        <div class="flex items-center gap-3 mt-6">
            <button class="btn btn-ghost btn-sm" onclick={() => { step = 'destination'; }}><ArrowLeft size={16} />Back</button>
            <div class="text-sm text-base-content/70">
                Destination: {selectedClass?.name} • {selectedModuleTitle}
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
                    canGenerate={Boolean(selectedModuleId)}
                    destinationSummary={selectedClass && selectedModuleId ? `${selectedClass.name} • ${selectedModuleTitle}` : ''}
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
                <button class="btn btn-ghost btn-sm" onclick={() => { generatedQuestions = []; }}>Clear</button>
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
                        <span class="ms-1">{q.explanation}</span>
                    </div>
                </div>
                {/each}
            </div>
        {/if}
    {/if}
</div>

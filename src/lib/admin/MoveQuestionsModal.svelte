<script lang="ts">
  let { isOpen, onClose, sourceModuleId, selectedQuestionIds } = $props();

  import { X } from 'lucide-svelte';
  import { useConvexClient, useQuery } from 'convex-svelte';
  import { api } from '../../convex/_generated/api.js';
  import type { Id, Doc } from '../../convex/_generated/dataModel';
  import { useClerkContext } from 'svelte-clerk/client';

  const client = useConvexClient();
  const clerk = useClerkContext();
  const clerkUser = $derived(clerk.user);

  type ClassDoc = Doc<'class'>;
  type ModuleWithCount = Doc<'module'> & { questionCount?: number };

  // Get user data to access cohort ID
  let userDataQuery = $state<{ isLoading: boolean; error: any; data?: Doc<'users'> | null }>({
    isLoading: true,
    error: null,
    data: undefined
  });

  $effect(() => {
    if (clerkUser) {
      userDataQuery = useQuery(api.users.getUserById, { id: clerkUser.id });
    } else {
      userDataQuery = { isLoading: true, error: null, data: undefined };
    }
  });

  // Get only the user's classes based on their cohort
  const classes = useQuery(api.class.getUserClasses, () => ({
    id: (userDataQuery.data?.cohortId as Id<'cohort'>) || ''
  }));

  let selectedClassId: Id<'class'> | null = $state(null);
  let selectedModuleId: Id<'module'> | null = $state(null);
  let isSubmitting = $state(false);

  let modules: {
    data: ModuleWithCount[];
    isLoading: boolean;
    error: any;
  } = $state({ data: [], isLoading: false, error: null });

  $effect(() => {
    const cid = selectedClassId as Id<'class'> | null;
    if (cid) {
      const r = useQuery(api.module.getAdminModulesWithQuestionCounts, { classId: cid });
      modules = r as unknown as typeof modules;
    } else {
      modules = { data: [], isLoading: false, error: null } as typeof modules;
    }
  });

  function resetSelections() {
    selectedClassId = null as unknown as Id<'class'> | null;
    selectedModuleId = null as unknown as Id<'module'> | null;
  }

  async function handleConfirm() {
    if (!selectedModuleId || !sourceModuleId) return;
    if (!selectedQuestionIds || selectedQuestionIds.length === 0) return;
    isSubmitting = true;
    try {
      await client.mutation(api.question.moveQuestionsToModule, {
        sourceModuleId: sourceModuleId as Id<'module'>,
        targetModuleId: selectedModuleId as Id<'module'>,
        questionIds: selectedQuestionIds as Id<'question'>[]
      });
      resetSelections();
      onClose(true);
    } catch (e) {
      onClose(false);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<dialog class="modal p-8" class:modal-open={isOpen}>
  <div class="modal-box w-full max-w-2xl rounded-2xl border border-base-300 shadow-2xl">
    <form method="dialog">
      <button class="btn btn-sm btn-circle btn-ghost absolute right-4 top-4" onclick={() => onClose(false)} aria-label="Close">
        <X size={18} />
      </button>
    </form>

    <div class="mb-6">
      <h3 class="text-2xl font-extrabold tracking-tight">Move Questions</h3>
      <p class="text-base-content/70 mt-1">Select a destination class and module.</p>
    </div>

    <div class="space-y-4">
      <div class="form-control">
        <label class="label" for="class-select"><span class="label-text font-medium">Class</span></label>
        <select id="class-select" class="select select-bordered w-full" bind:value={selectedClassId}>
          <option value={null}>Select class…</option>
          {#if userDataQuery.isLoading || !userDataQuery.data?.cohortId}
            <option disabled>Loading user data…</option>
          {:else if classes.isLoading}
            <option disabled>Loading classes…</option>
          {:else if classes.error}
            <option disabled>Error loading classes</option>
          {:else if !classes.data || classes.data.length === 0}
            <option disabled>No classes available</option>
          {:else}
            {#each classes.data as c (c._id)}
              <option value={c._id}>{c.name}</option>
            {/each}
          {/if}
        </select>
      </div>

      <div class="form-control">
        <label class="label" for="module-select"><span class="label-text font-medium">Module</span></label>
        <select id="module-select" class="select select-bordered w-full" bind:value={selectedModuleId} disabled={!selectedClassId || userDataQuery.isLoading || !userDataQuery.data?.cohortId}>
          <option value={null} disabled={!selectedClassId || userDataQuery.isLoading || !userDataQuery.data?.cohortId}>
            {#if userDataQuery.isLoading || !userDataQuery.data?.cohortId}
              Loading user data…
            {:else if !selectedClassId}
              Select a class first
            {:else}
              Select module…
            {/if}
          </option>
          {#if !selectedClassId}
            <option disabled>Select a class first</option>
          {:else if modules.isLoading}
            <option disabled>Loading modules…</option>
          {:else if modules.error}
            <option disabled>Error loading modules</option>
          {:else if !modules.data || modules.data.length === 0}
            <option disabled>No modules available</option>
          {:else}
            {#each (modules.data ?? []) as m (m._id)}
              <option value={m._id}>{m.title} ({m.questionCount})</option>
            {/each}
          {/if}
        </select>
      </div>
    </div>

    <div class="modal-action mt-6">
      <form method="dialog" class="flex gap-3">
        <button class="btn btn-ghost" onclick={() => onClose(false)} disabled={isSubmitting}>Cancel</button>
        <button class="btn btn-primary" onclick={handleConfirm} disabled={isSubmitting || !selectedModuleId || userDataQuery.isLoading || !userDataQuery.data?.cohortId}>
          {#if isSubmitting}
            <span class="loading loading-spinner loading-sm"></span>
            <span>Moving…</span>
          {:else}
            <span>Move</span>
          {/if}
        </button>
      </form>
    </div>
  </div>
</dialog>



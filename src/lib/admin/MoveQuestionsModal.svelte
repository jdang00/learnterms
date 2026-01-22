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

  // Get user data to access cohort ID - using skip pattern
  const userDataQuery = useQuery(
    api.users.getUserById,
    () => clerkUser ? { id: clerkUser.id } : 'skip'
  );

  // Get only the user's classes based on their cohort - using skip pattern
  const classes = useQuery(
    api.class.getUserClasses,
    () =>
      userDataQuery.data?.cohortId
        ? { id: userDataQuery.data.cohortId as Id<'cohort'> }
        : 'skip'
  );

  let selectedClassId: Id<'class'> | null = $state(null);
  let selectedModuleId: Id<'module'> | null = $state(null);
  let isSubmitting = $state(false);

  // Get modules for selected class - using skip pattern at top level
  const modules = useQuery(
    api.module.getAdminModulesWithQuestionCounts,
    () => selectedClassId ? { classId: selectedClassId as Id<'class'> } : 'skip'
  );

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



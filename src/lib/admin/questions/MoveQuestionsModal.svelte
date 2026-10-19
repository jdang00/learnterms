<script lang="ts">
	let { isOpen, onClose, sourceModuleId, selectedQuestionIds } = $props();

	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api.js';
	import type { Id } from '../../../convex/_generated/dataModel';
	import { useClerkContext } from 'svelte-clerk/client';
	import ModuleLimitModal from './ModuleLimitModal.svelte';
	import { getErrorText } from '#lib/utils/errorHandling.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import { SelectField } from '#lib/components/ui/select/index.js';

	const client = useConvexClient();
	const clerk = useClerkContext();
	const clerkUser = $derived(clerk.user);

	// Get user data to access cohort ID - using skip pattern
	const userDataQuery = useQuery(api.users.getUserById, () =>
		clerkUser ? { id: clerkUser.id } : 'skip'
	);

	// Get only the user's classes based on their cohort - using skip pattern
	const classes = useQuery(api.class.getUserClasses, () =>
		userDataQuery.data?.cohortId ? { id: userDataQuery.data.cohortId as Id<'cohort'> } : 'skip'
	);

	let selectedClassId: Id<'class'> | null = $state(null);
	let selectedModuleId: Id<'module'> | null = $state(null);
	let isSubmitting = $state(false);
	let isLimitModalOpen = $state(false);

	const classPlaceholder = $derived(
		userDataQuery.isLoading || !userDataQuery.data?.cohortId
			? 'Loading user data…'
			: classes.isLoading
				? 'Loading classes…'
				: classes.error
					? 'Error loading classes'
					: !classes.data?.length
						? 'No classes available'
						: 'Select class…'
	);

	// Get modules for selected class - using skip pattern at top level
	const modules = useQuery(api.module.getAdminModulesWithQuestionCounts, () =>
		selectedClassId ? { classId: selectedClassId as Id<'class'> } : 'skip'
	);

	const modulePlaceholder = $derived(
		userDataQuery.isLoading || !userDataQuery.data?.cohortId
			? 'Loading user data…'
			: !selectedClassId
				? 'Select a class first'
				: modules.isLoading
					? 'Loading modules…'
					: modules.error
						? 'Error loading modules'
						: !modules.data?.length
							? 'No modules available'
							: 'Select module…'
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
			await client.mutation(api.questions.order.moveQuestionsToModule, {
				sourceModuleId: sourceModuleId as Id<'module'>,
				targetModuleId: selectedModuleId as Id<'module'>,
				questionIds: selectedQuestionIds as Id<'question'>[]
			});
			resetSelections();
			onClose(true);
		} catch (e: unknown) {
			if (getErrorText(e).includes('Module limit reached')) {
				isLimitModalOpen = true;
			} else {
				onClose(false);
			}
		} finally {
			isSubmitting = false;
		}
	}
</script>

<Dialog.Root
	open={isOpen}
	onOpenChange={(o) => {
		if (!o) onClose(false);
	}}
>
	<Dialog.Content class="sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title class="text-2xl font-extrabold tracking-tight">Move Questions</Dialog.Title>
			<Dialog.Description>Select a destination class and module.</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<Field.Field>
				<Field.Label for="class-select">Class</Field.Label>
				<SelectField
					id="class-select"
					value={selectedClassId ?? ''}
					onValueChange={(v) => (selectedClassId = (v || null) as Id<'class'> | null)}
					placeholder={classPlaceholder}
					disabled={!classes.data?.length}
					options={(classes.data ?? []).map((c) => ({ value: c._id, label: c.name }))}
				/>
			</Field.Field>

			<Field.Field>
				<Field.Label for="module-select">Module</Field.Label>
				<SelectField
					id="module-select"
					value={selectedModuleId ?? ''}
					onValueChange={(v) => (selectedModuleId = (v || null) as Id<'module'> | null)}
					placeholder={modulePlaceholder}
					disabled={!selectedClassId ||
						userDataQuery.isLoading ||
						!userDataQuery.data?.cohortId ||
						!modules.data?.length}
					options={(modules.data ?? []).map((m) => ({
						value: m._id,
						label: `${m.title} (${m.questionCount})`
					}))}
				/>
			</Field.Field>
		</div>

		<Dialog.Footer>
			<Button variant="ghost" tone="neutral" onclick={() => onClose(false)} disabled={isSubmitting}
				>Cancel</Button
			>
			<Button
				onclick={handleConfirm}
				loading={isSubmitting}
				disabled={isSubmitting ||
					!selectedModuleId ||
					userDataQuery.isLoading ||
					!userDataQuery.data?.cohortId}
			>
				{isSubmitting ? 'Moving…' : 'Move'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<ModuleLimitModal isOpen={isLimitModalOpen} onClose={() => (isLimitModalOpen = false)} />

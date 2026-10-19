<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import Sheet from '$lib/components/Sheet.svelte';
	import { useQuestionMedia } from '$lib/utils/useQuestionMedia.svelte';
	import type { PageData } from './$types';
	import { draggable, droppable, type DragDropState } from '@thisux/sveltednd';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import type { FunctionReturnType } from 'convex/server';
	import type { Id } from '../../../../../convex/_generated/dataModel';
	import { api } from '../../../../../convex/_generated/api.js';
	import { flip } from 'svelte/animate';
	import Plus from '@lucide/svelte/icons/plus';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ArrowRightLeft from '@lucide/svelte/icons/arrow-right-left';
	import AddQuestionModal from '$lib/admin/questions/AddQuestionModal.svelte';

	import EditQuestionModal from '$lib/admin/questions/EditQuestionModal.svelte';
	import DuplicateQuestionModal from '$lib/admin/questions/DuplicateQuestionModal.svelte';
	import DeleteConfirmationModal from '$lib/admin/DeleteConfirmationModal.svelte';
	import MoveQuestionsModal from '$lib/admin/questions/MoveQuestionsModal.svelte';
	import QuestionEditorInline from '$lib/admin/questions/QuestionEditorInline.svelte';
	import QuestionListControls from '$lib/admin/questions/QuestionListControls.svelte';
	import QuestionListItem from '$lib/admin/questions/QuestionListItem.svelte';
	import QuestionDetailView from '$lib/admin/questions/QuestionDetailView.svelte';
	import AttachmentViewerModal from '$lib/admin/questions/AttachmentViewerModal.svelte';
	import ModuleLimitModal from '$lib/admin/questions/ModuleLimitModal.svelte';
	import { useClerkContext } from 'svelte-clerk';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';
	import { curationState, type QuestionItem } from './states.svelte.js';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Dialog from '$lib/components/ui/dialog';

	let { data }: { data: PageData } = $props();
	const isPhoneLayout = new MediaQuery('(max-width: 767.98px)');
	const moduleId = $derived(data.moduleId);

	// Initialize state with dependencies
	const client = useConvexClient();

	$effect(() => {
		curationState.init(client, moduleId);
	});

	// URL param for edit mode
	let editParam = $derived(page.url.searchParams.get('edit'));
	type QuestionMediaItem = FunctionReturnType<typeof api.questionMedia.getByQuestionId>[number];

	// Queries
	const moduleQuestions = useQuery(api.questions.search.searchQuestionsByModuleAdmin, () => ({
		id: moduleId as Id<'module'>,
		query: curationState.search,
		sort: curationState.sortMode
	}));

	const generationJob = $derived(page.url.searchParams.get('generationJob'));
	const questions = $derived({
		...moduleQuestions,
		data: generationJob
			? moduleQuestions.data?.filter(
					(question) => question.metadata.generation?.jobId === generationJob
				)
			: moduleQuestions.data
	});
	let openedReview = $state('');
	let preparedGenerationJob = $state('');
	$effect(() => {
		const scope = generationJob ?? '';
		if (preparedGenerationJob === scope) return;
		preparedGenerationJob = scope;
		openedReview = '';
		curationState.selectedQuestions.clear();
		if (scope) curationState.clearSearch();
	});
	$effect(() => {
		const review = page.url.searchParams.get('review');
		if (!generationJob || questions.isLoading || !questions.data || openedReview === generationJob)
			return;
		openedReview = generationJob;
		curationState.statusFilter = 'draft';
		curationState.selectedQuestionId =
			questions.data.find((question) => question._id === review)?._id ??
			questions.data[0]?._id ??
			null;
	});

	const moduleInfo = useQuery(api.module.getModuleById, () => ({ id: moduleId as Id<'module'> }));

	const mediaQuery = useQuestionMedia(
		() => curationState.selectedQuestionId as Id<'question'> | null
	);

	const allMediaQuery = useQuery(api.questionMedia.getByQuestionIds, () =>
		questions.data && questions.data.length > 0
			? { questionIds: questions.data.map((q) => q._id) as Id<'question'>[] }
			: 'skip'
	);

	// Auth
	const clerk = useClerkContext();
	const userDataQuery = useQuery(api.users.getUserById, () =>
		clerk.user ? { id: clerk.user.id } : 'skip'
	);
	const dev = $derived(userDataQuery.data?.role === 'dev');
	const admin = $derived(userDataQuery.data?.role === 'admin');
	const canEdit = $derived(
		userDataQuery.data?.role === 'dev' ||
			userDataQuery.data?.role === 'admin' ||
			userDataQuery.data?.role === 'curator'
	);
	const MAX_QUESTIONS = 150;
	const isModuleFull = $derived((moduleInfo.data?.questionCount ?? 0) >= MAX_QUESTIONS);

	// Derived values
	const media = $derived({
		data: (mediaQuery.data ?? []) as QuestionMediaItem[],
		isLoading: mediaQuery.isLoading,
		error: mediaQuery.error
	});

	const questionHasAttachments = $derived.by(() => {
		const questionIds: string[] = [];
		if (allMediaQuery.data && Array.isArray(allMediaQuery.data)) {
			for (const item of allMediaQuery.data) {
				if (item?.questionId && item?.hasMedia && !questionIds.includes(item.questionId)) {
					questionIds.push(item.questionId);
				}
			}
		}
		return questionIds;
	});

	const selectedQuestion = $derived(curationState.getSelectedQuestion(questions.data));

	// Sync data from queries to state
	$effect(() => {
		curationState.handleEditParam(editParam, questions.data);
		// Track statusFilter to re-filter when it changes
		const statusFilter = curationState.statusFilter;
		void statusFilter;
		curationState.syncQuestionList(questions.data);
	});

	// Cleanup on unmount
	$effect(() => {
		return () => curationState.cleanupSearchTimeout();
	});

	// Drag and drop handler wrapper
	function handleQuestionDrop(state: DragDropState<QuestionItem>) {
		curationState.handleQuestionDrop(
			state.draggedItem,
			state.sourceContainer,
			state.targetContainer,
			questions.data
		);
	}

	// Keyboard navigation (must stay in component for DOM access)
	function handleKeyDown(event: KeyboardEvent) {
		if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
			return;
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			curationState.navigateQuestion('up');
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			curationState.navigateQuestion('down');
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});
</script>

<div class="h-screen overflow-hidden bg-muted/30 flex flex-col">
	<div class="max-w-[1800px] mx-auto p-4 sm:p-6 flex flex-col flex-1 min-h-0 w-full">
		<!-- Header -->
		<div class="flex items-center gap-2 sm:gap-4 mb-4">
			{#if moduleInfo.data?.classId}
				<Button
					variant="ghost"
					tone="neutral"
					size="sm"
					class="gap-2"
					href={resolve('/admin/[classId]', { classId: moduleInfo.data.classId })}
					><ArrowLeft size={16} />
					<span class="hidden sm:inline">Back</span></Button
				>
			{:else}
				<Button variant="ghost" tone="neutral" size="sm" class="gap-2" href={resolve('/admin')}
					><ArrowLeft size={16} />
					<span class="hidden sm:inline">Back</span></Button
				>
			{/if}
			<div class="h-6 w-px bg-muted-strong"></div>
			{#if moduleInfo.isLoading}
				<Skeleton class="h-6 w-48" />
			{:else if moduleInfo.error != null}
				<div class="text-error-ink text-sm">Failed to load module</div>
			{:else if moduleInfo.data == null}
				<div class="text-foreground/70 text-sm">Module not found</div>
			{:else}
				<div class="flex min-w-0 items-center gap-2">
					<span class="text-xl">{moduleInfo.data?.emoji || '📘'}</span>
					<div class="min-w-0">
						<h1
							class="font-display text-base font-semibold leading-tight [overflow-wrap:anywhere] sm:text-lg"
						>
							{moduleInfo.data.title}
						</h1>
						<p class="text-xs text-foreground/60 hidden sm:block">
							{curationState.questionList.length} question{curationState.questionList.length !== 1
								? 's'
								: ''}
						</p>
					</div>
				</div>
			{/if}
			<div class="flex-1"></div>
			{#if canEdit && curationState.editorMode !== 'add'}
				<div class="flex shrink-0 items-center gap-1 sm:gap-2">
					<Button
						size="sm"
						class="gap-2"
						onclick={() =>
							isModuleFull
								? (curationState.isLimitModalOpen = true)
								: curationState.openAddQuestionModal()}
					>
						<Plus size={16} />
						<span class="hidden sm:inline">Add Question</span>
						<span class="sm:hidden">Add</span>
					</Button>
				</div>
			{/if}
		</div>

		{#if generationJob}
			<div
				class="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4"
			>
				<div class="min-w-0 flex-1">
					<h2 class="text-sm font-semibold">Questions from Question Studio</h2>
					<p class="mt-1 text-xs text-foreground/65">
						Newly saved questions are published. Review their answers and sources here; you can edit
						or archive them as needed.
					</p>
				</div>
				<Button
					href={resolve('/admin/[classId]/module/[moduleId]', {
						classId: page.params.classId!,
						moduleId
					})}
					variant="ghost"
					tone="neutral"
					size="sm">Show all module questions</Button
				>
			</div>
		{/if}
		<!-- Controls for mobile/tablet (below xl) -->
		<div class="xl:hidden p-3 surface mb-4">
			<QuestionListControls
				searchInput={curationState.searchInput}
				sortMode={curationState.sortMode}
				statusFilter={curationState.statusFilter}
				defaultStatus={curationState.defaultQuestionStatus}
				reorderMode={curationState.reorderMode}
				selectedCount={curationState.selectedQuestions.size}
				totalCount={questions.data?.length ?? 0}
				{canEdit}
				isAdmin={admin || dev}
				variant="mobile"
				onSearchChange={(v) => {
					curationState.searchInput = v;
					curationState.updateSearch();
				}}
				onSearchClear={() => curationState.clearSearch()}
				onSortChange={(m) => curationState.setSortMode(m)}
				onStatusFilterChange={(f) => curationState.setStatusFilter(f)}
				onDefaultStatusChange={(s) => curationState.setDefaultQuestionStatus(s)}
				onReorderToggle={() => curationState.toggleReorderMode()}
				onSelectAll={() => curationState.selectAllQuestions()}
				onDeselectAll={() => curationState.deselectAllQuestions()}
				onPublishSelected={() => curationState.publishSelectedQuestions()}
				onDraftSelected={() => curationState.draftSelectedQuestions()}
				onArchiveSelected={() => curationState.archiveSelectedQuestions()}
				onMoveSelected={() => curationState.openMoveModalForSelected()}
				onDeleteSelected={() => curationState.openBulkDeleteModal()}
			/>
		</div>

		<!-- Tablet View: Horizontal Scrolling Numbers (md to lg) -->
		{#if !curationState.reorderMode}
			<div class="hidden md:block xl:hidden mb-4">
				<div
					class="flex flex-row w-full overflow-x-auto overflow-y-hidden whitespace-nowrap space-x-3 relative items-center surface px-4 py-3"
				>
					{#if questions.isLoading}
						<div class="flex gap-3">
							{#each Array(10), index (index)}
								<Skeleton class="h-10 w-10 rounded-full shrink-0" />
							{/each}
						</div>
					{:else if questions.data && questions.data.length > 0}
						{#each curationState.questionList as questionItem, index (questionItem._id)}
							<div class="relative inline-flex shrink-0">
								{#if curationState.editorMode === 'edit' && curationState.editingQuestionForInline?._id === questionItem._id}
									<span class="absolute -top-1 -left-1 size-2.5 rounded-full bg-warning"></span>
								{/if}
								{#if curationState.recentlyAddedIds.has(questionItem._id)}
									<span class="absolute -top-1 -right-1 size-2.5 rounded-full bg-success"></span>
								{/if}
								<Button
									shape="circle"
									size="sm"
									variant={curationState.selectedQuestionId === questionItem._id
										? 'soft'
										: 'outline'}
									tone={curationState.selectedQuestionId === questionItem._id
										? 'primary'
										: 'neutral'}
									onclick={() => curationState.handleQuestionSelect(questionItem._id)}
									title={questionItem.stem?.replace(/<[^>]*>/g, '').substring(0, 50)}
								>
									{index + 1}
								</Button>
							</div>
						{/each}
					{:else}
						<div class="text-sm text-foreground/60 py-2">No questions yet</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Mobile Question List (below md) -->
		<div class="md:hidden flex-1 min-h-0 flex flex-col">
			<div class="surface overflow-hidden flex-1 min-h-0 flex flex-col">
				{#if questions.isLoading}
					<div class="divide-y divide-muted">
						{#each Array(5), index (index)}
							<div class="px-3 py-2.5">
								<div class="flex items-start gap-2">
									<Skeleton class="h-4 w-4 rounded-sm mt-0.5" />
									<div class="flex-1">
										<div class="flex items-center gap-2 mb-1">
											<Skeleton class="h-3 w-6 rounded-sm" />
											<Skeleton class="h-3 w-12 rounded-sm" />
										</div>
										<Skeleton class="h-3 w-full rounded-sm mb-1" />
										<Skeleton class="h-3 w-2/3 rounded-sm" />
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else if questions.error != null}
					<div class="flex items-center justify-center p-6">
						<div class="text-error-ink text-xs">Failed to load: {questions.error.toString()}</div>
					</div>
				{:else if !questions.data || questions.data.length === 0}
					<div class="flex items-center justify-center p-8">
						<div class="text-center">
							<div class="text-3xl mb-2">📚</div>
							<h3 class="text-sm font-semibold mb-1">
								{curationState.search ? 'No matches' : 'No questions'}
							</h3>
							<p class="text-xs text-foreground/60">
								{curationState.search ? 'Try different search terms' : 'Add your first question'}
							</p>
						</div>
					</div>
				{:else if curationState.reorderMode}
					<div class="p-2 space-y-2 overflow-y-auto flex-1 min-h-0">
						{#each curationState.questionList as questionItem, index (questionItem._id)}
							<div
								use:droppable={{
									container: index.toString(),
									callbacks: { onDrop: handleQuestionDrop }
								}}
								use:draggable={{ container: index.toString(), dragData: questionItem }}
								animate:flip={{ duration: 300 }}
							>
								<QuestionListItem
									question={questionItem}
									{index}
									isSelected={curationState.selectedQuestions.has(questionItem._id)}
									isHighlighted={curationState.selectedQuestionId === questionItem._id}
									hasAttachment={questionHasAttachments.includes(questionItem._id)}
									isRecentlyAdded={curationState.recentlyAddedIds.has(questionItem._id)}
									variant="mobile"
									reorderMode={true}
									onSelect={() => curationState.handleQuestionSelect(questionItem._id)}
									onToggleSelection={() => curationState.toggleQuestionSelection(questionItem._id)}
								/>
							</div>
						{/each}
					</div>
				{:else}
					<div class="p-2 space-y-2 overflow-y-auto flex-1 min-h-0">
						{#each curationState.questionList as questionItem, index (questionItem._id)}
							<QuestionListItem
								question={questionItem}
								{index}
								isSelected={curationState.selectedQuestions.has(questionItem._id)}
								isHighlighted={curationState.selectedQuestionId === questionItem._id}
								hasAttachment={questionHasAttachments.includes(questionItem._id)}
								isRecentlyAdded={curationState.recentlyAddedIds.has(questionItem._id)}
								variant="mobile"
								onSelect={() => curationState.handleQuestionSelect(questionItem._id)}
								onToggleSelection={() => curationState.toggleQuestionSelection(questionItem._id)}
							/>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<div class="hidden md:grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1 min-h-0">
			<!-- Desktop Sidebar (xl and above) -->
			<div class="xl:col-span-5 2xl:col-span-4 hidden xl:block min-h-0">
				<div class="surface-muted h-full overflow-hidden flex flex-col">
					<div class="p-4 border-b border-border bg-background shrink-0">
						<QuestionListControls
							searchInput={curationState.searchInput}
							sortMode={curationState.sortMode}
							statusFilter={curationState.statusFilter}
							defaultStatus={curationState.defaultQuestionStatus}
							reorderMode={curationState.reorderMode}
							selectedCount={curationState.selectedQuestions.size}
							totalCount={questions.data?.length ?? 0}
							{canEdit}
							isAdmin={admin || dev}
							variant="desktop"
							onSearchChange={(v) => {
								curationState.searchInput = v;
								curationState.updateSearch();
							}}
							onSearchClear={() => curationState.clearSearch()}
							onSortChange={(m) => curationState.setSortMode(m)}
							onStatusFilterChange={(f) => curationState.setStatusFilter(f)}
							onDefaultStatusChange={(s) => curationState.setDefaultQuestionStatus(s)}
							onReorderToggle={() => curationState.toggleReorderMode()}
							onSelectAll={() => curationState.selectAllQuestions()}
							onDeselectAll={() => curationState.deselectAllQuestions()}
							onPublishSelected={() => curationState.publishSelectedQuestions()}
							onDraftSelected={() => curationState.draftSelectedQuestions()}
							onArchiveSelected={() => curationState.archiveSelectedQuestions()}
							onMoveSelected={() => curationState.openMoveModalForSelected()}
							onDeleteSelected={() => curationState.openBulkDeleteModal()}
						/>
					</div>

					<div class="flex-1 overflow-y-auto pb-8 min-h-0">
						{#if questions.isLoading}
							<div class="divide-y divide-muted">
								{#each Array(8), index (index)}
									<div class="px-4 py-3">
										<div class="flex items-start gap-3">
											<Skeleton class="h-5 w-5 rounded-sm mt-0.5" />
											<div class="flex-1">
												<div class="flex items-center gap-2 mb-2">
													<Skeleton class="h-3 w-6 rounded-sm" />
													<Skeleton class="h-4 w-12 rounded-sm" />
													<Skeleton class="h-2 w-2 rounded-full" />
												</div>
												<Skeleton class="h-4 w-full rounded-sm mb-1" />
												<Skeleton class="h-4 w-3/4 rounded-sm" />
											</div>
										</div>
									</div>
								{/each}
							</div>
						{:else if questions.error != null}
							<div class="flex items-center justify-center p-8">
								<div class="text-error-ink text-sm">
									Failed to load: {questions.error.toString()}
								</div>
							</div>
						{:else if !questions.data || questions.data.length === 0}
							<div class="flex items-center justify-center p-8 h-full">
								<div class="text-center">
									<div class="text-3xl mb-3">📚</div>
									<h3 class="text-sm font-semibold mb-1 text-foreground">
										{curationState.search ? 'No matches' : 'No questions'}
									</h3>
									<p class="text-xs text-foreground/60">
										{curationState.search
											? 'Try different search terms'
											: 'Add your first question'}
									</p>
									{#if curationState.search}
										<Button
											variant="ghost"
											tone="neutral"
											size="sm"
											class="mt-3"
											onclick={() => curationState.clearSearch()}>Clear Search</Button
										>
									{/if}
								</div>
							</div>
						{:else if curationState.reorderMode}
							<div class="divide-y divide-muted">
								{#each curationState.questionList as questionItem, index (questionItem._id)}
									<div
										use:droppable={{
											container: index.toString(),
											callbacks: { onDrop: handleQuestionDrop }
										}}
										use:draggable={{ container: index.toString(), dragData: questionItem }}
										class="px-4 py-3 transition-all hover:bg-muted/50 cursor-grab active:cursor-grabbing {curationState.recentlyAddedIds.has(
											questionItem._id
										)
											? 'bg-success/5'
											: ''}"
										animate:flip={{ duration: 300 }}
									>
										<div class="flex items-center gap-3">
											<GripVertical size={16} class="text-foreground/30 shrink-0" />
											<span class="text-xs font-medium text-foreground/50 w-6">#{index + 1}</span>
											<p class="flex-1 text-sm text-foreground truncate tiptap-content-inline">
												<!-- eslint-disable-next-line svelte/no-at-html-tags -->
												{@html sanitizeHtml(questionItem.stem)}
											</p>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class="p-2 space-y-2">
								{#each curationState.questionList as questionItem, index (questionItem._id)}
									<QuestionListItem
										question={questionItem}
										{index}
										isSelected={curationState.selectedQuestions.has(questionItem._id)}
										isHighlighted={curationState.selectedQuestionId === questionItem._id}
										hasAttachment={questionHasAttachments.includes(questionItem._id)}
										isRecentlyAdded={curationState.recentlyAddedIds.has(questionItem._id)}
										variant="desktop"
										onSelect={() => curationState.handleQuestionSelect(questionItem._id)}
										onToggleSelection={() =>
											curationState.toggleQuestionSelection(questionItem._id)}
									/>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Main Content Panel (md and above) -->
			<div class="xl:col-span-7 2xl:col-span-8 hidden md:block min-h-0">
				<div class="surface h-full overflow-hidden flex flex-col">
					<!-- Reorder mode only visible on tablet (md-xl) -->
					<div
						class="h-full flex-col overflow-hidden {curationState.reorderMode
							? 'flex xl:hidden'
							: 'hidden'}"
					>
						<div class="p-4 border-b border-border">
							<h3 class="text-lg font-semibold">Reorder Questions</h3>
							<p class="text-sm text-foreground/60 mt-1">Drag questions to reorder them</p>
						</div>
						<div class="flex-1 overflow-y-auto pb-8 min-h-0">
							<div class="divide-y divide-muted">
								{#each curationState.questionList as questionItem, index (questionItem._id)}
									<div
										use:droppable={{
											container: index.toString(),
											callbacks: { onDrop: handleQuestionDrop }
										}}
										use:draggable={{ container: index.toString(), dragData: questionItem }}
										class="px-4 py-3 transition-all hover:bg-muted/50 cursor-grab active:cursor-grabbing {curationState.recentlyAddedIds.has(
											questionItem._id
										)
											? 'bg-success/5'
											: ''}"
										animate:flip={{ duration: 300 }}
									>
										<div class="flex items-center gap-3">
											<GripVertical size={16} class="text-foreground/30 shrink-0" />
											<span class="text-xs font-medium text-foreground/50 w-6">#{index + 1}</span>
											<p class="flex-1 text-sm text-foreground truncate tiptap-content-inline">
												<!-- eslint-disable-next-line svelte/no-at-html-tags -->
												{@html sanitizeHtml(questionItem.stem)}
											</p>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>

					<!-- Normal views -->
					<div
						class="{curationState.reorderMode
							? 'hidden xl:flex'
							: 'flex'} flex-col h-full overflow-hidden"
					>
						{#if curationState.editorMode === 'add'}
							<QuestionEditorInline
								{moduleId}
								mode="add"
								defaultStatus={curationState.defaultQuestionStatus}
								onSave={(id) => curationState.handleInlineEditorSave(id)}
								onCancel={() => curationState.handleInlineEditorCancel()}
								onChange={() => curationState.handleEditorChange()}
							/>
						{:else if curationState.editorMode === 'edit' && curationState.editingQuestionForInline}
							{#key curationState.editingQuestionForInline._id}
								<QuestionEditorInline
									{moduleId}
									editingQuestion={curationState.editingQuestionForInline}
									mode="edit"
									defaultStatus={curationState.defaultQuestionStatus}
									onSave={(id) => curationState.handleInlineEditorSave(id)}
									onCancel={() => curationState.handleInlineEditorCancel()}
									onChange={() => curationState.handleEditorChange()}
								/>
							{/key}
						{:else if selectedQuestion}
							<QuestionDetailView
								question={selectedQuestion}
								questionIndex={curationState.selectedQuestionIndex}
								media={media.data}
								{canEdit}
								variant="desktop"
								{isModuleFull}
								onEdit={() => curationState.editQuestion(selectedQuestion)}
								onMove={() => curationState.openMoveModalForOne(selectedQuestion._id)}
								onDuplicate={() =>
									isModuleFull
										? (curationState.isLimitModalOpen = true)
										: curationState.quickDuplicate(selectedQuestion._id)}
								onDuplicateMany={() =>
									curationState.openDuplicateModal(questions.data, selectedQuestion._id)}
								onDelete={() => curationState.openDeleteModal(questions.data, selectedQuestion._id)}
								onAttachmentClick={(a) => curationState.openAttachmentViewer(a)}
							/>
						{:else if curationState.selectedQuestions.size > 0}
							<div class="h-full flex flex-col items-center justify-center p-8 text-center">
								<div class="text-4xl mb-4">📋</div>
								<h3 class="text-lg font-semibold mb-2">
									{curationState.selectedQuestions.size}
									{curationState.selectedQuestions.size === 1 ? 'question' : 'questions'} selected
								</h3>
								<p class="text-sm text-foreground/60 mb-4">
									Use the toolbar to change status, move, or delete selected questions
								</p>
								<div class="flex gap-2">
									<Button
										variant="ghost"
										tone="neutral"
										size="sm"
										class="gap-1"
										onclick={() => curationState.openMoveModalForSelected()}
									>
										<ArrowRightLeft size={14} />
										Move All
									</Button>
									<Button
										tone="error"
										size="sm"
										class="gap-1"
										onclick={() => curationState.openBulkDeleteModal()}
									>
										<Trash2 size={14} />
										Delete All
									</Button>
								</div>
							</div>
						{:else}
							<div class="h-full flex flex-col items-center justify-center p-8 text-center">
								<div class="text-4xl mb-4">
									<span class="xl:hidden">☝️</span>
									<span class="hidden xl:inline">👈</span>
								</div>
								<h3 class="text-lg font-semibold mb-2">Select a question</h3>
								<p class="text-sm text-foreground/60">
									Click on a question from the list to view its details
								</p>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

{#if selectedQuestion}
	{@const selectedIndex = curationState.questionList.findIndex(
		(q) => q._id === curationState.selectedQuestionId
	)}
	<!-- Below md the detail panel is hidden, so the selected question opens in a sheet. -->
	<Sheet
		bind:open={
			() => isPhoneLayout.current && curationState.selectedQuestionId !== null,
			(open) => {
				if (!open) curationState.clearMobileSelection();
			}
		}
		title="Question #{selectedIndex + 1}"
		width="sm:max-w-2xl"
		expandable
	>
		<QuestionDetailView
			question={selectedQuestion}
			questionIndex={selectedIndex}
			{canEdit}
			variant="mobile"
			{isModuleFull}
			onEdit={() => curationState.editQuestion(selectedQuestion)}
			onMove={() => curationState.openMoveModalForOne(selectedQuestion._id)}
			onDuplicate={() =>
				isModuleFull
					? (curationState.isLimitModalOpen = true)
					: curationState.quickDuplicate(selectedQuestion._id)}
			onDuplicateMany={() => curationState.openDuplicateModal(questions.data, selectedQuestion._id)}
			onDelete={() => curationState.openDeleteModal(questions.data, selectedQuestion._id)}
		/>
	</Sheet>
{/if}

<AddQuestionModal
	isAddModalOpen={curationState.isAddQuestionModalOpen}
	closeAddModal={() => curationState.closeAddQuestionModal()}
	{moduleId}
	defaultStatus={curationState.defaultQuestionStatus}
/>
<EditQuestionModal
	isEditModalOpen={curationState.isEditQuestionModalOpen}
	closeEditModal={() => curationState.closeEditQuestionModal()}
	editingQuestion={curationState.editingQuestion}
	{moduleId}
/>
<DuplicateQuestionModal
	isOpen={curationState.isDuplicateModalOpen}
	onCancel={() => curationState.cancelDuplicateModal()}
	onConfirm={(count) => curationState.confirmDuplicateModal(count)}
	itemName={curationState.duplicateTarget?.stem?.replace(/<[^>]*>/g, '').substring(0, 30)}
/>
<DeleteConfirmationModal
	isDeleteModalOpen={curationState.isDeleteQuestionModalOpen}
	onCancel={() => curationState.cancelQuestionDelete()}
	onConfirm={() => curationState.confirmQuestionDelete()}
	itemName={curationState.questionToDelete?.stem}
	itemType="question"
/>
<DeleteConfirmationModal
	isDeleteModalOpen={curationState.isBulkDeleteModalOpen}
	onCancel={() => curationState.closeBulkDeleteModal()}
	onConfirm={() => curationState.confirmBulkDelete()}
	itemName={`${curationState.selectedQuestions.size} selected ${curationState.selectedQuestions.size === 1 ? 'question' : 'questions'}`}
	itemType="question"
/>
<MoveQuestionsModal
	isOpen={curationState.isMoveModalOpen}
	onClose={(s?: boolean) => curationState.handleCloseMoveModal(s)}
	sourceModuleId={moduleId}
	selectedQuestionIds={curationState.moveQuestionIds}
/>

<Dialog.Root
	open={curationState.showUnsavedChangesModal}
	onOpenChange={(o) => {
		if (!o) curationState.cancelDiscardChanges();
	}}
>
	<Dialog.Content showCloseButton={false}>
		<Dialog.Header>
			<Dialog.Title>Unsaved Changes</Dialog.Title>
			<Dialog.Description
				>You have unsaved changes. Do you want to discard them and continue?</Dialog.Description
			>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="ghost" tone="neutral" onclick={() => curationState.cancelDiscardChanges()}
				>Cancel</Button
			>
			<Button tone="error" onclick={() => curationState.confirmDiscardChanges()}
				>Discard Changes</Button
			>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<AttachmentViewerModal
	isOpen={curationState.isAttachmentModalOpen}
	attachment={mediaQuery.data?.find(
		(media) => media._id === curationState.selectedAttachment?._id
	) ?? null}
	onClose={() => curationState.closeAttachmentViewer()}
/>
<ModuleLimitModal
	isOpen={curationState.isLimitModalOpen}
	onClose={() => (curationState.isLimitModalOpen = false)}
/>

<style>
	:global(.tiptap-content-inline) {
		line-clamp: 2;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	:global(.tiptap-content-inline p) {
		margin: 0;
	}
	:global(.tiptap-content-inline p:not(:first-child)) {
		display: none;
	}
	:global(.line-clamp-2) {
		line-clamp: 2;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>

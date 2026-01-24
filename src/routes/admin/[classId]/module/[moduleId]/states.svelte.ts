import type { Doc, Id } from '../../../../../convex/_generated/dataModel';
import { api } from '../../../../../convex/_generated/api';
import type { ConvexClient } from 'convex/browser';
import { goto } from '$app/navigation';
import { toastStore } from '$lib/stores/toast.svelte';
import type { StatusFilter } from '$lib/types';

export type QuestionItem = Doc<'question'>;
export type MediaItem = { _id: string; url: string; altText: string; caption?: string };
export type SortMode = 'order' | 'created_desc';
export type EditorMode = 'view' | 'add' | 'edit';
export type DefaultQuestionStatus = 'published' | 'draft';

export class QuestionCurationState {
	// Dependencies
	private client: ConvexClient | null = null;
	private moduleId: string = '';

	// Search state
	search: string = $state('');
	searchInput: string = $state('');
	sortMode: SortMode = $state('order');
	statusFilter: StatusFilter = $state('all');
	private searchTimeout: ReturnType<typeof setTimeout> | null = null;

	// Auto-select after create
	pendingSelectId: string | null = $state(null);

	// Preferences
	defaultQuestionStatus: DefaultQuestionStatus = $state('published');

	// Question list state
	questionList: QuestionItem[] = $state([]);
	selectedQuestionId: string | null = $state(null);
	selectedQuestions: Set<string> = $state(new Set());
	recentlyAddedIds: Set<string> = $state(new Set());

	// UI mode state
	reorderMode: boolean = $state(false);
	editorMode: EditorMode = $state('view');
	editingQuestionForInline: QuestionItem | null = $state(null);

	// Unsaved changes state
	hasUnsavedChanges: boolean = $state(false);
	pendingQuestionId: string | null = $state(null);
	showUnsavedChangesModal: boolean = $state(false);

	// Modal states
	isEditQuestionModalOpen: boolean = $state(false);
	isAddQuestionModalOpen: boolean = $state(false);
	isDeleteQuestionModalOpen: boolean = $state(false);
	isDuplicateModalOpen: boolean = $state(false);
	isBulkDeleteModalOpen: boolean = $state(false);
	isMoveModalOpen: boolean = $state(false);
	isAttachmentModalOpen: boolean = $state(false);
	isLimitModalOpen: boolean = $state(false);

	// Modal data
	editingQuestion: QuestionItem | null = $state(null);
	questionToDelete: QuestionItem | null = $state(null);
	duplicateTarget: QuestionItem | null = $state(null);
	moveQuestionIds: string[] = $state([]);
	selectedAttachment: MediaItem | null = $state(null);

	// Initialize with dependencies
	init(client: ConvexClient, moduleId: string) {
		this.client = client;
		this.moduleId = moduleId;
		this.loadPreferences();
	}

	// Preferences
	private loadPreferences() {
		if (typeof window === 'undefined') return;
		try {
			const stored = window.localStorage.getItem('lt:defaultQuestionStatus');
			if (stored === 'draft' || stored === 'published') {
				this.defaultQuestionStatus = stored;
			}
		} catch {
			// Ignore localStorage errors
		}
	}

	setDefaultQuestionStatus(status: DefaultQuestionStatus) {
		this.defaultQuestionStatus = status;
		if (typeof window !== 'undefined') {
			try {
				window.localStorage.setItem('lt:defaultQuestionStatus', status);
			} catch {
				// Ignore localStorage errors
			}
		}
	}

	toggleDefaultQuestionStatus() {
		this.setDefaultQuestionStatus(this.defaultQuestionStatus === 'published' ? 'draft' : 'published');
	}

	// Computed values
	get selectedQuestionIndex(): number {
		if (!this.selectedQuestionId) return -1;
		return this.questionList.findIndex((q) => q._id === this.selectedQuestionId);
	}

	getSelectedQuestion(questionsData?: QuestionItem[] | null): QuestionItem | null {
		if (!this.selectedQuestionId) return null;
		return this.questionList.find((q) => q._id === this.selectedQuestionId) ??
			questionsData?.find((q) => q._id === this.selectedQuestionId) ?? null;
	}

	// Search operations
	updateSearch() {
		if (this.searchTimeout) clearTimeout(this.searchTimeout);
		this.searchTimeout = setTimeout(() => {
			this.search = this.searchInput;
		}, 300);
	}

	clearSearch() {
		this.searchInput = '';
		this.search = '';
		if (this.searchTimeout) {
			clearTimeout(this.searchTimeout);
			this.searchTimeout = null;
		}
	}

	cleanupSearchTimeout() {
		if (this.searchTimeout) clearTimeout(this.searchTimeout);
	}

	// Status filter
	setStatusFilter(filter: StatusFilter) {
		this.statusFilter = filter;
	}

	// Question list sync
	syncQuestionList(questionsData: QuestionItem[] | null | undefined) {
		if (questionsData) {
			if (this.statusFilter === 'all') {
				this.questionList = [...questionsData];
			} else {
				this.questionList = questionsData.filter((q) => q.status === this.statusFilter);
			}

			if (this.pendingSelectId) {
				const found = this.questionList.find((q) => q._id === this.pendingSelectId);
				if (found) {
					this.selectedQuestionId = this.pendingSelectId;
					this.pendingSelectId = null;
				}
			}
		}
	}

	// Question selection
	handleQuestionSelect(questionId: string) {
		if (this.editorMode === 'view' && this.selectedQuestionId === questionId) return;
		if ((this.editorMode === 'edit' || this.editorMode === 'add') && this.hasUnsavedChanges) {
			this.pendingQuestionId = questionId;
			this.showUnsavedChangesModal = true;
			return;
		}
		this.editorMode = 'view';
		this.editingQuestionForInline = null;
		this.selectedQuestionId = questionId;
		this.hasUnsavedChanges = false;
	}

	toggleQuestionSelection(questionId: string) {
		const newSelected = new Set(this.selectedQuestions);
		if (newSelected.has(questionId)) {
			newSelected.delete(questionId);
		} else {
			newSelected.add(questionId);
		}
		this.selectedQuestions = newSelected;
	}

	selectAllQuestions() {
		this.selectedQuestions = new Set(this.questionList.map((q) => q._id));
	}

	deselectAllQuestions() {
		this.selectedQuestions = new Set();
	}

	// Edit operations
	editQuestion(questionItem: QuestionItem) {
		const isDesktopOrTablet = typeof window !== 'undefined' && window.innerWidth >= 768;
		if (isDesktopOrTablet) {
			if ((this.editorMode === 'edit' || this.editorMode === 'add') && this.hasUnsavedChanges &&
				this.editingQuestionForInline?._id !== questionItem._id) {
				this.pendingQuestionId = `edit:${questionItem._id}`;
				this.showUnsavedChangesModal = true;
				return;
			}
			this.editingQuestionForInline = questionItem;
			this.editorMode = 'edit';
			this.selectedQuestionId = questionItem._id;
			this.hasUnsavedChanges = false;
		} else {
			this.editingQuestion = questionItem;
			this.isEditQuestionModalOpen = true;
		}
	}

	async closeEditQuestionModal() {
		try {
			const url = new URL(window.location.href);
			if (url.searchParams.has('edit')) {
				url.searchParams.delete('edit');
				const newPath = url.pathname + (url.search ? `?${url.searchParams.toString()}` : '');
				await goto(newPath, { replaceState: true, noScroll: true });
			}
		} catch {}
		this.isEditQuestionModalOpen = false;
		this.editingQuestion = null;
		this.editorMode = 'view';
		this.editingQuestionForInline = null;
	}

	openAddQuestionModal() {
		const isDesktopOrTablet = typeof window !== 'undefined' && window.innerWidth >= 768;
		if (isDesktopOrTablet) {
			if ((this.editorMode === 'edit' || this.editorMode === 'add') && this.hasUnsavedChanges) {
				this.pendingQuestionId = 'add';
				this.showUnsavedChangesModal = true;
				return;
			}
			this.editorMode = 'add';
			this.selectedQuestionId = null;
			this.editingQuestionForInline = null;
			this.hasUnsavedChanges = false;
		} else {
			this.isAddQuestionModalOpen = true;
		}
	}

	closeAddQuestionModal() {
		this.isAddQuestionModalOpen = false;
		this.editorMode = 'view';
	}

	// Delete operations
	openDeleteModal(questionsData: QuestionItem[] | null | undefined, id: string) {
		const foundQuestion = questionsData?.find((q) => q._id === id);
		if (!foundQuestion) return;
		this.questionToDelete = foundQuestion;
		this.isDeleteQuestionModalOpen = true;
	}

	async confirmQuestionDelete() {
		if (!this.questionToDelete || !this.client) return;
		try {
			await this.client.mutation(api.question.deleteQuestion, {
				questionId: this.questionToDelete._id as Id<'question'>,
				moduleId: this.moduleId as Id<'module'>
			});
			if (this.selectedQuestionId === this.questionToDelete._id) {
				this.selectedQuestionId = null;
			}
			toastStore.success('Question deleted');
		} catch (error) {
			console.error('Failed to delete question', error);
			toastStore.error('Failed to delete question');
		} finally {
			this.isDeleteQuestionModalOpen = false;
			this.questionToDelete = null;
		}
	}

	cancelQuestionDelete() {
		this.isDeleteQuestionModalOpen = false;
		this.questionToDelete = null;
	}

	// Bulk delete operations
	openBulkDeleteModal() {
		this.isBulkDeleteModalOpen = true;
	}

	closeBulkDeleteModal() {
		this.isBulkDeleteModalOpen = false;
	}

	async confirmBulkDelete() {
		if (this.selectedQuestions.size === 0 || !this.client) return;
		try {
			const result = await this.client.mutation(api.question.bulkDeleteQuestions, {
				questionIds: Array.from(this.selectedQuestions) as Id<'question'>[],
				moduleId: this.moduleId as Id<'module'>
			});
			if (result.success) {
				toastStore.success(`Deleted ${result.deletedCount} question${result.deletedCount !== 1 ? 's' : ''}`);
			}
			if (this.selectedQuestionId && this.selectedQuestions.has(this.selectedQuestionId)) {
				this.selectedQuestionId = null;
			}
			this.selectedQuestions = new Set();
		} catch (error) {
			console.error('Failed to bulk delete questions', error);
			toastStore.error('Failed to delete questions');
		} finally {
			this.isBulkDeleteModalOpen = false;
		}
	}

	// Move operations
	openMoveModalForSelected() {
		if (this.selectedQuestions.size === 0) return;
		this.moveQuestionIds = Array.from(this.selectedQuestions);
		this.isMoveModalOpen = true;
	}

	openMoveModalForOne(id: string) {
		this.moveQuestionIds = [id];
		this.isMoveModalOpen = true;
	}

	handleCloseMoveModal(success?: boolean, movedCount?: number) {
		this.isMoveModalOpen = false;
		const count = movedCount ?? this.moveQuestionIds.length;
		this.moveQuestionIds = [];
		if (success) {
			if (this.selectedQuestionId && this.selectedQuestions.has(this.selectedQuestionId)) {
				this.selectedQuestionId = null;
			}
			this.selectedQuestions = new Set();
			toastStore.success(`Moved ${count} question${count !== 1 ? 's' : ''}`);
		}
	}

	// Duplicate operations
	openDuplicateModal(questionsData: QuestionItem[] | null | undefined, id: string) {
		const found = questionsData?.find((q) => q._id === id) as QuestionItem | undefined;
		if (!found) return;
		this.duplicateTarget = found;
		this.isDuplicateModalOpen = true;
	}

	cancelDuplicateModal() {
		this.isDuplicateModalOpen = false;
		this.duplicateTarget = null;
	}

	async confirmDuplicateModal(count: number) {
		if (!this.duplicateTarget || !this.client) return;
		try {
			const result = await this.client.mutation(api.question.duplicateQuestionMany, {
				questionId: this.duplicateTarget._id as Id<'question'>,
				count
			});
			if (result?.insertedIds && Array.isArray(result.insertedIds)) {
				const next = new Set(this.recentlyAddedIds);
				for (const id of result.insertedIds) next.add(id);
				this.recentlyAddedIds = next;
				setTimeout(() => {
					this.recentlyAddedIds = new Set();
				}, 4000);
			}
			toastStore.success(`Duplicated ${count} cop${count !== 1 ? 'ies' : 'y'}`);
		} catch (error: any) {
			console.error('Failed to duplicate questions');
			if (error.message?.includes('Module limit reached') || error.toString().includes('Module limit reached')) {
				this.isLimitModalOpen = true;
			} else {
				toastStore.error('Failed to duplicate');
			}
		} finally {
			this.isDuplicateModalOpen = false;
			this.duplicateTarget = null;
		}
	}

	async quickDuplicate(questionId: string) {
		if (!this.client) return;
		try {
			const result = await this.client.mutation(api.question.duplicateQuestion, {
				questionId: questionId as Id<'question'>
			});
			if (result) {
				const next = new Set(this.recentlyAddedIds);
				next.add(result);
				this.recentlyAddedIds = next;
				setTimeout(() => {
					this.recentlyAddedIds = new Set();
				}, 4000);
			}
			toastStore.success('Question duplicated');
		} catch (error: any) {
			if (error.message?.includes('Module limit reached') || error.toString().includes('Module limit reached')) {
				this.isLimitModalOpen = true;
			} else {
				toastStore.error('Failed to duplicate');
			}
		}
	}

	// Inline editor handlers
	handleInlineEditorSave(newQuestionId?: string) {
		this.hasUnsavedChanges = false;
		this.editorMode = 'view';
		this.editingQuestionForInline = null;
		if (newQuestionId) {
			this.pendingSelectId = newQuestionId;
		}
		this.closeEditQuestionModal();
	}

	handleInlineEditorCancel() {
		this.hasUnsavedChanges = false;
		this.editorMode = 'view';
		this.editingQuestionForInline = null;
		this.closeEditQuestionModal();
	}

	handleEditorChange() {
		this.hasUnsavedChanges = true;
	}

	// Unsaved changes modal
	confirmDiscardChanges() {
		this.hasUnsavedChanges = false;
		this.showUnsavedChangesModal = false;

		if (this.pendingQuestionId === 'add') {
			this.editorMode = 'add';
			this.selectedQuestionId = null;
			this.editingQuestionForInline = null;
		} else if (this.pendingQuestionId?.startsWith('edit:')) {
			const questionId = this.pendingQuestionId.replace('edit:', '');
			const questionItem = this.questionList.find((q) => q._id === questionId);
			if (questionItem) {
				this.editingQuestionForInline = questionItem;
				this.editorMode = 'edit';
				this.selectedQuestionId = questionId;
			}
		} else if (this.pendingQuestionId) {
			this.editorMode = 'view';
			this.editingQuestionForInline = null;
			this.selectedQuestionId = this.pendingQuestionId;
		}
		this.pendingQuestionId = null;
	}

	cancelDiscardChanges() {
		this.showUnsavedChangesModal = false;
		this.pendingQuestionId = null;
	}

	// Attachment viewer
	openAttachmentViewer(attachment: MediaItem) {
		this.selectedAttachment = attachment;
		this.isAttachmentModalOpen = true;
	}

	closeAttachmentViewer() {
		this.isAttachmentModalOpen = false;
		this.selectedAttachment = null;
	}

	// Reorder toggle
	toggleReorderMode() {
		this.reorderMode = !this.reorderMode;
	}

	// Sort mode
	setSortMode(mode: SortMode) {
		this.sortMode = mode;
	}

	// Drag and drop reorder
	async handleQuestionDrop(
		draggedItem: QuestionItem,
		sourceContainer: string | null | undefined,
		targetContainer: string | null | undefined,
		questionsData: QuestionItem[] | null | undefined
	) {
		if (!targetContainer || sourceContainer === targetContainer || !this.client) return;

		const sourceIndex = this.questionList.findIndex((i) => i._id === draggedItem._id);
		const targetIndex = parseInt(targetContainer);

		if (sourceIndex === -1 || Number.isNaN(targetIndex)) return;

		const updatedList = [...this.questionList];
		const [moved] = updatedList.splice(sourceIndex, 1);
		updatedList.splice(targetIndex, 0, moved);
		this.questionList = updatedList;

		try {
			await this.client.mutation(api.question.updateQuestionOrder, {
				questionId: moved._id,
				newOrder: targetIndex,
				moduleId: this.moduleId as Id<'module'>
			});
		} catch (error) {
			console.error('Failed to update question order:', error);
			this.questionList = [...(questionsData || [])];
		}
	}

	// Handle edit param from URL
	handleEditParam(
		editParam: string | null,
		questionsData: QuestionItem[] | null | undefined
	) {
		if (!this.isEditQuestionModalOpen && this.editorMode === 'view' && questionsData && editParam) {
			const found = questionsData.find((q) => q._id === editParam);
			if (found) {
				const isDesktopOrTablet = typeof window !== 'undefined' && window.innerWidth >= 768;
				if (isDesktopOrTablet) {
					this.editingQuestionForInline = found as QuestionItem;
					this.editorMode = 'edit';
					this.selectedQuestionId = found._id;
				} else {
					this.editingQuestion = found as QuestionItem;
					this.isEditQuestionModalOpen = true;
				}
			}
		}
	}

	// Navigate to next/previous question (for keyboard navigation)
	navigateQuestion(direction: 'up' | 'down') {
		if (this.editorMode !== 'view') return;
		if (this.questionList.length === 0) return;

		const currentIndex = this.selectedQuestionId
			? this.questionList.findIndex((q) => q._id === this.selectedQuestionId)
			: -1;

		let newIndex: number;
		if (direction === 'down') {
			newIndex = currentIndex === -1 ? 0 : Math.min(currentIndex + 1, this.questionList.length - 1);
		} else {
			newIndex = currentIndex === -1 ? 0 : Math.max(currentIndex - 1, 0);
		}

		if (newIndex !== currentIndex && this.questionList[newIndex]) {
			this.handleQuestionSelect(this.questionList[newIndex]._id);
		}
	}

	// Clear mobile selection
	clearMobileSelection() {
		this.selectedQuestionId = null;
	}
}

// Create singleton instance
export const curationState = new QuestionCurationState();

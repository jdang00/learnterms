import {
	isIncorrectItem,
	isUnansweredItem,
	matchesReviewFilter,
	type AttemptResults,
	type ReviewEntry,
	type ReviewFilter
} from './results';

/** Which question the results page is reviewing, and under which filter. */
export class ReviewState {
	tab = $state<'summary' | 'review'>('summary');
	reviewFilter = $state<ReviewFilter>('all');
	selectedQuestionId = $state<string | null>(null);
	/** Bumped when navigation should scroll the selected question button into view. */
	scrollRequest = $state(0);

	constructor(private readonly source: () => AttemptResults | undefined) {}

	get results() {
		return this.source();
	}

	reviewEntries: ReviewEntry[] = $derived(
		(this.results?.reviewItems ?? []).map((item, originalIndex) => ({ item, originalIndex }))
	);

	filteredReviewEntries = $derived(
		this.reviewEntries.filter(({ item }) => matchesReviewFilter(item, this.reviewFilter))
	);

	reviewFilterCounts = $derived.by(() => {
		let flagged = 0;
		let unanswered = 0;
		let incorrect = 0;
		for (const { item } of this.reviewEntries) {
			if (item.response?.isFlagged) flagged += 1;
			if (isUnansweredItem(item)) unanswered += 1;
			if (isIncorrectItem(item)) incorrect += 1;
		}
		return { all: this.reviewEntries.length, flagged, unanswered, incorrect };
	});

	selectedEntry = $derived.by(() => {
		const entries = this.filteredReviewEntries;
		if (entries.length === 0) return null;
		if (!this.selectedQuestionId) return entries[0];
		return entries.find(({ item }) => item._id === this.selectedQuestionId) ?? entries[0];
	});

	selectedItem = $derived(this.selectedEntry?.item ?? null);

	selectedIndex = $derived.by(() => {
		const current = this.selectedEntry;
		if (!current) return 0;
		return this.filteredReviewEntries.findIndex(({ item }) => item._id === current.item._id);
	});

	selectedOriginalIndex = $derived(this.selectedEntry?.originalIndex ?? -1);

	/** Keeps the selection inside the current filter; call from an effect. */
	reconcileSelection() {
		const entries = this.filteredReviewEntries;
		if (entries.length === 0) {
			this.selectedQuestionId = null;
			return;
		}
		if (
			!this.selectedQuestionId ||
			!entries.some(({ item }) => item._id === this.selectedQuestionId)
		) {
			this.selectedQuestionId = entries[0].item._id;
		}
	}

	goToReviewQuestion(idx: number) {
		const entry = this.filteredReviewEntries[idx];
		if (!entry) return;
		this.selectedQuestionId = entry.item._id;
		this.scrollRequest += 1;
	}

	goToAdjacentReviewQuestion(delta: number) {
		const len = this.filteredReviewEntries.length;
		if (len === 0) return;
		const next = Math.min(len - 1, Math.max(0, this.selectedIndex + delta));
		this.goToReviewQuestion(next);
	}

	setReviewFilter(filter: ReviewFilter) {
		this.reviewFilter = filter;
		this.scrollRequest += 1;
	}

	showSummary() {
		this.tab = 'summary';
	}

	showReview() {
		this.tab = 'review';
	}
}

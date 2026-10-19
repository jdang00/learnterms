<script lang="ts">
	import { page } from '$app/state';
	import { useQuery } from 'convex-svelte';
	import { api } from '../../../../../../convex/_generated/api';
	import type { Id } from '../../../../../../convex/_generated/dataModel';
	import ResultsSummary from '$lib/tests/ResultsSummary.svelte';
	import ReviewSidebar from '$lib/tests/ReviewSidebar.svelte';
	import ReviewNavigator from '$lib/tests/ReviewNavigator.svelte';
	import ReviewQuestion from '$lib/tests/ReviewQuestion.svelte';
	import ReviewDock from '$lib/tests/ReviewDock.svelte';
	import { ReviewState } from '$lib/tests/review.svelte';
	import { fade, slide } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Alert from '$lib/components/ui/alert';
	import { LoadingState } from '$lib/components/ui/spinner';

	const classId = $derived(page.params.classId as Id<'class'>);
	const attemptId = $derived(page.params.attemptId as Id<'quizAttempts'>);

	const resultsQuery = useQuery(api.customQuiz.getAttemptResults, () =>
		attemptId ? { attemptId } : 'skip'
	);

	const review = new ReviewState(() => resultsQuery.data ?? undefined);
	let hideSidebar = $state(false);

	$effect(() => {
		review.reconcileSelection();
	});
</script>

<div class="flex flex-col h-[calc(100dvh-4rem)]" transition:fade={{ duration: 200 }}>
	{#if resultsQuery.isLoading}
		<LoadingState label="Loading your results…" class="flex-1 text-base" />
	{:else if resultsQuery.error}
		<div class="flex-1 flex items-center justify-center p-4">
			<Alert.Root tone="error" class="max-w-md">
				<CircleAlert />
				<Alert.Title>{resultsQuery.error.toString()}</Alert.Title>
			</Alert.Root>
		</div>
	{:else if resultsQuery.data}
		{@const attempt = resultsQuery.data.attempt}
		{@const summary = attempt.resultSummary}

		{#if review.tab === 'summary'}
			<ResultsSummary {attempt} {classId} onReview={() => review.showReview()} />
		{:else}
			<!-- Review view - matches free study module layout -->
			<div
				class="flex flex-col md:flex-col lg:flex-row bg-background h-full overflow-hidden p-2 md:p-3 lg:p-4 gap-3 sm:gap-4 lg:gap-8 transition-all duration-500 ease-in-out"
				transition:slide={{ duration: 400, easing: cubicInOut, axis: 'y' }}
			>
				<ReviewSidebar {review} {attempt} {classId} bind:hidden={hideSidebar} />

				<!-- Mobile header for review -->
				<div class="lg:hidden flex items-center justify-between gap-2 px-2">
					<Button variant="ghost" tone="secondary" size="sm" onclick={() => review.showSummary()}>
						<ChevronLeft size={16} /> Summary
					</Button>
					<Badge variant="solid" tone={summary?.passed ? 'success' : 'error'} size="sm">
						{summary?.scorePct ?? 0}%
					</Badge>
				</div>

				<!-- Main review content -->
				<div
					class="w-full lg:flex-1 lg:min-w-0 flex flex-col max-w-full lg:max-w-none overflow-y-auto grow min-h-0 h-full pb-24 sm:pb-36 lg:pb-48 relative"
				>
					<ReviewNavigator {review} />
					<ReviewQuestion {review} />
				</div>
			</div>

			<ReviewDock {review} />
		{/if}
	{/if}
</div>

<script lang="ts">
	import type { PageData } from './$types';
	import { onDestroy, onMount, tick } from 'svelte';
	import { QuestionMap } from './states.svelte';
	import { useClerkContext } from 'svelte-clerk';
	import Sidebar from './components/sidebar/Sidebar.svelte';
	import QuestionNavigation from './components/quiz/QuestionNavigation.svelte';
	import MobileMenu from './components/mobile/MobileMenu.svelte';
	import QuizContent from './components/quiz/QuizContent.svelte';
	import MobileInfo from './components/mobile/MobileInfo.svelte';

	const ctx = useClerkContext();
	const admin = $derived(ctx.user?.publicMetadata.role === 'admin');

	// Props and initial state
	let { data }: { data: PageData } = $props();
	let qm = $state(new QuestionMap(data));

	onMount(() => {
		qm.initializeState();
		qm.restorefromDB();
	});

	// Handles keyboard navigation and shortcuts
	function handleKeydown(event: KeyboardEvent) {
		if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
			return;
		}
		const key = event.key.toLowerCase();
		switch (key) {
			case 'tab':
				event.preventDefault();
				qm.handleSolution();
				break;
			case 'enter':
				qm.checkAnswers();
				break;
			case 'escape':
				qm.clearSelectedAnswers();
				break;
			case 'arrowright':
				qm.goToNextQuestion();
				break;
			case 'arrowleft':
				qm.goToPreviousQuestion();
				break;
			case 'f':
				qm.toggleFlag();
				break;
			case 's':
				if (event.shiftKey) {
					event.preventDefault();
					qm.toggleShuffle();
				}
				break;
		}
	}

	// Update question map and attach keydown listener.
	$effect(() => {
		qm.questionMap = Object.fromEntries(qm.questions.map((q) => [q.id, q]));
		qm.questionIds = qm.questions.map((q) => q.id);
		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});

	// Scroll to the currently selected question whenever it changes.
	$effect(() => {
		// This dependency causes the effect to re-run when qm.currentlySelectedId changes.
		void qm.currentlySelectedId;
		tick().then(() => {
			const currentIds = qm.getCurrentQuestionIds();
			const index = currentIds.indexOf(qm.currentlySelectedId);
			if (index > -1 && qm.questionButtons[index]) {
				qm.questionButtons[index].scrollIntoView({
					behavior: 'smooth',
					block: 'nearest',
					inline: 'center'
				});
			}
		});
	});

	// --- Debounce Implementation ---

	/**
	 * A type‑safe debounce helper that delays the execution of a function until after
	 * `delay` milliseconds have passed since its last call.
	 *
	 * @param func The function to debounce.
	 * @param delay The delay in milliseconds.
	 * @returns A debounced version of `func`.
	 */
	function debounce<T extends (...args: unknown[]) => void>(
		func: T,
		delay: number,
		{ immediate = false } = {}
	): (...args: Parameters<T>) => void {
		let timeoutId: ReturnType<typeof setTimeout>;
		return (...args: Parameters<T>) => {
			const callNow = immediate && !timeoutId;
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				if (!immediate) func(...args);
			}, delay);
			if (callNow) func(...args);
		};
	}

	// Create a debounced version of saveAllProgressToDB (with a 2-second delay)
	const debouncedSaveAllProgressToDB = debounce(() => {
		qm.saveAllProgressToDB();
	}, 15000);

	// Trigger the debounced save whenever the currently selected question changes.
	$effect(() => {
		const currentId = qm.currentlySelectedId;
		// If currentId is defined, schedule a save.
		if (currentId !== undefined) {
			debouncedSaveAllProgressToDB();
		}
	});

	// Ensure progress is saved immediately when the component is destroyed.
	onDestroy(() => {
		qm.saveAllProgressToDB();
	});
</script>

<div class="flex flex-row max-h-screen lg:h-screen lg:border-t border-b border-base-300">
	<Sidebar bind:qm {admin} />
	<MobileInfo bind:qm />
	<div class="container mx-auto lg:w-3/4 flex flex-col items-center lg:min-h-screen">
		<QuestionNavigation bind:qm />
		<div class="hidden sm:block border-t border-base-300 w-full my-6"></div>
		<QuizContent bind:qm />
	</div>
	<MobileMenu bind:qm />
</div>

<style>
	@keyframes fadeInOut {
		0% {
			opacity: 0;
			transform: translateY(-10px);
		}

		100% {
			opacity: 1;
			transform: translateY(-10px);
		}
	}
</style>

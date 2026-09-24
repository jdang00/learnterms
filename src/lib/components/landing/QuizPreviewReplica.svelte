<script lang="ts">
	import {
		ArrowDownNarrowWide,
		ArrowLeft,
		ArrowRight,
		Calculator,
		ChevronLeft,
		ExternalLink,
		Eye,
		FileText,
		Flag,
		Flame,
		Highlighter,
		Info,
		PanelRight,
		Settings,
		Shuffle,
		SlidersHorizontal,
		StickyNote
	} from 'lucide-svelte';
	import { Confetti } from 'svelte-confetti';
	import ModuleProgress from '$lib/components/ModuleProgress.svelte';
	import ProgressRing from '$lib/components/ProgressRing.svelte';
	import { summarizeModule } from '$lib/utils/moduleCompletion';
	import type { StudyEvidence } from '$lib/utils/studyMastery';
	import type { Id } from '../../../convex/_generated/dataModel';

	type Option = { id: string; text: string };
	type Question = {
		_id: string;
		stem: string;
		options: Option[];
		correctAnswers: string[];
		rationale: string;
		pages: number[];
	};

	// One module from one lecture, so every question belongs together.
	const moduleInfo = {
		emoji: '👁️',
		title: 'Lids & Adnexa',
		description: 'Blepharitis, meibomian gland dysfunction, and lid lesions from Lecture 6.',
		source: 'Lecture 6 – Lids and Adnexa'
	};

	const questions: Question[] = [
		{
			_id: 'q1',
			stem: 'An acute, tender, red swelling centered on a lash follicle at the lid margin is most consistent with:',
			options: [
				{ id: 'A', text: 'External hordeolum' },
				{ id: 'B', text: 'Chalazion' },
				{ id: 'C', text: 'Preseptal cellulitis' },
				{ id: 'D', text: 'Dacryocystitis' }
			],
			correctAnswers: ['A'],
			rationale:
				'An external hordeolum is an acute staphylococcal infection of a lash follicle or its glands of Zeis or Moll. It is tender and sits on the lid margin, unlike a chalazion.',
			pages: [8]
		},
		{
			_id: 'q2',
			stem: 'Clear, cylindrical collarettes wrapping the base of the lashes are pathognomonic for:',
			options: [
				{ id: 'A', text: 'Demodex blepharitis' },
				{ id: 'B', text: 'Seborrheic blepharitis' },
				{ id: 'C', text: 'Meibomian gland dysfunction' },
				{ id: 'D', text: 'Allergic conjunctivitis' }
			],
			correctAnswers: ['A'],
			rationale:
				'Collarettes are made of mite waste, keratinized cells, and eggs, and are considered pathognomonic for Demodex blepharitis. Seborrheic disease leaves greasy scales instead.',
			pages: [12]
		},
		{
			_id: 'q3',
			stem: 'A firm, painless nodule set back from the lid margin that has persisted for six weeks is most likely a:',
			options: [
				{ id: 'A', text: 'Chalazion' },
				{ id: 'B', text: 'External hordeolum' },
				{ id: 'C', text: 'Preseptal cellulitis' },
				{ id: 'D', text: 'Xanthelasma' }
			],
			correctAnswers: ['A'],
			rationale:
				'A chalazion is a sterile lipogranuloma from a blocked meibomian gland. It is painless and sits within the tarsus, away from the margin.',
			pages: [9]
		},
		{
			_id: 'q4',
			stem: 'Which two findings best support meibomian gland dysfunction?',
			options: [
				{ id: 'A', text: 'Capped meibomian gland orifices' },
				{ id: 'B', text: 'Turbid, toothpaste-like meibum on expression' },
				{ id: 'C', text: 'Collarettes at the lash base' },
				{ id: 'D', text: 'Follicular conjunctival reaction' }
			],
			correctAnswers: ['A', 'B'],
			rationale:
				'MGD is posterior lid margin disease: capped orifices and thick, turbid meibum on expression point to it. Collarettes are an anterior (Demodex) sign, and follicles suggest viral or chlamydial conjunctivitis.',
			pages: [15, 16]
		},
		{
			_id: 'q5',
			stem: 'Which topical treatment is FDA-approved specifically for Demodex blepharitis?',
			options: [
				{ id: 'A', text: 'Lotilaner ophthalmic solution 0.25%' },
				{ id: 'B', text: 'Cyclosporine ophthalmic emulsion 0.05%' },
				{ id: 'C', text: 'Loteprednol etabonate 0.5%' },
				{ id: 'D', text: 'Azithromycin ophthalmic solution 1%' }
			],
			correctAnswers: ['A'],
			rationale:
				'Lotilaner blocks the GABA-gated chloride channels of the mite, paralyzing and killing it. It was the first treatment approved for Demodex blepharitis.',
			pages: [13]
		},
		{
			_id: 'q6',
			stem: 'Which feature of a recurring “chalazion” should raise concern for sebaceous gland carcinoma?',
			options: [
				{ id: 'A', text: 'Recurrence at the same site with loss of lashes' },
				{ id: 'B', text: 'Resolution with warm compresses' },
				{ id: 'C', text: 'Tenderness that began within 48 hours' },
				{ id: 'D', text: 'A pointing, pus-filled head at the lash line' }
			],
			correctAnswers: ['A'],
			rationale:
				'Sebaceous gland carcinoma can masquerade as a chalazion or chronic unilateral blepharitis. Recurrence at the same site, madarosis, and lid thickening warrant a biopsy.',
			pages: [21]
		}
	];

	const START = 3;
	const startAnswers = { selected: ['A'], eliminated: ['D'] };

	let evidence = $state<Record<string, StudyEvidence>>({
		q1: { questionId: 'q1', checkedAt: 1, latestCorrect: true, cleanRecallCount: 2, masteredAt: 1 },
		q2: { questionId: 'q2', checkedAt: 1, latestCorrect: true, cleanRecallCount: 1 },
		q3: { questionId: 'q3', checkedAt: 1, latestCorrect: false, cleanRecallCount: 0 }
	});
	let flagged = $state<string[]>(['q3', 'q5']);
	let interacted = $state<string[]>(['q1', 'q2', 'q3', 'q4']);

	let currentIndex = $state(START);
	let selected = $state<string[]>([...startAnswers.selected]);
	let eliminated = $state<string[]>([...startAnswers.eliminated]);
	let showSolution = $state(false);
	let autoRevealed = $state(false);
	let outcome = $state<'correct' | 'incorrect' | null>(null);
	let resultNonce = $state(0);
	let showBanner = $state(false);
	let showConfetti = $state(false);
	let streak = $state(3);
	let highlightOn = $state(false);
	let isShuffled = $state(false);
	let hideSidebar = $state(false);

	const current = $derived(questions[currentIndex]);
	const isFlagged = $derived(flagged.includes(current._id));
	const summary = $derived(
		summarizeModule(
			questions.map((q) => ({
				_id: q._id as Id<'question'>,
				type: 'multiple_choice',
				options: q.options,
				correctAnswers: q.correctAnswers
			})),
			evidence,
			flagged
		)
	);
	const ring = $derived({
		correct: Math.round((summary.correct / summary.total) * 100),
		review: Math.round((summary.incorrect / summary.total) * 100)
	});

	$effect(() => {
		if (!resultNonce) return;
		showBanner = true;
		const timeout = setTimeout(() => (showBanner = false), 1800);
		return () => clearTimeout(timeout);
	});

	function select(index: number) {
		currentIndex = index;
		outcome = null;
		showSolution = false;
		autoRevealed = false;
		selected = index === START ? [...startAnswers.selected] : [];
		eliminated = index === START ? [...startAnswers.eliminated] : [];
	}

	function toggleOption(id: string) {
		if (eliminated.includes(id) || showSolution) return;
		selected = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
		outcome = null;
		if (!interacted.includes(current._id)) interacted = [...interacted, current._id];
	}

	function toggleElimination(id: string) {
		if (showSolution) return;
		eliminated = eliminated.includes(id) ? eliminated.filter((e) => e !== id) : [...eliminated, id];
		selected = selected.filter((s) => s !== id);
		outcome = null;
	}

	function check() {
		if (!selected.length) return;
		const expected = [...current.correctAnswers].sort();
		const actual = [...selected].sort();
		const correct = expected.length === actual.length && expected.every((a, i) => a === actual[i]);
		outcome = correct ? 'correct' : 'incorrect';
		resultNonce += 1;
		evidence[current._id] = {
			questionId: current._id,
			checkedAt: Date.now(),
			latestCorrect: correct,
			cleanRecallCount: correct ? 1 : 0
		};
		streak = correct ? streak + 1 : 0;
		if (!correct) return;
		showSolution = true;
		autoRevealed = true;
		showConfetti = false;
		requestAnimationFrame(() => {
			showConfetti = true;
			setTimeout(() => (showConfetti = false), 1200);
		});
	}

	function clear() {
		selected = [];
		eliminated = [];
		outcome = null;
	}

	function toggleFlag() {
		flagged = isFlagged ? flagged.filter((id) => id !== current._id) : [...flagged, current._id];
	}

	// A correct check reveals the answer without marking the other options wrong, as in the app.
	const optionBorder = (id: string) =>
		!showSolution
			? ''
			: current.correctAnswers.includes(id)
				? 'border-success'
				: autoRevealed
					? ''
					: 'border-error';
</script>

{#snippet sources()}
	<div class="mt-3 border-t border-base-300 pt-3">
		<p class="mb-2 flex items-start gap-1.5 text-xs font-medium text-base-content/60">
			<FileText size={12} class="mt-0.5 shrink-0" />
			<span class="break-words">{moduleInfo.source}</span>
		</p>
		<div class="flex flex-wrap gap-2">
			{#each current.pages as page (page)}
				<span
					class="btn btn-ghost btn-xs pointer-events-none gap-1.5 rounded-full border border-base-300 font-mono font-normal"
				>
					<FileText size={12} /> p. {page}<ExternalLink size={11} />
				</span>
			{/each}
		</div>
	</div>
{/snippet}

<div class="relative overflow-visible bg-base-100 p-2 md:p-3 lg:p-4">
	{#if showBanner && outcome}
		<div class="pointer-events-none absolute inset-x-0 top-16 z-[120] flex justify-center px-3">
			<div
				class="alert rounded-full px-4 py-2.5 shadow-lg sm:px-6 {outcome === 'correct'
					? 'alert-success'
					: 'alert-error'}"
			>
				<span class="text-base font-extrabold sm:text-lg"
					>{outcome === 'correct' ? 'Correct!' : 'Incorrect. Please try again.'}</span
				>
			</div>
		</div>
	{/if}

	<div
		class="flex min-h-[38rem] flex-col gap-3 overflow-visible bg-base-100 md:gap-4 lg:min-h-[46rem] lg:flex-row lg:gap-8"
	>
		<div
			class="relative hidden shrink-0 self-stretch overflow-x-hidden rounded-4xl border border-base-300 bg-base-100/80 p-3 px-4 backdrop-blur-md transition-all duration-200 ease-out lg:flex lg:flex-col {hideSidebar
				? 'w-[72px]'
				: 'w-[min(22rem,30vw)] xl:w-[min(24rem,28vw)]'}"
		>
			<button
				class="btn btn-ghost btn-square btn-sm absolute top-6 left-5 h-9 w-9 rounded-full"
				aria-label="Toggle sidebar"
				onclick={() => (hideSidebar = !hideSidebar)}
			>
				<PanelRight
					size={18}
					class="transition-transform duration-300 {hideSidebar ? 'rotate-180' : ''}"
				/>
			</button>

			{#if !hideSidebar}
				<div class="mt-8 p-4 pt-12 md:p-5 lg:p-6">
					<h4 class="-ms-6 text-sm font-bold tracking-wide text-secondary">
						<button type="button" class="btn btn-ghost rounded-full font-bold text-secondary">
							<ChevronLeft size={16} /> Back
						</button>
					</h4>
					<h2 class="mt-2 flex min-w-0 items-start gap-3 text-xl leading-tight font-semibold">
						<span class="shrink-0 text-2xl">{moduleInfo.emoji}</span>
						<span class="min-w-0 text-balance">{moduleInfo.title}</span>
					</h2>
					<p class="mt-2 text-base-content/70">{moduleInfo.description}</p>

					<div class="mt-6">
						<ModuleProgress
							{summary}
							currentId={current._id}
							onclick={() => {}}
							onreset={() => {}}
						/>
					</div>

					<section class="mt-5" aria-label="Tools">
						<div class="mb-1.5 flex items-center justify-between px-1">
							<h3 class="text-[0.7rem] font-semibold tracking-wider text-base-content/45 uppercase">
								Tools
							</h3>
							<span
								class="btn btn-ghost btn-xs btn-circle pointer-events-none text-base-content/40"
							>
								<SlidersHorizontal size={13} />
							</span>
						</div>
						<div
							class="grid grid-cols-4 gap-1 rounded-2xl border border-base-300 bg-base-200/50 p-1"
						>
							<button
								type="button"
								class="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.68rem] font-medium transition-colors {highlightOn
									? 'bg-[var(--color-highlighter)]/25 font-semibold text-[var(--color-highlighter-ink)] ring-1 ring-current/25 ring-inset'
									: 'text-base-content/70 hover:bg-base-100 hover:text-base-content'}"
								aria-pressed={highlightOn}
								onclick={() => (highlightOn = !highlightOn)}
							>
								<Highlighter
									size={18}
									class={highlightOn ? '' : 'text-[var(--color-highlighter-ink)]'}
								/>
								Highlight
							</button>
							<span
								class="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.68rem] font-medium text-base-content/70"
							>
								<Calculator size={18} class="text-info" /> Calculator
							</span>
							<span
								class="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.68rem] font-medium text-base-content/70"
							>
								<StickyNote size={18} class="text-info" /> Notes
							</span>
							<span
								class="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.68rem] tabular-nums"
							>
								<span class="flex items-center gap-1 text-sm font-semibold text-base-content">
									<Flame
										size={16}
										class={streak ? 'text-orange-500' : 'text-base-content/40'}
										fill={streak ? 'currentColor' : 'none'}
									/>
									{streak}
								</span>
								<span class="font-medium text-base-content/55"
									>{streak === 1 ? 'correct' : 'in a row'}</span
								>
							</span>
						</div>
					</section>
				</div>

				<div class="m-4 flex flex-col justify-center">
					<div class="card rounded-2xl border border-base-300 bg-base-100">
						<div class="card-body">
							<div class="flex flex-row flex-wrap justify-between border-b pb-2">
								<h2 class="card-title">Rationale</h2>
								<div class="flex flex-row">
									<kbd class="kbd kbd-sm me-1 hidden self-center xl:block">tab</kbd>
									<button
										class="btn btn-ghost btn-circle"
										aria-label="Show rationale"
										onclick={() => {
											showSolution = !showSolution;
											autoRevealed = false;
										}}
									>
										<Eye />
									</button>
								</div>
							</div>
							<div
								class="mt-2 break-words transition-[filter] duration-300 {showSolution
									? 'blur-none'
									: 'blur-xs select-none'}"
								aria-hidden={!showSolution}
							>
								<p class="tiptap-content">{current.rationale}</p>
								{@render sources()}
							</div>
						</div>
					</div>

					<div class="mt-6 flex flex-row justify-center">
						<button class="btn btn-soft btn-sm rounded-full">
							<Settings size={16} />
							<span class="ml-1">Settings</span>
						</button>
					</div>
				</div>
			{:else}
				<div class="ms-1 mt-16 flex flex-col items-center space-y-4">
					<button
						type="button"
						class="flex w-full items-center justify-center rounded-full bg-secondary text-center font-bold text-secondary-content"
						aria-label="Back"
					>
						<ChevronLeft size={24} />
					</button>
					<button type="button" class="btn btn-circle btn-lg btn-soft btn-primary">
						<Info />
					</button>
					<ProgressRing correct={ring.correct} review={ring.review} label={summary.completion} />
					<button
						type="button"
						class="btn btn-circle btn-lg btn-soft"
						aria-label="Show rationale"
						onclick={() => (showSolution = !showSolution)}
					>
						<Eye />
					</button>
					<div
						class="flex flex-col items-center gap-1 rounded-2xl border border-base-300 bg-base-200/50 p-1"
					>
						<span class="grid size-11 place-items-center rounded-xl">
							<Highlighter size={20} class="text-[var(--color-highlighter-ink)]" />
						</span>
						<span class="grid size-11 place-items-center rounded-xl">
							<Calculator size={20} class="text-info" />
						</span>
						<span class="grid size-11 place-items-center rounded-xl">
							<StickyNote size={20} class="text-info" />
						</span>
					</div>
					<div class="my-2 w-full border-t border-base-300"></div>
					<button type="button" class="btn btn-circle btn-lg btn-soft" aria-label="Settings">
						<Settings />
					</button>
				</div>
			{/if}
		</div>

		<div class="w-full lg:min-w-0 lg:flex-1">
			<div class="mb-3 rounded-2xl border border-base-300 bg-base-100/80 p-3 lg:hidden">
				<h3 class="text-lg font-semibold">{moduleInfo.emoji} {moduleInfo.title}</h3>
				<p class="text-sm text-base-content/70">{moduleInfo.description}</p>
			</div>

			<div
				class="relative flex h-20 max-h-20 min-h-20 flex-none flex-row items-center space-x-4 overflow-x-auto overflow-y-hidden rounded-4xl border border-base-300 px-6 py-3 whitespace-nowrap"
			>
				{#each questions as question, index (question._id)}
					<div class="indicator">
						{#if flagged.includes(question._id)}
							<span
								class="indicator-item indicator-start badge badge-xs z-[1] translate-x-[-1/4] translate-y-[-1/4] badge-warning"
							></span>
						{/if}
						<button
							class="btn btn-circle btn-md btn-soft {current._id === question._id
								? 'btn-primary'
								: 'btn-outline'} {interacted.includes(question._id) ? 'btn-accent' : ''}"
							onclick={() => select(index)}>{index + 1}</button
						>
					</div>
				{/each}
			</div>

			<div class="relative p-3 pb-28 sm:p-4 sm:text-lg md:pb-32 lg:text-xl">
				<div class="flex flex-row justify-between">
					<div class="items-end gap-1 self-center sm:gap-2">
						<div class="ms-2 text-base leading-tight font-medium sm:text-xl">
							{current.stem}
						</div>
					</div>
					<div class="hidden items-center gap-2 lg:flex">
						<span class="btn btn-soft btn-accent btn-circle pointer-events-none m-1">
							<ArrowDownNarrowWide />
						</span>
					</div>
				</div>

				<div class="my-3 ms-2 text-base leading-tight font-medium text-base-content/70 sm:text-lg">
					Select {current.correctAnswers.length}.
				</div>

				<div class="flex flex-col justify-start space-y-2 md:space-y-3 lg:space-y-4">
					{#each current.options as option, i (option.id)}
						<label
							class="label flex w-full cursor-pointer items-center rounded-2xl border-2 border-base-300 bg-base-200 p-2 transition-colors duration-200 sm:rounded-full md:p-3 {optionBorder(
								option.id
							)}"
						>
							<input
								type="checkbox"
								class="checkbox checkbox-primary checkbox-sm ms-4"
								checked={selected.includes(option.id)}
								onchange={() => toggleOption(option.id)}
								disabled={eliminated.includes(option.id) || showSolution}
							/>
							<span class="my-3 ml-3 grow text-base text-wrap break-words md:ml-4">
								<span class="mr-2 font-semibold select-none">{String.fromCharCode(65 + i)}.</span>
								<span class={eliminated.includes(option.id) ? 'line-through opacity-50' : ''}
									>{option.text}</span
								>
							</span>
							<div class="mr-2 flex w-12 items-center justify-center md:mr-4 md:w-16">
								<button
									type="button"
									class="btn btn-ghost btn-circle btn-md"
									onclick={() => toggleElimination(option.id)}
									disabled={showSolution}
									aria-label="eliminate option {option.id}"
								>
									<Eye />
								</button>
							</div>
						</label>
					{/each}
				</div>

				<!-- The Classic dock layout, pinned inside the preview instead of the viewport. -->
				<div
					class="absolute -bottom-7 left-1/2 z-40 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-base-300 bg-base-100/80 px-5 py-4 shadow-xl backdrop-blur-md md:inline-flex"
					role="toolbar"
					aria-label="Quiz controls"
				>
					{#if showConfetti}
						<div
							class="pointer-events-none absolute -top-8 left-1/2 z-[65] h-0 w-0 -translate-x-1/2"
						>
							<Confetti />
						</div>
					{/if}
					<button class="btn btn-sm btn-ghost rounded-full text-base-content/75" onclick={clear}
						>Clear</button
					>
					<button class="btn btn-sm btn-success rounded-full" onclick={check}>Check</button>
					<button
						class="btn btn-sm btn-circle btn-warning {isFlagged ? '' : 'btn-outline'}"
						aria-label="Flag question"
						aria-pressed={isFlagged}
						onclick={toggleFlag}
					>
						<Flag size={18} />
					</button>
					<button
						class="btn btn-sm btn-secondary rounded-full"
						onclick={() => (isShuffled = !isShuffled)}
					>
						<Shuffle size={18} />
						{isShuffled ? 'Unshuffle' : 'Shuffle'}
					</button>
					<div class="divider divider-horizontal mx-0.5"></div>
					<button
						class="btn btn-sm btn-outline"
						style="border-radius: 9999px 0.3rem 0.3rem 9999px"
						aria-label="Previous question"
						disabled={currentIndex === 0}
						onclick={() => select(currentIndex - 1)}
					>
						<ArrowLeft size={18} />
					</button>
					<button
						class="btn btn-sm btn-outline"
						style="border-radius: 0.3rem 9999px 9999px 0.3rem; margin-left: calc(2px - 0.5rem)"
						aria-label="Next question"
						disabled={currentIndex === questions.length - 1}
						onclick={() => select(currentIndex + 1)}
					>
						<ArrowRight size={18} />
					</button>
					<span
						class="btn btn-ghost btn-sm btn-circle pointer-events-none text-base-content/40"
						aria-hidden="true"
					>
						<SlidersHorizontal size={16} />
					</span>
				</div>
			</div>
		</div>
	</div>
</div>

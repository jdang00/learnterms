<script lang="ts">
	import {
		ArrowDownNarrowWide,
		ArrowLeft,
		ArrowRight,
		ChevronLeft,
		Eye,
		Flag,
		Info,
		PanelRight,
		Settings,
		Shuffle
	} from 'lucide-svelte';
	import { Confetti } from 'svelte-confetti';

	type Option = { id: string; text: string };
	type Question = {
		_id: string;
		stem: string;
		options: Option[];
		correctAnswers: string[];
		explanation: string;
	};

	const questions: Question[] = [
		{
			_id: 'q1',
			stem: 'A patient with progressive myopia and inferior corneal steepening on topography most likely has:',
			options: [
				{ id: 'A', text: 'Keratoconus' },
				{ id: 'B', text: 'Fuchs endothelial dystrophy' },
				{ id: 'C', text: 'Central serous chorioretinopathy' },
				{ id: 'D', text: 'Optic neuritis' }
			],
			correctAnswers: ['A'],
			explanation:
				'Keratoconus causes progressive corneal thinning and cone-like protrusion, creating irregular astigmatism and worsening myopia, often first seen on corneal topography.'
		},
		{
			_id: 'q2',
			stem: 'Which exam finding is most consistent with anterior blepharitis?',
			options: [
				{ id: 'A', text: 'Eyelid margin erythema with collarettes at the lash base' },
				{ id: 'B', text: 'Corneal dendrites with terminal bulbs' },
				{ id: 'C', text: 'Cherry-red macula with retinal whitening' },
				{ id: 'D', text: 'Hypopyon in the anterior chamber' }
			],
			correctAnswers: ['A'],
			explanation:
				'Anterior blepharitis often presents with inflamed lid margins and lash debris or collarettes. Targeting lid hygiene and inflammation control is central to treatment.'
		},
		{
			_id: 'q3',
			stem: 'A patient with metamorphopsia and central blur most likely has early:',
			options: [
				{ id: 'A', text: 'Age-related macular degeneration' },
				{ id: 'B', text: 'Anterior blepharitis' },
				{ id: 'C', text: 'Central serous chorioretinopathy' },
				{ id: 'D', text: 'Epiretinal membrane' }
			],
			correctAnswers: ['A'],
			explanation:
				'Macular disease commonly distorts central vision and straight lines. Metamorphopsia should raise concern for AMD or other macular pathology.'
		},
		{
			_id: 'q4',
			stem: 'Which lens change most directly corrects simple myopic astigmatism?',
			options: [
				{ id: 'A', text: 'Add minus cylinder power at the proper axis' },
				{ id: 'B', text: 'Increase plus sphere power only' },
				{ id: 'C', text: 'Remove all cylindrical correction' },
				{ id: 'D', text: 'Use plus cylinder at 90 degrees for all cases' }
			],
			correctAnswers: ['A'],
			explanation:
				'Astigmatism correction requires cylindrical power aligned to the refractive axis. Myopic astigmatism specifically needs minus-cylinder correction in the appropriate meridian.'
		},
		{
			_id: 'q5',
			stem: 'Which lens type is used to correct the refractive error of aphakia?',
			options: [
				{ id: 'A', text: 'A high-plus convex lens' },
				{ id: 'B', text: 'A high-minus concave lens' },
				{ id: 'C', text: 'A plano lens' },
				{ id: 'D', text: 'A cylindrical lens only' }
			],
			correctAnswers: ['A'],
			explanation:
				'Aphakia removes the natural positive lens power of the eye, so correction requires strong plus power from an intraocular lens or external convex lens.'
		},
		{
			_id: 'q6',
			stem: 'Cotton-wool spots, microaneurysms, and dot-blot hemorrhages are classic for:',
			options: [
				{ id: 'A', text: 'Anterior uveitis' },
				{ id: 'B', text: 'Diabetic retinopathy' },
				{ id: 'C', text: 'Optic neuritis' },
				{ id: 'D', text: 'Blepharitis' }
			],
			correctAnswers: ['B'],
			explanation:
				'Diabetic retinopathy frequently shows microvascular retinal damage, including microaneurysms, hemorrhages, and cotton-wool spots on fundus exam.'
		}
	];

	const moduleInfo = {
		emoji: '👁️',
		title: 'Ocular Pathology & Optics',
		description: 'Focused question reps for astigmatism, anterior blepharitis, retina, and corneal disease.',
		order: 2
	};

	const interactedQuestionIds = ['q1', 'q2', 'q4', 'q5'];
	let flaggedQuestionIds = $state<string[]>(['q4', 'q6']);

	let currentQuestionIndex = $state(3);
	let selectedAnswers = $state<string[]>(['A']);
	let eliminatedAnswers = $state<string[]>(['D']);
	let showSolution = $state(false);
	let checkResult = $state('');
	let resultNonce = $state(0);
	let showResultBanner = $state(false);
	let showConfetti = $state(false);
	let isShuffled = $state(false);
	let hideSidebar = $state(false);

	const currentQuestion = $derived(questions[currentQuestionIndex]);
	const progressPct = $derived(Math.round((interactedQuestionIds.length / questions.length) * 100));
	const isCurrentFlagged = $derived(flaggedQuestionIds.includes(currentQuestion._id));

	$effect(() => {
		resultNonce;
		if (!checkResult) {
			showResultBanner = false;
			return;
		}

		showResultBanner = true;
		const timeout = setTimeout(() => {
			showResultBanner = false;
		}, 1800);

		return () => clearTimeout(timeout);
	});

	function handleSelectQuestion(index: number) {
		currentQuestionIndex = index;
		checkResult = '';
		showSolution = false;
		selectedAnswers = index === 3 ? ['A'] : [];
		eliminatedAnswers = index === 3 ? ['D'] : [];
	}

	function toggleOption(optionId: string) {
		if (eliminatedAnswers.includes(optionId) || showSolution) return;
		selectedAnswers = selectedAnswers.includes(optionId)
			? selectedAnswers.filter((id) => id !== optionId)
			: [...selectedAnswers, optionId];
	}

	function toggleElimination(optionId: string) {
		if (showSolution) return;
		if (eliminatedAnswers.includes(optionId)) {
			eliminatedAnswers = eliminatedAnswers.filter((id) => id !== optionId);
			return;
		}
		eliminatedAnswers = [...eliminatedAnswers, optionId];
		selectedAnswers = selectedAnswers.filter((id) => id !== optionId);
	}

	function checkAnswer() {
		const expected = [...currentQuestion.correctAnswers].sort();
		const actual = [...selectedAnswers].sort();
		const correct =
			expected.length === actual.length && expected.every((answer, i) => answer === actual[i]);
		checkResult = correct ? 'Correct!' : 'Incorrect. Please try again.';
		resultNonce += 1;
		if (correct) {
			showConfetti = false;
			requestAnimationFrame(() => {
				showConfetti = true;
				setTimeout(() => {
					showConfetti = false;
				}, 1200);
			});
		}
	}

	function clearSelections() {
		selectedAnswers = [];
		eliminatedAnswers = [];
		checkResult = '';
		resultNonce += 1;
		showConfetti = false;
	}

	function toggleCurrentFlag() {
		if (isCurrentFlagged) {
			flaggedQuestionIds = flaggedQuestionIds.filter((id) => id !== currentQuestion._id);
		} else {
			flaggedQuestionIds = [...flaggedQuestionIds, currentQuestion._id];
		}
	}

	function goPrevious() {
		if (currentQuestionIndex === 0) return;
		handleSelectQuestion(currentQuestionIndex - 1);
	}

	function goNext() {
		if (currentQuestionIndex === questions.length - 1) return;
		handleSelectQuestion(currentQuestionIndex + 1);
	}

	function toggleShuffle() {
		isShuffled = !isShuffled;
	}
</script>

<div class="relative overflow-visible bg-base-100 p-2 md:p-3 lg:p-4">
	{#if showResultBanner && checkResult}
		<div class="pointer-events-none absolute inset-x-0 top-16 z-[120] flex justify-center px-3">
			<div
				class={`alert rounded-full px-4 py-2 shadow-lg ${checkResult === 'Correct!' ? 'alert-success' : 'alert-error'}`}
			>
				<span class="font-extrabold">{checkResult}</span>
			</div>
		</div>
	{/if}

	<div
		class="flex min-h-[38rem] h-full flex-col gap-3 overflow-visible bg-base-100 md:gap-4 lg:min-h-[46rem] lg:flex-row lg:gap-8"
	>
		<div
			class="relative hidden self-stretch flex-shrink-0 overflow-x-hidden overflow-y-auto rounded-4xl border border-base-300 bg-base-100/80 p-3 px-4 shadow-lg backdrop-blur-md transition-all duration-200 ease-out lg:flex lg:flex-col {hideSidebar
				? 'w-[72px]'
				: 'w-[min(22rem,30vw)] xl:w-[min(24rem,28vw)]'}"
		>
			<button
				class="btn btn-ghost btn-square btn-sm absolute left-5 top-6 h-9 w-9 rounded-full"
				aria-label="Toggle sidebar"
				onclick={() => (hideSidebar = !hideSidebar)}
			>
				<PanelRight
					size={18}
					class={`transition-transform duration-300 ${hideSidebar ? 'rotate-180' : ''}`}
				/>
			</button>

			{#if !hideSidebar}
				<div class="mt-16 p-4 md:p-5 lg:p-6">
					<h4 class="-ms-6 text-sm font-bold tracking-wide text-secondary">
						<button type="button" class="btn btn-ghost rounded-full font-bold">
							<ChevronLeft size={16} /> MODULE {moduleInfo.order + 1}
						</button>
					</h4>
					<h2 class="mt-2 flex items-start gap-3 text-2xl font-semibold">
						<span class="shrink-0 text-2xl">{moduleInfo.emoji}</span>
						<span>{moduleInfo.title}</span>
					</h2>
					<p class="mt-2 text-base-content/70">{moduleInfo.description}</p>

					<div class="mt-6">
						<p class="mb-2 text-base-content/60">{progressPct}% done.</p>
						<progress class="progress progress-success w-full" value={progressPct} max="100"
						></progress>
					</div>
				</div>

				<div class="m-4">
					<div class="card mt-2 rounded-2xl bg-base-100 shadow-xl">
						<div class="card-body">
							<div class="flex flex-row justify-between border-b pb-2">
								<h2 class="card-title">Rationale</h2>
								<button
									class="btn btn-ghost btn-circle"
									onclick={() => (showSolution = !showSolution)}
								>
									<Eye size={18} />
								</button>
							</div>
							<div
								class={`tiptap-content mt-2 transition-all duration-300 ${showSolution ? 'blur-none' : 'blur-sm'}`}
							>
								{currentQuestion.explanation}
							</div>
						</div>
					</div>

					<div class="mt-6 flex justify-center">
						<button class="btn btn-soft btn-sm rounded-full">
							<Settings size={16} />
							<span class="ml-1">Settings</span>
						</button>
					</div>
				</div>
			{:else}
				<div class="mt-16 ms-1 flex flex-col items-center justify-self-center space-y-4">
					<div class="flex flex-col items-center space-y-4">
						<button
							type="button"
							class="group flex w-full items-center justify-center rounded-full bg-secondary text-center font-bold text-secondary-content transition-colors"
						>
							<span class="group-hover:hidden">{moduleInfo.order + 1}</span>
							<span class="hidden items-center justify-center group-hover:inline-flex"
								><ChevronLeft size={24} /></span
							>
						</button>

						<button type="button" class="btn btn-circle btn-lg btn-soft btn-primary">
							<Info />
						</button>

						<div
							class="radial-progress bg-base-300 text-xs text-success"
							style="--value:{progressPct}; --size:3rem; --thickness: 3px;"
							aria-valuenow={progressPct}
							role="progressbar"
						>
							{progressPct}%
						</div>

						<button
							type="button"
							class="btn btn-circle btn-lg btn-soft"
							onclick={() => (showSolution = !showSolution)}
						>
							<Eye />
						</button>
					</div>

					<div class="my-2 w-full border-t border-base-300"></div>

					<button type="button" class="btn btn-circle btn-lg btn-soft mt-3" title="Settings">
						<Settings />
					</button>
				</div>
			{/if}
		</div>

		<div class="w-full lg:min-w-0 lg:flex-1">
			<div class="mb-3 rounded-2xl border border-base-300 bg-base-100/80 p-3 lg:hidden">
				<p class="text-xs font-semibold uppercase tracking-wide text-secondary">
					Module {moduleInfo.order + 1}
				</p>
				<h3 class="mt-1 text-lg font-semibold">{moduleInfo.emoji} {moduleInfo.title}</h3>
				<p class="text-sm text-base-content/70">{moduleInfo.description}</p>
			</div>

			<div
				class="relative flex h-20 min-h-20 max-h-20 flex-row items-center space-x-4 overflow-x-auto overflow-y-hidden whitespace-nowrap rounded-4xl border border-base-300 px-6 py-3"
			>
				{#each questions as question, index (question._id)}
					<div class="indicator">
						{#if flaggedQuestionIds.includes(question._id)}
							<span
								class="indicator-item indicator-start badge badge-warning badge-xs z-[1] translate-x-[-1/4] translate-y-[-1/4]"
							></span>
						{/if}
						<button
							class={`btn btn-circle btn-md btn-soft ${currentQuestion._id === question._id ? 'btn-primary' : 'btn-outline'} ${interactedQuestionIds.includes(question._id) ? 'btn-accent' : ''}`}
							onclick={() => handleSelectQuestion(index)}
						>
							{index + 1}
						</button>
					</div>
				{/each}
			</div>

			<div class="relative p-4 pb-28 text-md sm:text-lg md:pb-32 lg:text-xl">
				<div class="flex flex-row justify-between gap-4">
					<div class="items-end gap-1 self-center sm:gap-2">
						<div class="ms-2 text-base font-medium leading-tight sm:text-xl">
							{currentQuestion.stem}
						</div>
					</div>

					<div class="hidden items-center gap-2 lg:flex">
						<div class="dropdown dropdown-end">
							<button type="button" class="btn btn-soft btn-accent m-1 btn-circle">
								<ArrowDownNarrowWide size={18} />
							</button>
							<ul
								tabindex="-1"
								class="dropdown-content menu z-[1] w-52 rounded-2xl bg-base-100 p-2 shadow-sm"
							>
								<li><button>Show Flagged</button></li>
								<li><button>Show Incomplete</button></li>
							</ul>
						</div>
					</div>
				</div>

				<div class="my-3 ms-2 text-base font-medium leading-tight text-base-content/70 sm:text-lg">
					Select {currentQuestion.correctAnswers.length}.
				</div>

				<div class="flex flex-col justify-start space-y-2 md:space-y-3 lg:space-y-4">
					{#each currentQuestion.options as option, i (option.id)}
						<label
							class={`label cursor-pointer rounded-full border-2 border-base-300 bg-base-200 p-2 transition-colors md:p-3 ${showSolution ? (currentQuestion.correctAnswers.includes(option.id) ? 'border-success' : 'border-error') : ''}`}
						>
							<input
								type="checkbox"
								class="checkbox checkbox-primary checkbox-sm ms-4"
								value={option.id}
								checked={selectedAnswers.includes(option.id)}
								onchange={() => toggleOption(option.id)}
								disabled={eliminatedAnswers.includes(option.id) || showSolution}
							/>
							<span class="my-3 ml-3 flex-grow break-words text-sm text-wrap md:ml-4 md:text-base">
								<span class="mr-2 select-none font-semibold">{String.fromCharCode(65 + i)}.</span>
								<span class={eliminatedAnswers.includes(option.id) ? 'line-through opacity-50' : ''}
									>{option.text}</span
								>
							</span>
							<div class="mr-2 flex w-12 items-center justify-center md:mr-4 md:w-16">
								<button
									type="button"
									class="btn btn-ghost btn-circle btn-md"
									onclick={() => toggleElimination(option.id)}
									disabled={showSolution}
									aria-label={`eliminate option ${option.id}`}
								>
									<Eye size={18} />
								</button>
							</div>
						</label>
					{/each}
				</div>

				<div
					class="absolute -bottom-7 left-1/2 z-40 hidden max-w-max -translate-x-1/2 flex-nowrap items-center gap-1.5 rounded-full border border-base-300 bg-base-100 px-2.5 py-2.5 shadow-xl backdrop-blur-md md:inline-flex"
				>
					<button class="btn btn-sm btn-outline rounded-full" onclick={clearSelections}
						>Clear</button
					>
					<div class="relative inline-flex">
						<button class="btn btn-sm btn-soft btn-success rounded-full" onclick={checkAnswer}
							>Check</button
						>
						{#if showConfetti}
							<div
								class="pointer-events-none absolute -top-10 left-1/2 z-[65] h-0 w-0 -translate-x-1/2"
							>
								<Confetti />
							</div>
						{/if}
					</div>
					<button
						class={`btn btn-sm btn-circle ${isCurrentFlagged ? 'btn-warning' : 'btn-warning btn-soft'}`}
						onclick={toggleCurrentFlag}
						aria-label="flag question"
					>
						<Flag size={18} />
					</button>
					<button class="btn btn-sm btn-secondary rounded-full" onclick={toggleShuffle}>
						<Shuffle size={18} />
						{isShuffled ? 'Unshuffle' : 'Shuffle'}
					</button>

					<div class="divider divider-horizontal mx-1"></div>

					<button
						class="btn btn-sm btn-outline"
						style="border-radius: 9999px 50% 50% 9999px;"
						onclick={goPrevious}
						disabled={currentQuestionIndex === 0}
					>
						<ArrowLeft size={18} />
					</button>
					<button
						class="btn btn-sm btn-outline"
						style="border-radius: 50% 9999px 9999px 50%;"
						onclick={goNext}
						disabled={currentQuestionIndex === questions.length - 1}
					>
						<ArrowRight size={18} />
					</button>
				</div>
			</div>
		</div>
	</div>
</div>

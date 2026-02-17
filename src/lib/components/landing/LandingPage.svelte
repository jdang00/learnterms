<script lang="ts">
	import {
		ArrowRight,
		BrainCircuit,
		Flag,
		Keyboard,
		FileText,
		Sparkles,
		Check,
		BarChart3,
		Eye,
		EyeOff,
		Image,
		ZoomIn,
		Users
	} from 'lucide-svelte';
	import QuizPreviewReplica from '$lib/components/landing/QuizPreviewReplica.svelte';
	import ReviewsShowcase from '$lib/components/landing/ReviewsShowcase.svelte';
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	function reveal(node: HTMLElement, opts?: { y?: number; delay?: number; stagger?: number }) {
		const y = opts?.y ?? 24;
		const delay = opts?.delay ?? 0;
		const stagger = opts?.stagger ?? 0;

		const children = stagger ? (Array.from(node.children) as HTMLElement[]) : [];
		const targets = stagger ? children : [node];

		targets.forEach((el, i) => {
			el.style.opacity = '0';
			el.style.transform = `translateY(${y}px)`;
			el.style.transition = `opacity 0.6s cubic-bezier(.16,1,.3,1) ${delay + i * stagger}ms, transform 0.6s cubic-bezier(.16,1,.3,1) ${delay + i * stagger}ms`;
		});

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					targets.forEach((el, i) => {
						setTimeout(() => {
							el.style.opacity = '1';
							el.style.transform = 'translateY(0)';
						}, delay + i * stagger);
					});
					observer.disconnect();
				}
			},
			{ threshold: 0.15 }
		);
		observer.observe(node);

		return { destroy: () => observer.disconnect() };
	}

	let scrollY = $state(0);
	let glowContainer: HTMLElement;

	$effect(() => {
		if (!glowContainer) return;
		const rate = scrollY * 0.12;
		glowContainer.style.transform = `translateY(${rate}px)`;
	});

	// Flag & filter demo state
	let showFlaggedOnly = $state(false);
	let mockQuestions = $state([
		{ id: 1, label: 'Q1', flagged: false },
		{ id: 2, label: 'Q2', flagged: true },
		{ id: 3, label: 'Q3', flagged: false },
		{ id: 4, label: 'Q4', flagged: true },
		{ id: 5, label: 'Q5', flagged: false },
		{ id: 6, label: 'Q6', flagged: false },
		{ id: 7, label: 'Q7', flagged: false },
		{ id: 8, label: 'Q8', flagged: true }
	]);
	let flagActiveQ = $state(3); // which question is "selected" in the demo
	let visibleQuestions = $derived(
		showFlaggedOnly ? mockQuestions.filter((q) => q.flagged) : mockQuestions
	);
	function toggleFlag(id: number) {
		const q = mockQuestions.find((q) => q.id === id);
		if (q) q.flagged = !q.flagged;
		flagActiveQ = id;
	}

	// Keyboard shortcut animation — matches actual quizzing shortcuts
	const keySequence: { key: string; label: string; action: string }[] = [
		{ key: '1', label: 'Select A', action: 'selected-a' },
		{ key: '3', label: 'Select C', action: 'selected-c' },
		{ key: '⏎', label: 'Check', action: 'checking' },
		{ key: '→', label: 'Next', action: 'next' },
		{ key: 'F', label: 'Flag', action: 'flagging' },
		{ key: 'Tab', label: 'Solution', action: 'solution' }
	];
	let activeKeyIndex = $state(0);

	let activeAction = $derived(keySequence[activeKeyIndex]?.action ?? '');

	$effect(() => {
		const interval = setInterval(() => {
			activeKeyIndex = (activeKeyIndex + 1) % keySequence.length;
		}, 1400);
		return () => clearInterval(interval);
	});

	// AI generation animation
	let aiStep = $state(0);
	const aiSteps = ['parsing', 'generating', 'done'] as const;

	$effect(() => {
		const timings = [2200, 2800, 2000];
		let timeout: ReturnType<typeof setTimeout>;
		const advance = () => {
			aiStep = (aiStep + 1) % aiSteps.length;
			timeout = setTimeout(advance, timings[aiStep]);
		};
		timeout = setTimeout(advance, timings[aiStep]);
		return () => clearTimeout(timeout);
	});

	// Solution reveal demo
	let solutionRevealed = $state(false);

	// Analytics demo — cohort student roster
	const cohortStudents = [
		{ initials: 'MR', name: 'Maya R.', progress: 94, flags: 1, color: 'bg-primary', recent: '2m ago' },
		{ initials: 'JD', name: 'Jake D.', progress: 82, flags: 3, color: 'bg-secondary', recent: '8m ago' },
		{ initials: 'SP', name: 'Sofia P.', progress: 71, flags: 5, color: 'bg-accent', recent: '14m ago' },
		{ initials: 'LT', name: 'Liam T.', progress: 58, flags: 8, color: 'bg-info', recent: '21m ago' }
	];
	let analyticsVisible = $state(false);

	// Attachment demo — image zoom
	let attachmentZoomed = $state(false);

	// Workflow data — lean, no decorative fluff
	const studentSteps = [
		{
			title: 'Pick a module and start',
			detail: 'Select topic scope and question count. Every session has a clear objective from the first click.'
		},
		{
			title: 'Answer under exam-style controls',
			detail: 'Elimination, flagging, and keyboard shortcuts — the same mechanics you use on test day.'
		},
		{
			title: 'Filter to what you missed',
			detail: 'Flagged items become your next session. No wasted reps on material you already know.'
		},
		{
			title: 'Repeat until clean',
			detail: 'Each pass narrows the set. Watch your flag count drop and your confidence rise.'
		}
	];

	const adminSteps = [
		{
			title: 'Upload source material',
			detail: 'Drop lecture notes, PDFs, or outlines into the pipeline. No reformatting needed.'
		},
		{
			title: 'Generate questions in batches',
			detail: 'AI produces stems, choices, and rationales in one pass. Edit what needs editing.'
		},
		{
			title: 'Review and publish',
			detail: 'Approve production-ready items, flag anything that needs another look.'
		},
		{
			title: 'Monitor and improve',
			detail: 'Analytics surface weak questions, high flag rates, and emerging gaps. Update the bank live.'
		}
	];
</script>

<svelte:window bind:scrollY={scrollY} />

<main class="relative isolate overflow-hidden pb-28">
	<div class="pointer-events-none absolute inset-0 -z-10">
		<div class="page-grid"></div>
		<div bind:this={glowContainer} class="glow-wrap">
			<div class="glow glow-focus"></div>
			<div class="glow glow-momentum"></div>
			<div class="glow glow-spark"></div>
		</div>
	</div>

	<div class="mx-auto max-w-6xl px-4 sm:px-8 lg:px-12">
		<section
			class="mx-auto flex min-h-[48vh] max-w-4xl items-center justify-start text-left md:min-h-[54vh]"
			aria-labelledby="hero-title"
		>
			<div in:fade={{ duration: 550 }} class="max-w-3xl">
				<h1
					id="hero-title"
					class="text-balance text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl"
				>
					LearnTerms is Smarter Studying, Simplified.
				</h1>
				<p class="mt-5 max-w-3xl text-lg text-base-content/80 sm:text-xl">
					LearnTerms gives you a live quiz workspace for optics, anterior blepharitis, astigmatism,
					and ocular disease where answers, flags, and progress sync instantly.
				</p>
				<div class="mt-8 flex">
					<a href="/sign-in" class="btn btn-primary rounded-full px-6">
						Start studying
						<ArrowRight size={18} />
					</a>
				</div>
			</div>
		</section>

		<section class="mt-10" aria-labelledby="quiz-preview-title">
			<div class="mb-5 max-w-3xl">
				<h2 id="quiz-preview-title" class="text-2xl font-bold sm:text-3xl">Look familiar?</h2>
				<p class="mt-2 text-base-content/75">
					Feel at home with the familiar testing tools and workflow you already use. This is your
					high-speed sandbox to practice with full control, built for healthcare students across
					programs.
				</p>
			</div>
			<div in:scale={{ duration: 600, delay: 120, easing: cubicOut }}>
				<div class="mockup-browser relative z-10 overflow-visible border border-base-300 bg-base-100">
					<div class="mockup-browser-toolbar">
						<div class="input border border-base-300">app.learnterms.com/classes/module</div>
					</div>
					<div class="overflow-visible border-t border-base-300 bg-base-100 pb-10">
						<QuizPreviewReplica />
					</div>
				</div>
			</div>
		</section>

		<!-- Feature showcase: interactive demos -->
		<section class="mt-16" aria-labelledby="features-title" use:reveal={{ y: 20 }}>
			<div class="mb-6">
				<h2 id="features-title" class="text-3xl font-bold sm:text-4xl">
					Built for how students actually study
				</h2>
				<p class="mt-2 text-base-content/75">
					Equipping students with the practice tools and control that are usually hidden behind
					proctor-managed testing workflows.
				</p>
			</div>

			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" use:reveal={{ y: 18, stagger: 90 }}>
				<!-- Flag & filter — interactive mini quiz nav -->
				<div class="feature-card flex flex-col">
					<div class="mb-3 flex items-start justify-between">
						<div class="rounded-xl border border-base-300/80 bg-base-100/70 p-2">
							<Flag size={18} />
						</div>
					</div>
					<h3 class="text-xl font-semibold">Flag & filter</h3>
					<p class="mt-2 text-sm text-base-content/75">
						Mark what you missed and focus your next pass where it matters most.
					</p>

					<div class="mt-4 flex flex-1 flex-col rounded-xl border border-base-300/60 bg-base-100/50 overflow-hidden">
						<div class="flex items-center justify-between border-b border-base-300/40 px-3 py-2">
							<span class="text-[10px] text-base-content/50">{visibleQuestions.length} of {mockQuestions.length} questions</span>
							<label class="flex cursor-pointer items-center gap-1.5">
								<span class="text-[10px] font-medium" class:text-warning={showFlaggedOnly}>Flagged</span>
								<input
									type="checkbox"
									class="toggle toggle-xs toggle-accent"
									bind:checked={showFlaggedOnly}
								/>
							</label>
						</div>
						<div class="flex-1 p-2">
							<div class="grid grid-cols-4 gap-1.5">
								{#each visibleQuestions as q (q.id)}
									<button
										class="flag-q-btn relative flex flex-col items-center justify-center rounded-lg border py-2 px-1 text-[10px] font-medium transition-all duration-200 {q.id === flagActiveQ ? 'ring-1 ring-primary/40' : ''} {q.flagged
											? 'bg-warning/10 text-warning border-warning/30 hover:bg-warning/20'
											: 'bg-base-200/60 text-base-content/60 border-base-300/60 hover:bg-base-200'}"
										onclick={() => toggleFlag(q.id)}
									>
										<span>{q.label}</span>
										<Flag size={9} class="mt-0.5 transition-all duration-200 {q.flagged ? 'text-warning opacity-100 scale-100' : 'opacity-20 scale-75'}" />
									</button>
								{/each}
							</div>
						</div>
						<div class="border-t border-base-300/40 px-3 py-1.5">
							<p class="text-[9px] text-base-content/35 text-center">Click to flag &middot; toggle to filter</p>
						</div>
					</div>
				</div>

				<!-- AI generation — animated pipeline demo -->
				<div class="feature-card ai-card">
					<div class="mb-3 flex items-start justify-between">
						<div class="rounded-xl border border-base-300/80 bg-base-100/70 p-2">
							<BrainCircuit size={18} />
						</div>
					</div>
					<h3 class="text-xl font-semibold">AI-generated or hand-built</h3>
					<p class="mt-2 text-sm text-base-content/75">
						Generate questions from source material in seconds, or create them manually — both work in the same workflow.
					</p>

					<div class="ai-pipeline mt-4 overflow-hidden rounded-xl border border-base-300/60 bg-base-100/50">
						<!-- Step indicators -->
						<div class="flex items-center gap-0 border-b border-base-300/40 text-[10px] font-medium">
							<div class="ai-step flex-1 px-3 py-2 text-center transition-all duration-500 {aiSteps[aiStep] === 'parsing' ? 'bg-info/10 text-info' : aiSteps[aiStep] === 'generating' || aiSteps[aiStep] === 'done' ? 'text-base-content/40' : 'text-base-content/30'}">
								<FileText size={11} class="mx-auto mb-0.5" />
								Parse
							</div>
							<div class="ai-step flex-1 border-x border-base-300/40 px-3 py-2 text-center transition-all duration-500 {aiSteps[aiStep] === 'generating' ? 'bg-secondary/10 text-secondary' : aiSteps[aiStep] === 'done' ? 'text-base-content/40' : 'text-base-content/30'}">
								<Sparkles size={11} class="mx-auto mb-0.5" />
								Generate
							</div>
							<div class="ai-step flex-1 px-3 py-2 text-center transition-all duration-500 {aiSteps[aiStep] === 'done' ? 'bg-success/10 text-success' : 'text-base-content/30'}">
								<Check size={11} class="mx-auto mb-0.5" />
								Ready
							</div>
						</div>

						<!-- Animated content area -->
						<div class="relative h-[7.5rem] p-3">
							{#if aiSteps[aiStep] === 'parsing'}
								<div class="space-y-1.5" in:fade={{ duration: 300 }}>
									<div class="flex items-center gap-2">
										<div class="h-5 w-5 rounded bg-error/15 flex items-center justify-center">
											<span class="text-[8px] font-bold text-error">PDF</span>
										</div>
										<span class="text-[11px] font-medium">Chapter_06_Anterior_Blepharitis_and_Astigmatism.pdf</span>
									</div>
									<div class="mt-2 space-y-1">
										<div class="ai-scan-line h-1.5 rounded-full bg-info/20">
											<div class="h-full rounded-full bg-info/60 ai-scan-fill"></div>
										</div>
										<div class="ai-scan-line h-1.5 rounded-full bg-info/20" style="animation-delay: 0.3s">
											<div class="h-full rounded-full bg-info/60 ai-scan-fill" style="animation-delay: 0.3s"></div>
										</div>
										<div class="ai-scan-line h-1.5 rounded-full bg-info/20" style="animation-delay: 0.6s">
											<div class="h-full rounded-full bg-info/60 ai-scan-fill" style="animation-delay: 0.6s"></div>
										</div>
									</div>
									<p class="text-[10px] text-info/70 mt-1">Extracting content from 23 pages...</p>
								</div>
							{:else if aiSteps[aiStep] === 'generating'}
								<div class="space-y-1" in:fade={{ duration: 300 }}>
									<div class="ai-gen-line flex items-center gap-2 rounded-lg bg-secondary/5 px-2 py-1.5" style="animation-delay: 0s">
										<span class="text-[10px] text-secondary/60 font-mono">Q1</span>
										<span class="text-[10px] leading-tight">Which lid finding most strongly suggests anterior blepharitis?</span>
									</div>
									<div class="ai-gen-line flex items-center gap-2 rounded-lg bg-secondary/5 px-2 py-1.5" style="animation-delay: 0.2s">
										<span class="text-[10px] text-secondary/60 font-mono">Q2</span>
										<span class="text-[10px] leading-tight">Which refraction change best improves myopic astigmatism?</span>
									</div>
									<div class="ai-gen-line flex items-center gap-2 rounded-lg bg-secondary/5 px-2 py-1.5" style="animation-delay: 0.4s">
										<span class="text-[10px] text-secondary/60 font-mono">Q3</span>
										<span class="ai-typing text-[10px] text-secondary/50">Generating...</span>
									</div>
								</div>
							{:else}
								<div in:fade={{ duration: 300 }}>
									<div class="flex items-center justify-between mb-2">
										<span class="text-[11px] font-semibold text-success">40 questions ready</span>
										<span class="rounded-full bg-success/10 px-2 py-0.5 text-[9px] font-medium text-success">MCQ + Case-based</span>
									</div>
									<div class="grid grid-cols-8 gap-1">
										{#each Array(16) as _, i}
											<div class="ai-dot h-2 w-full rounded-full {i < 14 ? 'bg-success/30' : 'bg-warning/30'}" style="animation-delay: {i * 30}ms"></div>
										{/each}
									</div>
									<p class="text-[10px] text-base-content/50 mt-2">2 flagged for review &middot; 38 published</p>
								</div>
							{/if}
						</div>
					</div>
				</div>

				<!-- Rationale-first questions -->
				<div class="feature-card sm:col-span-2 lg:col-span-1">
					<div class="mb-3 flex items-start justify-between">
						<div class="rounded-xl border border-base-300/80 bg-base-100/70 p-2">
							<Eye size={18} />
						</div>
					</div>
					<h3 class="text-xl font-semibold">Rationale-first questions</h3>
					<p class="mt-2 text-sm text-base-content/75">
						Every question is built with an explanation baked in — AI-generated or hand-written.
						Students don't just get answers, they get the why.
					</p>

					<div class="mt-4 rounded-xl border border-base-300/60 bg-base-100/50 p-3">
						<div class="mb-1.5 flex items-center gap-1.5">
							<span class="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">Question</span>
						</div>
						<p class="text-[11px] font-medium leading-tight text-base-content/80 mb-2">
							Why does uncorrected astigmatism create ghosted letters?
						</p>
						<div class="flex items-center gap-1.5 mb-1.5">
							<span class="rounded bg-secondary/10 px-1.5 py-0.5 text-[9px] font-medium text-secondary">Rationale</span>
							<span class="text-[9px] text-base-content/35">auto-generated with question</span>
						</div>
						<div class="solution-box relative rounded-lg border border-base-300/50 bg-base-200/40 p-2.5 overflow-hidden">
							<p class="text-[10px] leading-relaxed text-base-content/70 transition-all duration-400 {solutionRevealed ? '' : 'blur-sm select-none'}">
								When corneal power differs between meridians, light focuses at different planes
								instead of one retinal point. That split focus produces blur, shadowing, and
								double-edge letters.
							</p>
							{#if !solutionRevealed}
								<div class="absolute inset-0 flex items-center justify-center">
									<button
										class="btn btn-xs btn-ghost gap-1 text-base-content/50 hover:text-base-content/80"
										onclick={() => solutionRevealed = true}
									>
										<EyeOff size={12} />
										<span class="text-[10px]">Reveal</span>
									</button>
								</div>
							{:else}
								<button
									class="absolute top-1 right-1 btn btn-xs btn-ghost btn-circle opacity-40 hover:opacity-100"
									onclick={() => solutionRevealed = false}
								>
									<Eye size={10} />
								</button>
							{/if}
						</div>
						<p class="mt-1.5 text-[9px] text-base-content/40 italic">
							Revealed on demand, or automatically when answered correctly
						</p>
					</div>
				</div>
			</div>

			<!-- Second row of feature cards -->
			<div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" use:reveal={{ y: 18, stagger: 90 }}>
				<!-- Cohort Analytics -->
				<div class="feature-card">
					<div class="mb-3 flex items-start justify-between">
						<div class="rounded-xl border border-base-300/80 bg-base-100/70 p-2">
							<BarChart3 size={18} />
						</div>
					</div>
					<h3 class="text-xl font-semibold">Cohort analytics</h3>
					<p class="mt-2 text-sm text-base-content/75">
						See who's active, what gets flagged most, and where learners are getting stuck.
					</p>

					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="analytics-demo mt-4 rounded-xl border border-base-300/60 bg-base-100/50 p-3"
						use:reveal={{ y: 0 }}
						onmouseenter={() => analyticsVisible = true}
					>
						<div class="mb-2.5 flex items-center justify-between">
							<span class="text-[10px] font-medium text-base-content/50">OPT 301 &middot; Lids, Cornea, and Retina</span>
							<span class="rounded-full bg-success/10 px-2 py-0.5 text-[9px] font-medium text-success">89% avg</span>
						</div>
						<div class="space-y-1.5">
							{#each cohortStudents as student, i}
								<div class="flex items-center gap-2">
									<div class="student-avatar h-5 w-5 shrink-0 rounded-full {student.color}/15 flex items-center justify-center">
										<span class="text-[7px] font-bold {student.color.replace('bg-', 'text-')}">{student.initials}</span>
									</div>
									<div class="w-11 shrink-0">
										<span class="block text-[9px] text-base-content/70 truncate">{student.name}</span>
										<span class="block text-[7px] text-base-content/30">{student.recent}</span>
									</div>
									<div class="flex-1 h-2.5 rounded-full bg-base-200/80 overflow-hidden">
										<div
											class="analytics-bar h-full rounded-full {student.color}/50 transition-all duration-700 ease-out"
											style="width: {analyticsVisible ? student.progress : 0}%{!analyticsVisible ? '; transition-delay: ' + i * 120 + 'ms' : ''}"
										></div>
									</div>
									<span class="w-7 text-right text-[9px] font-mono font-medium text-base-content/60">{student.progress}%</span>
									{#if student.flags > 0}
										<span class="flex items-center gap-0.5 text-[8px] text-warning/70 w-5">
											<Flag size={7} />{student.flags}
										</span>
									{:else}
										<span class="flex items-center gap-0.5 text-[8px] text-success/50 w-5">
											<Check size={7} />
										</span>
									{/if}
								</div>
							{/each}
						</div>
						<div class="mt-2 flex items-center justify-between pt-2 border-t border-base-300/30">
							<div class="flex items-center gap-1">
								<Users size={9} class="text-base-content/40" />
								<span class="text-[9px] text-base-content/40">32 enrolled</span>
							</div>
							<span class="text-[9px] text-base-content/35">Hotspots: anterior bleph, astigmatism, AMD</span>
						</div>
					</div>
				</div>

				<!-- Keyboard shortcuts — mini quiz that reacts -->
				<div class="feature-card flex flex-col">
					<div class="mb-3 flex items-start justify-between">
						<div class="rounded-xl border border-base-300/80 bg-base-100/70 p-2">
							<Keyboard size={18} />
						</div>
					</div>
					<h3 class="text-xl font-semibold">Keyboard-first</h3>
					<p class="mt-2 text-sm text-base-content/75">
						Number keys to select, Enter to check, arrows to navigate.
					</p>

					<div class="mt-4 flex flex-1 flex-col rounded-xl border border-base-300/60 bg-base-100/50 overflow-hidden">
						<!-- Mini quiz context — fixed height to prevent layout shift -->
						<div class="flex-1 border-b border-base-300/40 p-3">
							<p class="text-[10px] text-base-content/50 mb-1.5">Q7 of 48</p>
							<p class="text-[11px] font-medium leading-tight text-base-content/80 mb-2">
								Which sign most strongly supports anterior blepharitis?
							</p>
							<div class="space-y-1">
								<div class="kbd-option rounded-md border px-2 py-1 text-[10px] transition-all duration-300 {activeAction === 'selected-a' || activeAction === 'checking' ? 'border-primary/40 bg-primary/8 text-primary font-medium' : 'border-base-300/50 bg-base-200/40 text-base-content/60'} flex items-center justify-between gap-2">
									<span class="min-w-0"><span class="text-base-content/30 mr-1">1.</span>Collarettes at lash bases with lid margin erythema</span>
									<span
										class="w-3 shrink-0 text-center text-[8px] transition-opacity duration-200 {activeAction === 'checking'
											? 'opacity-100 text-success'
											: 'opacity-0'}"
										aria-hidden="true"
									>
										✓
									</span>
								</div>
								<div class="kbd-option rounded-md border px-2 py-1 text-[10px] transition-all duration-300 border-base-300/50 bg-base-200/40 text-base-content/60">
									<span class="text-base-content/30 mr-1">2.</span> Immediate full-thickness corneal melt
								</div>
								<div class="kbd-option rounded-md border px-2 py-1 text-[10px] transition-all duration-300 {activeAction === 'selected-c' ? 'border-secondary/40 bg-secondary/8 text-secondary font-medium' : 'border-base-300/50 bg-base-200/40 text-base-content/60'}">
									<span class="text-base-content/30 mr-1">3.</span> Cherry-red spot with retinal pallor
								</div>
							</div>
							<!-- Reserved space for contextual feedback — no layout shift -->
							<div class="mt-1.5 h-5">
								{#if activeAction === 'flagging'}
									<div class="flex items-center gap-1 text-[9px] text-warning" in:fade={{ duration: 200 }}>
										<Flag size={9} /> Flagged
									</div>
								{:else if activeAction === 'solution'}
									<p class="text-[9px] text-base-content/50 italic truncate" in:fade={{ duration: 200 }}>
										Lash collarettes plus lid margin inflammation strongly fit anterior blepharitis...
									</p>
								{/if}
							</div>
						</div>
						<!-- Key strip -->
						<div class="flex items-center justify-between px-2 py-2">
							{#each keySequence as shortcut, i}
								<div class="flex flex-col items-center gap-0.5">
									<kbd
										class="kbd text-[10px] leading-none min-w-[1.75rem] text-center transition-all duration-300"
										class:kbd-active={i === activeKeyIndex}
									>
										{shortcut.key}
									</kbd>
									<span
										class="text-[8px] leading-tight transition-colors duration-300 {i === activeKeyIndex
											? 'text-secondary'
											: 'text-base-content/30'}"
									>
										{shortcut.label}
									</span>
								</div>
							{/each}
						</div>
					</div>
				</div>

				<!-- Rich Attachments & Formatting -->
				<div class="feature-card sm:col-span-2 lg:col-span-1">
					<div class="mb-3 flex items-start justify-between">
						<div class="rounded-xl border border-base-300/80 bg-base-100/70 p-2">
							<Image size={18} />
						</div>
					</div>
					<h3 class="text-xl font-semibold">Beyond plain text</h3>
					<p class="mt-2 text-sm text-base-content/75">
						Rich formatting, media attachments, zoom, and captions so question quality stays high.
					</p>

					<div class="mt-4 rounded-xl border border-base-300/60 bg-base-100/50 p-3">
						<!-- Mini rich text toolbar -->
						<div class="mb-2 flex items-center gap-0.5 rounded-lg border border-base-300/40 bg-base-200/50 px-1.5 py-1">
							<span class="rich-btn text-[10px] font-bold px-1.5 py-0.5 rounded">B</span>
							<span class="rich-btn text-[10px] italic px-1.5 py-0.5 rounded">I</span>
							<span class="rich-btn text-[10px] underline px-1.5 py-0.5 rounded">U</span>
							<span class="text-base-300/60 mx-0.5">|</span>
							<span class="rich-btn text-[10px] px-1.5 py-0.5 rounded">H1</span>
							<span class="rich-btn text-[10px] px-1.5 py-0.5 rounded">H2</span>
							<span class="text-base-300/60 mx-0.5">|</span>
							<span class="rich-btn px-1.5 py-0.5 rounded"><Image size={9} /></span>
						</div>

						<!-- Attachment grid mockup -->
						<div class="grid grid-cols-2 gap-1.5">
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div
								class="attachment-thumb group relative h-16 overflow-hidden rounded-lg border border-base-300/50 bg-base-200/60 cursor-pointer transition-all duration-300"
								class:attachment-zoomed={attachmentZoomed}
								onclick={() => attachmentZoomed = !attachmentZoomed}
							>
								<div class="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10"></div>
								<div class="absolute inset-0 flex items-center justify-center">
									<div class="space-y-0.5 text-center">
										<div class="mx-auto h-6 w-10 rounded border border-base-content/10 bg-base-100/50 flex items-center justify-center">
											<div class="h-3 w-3 rounded-full bg-primary/20"></div>
										</div>
										<span class="text-[7px] text-base-content/40">slitlamp_anterior_bleph.png</span>
									</div>
								</div>
								<div class="absolute inset-0 flex items-center justify-center bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
									<ZoomIn size={14} class="text-primary/60" />
								</div>
							</div>
							<div class="space-y-1.5">
								<div class="attachment-thumb h-[29px] overflow-hidden rounded-lg border border-base-300/50 bg-base-200/60">
									<div class="h-full w-full bg-gradient-to-r from-secondary/8 to-accent/8 flex items-center justify-center">
										<span class="text-[7px] text-base-content/40">keratometry_astigmatism.svg</span>
									</div>
								</div>
								<div class="attachment-thumb h-[29px] overflow-hidden rounded-lg border border-base-300/50 bg-base-200/60">
									<div class="h-full w-full bg-gradient-to-r from-info/8 to-primary/8 flex items-center justify-center">
										<span class="text-[7px] text-base-content/40">fundus_drusen_macular.png</span>
									</div>
								</div>
							</div>
						</div>
						<p class="mt-1.5 text-[9px] text-base-content/40">
							Full zoom &amp; pan viewer — images can be gated behind the rationale reveal
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Workflow sections -->
		<section class="mt-20" aria-labelledby="workflow-title" use:reveal={{ y: 22 }}>
			<div class="mb-10 max-w-3xl">
				<h2 id="workflow-title" class="text-3xl font-bold sm:text-4xl">
					Two loops, one platform
				</h2>
				<p class="mt-3 text-base-content/75">
					Students practice and review. Content teams build and improve. Both happen live without getting in each other's way.
				</p>
			</div>

			<div class="grid gap-8 lg:grid-cols-2" use:reveal={{ y: 18, stagger: 120 }}>
				<!-- Student flow -->
				<div>
					<h3 class="text-lg font-bold mb-4">How students study</h3>
					<div class="wf-timeline wf-timeline-student">
						{#each studentSteps as step, i}
							<div class="wf-step">
								<div class="wf-dot"></div>
								<div class="wf-content">
									<h4 class="text-sm font-semibold">{step.title}</h4>
									<p class="mt-1 text-sm leading-relaxed text-base-content/65">{step.detail}</p>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Admin flow -->
				<div>
					<h3 class="text-lg font-bold mb-4">How content stays sharp</h3>
					<div class="wf-timeline wf-timeline-admin">
						{#each adminSteps as step, i}
							<div class="wf-step">
								<div class="wf-dot"></div>
								<div class="wf-content">
									<h4 class="text-sm font-semibold">{step.title}</h4>
									<p class="mt-1 text-sm leading-relaxed text-base-content/65">{step.detail}</p>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</section>

		<section class="mt-16" use:reveal={{ y: 20 }}>
			<ReviewsShowcase />
		</section>

		<!-- Bottom CTA -->
		<section class="mt-20 mb-4" use:reveal={{ y: 20 }}>
			<div class="cta-section text-center py-14 px-6 sm:px-10">
				<h2 class="text-3xl font-bold sm:text-4xl">
					Ready to study smarter?
				</h2>
				<p class="mx-auto mt-4 max-w-lg text-base-content/70">
					Join your class or start your own. Setup takes under five minutes.
				</p>
				<div class="mt-8 flex flex-wrap items-center justify-center gap-3">
					<a href="/sign-in" class="btn btn-primary btn-lg rounded-full px-8">
						Start studying
						<ArrowRight size={18} />
					</a>
					<a href="/contact" class="btn btn-ghost btn-lg rounded-full px-6">
						Sign your school up
					</a>
				</div>
			</div>
		</section>
	</div>
</main>

<style>
	.page-grid {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(
					to right,
					color-mix(in oklab, var(--color-base-content) 14%, transparent) 1px,
					transparent 1px
				)
				0 0 / 42px 42px,
			linear-gradient(
					to bottom,
					color-mix(in oklab, var(--color-base-content) 14%, transparent) 1px,
					transparent 1px
				)
				0 0 / 42px 42px;
		opacity: 0.5;
		mask-image:
			linear-gradient(to bottom, transparent 0%, black 8%, black 50%, transparent 100%),
			radial-gradient(ellipse 90% 75% at 50% 45%, black 15%, transparent 100%);
		mask-composite: intersect;
		-webkit-mask-image:
			linear-gradient(to bottom, transparent 0%, black 8%, black 50%, transparent 100%),
			radial-gradient(ellipse 90% 75% at 50% 45%, black 15%, transparent 100%);
		-webkit-mask-composite: source-in;
	}

	.glow-wrap {
		position: absolute;
		inset: 0;
		will-change: transform;
	}

	.glow {
		position: absolute;
		pointer-events: none;
	}

	/* Wide primary wash — sits behind hero text, weighted to the left like a reading lamp */
	.glow-focus {
		top: 6rem;
		left: 2%;
		width: 55%;
		height: 28rem;
		border-radius: 40% 60% 55% 45%;
		background: radial-gradient(
			ellipse at 40% 50%,
			color-mix(in oklab, var(--color-primary) 48%, transparent),
			color-mix(in oklab, var(--color-primary) 18%, transparent) 55%,
			transparent 100%
		);
		filter: blur(64px);
		opacity: 0.6;
		animation: focus-breathe 7s ease-in-out infinite;
	}

	/* Diagonal secondary streak — cuts across the right side, bold and directional */
	.glow-momentum {
		top: 10rem;
		right: -2rem;
		width: 36rem;
		height: 10rem;
		border-radius: 999px;
		background: linear-gradient(
			90deg,
			transparent 5%,
			color-mix(in oklab, var(--color-secondary) 50%, transparent) 35%,
			color-mix(in oklab, var(--color-secondary) 60%, transparent) 55%,
			color-mix(in oklab, var(--color-secondary) 20%, transparent) 85%,
			transparent
		);
		filter: blur(44px);
		opacity: 0.55;
		transform: rotate(-22deg);
		animation: streak-drift 9s ease-in-out infinite;
	}

	/* Accent spark — organic shape, sits lower-left as a vivid counterpoint */
	.glow-spark {
		bottom: 22%;
		left: 12%;
		width: 14rem;
		height: 12rem;
		border-radius: 30% 70% 55% 45%;
		background: radial-gradient(
			ellipse at 55% 45%,
			color-mix(in oklab, var(--color-accent) 60%, transparent),
			color-mix(in oklab, var(--color-accent) 22%, transparent) 55%,
			transparent 100%
		);
		filter: blur(40px);
		opacity: 0.5;
		animation: spark-pulse 5s ease-in-out infinite;
	}

	@keyframes focus-breathe {
		0%,
		100% {
			opacity: 0.6;
			transform: scale(1) translate(0, 0);
		}
		50% {
			opacity: 0.45;
			transform: scale(1.06) translate(0.5rem, -0.3rem);
		}
	}

	@keyframes streak-drift {
		0%,
		100% {
			transform: rotate(-22deg) translateX(0);
			opacity: 0.55;
		}
		50% {
			transform: rotate(-19deg) translateX(2rem);
			opacity: 0.45;
		}
	}

	@keyframes spark-pulse {
		0%,
		100% {
			opacity: 0.5;
			transform: scale(1) rotate(0deg);
		}
		50% {
			opacity: 0.65;
			transform: scale(1.15) rotate(3deg);
		}
	}

	.feature-card {
		position: relative;
		border-radius: 1.1rem;
		padding: 1rem;
		background:
			linear-gradient(
				to bottom,
				color-mix(in oklab, var(--color-base-200) 70%, transparent),
				color-mix(in oklab, var(--color-base-100) 95%, transparent)
			),
			linear-gradient(
					to right,
					color-mix(in oklab, var(--color-base-content) 8%, transparent) 1px,
					transparent 1px
				)
				0 0 / 22px 22px,
			linear-gradient(
					to bottom,
					color-mix(in oklab, var(--color-base-content) 8%, transparent) 1px,
					transparent 1px
				)
				0 0 / 22px 22px;
		border: 1px solid color-mix(in oklab, var(--color-base-content) 14%, transparent);
	}

	.feature-card::before {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		border-radius: inherit;
		box-shadow: inset 0 0 0 1px color-mix(in oklab, white 18%, transparent);
		opacity: 0.45;
	}

	.grid-frame {
		padding: 1.1rem;
		border-radius: 1.25rem;
		border: 1px solid color-mix(in oklab, var(--color-base-content) 14%, transparent);
		background:
			linear-gradient(
					to right,
					color-mix(in oklab, var(--color-base-content) 8%, transparent) 1px,
					transparent 1px
				)
				0 0 / 26px 26px,
			linear-gradient(
					to bottom,
					color-mix(in oklab, var(--color-base-content) 8%, transparent) 1px,
					transparent 1px
				)
				0 0 / 26px 26px,
			linear-gradient(
				180deg,
				color-mix(in oklab, var(--color-base-200) 72%, transparent),
				color-mix(in oklab, var(--color-base-100) 95%, transparent)
			);
	}

	/* Timeline workflow */
	.wf-timeline {
		position: relative;
		padding-left: 1.5rem;
	}

	.wf-timeline::before {
		content: '';
		position: absolute;
		left: 0.34rem;
		top: 0.5rem;
		bottom: 0.5rem;
		width: 1px;
		background: color-mix(in oklab, var(--wf-accent) 30%, transparent);
	}

	.wf-timeline-student {
		--wf-accent: var(--color-primary);
	}

	.wf-timeline-admin {
		--wf-accent: var(--color-secondary);
	}

	.wf-step {
		position: relative;
		padding-bottom: 1.25rem;
	}

	.wf-step:last-child {
		padding-bottom: 0;
	}

	.wf-dot {
		position: absolute;
		left: -1.2rem;
		top: 0.35rem;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 999px;
		background: var(--wf-accent);
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--wf-accent) 15%, transparent);
	}

	.wf-step:hover .wf-dot {
		box-shadow: 0 0 0 5px color-mix(in oklab, var(--wf-accent) 25%, transparent);
		transition: box-shadow 0.2s ease;
	}

	.cta-section {
		border-top: 1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent);
	}

	.kbd-active {
		background: color-mix(in oklab, var(--color-secondary) 20%, var(--color-base-200));
		border-color: var(--color-secondary);
		color: var(--color-secondary);
		transform: translateY(-2px);
		box-shadow: 0 2px 8px color-mix(in oklab, var(--color-secondary) 25%, transparent);
	}

	/* AI card animations */
	.ai-scan-fill {
		width: 0%;
		animation: scan-fill 1.8s ease-out forwards;
	}

	@keyframes scan-fill {
		0% { width: 0%; }
		100% { width: 100%; }
	}

	.ai-gen-line {
		opacity: 0;
		transform: translateY(4px);
		animation: gen-appear 0.4s ease-out forwards;
	}

	@keyframes gen-appear {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.ai-typing::after {
		content: '';
		display: inline-block;
		width: 3px;
		height: 10px;
		margin-left: 2px;
		background: currentColor;
		animation: blink 0.8s step-end infinite;
		vertical-align: middle;
	}

	@keyframes blink {
		0%, 100% { opacity: 1; }
		50% { opacity: 0; }
	}

	.ai-dot {
		opacity: 0;
		animation: dot-pop 0.2s ease-out forwards;
	}

	@keyframes dot-pop {
		from {
			opacity: 0;
			transform: scale(0);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	/* Flag button hover/active */
	.flag-q-btn {
		cursor: pointer;
		user-select: none;
	}

	.flag-q-btn:active {
		transform: scale(0.93);
	}

	/* Keyboard option highlight */
	.kbd-option {
		will-change: background-color, border-color;
	}

	/* Analytics — student avatars */
	.student-avatar {
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}

	/* Analytics bar fills */
	.analytics-bar {
		will-change: width;
	}


	/* Solution blur transition */
	.solution-box {
		transition: border-color 0.3s ease;
	}

	.solution-box:has(p:not(.blur-sm)) {
		border-color: color-mix(in oklab, var(--color-success) 30%, transparent);
	}

	/* Rich text toolbar buttons */
	.rich-btn {
		color: color-mix(in oklab, var(--color-base-content) 50%, transparent);
		cursor: default;
		transition: all 0.15s;
	}

	.rich-btn:hover {
		background: color-mix(in oklab, var(--color-base-content) 8%, transparent);
		color: var(--color-base-content);
	}

	/* Attachment hover */
	.attachment-thumb {
		transition: all 0.3s cubic-bezier(.16,1,.3,1);
	}

	.attachment-zoomed {
		transform: scale(1.05);
		border-color: color-mix(in oklab, var(--color-primary) 40%, transparent) !important;
		box-shadow: 0 4px 16px color-mix(in oklab, var(--color-primary) 15%, transparent);
	}

	@media (prefers-reduced-motion: reduce) {
		* {
			animation: none !important;
			transition: none !important;
		}
	}
</style>

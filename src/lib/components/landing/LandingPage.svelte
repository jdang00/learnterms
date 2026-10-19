<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import BrainCircuit from '@lucide/svelte/icons/brain-circuit';
	import Flag from '@lucide/svelte/icons/flag';
	import Keyboard from '@lucide/svelte/icons/keyboard';
	import FileText from '@lucide/svelte/icons/file-text';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Check from '@lucide/svelte/icons/check';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Image from '@lucide/svelte/icons/image';
	import ZoomIn from '@lucide/svelte/icons/zoom-in';
	import Users from '@lucide/svelte/icons/users';
	import QuizPreviewReplica from '$lib/components/landing/QuizPreviewReplica.svelte';
	import ReviewsShowcase from '$lib/components/landing/ReviewsShowcase.svelte';
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Kbd } from '$lib/components/ui/kbd';
	import { Switch } from '$lib/components/ui/switch';
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { resolve } from '$app/paths';

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
						setTimeout(
							() => {
								el.style.opacity = '1';
								el.style.transform = 'translateY(0)';
							},
							delay + i * stagger
						);
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
		{ id: 1, answered: true, flagged: false },
		{ id: 2, answered: true, flagged: true },
		{ id: 3, answered: true, flagged: false },
		{ id: 4, answered: true, flagged: true },
		{ id: 5, answered: false, flagged: false },
		{ id: 6, answered: false, flagged: false },
		{ id: 7, answered: false, flagged: false },
		{ id: 8, answered: false, flagged: true }
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

	// Keyboard shortcut animation, using the quiz's real bindings (quiz-dock/shortcuts.ts)
	const keySequence: { key: string; label: string; action: string }[] = [
		{ key: '3', label: 'Select C', action: 'selected-c' },
		{ key: '1', label: 'Select A', action: 'selected-a' },
		{ key: 'Enter', label: 'Check', action: 'checking' },
		{ key: 'Tab', label: 'Rationale', action: 'solution' },
		{ key: 'F', label: 'Flag', action: 'flagging' },
		{ key: '→', label: 'Next', action: 'next' }
	];
	let activeKeyIndex = $state(0);
	const keyOptions = [
		'Demodex blepharitis',
		'Seborrheic blepharitis',
		'Meibomian gland dysfunction'
	];

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

	// Rationale reveal demo
	let solutionRevealed = $state(false);

	// Analytics demo — cohort student roster
	const cohortStudents = [
		{
			initials: 'MR',
			name: 'Maya R.',
			progress: 94,
			flags: 1,
			color: 'bg-primary',
			ink: 'text-primary-ink',
			recent: '2m ago'
		},
		{
			initials: 'JD',
			name: 'Jake D.',
			progress: 82,
			flags: 3,
			color: 'bg-secondary',
			ink: 'text-secondary-ink',
			recent: '8m ago'
		},
		{
			initials: 'SP',
			name: 'Sofia P.',
			progress: 71,
			flags: 5,
			color: 'bg-accent',
			ink: 'text-accent-ink',
			recent: '14m ago'
		},
		{
			initials: 'LT',
			name: 'Liam T.',
			progress: 58,
			flags: 8,
			color: 'bg-info',
			ink: 'text-info-ink',
			recent: '21m ago'
		}
	];
	let analyticsVisible = $state(false);

	// Attachment demo — image zoom
	let attachmentZoomed = $state(false);

	// Workflow data — lean, no decorative fluff
	const studentSteps = [
		{
			title: 'Pick a module and start',
			detail:
				'Select topic scope and question count. Every session has a clear objective from the first click.'
		},
		{
			title: 'Answer under exam-style controls',
			detail:
				'Elimination, flagging, and keyboard shortcuts — the same mechanics you use on test day.'
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
			detail:
				'Analytics surface weak questions, high flag rates, and emerging gaps. Update the bank live.'
		}
	];
</script>

<svelte:window bind:scrollY />

<div class="relative isolate overflow-hidden pb-28">
	<div class="pointer-events-none absolute inset-0 -z-10">
		<div class="bg-graph-paper absolute inset-0"></div>
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
					class="hero-title text-balance text-4xl leading-tight sm:text-5xl lg:text-6xl"
				>
					<BrandLogo class="align-baseline" /> is Smarter Studying, Simplified.
				</h1>
				<p class="mt-5 max-w-3xl text-lg text-foreground/80 sm:text-xl">
					LearnTerms gives you a live quiz workspace where answers, flags, and progress sync
					instantly, so every study session stays focused and uninterrupted.
				</p>
				<div class="mt-8 flex">
					<Button href={resolve('/sign-in')} class="px-6">
						Start studying
						<ArrowRight size={18} />
					</Button>
				</div>
			</div>
		</section>

		<section class="mt-2 grid gap-3 sm:grid-cols-3" aria-label="Explore LearnTerms">
			<a href={resolve('/features')} class="panel-graph transition-colors hover:border-primary/50">
				<span class="flex flex-col gap-1 p-5">
					<span class="font-semibold">Explore study features</span>
					<span class="text-sm text-foreground/70"
						>Question banks, practice tests, feedback, and progress tools.</span
					>
				</span>
			</a>
			<a href={resolve('/pricing')} class="panel-graph transition-colors hover:border-primary/50">
				<span class="flex flex-col gap-1 p-5">
					<span class="font-semibold">See access and pricing</span>
					<span class="text-sm text-foreground/70"
						>How students and content curators use LearnTerms.</span
					>
				</span>
			</a>
			<a
				href="https://docs.learnterms.com/docs"
				class="panel-graph transition-colors hover:border-primary/50"
			>
				<span class="flex flex-col gap-1 p-5">
					<span class="font-semibold">Read the documentation</span>
					<span class="text-sm text-foreground/70"
						>Guides for study workflows, cohorts, and course content.</span
					>
				</span>
			</a>
		</section>

		<section class="mt-10" aria-labelledby="quiz-preview-title">
			<div class="mb-5 max-w-3xl">
				<h2 id="quiz-preview-title" class="text-2xl font-bold sm:text-3xl">Look familiar?</h2>
				<p class="mt-2 text-foreground/75">
					Feel at home with the familiar testing tools and workflow you already use. This is your
					high-speed sandbox to practice with full control, built for healthcare students across
					programs.
				</p>
			</div>
			<div in:scale={{ duration: 600, delay: 120, easing: cubicOut }}>
				<div class="relative z-10 overflow-visible surface">
					<div class="flex items-center px-4 pt-3 pb-2">
						<div
							class="flex h-9 w-full items-center rounded-full border border-border bg-background px-4 text-sm text-muted-foreground"
						>
							learnterms.com/classes
						</div>
					</div>
					<div class="overflow-visible border-t border-border bg-background pb-10">
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
				<p class="mt-2 text-foreground/75">
					Equipping students with the practice tools and control that are usually hidden behind
					proctor-managed testing workflows.
				</p>
			</div>

			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" use:reveal={{ y: 18, stagger: 90 }}>
				<!-- Flag & filter — interactive mini quiz nav -->
				<div class="panel-graph p-4 flex flex-col">
					<div class="mb-3 flex items-start justify-between">
						<div class="surface-inset p-2">
							<Flag size={18} />
						</div>
					</div>
					<h3 class="text-xl font-semibold">Flag & filter</h3>
					<p class="mt-2 text-sm text-foreground/75">
						Mark what you missed and focus your next pass where it matters most.
					</p>

					<div class="mt-4 flex flex-1 flex-col surface-inset overflow-hidden">
						<div class="flex items-center justify-between border-b border-border/40 px-3 py-2">
							<span class="text-[10px] text-foreground/50"
								>{visibleQuestions.length} of {mockQuestions.length} questions</span
							>
							<label class="flex cursor-pointer items-center gap-1.5">
								<Flag size={10} class={showFlaggedOnly ? 'text-warning' : 'text-foreground/40'} />
								<span class="text-[10px] font-medium" class:text-warning-ink={showFlaggedOnly}
									>Flagged only</span
								>
								<Switch size="sm" class="data-checked:bg-warning" bind:checked={showFlaggedOnly} />
							</label>
						</div>
						<div class="flex-1 p-3">
							<!-- Same buttons as the question strip above each quiz. -->
							<div class="flex flex-wrap gap-3">
								{#each visibleQuestions as q (q.id)}
									<div class="relative inline-flex">
										{#if q.flagged}
											<Badge
												tone="warning"
												variant="solid"
												size="xs"
												class="absolute -top-1 -left-1 z-[1]"
											></Badge>
										{/if}
										<Button
											variant={q.id === flagActiveQ || q.answered ? 'soft' : 'outline'}
											tone={q.id === flagActiveQ ? 'primary' : q.answered ? 'accent' : 'neutral'}
											shape="circle"
											class="flag-q-btn"
											aria-label="{q.flagged ? 'Unflag' : 'Flag'} question {q.id}"
											onclick={() => toggleFlag(q.id)}
										>
											{q.id}
										</Button>
									</div>
								{/each}
							</div>
						</div>
						<div class="border-t border-border/40 px-3 py-1.5">
							<p class="text-[9px] text-foreground/35 text-center">
								Click to flag &middot; toggle to filter
							</p>
						</div>
					</div>
				</div>

				<!-- AI generation — animated pipeline demo -->
				<div class="panel-graph p-4 ai-card min-w-0">
					<div class="mb-3 flex items-start justify-between">
						<div class="surface-inset p-2">
							<BrainCircuit size={18} />
						</div>
					</div>
					<h3 class="text-xl font-semibold">AI-generated or hand-built</h3>
					<p class="mt-2 text-sm text-foreground/75">
						Generate questions from source material in seconds, or create them manually — both work
						in the same workflow.
					</p>

					<div class="ai-pipeline mt-4 overflow-hidden surface-inset">
						<!-- Step indicators -->
						<div class="flex items-center gap-0 border-b border-border/40 text-[10px] font-medium">
							<div
								class="ai-step flex-1 px-3 py-2 text-center transition-all duration-500 {aiSteps[
									aiStep
								] === 'parsing'
									? 'bg-info/10 text-info-ink'
									: aiSteps[aiStep] === 'generating' || aiSteps[aiStep] === 'done'
										? 'text-foreground/40'
										: 'text-foreground/30'}"
							>
								<FileText size={11} class="mx-auto mb-0.5" />
								Parse
							</div>
							<div
								class="ai-step flex-1 border-x border-border/40 px-3 py-2 text-center transition-all duration-500 {aiSteps[
									aiStep
								] === 'generating'
									? 'bg-secondary/10 text-secondary-ink'
									: aiSteps[aiStep] === 'done'
										? 'text-foreground/40'
										: 'text-foreground/30'}"
							>
								<Sparkles size={11} class="mx-auto mb-0.5" />
								Generate
							</div>
							<div
								class="ai-step flex-1 px-3 py-2 text-center transition-all duration-500 {aiSteps[
									aiStep
								] === 'done'
									? 'bg-success/10 text-success-ink'
									: 'text-foreground/30'}"
							>
								<Check size={11} class="mx-auto mb-0.5" />
								Ready
							</div>
						</div>

						<!-- Animated content area -->
						<div class="relative h-[7.5rem] p-3">
							{#if aiSteps[aiStep] === 'parsing'}
								<div class="space-y-1.5" in:fade={{ duration: 300 }}>
									<div class="flex items-center gap-2 min-w-0">
										<div
											class="h-5 w-5 shrink-0 rounded-sm bg-error/15 flex items-center justify-center"
										>
											<span class="text-[8px] font-bold text-error-ink">PDF</span>
										</div>
										<span class="min-w-0 flex-1 text-[11px] font-medium truncate"
											>Lecture_06_Lids_and_Adnexa.pdf</span
										>
									</div>
									<div class="mt-2 space-y-1">
										<div class="ai-scan-line h-1.5 rounded-full bg-info/20">
											<div class="h-full rounded-full bg-info/60 ai-scan-fill"></div>
										</div>
										<div
											class="ai-scan-line h-1.5 rounded-full bg-info/20"
											style="animation-delay: 0.3s"
										>
											<div
												class="h-full rounded-full bg-info/60 ai-scan-fill"
												style="animation-delay: 0.3s"
											></div>
										</div>
										<div
											class="ai-scan-line h-1.5 rounded-full bg-info/20"
											style="animation-delay: 0.6s"
										>
											<div
												class="h-full rounded-full bg-info/60 ai-scan-fill"
												style="animation-delay: 0.6s"
											></div>
										</div>
									</div>
									<p class="text-[10px] text-info-ink/70 mt-1">
										Extracting content from 23 pages...
									</p>
								</div>
							{:else if aiSteps[aiStep] === 'generating'}
								<div class="space-y-1" in:fade={{ duration: 300 }}>
									<div
										class="ai-gen-line flex items-center gap-2 rounded-lg bg-secondary/5 px-2 py-1.5"
										style="animation-delay: 0s"
									>
										<span class="text-[10px] text-secondary-ink/60 font-mono">Q1</span>
										<span class="text-[10px] leading-tight"
											>Which two findings best support meibomian gland dysfunction?</span
										>
									</div>
									<div
										class="ai-gen-line flex items-center gap-2 rounded-lg bg-secondary/5 px-2 py-1.5"
										style="animation-delay: 0.2s"
									>
										<span class="text-[10px] text-secondary-ink/60 font-mono">Q2</span>
										<span class="text-[10px] leading-tight"
											>Clear collarettes at the lash base are pathognomonic for:</span
										>
									</div>
									<div
										class="ai-gen-line flex items-center gap-2 rounded-lg bg-secondary/5 px-2 py-1.5"
										style="animation-delay: 0.4s"
									>
										<span class="text-[10px] text-secondary-ink/60 font-mono">Q3</span>
										<span class="ai-typing text-[10px] text-secondary-ink/50">Generating...</span>
									</div>
								</div>
							{:else}
								<div in:fade={{ duration: 300 }}>
									<div class="flex items-center justify-between mb-2">
										<span class="text-[11px] font-semibold text-success-ink"
											>40 questions ready</span
										>
										<span
											class="rounded-full bg-success/10 px-2 py-0.5 text-[9px] font-medium text-success-ink"
											>MCQ + Case-based</span
										>
									</div>
									<div class="grid grid-cols-8 gap-1">
										<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
										{#each Array(16) as _, i (i)}
											<div
												class="ai-dot h-2 w-full rounded-full {i < 14
													? 'bg-success/30'
													: 'bg-warning/30'}"
												style="animation-delay: {i * 30}ms"
											></div>
										{/each}
									</div>
									<p class="text-[10px] text-foreground/50 mt-2">
										2 flagged for review &middot; 38 published
									</p>
								</div>
							{/if}
						</div>
					</div>
				</div>

				<!-- Rationale-first questions -->
				<div class="panel-graph p-4 sm:col-span-2 lg:col-span-1">
					<div class="mb-3 flex items-start justify-between">
						<div class="surface-inset p-2">
							<Eye size={18} />
						</div>
					</div>
					<h3 class="text-xl font-semibold">Rationale-first questions</h3>
					<p class="mt-2 text-sm text-foreground/75">
						Every question is built with a rationale baked in — AI-generated or hand-written.
						Students don't just get answers, they get the why.
					</p>

					<div class="mt-4 surface-inset p-3">
						<p class="text-[11px] font-medium leading-snug text-foreground/80">
							Clear, cylindrical collarettes wrapping the base of the lashes are pathognomonic for:
						</p>
						<p class="mt-1 text-[10px] text-foreground/55">
							<span class="font-semibold">A.</span> Demodex blepharitis
						</p>
						<div
							class="solution-box mt-2.5 rounded-xl border bg-background p-2.5 {solutionRevealed
								? 'border-success/40'
								: 'border-border'}"
						>
							<div class="flex items-center justify-between border-b border-border pb-1.5">
								<span class="text-xs font-semibold">Rationale</span>
								<span class="flex items-center gap-1">
									<Kbd>tab</Kbd>
									<Button
										variant="ghost"
										tone="neutral"
										size="xs"
										shape="circle"
										aria-label={solutionRevealed ? 'Hide rationale' : 'Show rationale'}
										onclick={() => (solutionRevealed = !solutionRevealed)}
									>
										{#if solutionRevealed}<EyeOff size={12} />{:else}<Eye size={12} />{/if}
									</Button>
								</span>
							</div>
							<div
								class="mt-1.5 transition-[filter] duration-300 {solutionRevealed
									? ''
									: 'blur-xs select-none'}"
								aria-hidden={!solutionRevealed}
							>
								<p class="text-[10px] leading-relaxed text-foreground/70">
									Collarettes are made of mite waste, keratinized cells, and eggs, and are
									considered pathognomonic for Demodex blepharitis.
								</p>
								<div class="mt-1.5 flex items-center gap-1.5 border-t border-border pt-1.5">
									<FileText size={9} class="text-foreground/50" />
									<span class="truncate text-[9px] text-foreground/55"
										>Lecture 6 – Lids and Adnexa</span
									>
									<span
										class="ml-auto shrink-0 rounded-full border border-border px-1.5 font-mono text-[9px] text-foreground/70"
										>p. 12</span
									>
								</div>
							</div>
						</div>
						<p class="mt-1.5 text-[9px] text-foreground/40">
							Tied to the page it came from. Revealed on demand, or after a correct answer.
						</p>
					</div>
				</div>
			</div>

			<!-- Second row of feature cards -->
			<div
				class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
				use:reveal={{ y: 18, stagger: 90 }}
			>
				<!-- Cohort Analytics -->
				<div class="panel-graph p-4">
					<div class="mb-3 flex items-start justify-between">
						<div class="surface-inset p-2">
							<BarChart3 size={18} />
						</div>
					</div>
					<h3 class="text-xl font-semibold">Cohort analytics</h3>
					<p class="mt-2 text-sm text-foreground/75">
						See who's active, what gets flagged most, and where learners are getting stuck.
					</p>

					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="analytics-demo mt-4 surface-inset p-3"
						use:reveal={{ y: 0 }}
						onmouseenter={() => (analyticsVisible = true)}
					>
						<div class="mb-2.5 flex items-center justify-between">
							<span class="text-[10px] font-medium text-foreground/50"
								>OPT 341 &middot; Ocular Disease I</span
							>
							<span
								class="rounded-full bg-success/10 px-2 py-0.5 text-[9px] font-medium text-success-ink"
								>89% avg</span
							>
						</div>
						<div class="space-y-1.5">
							{#each cohortStudents as student, i (student.initials)}
								<div class="flex items-center gap-2">
									<div
										class="student-avatar h-5 w-5 shrink-0 rounded-full {student.color}/15 flex items-center justify-center"
									>
										<span class="text-[7px] font-bold {student.ink}">{student.initials}</span>
									</div>
									<div class="w-11 shrink-0">
										<span class="block text-[9px] text-foreground/70 truncate">{student.name}</span>
										<span class="block text-[7px] text-foreground/30">{student.recent}</span>
									</div>
									<div class="flex-1 h-2.5 rounded-full bg-muted/80 overflow-hidden">
										<div
											class="analytics-bar h-full rounded-full {student.color}/50 transition-all duration-700 ease-out"
											style="width: {analyticsVisible ? student.progress : 0}%{!analyticsVisible
												? '; transition-delay: ' + i * 120 + 'ms'
												: ''}"
										></div>
									</div>
									<span class="w-7 text-right text-[9px] font-mono font-medium text-foreground/60"
										>{student.progress}%</span
									>
									{#if student.flags > 0}
										<span class="flex items-center gap-0.5 text-[8px] text-warning-ink/70 w-5">
											<Flag size={7} />{student.flags}
										</span>
									{:else}
										<span class="flex items-center gap-0.5 text-[8px] text-success-ink/50 w-5">
											<Check size={7} />
										</span>
									{/if}
								</div>
							{/each}
						</div>
						<div class="mt-2 flex items-center justify-between pt-2 border-t border-border/30">
							<div class="flex items-center gap-1">
								<Users size={9} class="text-foreground/40" />
								<span class="text-[9px] text-foreground/40">32 enrolled</span>
							</div>
							<span class="text-[9px] text-foreground/35">Hotspots: Demodex, MGD, chalazion</span>
						</div>
					</div>
				</div>

				<!-- Keyboard shortcuts — mini quiz that reacts -->
				<div class="panel-graph p-4 flex flex-col">
					<div class="mb-3 flex items-start justify-between">
						<div class="surface-inset p-2">
							<Keyboard size={18} />
						</div>
					</div>
					<h3 class="text-xl font-semibold">Keyboard-first</h3>
					<p class="mt-2 text-sm text-foreground/75">
						Number keys to select, Enter to check, arrows to navigate.
					</p>

					<div class="mt-4 flex flex-1 flex-col surface-inset overflow-hidden">
						<!-- Mini quiz context — fixed height to prevent layout shift -->
						<div class="flex-1 border-b border-border/40 p-3">
							<p class="mb-1.5 text-[10px] text-foreground/50">Lids &amp; Adnexa · 2 of 6</p>
							<p class="mb-2 text-[11px] font-medium leading-tight text-foreground/80">
								Clear collarettes at the lash base are pathognomonic for:
							</p>
							<div class="space-y-1">
								{#each keyOptions as option, i (option)}
									{@const answered = ['checking', 'solution', 'flagging'].includes(activeAction)}
									{@const picked =
										(i === 0 && (answered || activeAction === 'selected-a')) ||
										(i === 2 && activeAction === 'selected-c')}
									<div
										class="kbd-option flex items-center gap-2 rounded-full border bg-muted px-2 py-1 text-[10px] transition-colors duration-300 {i ===
											0 && answered
											? 'border-success'
											: 'border-border'}"
									>
										<span
											class="grid size-3 shrink-0 place-items-center rounded-[3px] border transition-colors duration-200 {picked
												? 'border-primary bg-primary text-primary-foreground'
												: 'border-primary/60'}"
											aria-hidden="true"
										>
											{#if picked}<Check size={8} strokeWidth={4} />{/if}
										</span>
										<span class="min-w-0 text-foreground/75"
											><span class="mr-1 font-semibold">{String.fromCharCode(65 + i)}.</span
											>{option}</span
										>
									</div>
								{/each}
							</div>
							<!-- Reserved space for contextual feedback — no layout shift -->
							<div class="mt-1.5 h-5">
								{#if activeAction === 'flagging'}
									<div
										class="flex items-center gap-1 text-[9px] text-warning-ink"
										in:fade={{ duration: 200 }}
									>
										<Flag size={9} /> Flagged for review
									</div>
								{:else if activeAction === 'solution'}
									<p
										class="truncate text-[9px] text-foreground/50 italic"
										in:fade={{ duration: 200 }}
									>
										Collarettes are made of mite waste, keratinized cells, and eggs...
									</p>
								{:else if activeAction === 'checking'}
									<p class="text-[9px] font-semibold text-success-ink" in:fade={{ duration: 200 }}>
										Correct!
									</p>
								{/if}
							</div>
						</div>
						<!-- Key strip -->
						<div class="flex items-center justify-between px-2 py-2">
							{#each keySequence as shortcut, i (shortcut.action)}
								<div class="flex flex-col items-center gap-0.5">
									<Kbd
										class="min-w-[1.75rem] text-center text-[10px] leading-none transition-all duration-300 {i ===
										activeKeyIndex
											? 'kbd-active'
											: ''}"
									>
										{shortcut.key}
									</Kbd>
									<span
										class="text-[8px] leading-tight transition-colors duration-300 {i ===
										activeKeyIndex
											? 'text-secondary-ink'
											: 'text-foreground/30'}"
									>
										{shortcut.label}
									</span>
								</div>
							{/each}
						</div>
					</div>
				</div>

				<!-- Rich Attachments & Formatting -->
				<div class="panel-graph p-4 sm:col-span-2 lg:col-span-1">
					<div class="mb-3 flex items-start justify-between">
						<div class="surface-inset p-2">
							<Image size={18} />
						</div>
					</div>
					<h3 class="text-xl font-semibold">Beyond plain text</h3>
					<p class="mt-2 text-sm text-foreground/75">
						Rich formatting, media attachments, zoom, and captions so question quality stays high.
					</p>

					<div class="mt-4 surface-inset p-3">
						<!-- Mini rich text toolbar -->
						<div class="mb-2 flex items-center gap-0.5 surface-inset px-1.5 py-1">
							<span class="rich-btn text-[10px] font-bold px-1.5 py-0.5 rounded-sm">B</span>
							<span class="rich-btn text-[10px] italic px-1.5 py-0.5 rounded-sm">I</span>
							<span class="rich-btn text-[10px] underline px-1.5 py-0.5 rounded-sm">U</span>
							<span class="text-muted-strong/60 mx-0.5">|</span>
							<span class="rich-btn text-[10px] px-1.5 py-0.5 rounded-sm">H1</span>
							<span class="rich-btn text-[10px] px-1.5 py-0.5 rounded-sm">H2</span>
							<span class="text-muted-strong/60 mx-0.5">|</span>
							<span class="rich-btn px-1.5 py-0.5 rounded-sm"><Image size={9} /></span>
						</div>

						<!-- Attachment grid mockup -->
						<div class="grid grid-cols-2 gap-1.5">
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div
								class="attachment-thumb group relative h-16 overflow-hidden rounded-lg border border-border/50 bg-muted/60 cursor-pointer transition-all duration-300"
								class:attachment-zoomed={attachmentZoomed}
								onclick={() => (attachmentZoomed = !attachmentZoomed)}
							>
								<div
									class="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10"
								></div>
								<div class="absolute inset-0 flex items-center justify-center">
									<div class="space-y-0.5 text-center">
										<div
											class="mx-auto h-6 w-10 rounded-sm border border-foreground/10 bg-background/50 flex items-center justify-center"
										>
											<div class="h-3 w-3 rounded-full bg-primary/20"></div>
										</div>
										<span class="text-[7px] text-foreground/40">slit-lamp_collarettes.jpg</span>
									</div>
								</div>
								<div
									class="absolute inset-0 flex items-center justify-center bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
								>
									<ZoomIn size={14} class="text-primary/60" />
								</div>
							</div>
							<div class="space-y-1.5">
								<div
									class="attachment-thumb h-[29px] overflow-hidden rounded-lg border border-border/50 bg-muted/60"
								>
									<div
										class="h-full w-full bg-gradient-to-r from-secondary/8 to-accent/8 flex items-center justify-center"
									>
										<span class="text-[7px] text-foreground/40">meibography_lower_lid.png</span>
									</div>
								</div>
								<div
									class="attachment-thumb h-[29px] overflow-hidden rounded-lg border border-border/50 bg-muted/60"
								>
									<div
										class="h-full w-full bg-gradient-to-r from-info/8 to-primary/8 flex items-center justify-center"
									>
										<span class="text-[7px] text-foreground/40">everted_lid_chalazion.jpg</span>
									</div>
								</div>
							</div>
						</div>
						<p class="mt-1.5 text-[9px] text-foreground/40">
							Full zoom &amp; pan viewer — images can be gated behind the rationale reveal
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Workflow sections -->
		<section class="mt-20" aria-labelledby="workflow-title" use:reveal={{ y: 22 }}>
			<div class="mb-10 max-w-3xl">
				<h2 id="workflow-title" class="text-3xl font-bold sm:text-4xl">Two loops, one platform</h2>
				<p class="mt-3 text-foreground/75">
					Students practice and review. Content teams build and improve. Both happen live without
					getting in each other's way.
				</p>
			</div>

			<div class="grid gap-8 lg:grid-cols-2" use:reveal={{ y: 18, stagger: 120 }}>
				<!-- Student flow -->
				<div>
					<h3 class="text-lg font-bold mb-4">How students study</h3>
					<div class="wf-timeline wf-timeline-student">
						{#each studentSteps as step (step.title)}
							<div class="wf-step">
								<div class="wf-dot"></div>
								<div class="wf-content">
									<h4 class="text-sm font-semibold">{step.title}</h4>
									<p class="mt-1 text-sm leading-relaxed text-foreground/65">{step.detail}</p>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Admin flow -->
				<div>
					<h3 class="text-lg font-bold mb-4">How content stays sharp</h3>
					<div class="wf-timeline wf-timeline-admin">
						{#each adminSteps as step (step.title)}
							<div class="wf-step">
								<div class="wf-dot"></div>
								<div class="wf-content">
									<h4 class="text-sm font-semibold">{step.title}</h4>
									<p class="mt-1 text-sm leading-relaxed text-foreground/65">{step.detail}</p>
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
				<h2 class="text-3xl font-bold sm:text-4xl">Ready to study smarter?</h2>
				<p class="mx-auto mt-4 max-w-lg text-foreground/70">
					Join your class or start your own. Reach out to get your cohort started today.
				</p>
				<div class="mt-8 flex flex-wrap items-center justify-center gap-3">
					<Button href={resolve('/sign-in')} size="lg" class="px-8">
						Start studying
						<ArrowRight size={18} />
					</Button>
					<Button href={resolve('/contact')} variant="ghost" tone="neutral" size="lg" class="px-6">
						Sign your school up
					</Button>
				</div>
			</div>
		</section>
	</div>
</div>

<style>
	.hero-title {
		font-family: var(--font-brand);
		font-weight: 600;
		letter-spacing: -0.03em;
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
			color-mix(in oklab, var(--primary) 48%, transparent),
			color-mix(in oklab, var(--primary) 18%, transparent) 55%,
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
			color-mix(in oklab, var(--secondary) 50%, transparent) 35%,
			color-mix(in oklab, var(--secondary) 60%, transparent) 55%,
			color-mix(in oklab, var(--secondary) 20%, transparent) 85%,
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
			color-mix(in oklab, var(--accent) 60%, transparent),
			color-mix(in oklab, var(--accent) 22%, transparent) 55%,
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
		--wf-accent: var(--primary);
	}

	.wf-timeline-admin {
		--wf-accent: var(--secondary);
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
		border-top: 1px solid color-mix(in oklab, var(--foreground) 10%, transparent);
	}

	.kbd-active {
		background: color-mix(in oklab, var(--secondary) 20%, var(--muted));
		border-color: var(--secondary);
		color: var(--secondary);
		transform: translateY(-2px);
		box-shadow: 0 2px 8px color-mix(in oklab, var(--secondary) 25%, transparent);
	}

	/* AI card animations */
	.ai-scan-fill {
		width: 0%;
		animation: scan-fill 1.8s ease-out forwards;
	}

	@keyframes scan-fill {
		0% {
			width: 0%;
		}
		100% {
			width: 100%;
		}
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
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0;
		}
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

	/* Rationale blur transition */
	.solution-box {
		transition: border-color 0.3s ease;
	}

	/* Rich text toolbar buttons */
	.rich-btn {
		color: color-mix(in oklab, var(--foreground) 50%, transparent);
		cursor: default;
		transition: all 0.15s;
	}

	.rich-btn:hover {
		background: color-mix(in oklab, var(--foreground) 8%, transparent);
		color: var(--foreground);
	}

	/* Attachment hover */
	.attachment-thumb {
		transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.attachment-zoomed {
		transform: scale(1.05);
		border-color: color-mix(in oklab, var(--primary) 40%, transparent) !important;
		box-shadow: 0 4px 16px color-mix(in oklab, var(--primary) 15%, transparent);
	}

	@media (prefers-reduced-motion: reduce) {
		* {
			animation: none !important;
			transition: none !important;
		}
	}
</style>

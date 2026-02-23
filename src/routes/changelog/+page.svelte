<script lang="ts">
	import {
		Sparkles,
		ClipboardCheck,
		BrainCircuit,
		BookOpen,
		Flag,
		Keyboard,
		BarChart3,
		FileText,
		Eye,
		Image,
		Users,
		Zap,
		ArrowRight
	} from 'lucide-svelte';

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
		const rate = scrollY * 0.08;
		glowContainer.style.transform = `translateY(${rate}px)`;
	});

	type ChangelogEntry = {
		version: string;
		date: string;
		title: string;
		badge: string;
		badgeClass: string;
		highlights: { icon: typeof Sparkles; title: string; description: string }[];
	};

	const changelog: ChangelogEntry[] = [
		{
			version: 'v4',
			date: 'February 2026',
			title: 'Custom Tests & Practice Exams',
			badge: 'Latest',
			badgeClass: 'badge-primary',
			highlights: [
				{
					icon: ClipboardCheck,
					title: 'Build your own test',
					description:
						'Pick modules, set a time limit, and take a scored practice exam. Review every answer when you finish.'
				},
				{
					icon: Flag,
					title: 'Flag-aware test builder',
					description:
						'Include only flagged questions from past study sessions so you focus on the material you missed.'
				},
				{
					icon: BarChart3,
					title: 'Results breakdown',
					description:
						'See your score, time per question, and which topics gave you the most trouble — all in one view.'
				}
			]
		},
		{
			version: 'v3',
			date: 'January 2026',
			title: 'Content Library & AI Chunking',
			badge: 'Stable',
			badgeClass: 'badge-secondary',
			highlights: [
				{
					icon: BrainCircuit,
					title: 'AI-powered question generation',
					description:
						'Upload PDFs, lecture notes, or outlines and generate questions with rationales in a single pass.'
				},
				{
					icon: FileText,
					title: 'Document chunking',
					description:
						'Source material is automatically split into reviewable chunks. Edit, reorder, or regenerate any section.'
				},
				{
					icon: Image,
					title: 'Rich attachments',
					description:
						'Questions support images with zoom, captions, and gated reveals behind the rationale.'
				}
			]
		},
		{
			version: 'v2',
			date: 'November 2025',
			title: 'Classes, Modules & Progress',
			badge: 'Foundation',
			badgeClass: 'badge-accent',
			highlights: [
				{
					icon: BookOpen,
					title: 'Structured curriculum',
					description:
						'Organize content into classes and modules. Students see only what belongs to their cohort.'
				},
				{
					icon: Keyboard,
					title: 'Keyboard-first quizzing',
					description:
						'Number keys select, Enter checks, arrows navigate, Tab reveals rationales. Built for speed.'
				},
				{
					icon: Eye,
					title: 'Rationale-first questions',
					description:
						'Every question ships with an explanation. Students learn the why, not just the answer.'
				}
			]
		},
		{
			version: 'v1',
			date: 'September 2025',
			title: 'The Beginning',
			badge: 'Genesis',
			badgeClass: 'badge-neutral',
			highlights: [
				{
					icon: Zap,
					title: 'Core study flow',
					description:
						'Interactive question practice with real-time progress tracking and theme support.'
				},
				{
					icon: Users,
					title: 'Cohort access',
					description:
						'Students join through their school and cohort. Access is scoped and controlled from day one.'
				}
			]
		}
	];
</script>

<svelte:window bind:scrollY />

<main class="relative isolate overflow-hidden pb-28">
	<div class="pointer-events-none absolute inset-0 -z-10">
		<div class="page-grid"></div>
		<div bind:this={glowContainer} class="glow-wrap">
			<div class="glow glow-focus"></div>
			<div class="glow glow-momentum"></div>
		</div>
	</div>

	<div class="mx-auto max-w-4xl px-4 sm:px-8 lg:px-12">
		<!-- Hero -->
		<section class="pt-16 pb-12 sm:pt-20 sm:pb-16" use:reveal={{ y: 20 }}>
			<div class="flex items-center gap-3 mb-5">
				<div
					class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center"
				>
					<Sparkles size={20} />
				</div>
				<div class="badge badge-primary badge-soft rounded-full text-xs">Changelog</div>
			</div>
			<h1 class="text-4xl font-bold leading-tight sm:text-5xl">What's new in LearnTerms</h1>
			<p class="mt-4 max-w-2xl text-lg text-base-content/65 leading-relaxed">
				Every update ships with one goal — help you study smarter with less friction. Here's what
				changed and why.
			</p>
		</section>

		<!-- Timeline -->
		<div class="changelog-timeline">
			{#each changelog as entry, entryIdx (entry.version)}
				<section
					class="changelog-entry"
					use:reveal={{ y: 22, delay: entryIdx * 60 }}
				>
					<!-- Timeline dot & connector -->
					<div class="timeline-track">
						<div
							class="timeline-dot {entryIdx === 0
								? 'timeline-dot-active'
								: 'timeline-dot-past'}"
						></div>
						{#if entryIdx < changelog.length - 1}
							<div class="timeline-line"></div>
						{/if}
					</div>

					<!-- Content -->
					<div class="timeline-content">
						<div class="flex flex-wrap items-center gap-2 mb-1">
							<span class="font-mono text-sm font-bold text-base-content/80"
								>{entry.version}</span
							>
							<span class="text-xs text-base-content/35">&middot;</span>
							<span class="text-xs text-base-content/45">{entry.date}</span>
							<span class="badge {entry.badgeClass} badge-soft badge-xs rounded-full"
								>{entry.badge}</span
							>
						</div>

						<h2 class="text-xl font-bold sm:text-2xl mb-4">{entry.title}</h2>

						<div
							class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
							use:reveal={{ y: 14, stagger: 80 }}
						>
							{#each entry.highlights as highlight (highlight.title)}
								{@const Icon = highlight.icon}
								<div class="highlight-card">
									<div
										class="rounded-xl border border-base-300/80 bg-base-100/70 p-2 mb-3 w-fit"
									>
										<Icon size={16} />
									</div>
									<h3 class="text-sm font-semibold">{highlight.title}</h3>
									<p class="mt-1 text-xs text-base-content/55 leading-relaxed">
										{highlight.description}
									</p>
								</div>
							{/each}
						</div>
					</div>
				</section>
			{/each}
		</div>

		<!-- Bottom CTA -->
		<section class="mt-16" use:reveal={{ y: 20 }}>
			<div class="cta-section text-center py-12 px-6">
				<h2 class="text-2xl font-bold sm:text-3xl">More on the way</h2>
				<p class="mx-auto mt-3 max-w-md text-base-content/55 text-sm leading-relaxed">
					LearnTerms is actively developed. Have a feature request or idea? We'd love to hear it.
				</p>
				<div class="mt-6 flex flex-wrap items-center justify-center gap-3">
					<a href="/sign-in" class="btn btn-primary rounded-full px-6">
						Start studying
						<ArrowRight size={16} />
					</a>
					<a href="/contact" class="btn btn-ghost rounded-full px-5"> Get in touch </a>
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
			radial-gradient(ellipse 90% 75% at 50% 35%, black 15%, transparent 100%);
		mask-composite: intersect;
		-webkit-mask-image:
			linear-gradient(to bottom, transparent 0%, black 8%, black 50%, transparent 100%),
			radial-gradient(ellipse 90% 75% at 50% 35%, black 15%, transparent 100%);
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

	.glow-focus {
		top: 4rem;
		left: 5%;
		width: 50%;
		height: 22rem;
		border-radius: 40% 60% 55% 45%;
		background: radial-gradient(
			ellipse at 40% 50%,
			color-mix(in oklab, var(--color-primary) 40%, transparent),
			color-mix(in oklab, var(--color-primary) 14%, transparent) 55%,
			transparent 100%
		);
		filter: blur(64px);
		opacity: 0.5;
		animation: focus-breathe 7s ease-in-out infinite;
	}

	.glow-momentum {
		top: 8rem;
		right: -1rem;
		width: 28rem;
		height: 8rem;
		border-radius: 999px;
		background: linear-gradient(
			90deg,
			transparent 5%,
			color-mix(in oklab, var(--color-secondary) 40%, transparent) 35%,
			color-mix(in oklab, var(--color-secondary) 50%, transparent) 55%,
			color-mix(in oklab, var(--color-secondary) 15%, transparent) 85%,
			transparent
		);
		filter: blur(44px);
		opacity: 0.45;
		transform: rotate(-18deg);
		animation: streak-drift 9s ease-in-out infinite;
	}

	@keyframes focus-breathe {
		0%,
		100% {
			opacity: 0.5;
			transform: scale(1) translate(0, 0);
		}
		50% {
			opacity: 0.38;
			transform: scale(1.06) translate(0.5rem, -0.3rem);
		}
	}

	@keyframes streak-drift {
		0%,
		100% {
			transform: rotate(-18deg) translateX(0);
			opacity: 0.45;
		}
		50% {
			transform: rotate(-15deg) translateX(2rem);
			opacity: 0.35;
		}
	}

	/* Timeline layout */
	.changelog-timeline {
		position: relative;
	}

	.changelog-entry {
		display: flex;
		gap: 1.25rem;
		padding-bottom: 2.5rem;
	}

	.changelog-entry:last-child {
		padding-bottom: 0;
	}

	.timeline-track {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex-shrink: 0;
		width: 1.25rem;
		padding-top: 0.25rem;
	}

	.timeline-dot {
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 999px;
		flex-shrink: 0;
	}

	.timeline-dot-active {
		background: var(--color-primary);
		box-shadow:
			0 0 0 4px color-mix(in oklab, var(--color-primary) 18%, transparent),
			0 0 12px color-mix(in oklab, var(--color-primary) 25%, transparent);
	}

	.timeline-dot-past {
		background: color-mix(in oklab, var(--color-base-content) 25%, transparent);
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-base-content) 8%, transparent);
	}

	.timeline-line {
		flex: 1;
		width: 1px;
		margin-top: 0.5rem;
		background: linear-gradient(
			to bottom,
			color-mix(in oklab, var(--color-base-content) 18%, transparent),
			color-mix(in oklab, var(--color-base-content) 6%, transparent)
		);
	}

	.timeline-content {
		flex: 1;
		min-width: 0;
	}

	/* Highlight cards — same aesthetic as landing feature-card */
	.highlight-card {
		position: relative;
		border-radius: 1rem;
		padding: 0.875rem;
		background:
			linear-gradient(
				to bottom,
				color-mix(in oklab, var(--color-base-200) 70%, transparent),
				color-mix(in oklab, var(--color-base-100) 95%, transparent)
			),
			linear-gradient(
					to right,
					color-mix(in oklab, var(--color-base-content) 6%, transparent) 1px,
					transparent 1px
				)
				0 0 / 18px 18px,
			linear-gradient(
					to bottom,
					color-mix(in oklab, var(--color-base-content) 6%, transparent) 1px,
					transparent 1px
				)
				0 0 / 18px 18px;
		border: 1px solid color-mix(in oklab, var(--color-base-content) 12%, transparent);
		transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.highlight-card::before {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		border-radius: inherit;
		box-shadow: inset 0 0 0 1px color-mix(in oklab, white 14%, transparent);
		opacity: 0.4;
	}

	.highlight-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 20px color-mix(in oklab, var(--color-base-content) 6%, transparent);
		border-color: color-mix(in oklab, var(--color-primary) 25%, transparent);
	}

	.cta-section {
		border-top: 1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent);
	}

	@media (prefers-reduced-motion: reduce) {
		* {
			animation: none !important;
			transition: none !important;
		}
	}
</style>

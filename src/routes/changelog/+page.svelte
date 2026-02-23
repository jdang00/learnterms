<script lang="ts">
	import {
		Sparkles,
		BrainCircuit,
		BookOpen,
		ChartColumnIncreasing,
		CircleGauge,
		ClipboardCheck,
		Database,
		FileCog,
		Flag,
		FolderOpen,
		GalleryVerticalEnd,
		GitBranch,
		Keyboard,
		BarChart3,
		FileText,
		Eye,
		Image,
		LayoutDashboard,
		Palette,
		Search,
		Shield,
		SlidersHorizontal,
		WandSparkles,
		Users,
		Zap,
		ArrowRight
	} from 'lucide-svelte';

	function reveal(node: HTMLElement, opts?: { y?: number; delay?: number; stagger?: number }) {
		const y = opts?.y ?? 24;
		const delay = opts?.delay ?? 0;
		const stagger = opts?.stagger ?? 0;
		const reduceMotion =
			typeof window !== 'undefined' &&
			window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

		const children = stagger ? (Array.from(node.children) as HTMLElement[]) : [];
		const targets = stagger ? children : [node];

		targets.forEach((el, i) => {
			if (reduceMotion) {
				el.style.opacity = '1';
				el.style.transform = 'translateY(0)';
				el.style.transition = '';
				return;
			}
			el.style.opacity = '0';
			el.style.transform = `translateY(${y}px)`;
			el.style.transition = `opacity 0.6s cubic-bezier(.16,1,.3,1) ${delay + i * stagger}ms, transform 0.6s cubic-bezier(.16,1,.3,1) ${delay + i * stagger}ms`;
		});

		const observer = new IntersectionObserver(
				([entry]) => {
					if (entry.isIntersecting) {
						if (reduceMotion) {
							targets.forEach((el) => {
								el.style.opacity = '1';
								el.style.transform = 'translateY(0)';
							});
							observer.disconnect();
							return;
						}
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
		highlights: {
			icon: typeof Sparkles;
			title: string;
			description: string;
			href?: string;
		}[];
	};

	const changelog: ChangelogEntry[] = [
		{
			version: 'Feb 2026',
			date: 'February 2026',
			title: 'Enhancing the Learning Experience',
			highlights: [
				{
					icon: CircleGauge,
					title: 'Power bar & UI refresh',
					description:
						'Introduced the power bar plus frontend refinements across mobile flow, solution display, and question switching.',
					href: 'https://github.com/jdang00/learnterms/commits/main/#:~:text=Copy%20full%20SHA%20for%200be2cb9'
				},
				{
					icon: Palette,
					title: 'Badges & visual redesign',
					description:
						'Added badges and a redesigned interface with cohort page updates, more vibrant sidebar elements, and a refreshed aesthetic.',
					href: 'https://github.com/jdang00/learnterms/commits/main/#:~:text=%2A%20,buttons'
				},
				{
					icon: BarChart3,
					title: 'Analytics + AI helper polish',
					description:
						'Expanded analytics, improved progress displays, and tuned AI helper prompts/behavior for more reliable support.',
					href: 'https://github.com/jdang00/learnterms/commits/main/#:~:text=%2A%20,buttons'
				},
				{
					icon: Image,
					title: 'Open Graph & share fixes',
					description:
						'Miscellaneous fixes improved Open Graph images and general polish so shared links render more consistently.',
					href: 'https://github.com/jdang00/learnterms/commits/main/#:~:text=%2A%20,buttons'
				}
			]
		},
		{
			version: 'Jan 2026',
			date: 'January 2026',
			title: 'Curation Tools and Redesign',
			highlights: [
				{
					icon: LayoutDashboard,
					title: 'Admin + student redesign',
					description:
						'A significant interface redesign improved navigation for admins and students with more intuitive layouts and streamlined screens.',
					href: 'https://github.com/jdang00/learnterms/commits/main#:~:text=Commits%20on%20Jan%2027%2C%202026'
				},
				{
					icon: Users,
					title: 'Developer class management',
					description:
						'Internal developer tooling expanded to support class management, student adds/removals, and course-content handling.',
					href: 'https://github.com/jdang00/learnterms/commits/main#:~:text=Commits%20on%20Jan%2024%2C%202026'
				},
				{
					icon: FileCog,
					title: 'Question curation ergonomics',
					description:
						'Improved question editing workflows with optimizations, limits, auth fixes, and a new curation/content-management setup.',
					href: 'https://github.com/jdang00/learnterms/commits/main#:~:text=%2A%20'
				},
				{
					icon: ChartColumnIncreasing,
					title: 'Stats, flags, and tagging',
					description:
						'Added updated statistics/progress dashboards plus flagged-question tracking and the tagging system groundwork.',
					href: 'https://github.com/jdang00/learnterms/commits/main#:~:text=committed'
				},
				{
					icon: WandSparkles,
					title: 'PostHog reintegration',
					description:
						'Reintroduced PostHog analytics and strengthened the tracking infrastructure for better product telemetry.',
					href: 'https://github.com/jdang00/learnterms/commits/main#:~:text=committed'
				}
			]
		},
		{
			version: 'Dec 2025',
			date: 'December 2025',
			title: 'Performance Tweaks',
			highlights: [
				{
					icon: Zap,
					title: 'Simplified progress cache',
					description:
						'Rolled back an expensive progress cache in favor of simpler direct queries, reducing complexity and improving runtime performance.',
					href: 'https://github.com/jdang00/learnterms/commits/main#:~:text=%2A%20,to%20fixed%20field'
				},
				{
					icon: ClipboardCheck,
					title: 'Fixed module question counts',
					description:
						'Question counts moved from calculated values to fixed stored fields to support more accurate reporting and summaries.',
					href: 'https://github.com/jdang00/learnterms/commits/main#:~:text=%2A%20,to%20fixed%20field'
				}
			]
		},
		{
			version: 'Nov 2025',
			date: 'November 2025',
			title: 'Minor Fixes and UI Refinements',
			highlights: [
				{
					icon: BookOpen,
					title: 'About page + grade calculations',
					description:
						'Reworked the About section, improved grade calculations, and shipped several bug fixes near the end of the month.',
					href: 'https://github.com/jdang00/learnterms/commits/main#:~:text=%2A%20'
				},
				{
					icon: SlidersHorizontal,
					title: 'General cleanup bump',
					description:
						'A larger cleanup pass bundled dependency bumps, visual tweaks, and a set of smaller maintenance updates.',
					href: 'https://github.com/jdang00/learnterms/commits/main#:~:text=%2A%20'
				}
			]
		},
		{
			version: 'Oct 2025',
			date: 'October 2025',
			title: 'Progress Tracking Enhancements',
			highlights: [
				{
					icon: Eye,
					title: 'Attachment modal hotfix',
					description:
						'Fixed unintended blur behavior so users can view attachments clearly without blurring the rest of the page.',
					href: 'https://github.com/jdang00/learnterms/commits/main#:~:text=%2A%20,by%20default%20on%20attachment%20modal'
				},
				{
					icon: Keyboard,
					title: 'FITB and matching updates',
					description:
						'Improved reset behavior for fill-in-the-blank and matching questions and began counting them in overall progress tracking.',
					href: 'https://github.com/jdang00/learnterms/commits/main#:~:text=Commits%20on%20Oct%202%2C%202025'
				}
			]
		},
		{
			version: 'Sep 2025',
			date: 'September 2025',
			title: 'Matching and Editor Refinements',
			highlights: [
				{
					icon: ClipboardCheck,
					title: 'Matching question fixes',
					description:
						'Fixed matching behavior and ensured answer-option order shuffles independently from prompt order.',
					href: 'https://github.com/jdang00/learnterms/commits/main#:~:text=%2A%20'
				},
				{
					icon: FileText,
					title: 'TipTap + duplicate warnings',
					description:
						'Addressed rich-text editor issues and duplicate content warnings to smooth out authoring workflows.',
					href: 'https://github.com/jdang00/learnterms/commits/main#:~:text=%2A%20'
				},
				{
					icon: Sparkles,
					title: 'Small quality improvements',
					description:
						'A cluster of additional commits delivered smaller refinements across user-facing features and internal tooling.'
				}
			]
		},
		{
			version: 'Aug 2025',
			date: 'August 2025',
			title: 'Content and AI Capabilities Expand',
			highlights: [
				{
					icon: Image,
					title: 'Images in questions',
					description:
						'Enabled attaching images directly to questions to support richer learning and review experiences.',
					href: 'https://github.com/jdang00/learnterms/commits/main#:~:text=Copy%20full%20SHA%20for%20862a492'
				},
				{
					icon: Shield,
					title: 'Security + quality-of-life',
					description:
						'Shipped cohort module security improvements, better error handling, improved forms, and class-management UI tweaks.',
					href: 'https://github.com/jdang00/learnterms/commits/main#:~:text=Copy%20full%20SHA%20for%20862a492'
				},
				{
					icon: Search,
					title: 'Search, docs, and UI polish',
					description:
						'Expanded search and documentation while aligning the interface more closely with evolving design standards.',
					href: 'https://github.com/jdang00/learnterms/commits/main#:~:text=Copy%20full%20SHA%20for%20862a492'
				},
				{
					icon: BrainCircuit,
					title: 'AI generation + content library',
					description:
						'Early AI-generated practice questions landed and the admin content library was introduced for reusable materials.',
					href: 'https://github.com/jdang00/learnterms/commits/main#:~:text=%2A%20'
				},
				{
					icon: Database,
					title: 'Progress tracking efficiency',
					description:
						'Improved how user progress is stored and queried to reduce bandwidth usage and make tracking more efficient.',
					href: 'https://github.com/jdang00/learnterms/commits/main#:~:text=Copy%20full%20SHA%20for%20862a492'
				}
			]
		},
		{
			version: 'Jul 2025',
			date: 'July 2025',
			title: 'Foundational Work',
			highlights: [
				{
					icon: GalleryVerticalEnd,
					title: 'Navigation overhaul',
					description:
						'Introduced a new sidebar and improved class UI, making it easier for learners to navigate modules.',
					href: 'https://github.com/jdang00/learnterms/commits/main#:~:text=%2A%20'
				},
				{
					icon: GitBranch,
					title: 'Convex migration + modularization',
					description:
						'Started migrating storage to Convex and modularizing frontend components as the architecture took shape.',
					href: 'https://github.com/jdang00/learnterms/commits/main#:~:text=Commits%20on%20Jul%2027%2C%202025'
				},
				{
					icon: FolderOpen,
					title: 'Initial features and fixes',
					description:
						'Early commits stabilized question generation and introduced initial cohort pages and class editing screens.',
					href: 'https://github.com/jdang00/learnterms/commits/main#:~:text=%2A%20'
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
									{#if highlight.href}
										<a
											href={highlight.href}
											target="_blank"
											rel="noreferrer"
											class="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
										>
											View source commits
											<ArrowRight size={12} />
										</a>
									{/if}
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

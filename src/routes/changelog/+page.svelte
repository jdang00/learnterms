<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		Sparkles,
		BrainCircuit,
		BookOpen,
		ChartColumnIncreasing,
		CircleGauge,
		ClipboardCheck,
		Database,
		FileCog,
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

	const highlight = (
		icon: typeof Sparkles,
		title: string,
		description: string,
		href: string
	): ChangelogEntry['highlights'][number] => ({ icon, title, description, href });

	const changelog: ChangelogEntry[] = [
		{
			version: 'Sep 2026',
			date: 'September 2026',
			title: 'Source-grounded authoring and new study tools',
			highlights: [
				highlight(
					WandSparkles,
					'Question Studio and Content Library',
					'Rebuilt document upload and processing with R2 and Datalab, source-page mapping, editable drafts, and visible generation progress.',
					'https://github.com/jdang00/learnterms/pull/155'
				),
				highlight(
					ChartColumnIncreasing,
					'Progress and completion',
					'Added a quiz dock, module completion feedback, and study history.',
					'https://github.com/jdang00/learnterms/commit/630155c'
				),
				highlight(
					CircleGauge,
					'Quieter mastery tracking',
					'Made mastery feedback passive and improved navigation between a module and its progress view.',
					'https://github.com/jdang00/learnterms/commit/e3493c1'
				),
				highlight(
					Eye,
					'Question highlighting',
					'Select text in a question stem to keep a personal highlight for later study.',
					'https://github.com/jdang00/learnterms/commit/630155c'
				),
				highlight(
					FileText,
					'Calculator, notes, and sources',
					'Added a calculator and private per-question notes beside the quiz, plus question source editing and PDF page previews.',
					'https://github.com/jdang00/learnterms/commit/4eee54d'
				),
				highlight(
					LayoutDashboard,
					'Progress for curators',
					'Added live curator activity and module statistics to the admin dashboard.',
					'https://github.com/jdang00/learnterms/commit/1429b29'
				),
				highlight(
					BarChart3,
					'Class progress view',
					'Redesigned class progress and improved access to the join-class flow.',
					'https://github.com/jdang00/learnterms/commit/ca52c07'
				),
				highlight(
					Shield,
					'Cohort access',
					'Tightened server-side cohort checks and prevented self-service switching after a student joins a cohort.',
					'https://github.com/jdang00/learnterms/commit/2a16ddd'
				),
				highlight(
					Users,
					'Sign-in and onboarding',
					'Repaired nested sign-in routes and display names for accounts without a name.',
					'https://github.com/jdang00/learnterms/commit/a74d8e9'
				),
				highlight(
					ClipboardCheck,
					'Free response and mobile quiz',
					'Added free-response checking and improved the quiz layout and answer flow on small screens.',
					'https://github.com/jdang00/learnterms/commit/b843173'
				)
			]
		},
		{
			version: 'Jul 2026',
			date: 'July 2026',
			title: 'Question Studio generation updates',
			highlights: [
				highlight(
					BrainCircuit,
					'Batched drafting turns',
					'Grouped Question Studio drafting turns to improve source-based question generation.',
					'https://github.com/jdang00/learnterms/commit/b898238'
				),
				highlight(
					Zap,
					'Tool-first workers',
					'Moved Question Studio workers to a tool-first workflow for retrieving and using source material.',
					'https://github.com/jdang00/learnterms/commit/8810cf8'
				)
			]
		},
		{
			version: 'Jun 2026',
			date: 'June 2026',
			title: 'Joining classes and organizing course links',
			highlights: [
				highlight(
					Users,
					'Join-class account setup',
					'Enabled students to sign in or create an account as part of joining a class.',
					'https://github.com/jdang00/learnterms/pull/154'
				),
				highlight(
					FolderOpen,
					'Cohort quick links',
					'Added cohort-managed links for organizing course resources.',
					'https://github.com/jdang00/learnterms/commit/fcf3fe9'
				),
				highlight(
					WandSparkles,
					'Question Studio redesign',
					'Reworked the question-generation workflow and its AI authoring flow.',
					'https://github.com/jdang00/learnterms/commit/c794770'
				)
			]
		},
		{
			version: 'May 2026',
			date: 'May 2026',
			title: 'More ways to recognize study',
			highlights: [
				highlight(
					Sparkles,
					'New badges',
					'Added badges for larger quizzes, consistent weekend study, and finals preparation.',
					'https://github.com/jdang00/learnterms/pull/152'
				),
				highlight(
					GalleryVerticalEnd,
					'Badge award display',
					'Added a modal to show newly earned badges.',
					'https://github.com/jdang00/learnterms/pull/153'
				)
			]
		},
		{
			version: 'Apr 2026',
			date: 'April 2026',
			title: 'Class design, editing, and grade tools',
			highlights: [
				highlight(
					Palette,
					'Custom class cards',
					'Added configurable colors and patterns for class cards.',
					'https://github.com/jdang00/learnterms/pull/145'
				),
				highlight(
					FileText,
					'Question editor guidance',
					'Improved validation and error messages when creating and editing questions.',
					'https://github.com/jdang00/learnterms/pull/150'
				),
				highlight(
					BookOpen,
					'Rich-text controls',
					'Expanded formatting controls for question content and refined navigation back to studying.',
					'https://github.com/jdang00/learnterms/pull/146'
				),
				highlight(
					CircleGauge,
					'Grade calculator refresh',
					'Redesigned the grade calculator and updated its course rules.',
					'https://github.com/jdang00/learnterms/pull/147'
				),
				highlight(
					ClipboardCheck,
					'Matching answer fix',
					'Repaired dropdown answer selection for matching questions.',
					'https://github.com/jdang00/learnterms/pull/151'
				)
			]
		},
		{
			version: 'Mar 2026',
			date: 'March 2026',
			title: 'LearnTerms v3 released',
			highlights: [
				highlight(
					Sparkles,
					'v3 release',
					'Published the v3 release with rebuilt study and admin flows, custom tests, progress and badges, and AI-assisted content tools.',
					'https://github.com/jdang00/learnterms/releases/tag/v3'
				),
				highlight(
					Database,
					'Classes and cohorts',
					'Moved the platform to a school, cohort, class, and module model with a new classes dashboard and join flow.',
					'https://github.com/jdang00/learnterms/releases/tag/v3'
				),
				highlight(
					WandSparkles,
					'Content Library and Question Studio',
					'Included document-backed question generation and new tools for curating and managing questions.',
					'https://github.com/jdang00/learnterms/releases/tag/v3'
				),
				highlight(
					FileText,
					'Rationale migration',
					'Renamed question explanations to rationales with compatibility and data migration support.',
					'https://github.com/jdang00/learnterms/pull/141'
				),
				highlight(
					BookOpen,
					'Changelog added',
					'Added this public history of product updates.',
					'https://github.com/jdang00/learnterms/pull/140'
				),
				highlight(
					ClipboardCheck,
					'Study flow fixes',
					'Stabilized matching answers and answer selection ahead of the v3 release.',
					'https://github.com/jdang00/learnterms/pull/136'
				)
			]
		},
		{
			version: 'Feb 2026',
			date: 'February 2026',
			title: 'Tests, badges, and study flow',
			highlights: [
				highlight(
					ClipboardCheck,
					'Custom tests',
					'Built custom tests with selected question pools, timed sessions, results, review, and recent attempts.',
					'https://github.com/jdang00/learnterms/pull/130'
				),
				highlight(
					CircleGauge,
					'Power bar',
					'Added a persistent power bar for study controls.',
					'https://github.com/jdang00/learnterms/pull/129'
				),
				highlight(
					Keyboard,
					'Mobile study flow',
					'Refined solution display and question switching on small screens.',
					'https://github.com/jdang00/learnterms/pull/128'
				),
				highlight(
					Sparkles,
					'Badges and cohort page',
					'Introduced badge awards and refreshed the cohort page and sidebar.',
					'https://github.com/jdang00/learnterms/commit/e4183a6'
				),
				highlight(
					BrainCircuit,
					'AI question generation',
					'Expanded AI-assisted question generation.',
					'https://github.com/jdang00/learnterms/pull/117'
				),
				highlight(
					Image,
					'Public sharing',
					'Added Open Graph image support for shared links.',
					'https://github.com/jdang00/learnterms/pull/118'
				)
			]
		},
		{
			version: 'Jan 2026',
			date: 'January 2026',
			title: 'Question curation and redesigned navigation',
			highlights: [
				highlight(
					LayoutDashboard,
					'Admin and student redesign',
					'Updated navigation and layouts across the student and admin experience.',
					'https://github.com/jdang00/learnterms/pull/115'
				),
				highlight(
					FileCog,
					'Question curation',
					'Introduced a new question curation setup and editing workflow.',
					'https://github.com/jdang00/learnterms/pull/108'
				),
				highlight(
					SlidersHorizontal,
					'Question tags',
					'Added a tagging system for organizing questions.',
					'https://github.com/jdang00/learnterms/pull/105'
				),
				highlight(
					Shield,
					'Question flag tracking',
					'Expanded tracking of flagged questions.',
					'https://github.com/jdang00/learnterms/pull/106'
				),
				highlight(
					Users,
					'Developer class management',
					'Expanded tools for developers to manage classes.',
					'https://github.com/jdang00/learnterms/pull/114'
				),
				highlight(
					BarChart3,
					'Product analytics',
					'Reintroduced PostHog tracking.',
					'https://github.com/jdang00/learnterms/pull/103'
				)
			]
		},
		{
			version: 'Dec 2025',
			date: 'December 2025',
			title: 'Progress and reporting reliability',
			highlights: [
				highlight(
					Zap,
					'Simpler progress queries',
					'Removed an expensive progress cache and returned to simpler direct queries.',
					'https://github.com/jdang00/learnterms/pull/101'
				),
				highlight(
					ClipboardCheck,
					'Stored question counts',
					'Moved module question counts to stored fields for more reliable summaries.',
					'https://github.com/jdang00/learnterms/pull/102'
				),
				highlight(
					ChartColumnIncreasing,
					'Dashboard statistics',
					'Updated dashboard statistics.',
					'https://github.com/jdang00/learnterms/pull/99'
				)
			]
		},
		{
			version: 'Nov 2025',
			date: 'November 2025',
			title: 'About page and grade tools',
			highlights: [
				highlight(
					BookOpen,
					'About page',
					'Reworked the About page and its account of LearnTerms.',
					'https://github.com/jdang00/learnterms/pull/95'
				),
				highlight(
					CircleGauge,
					'Grade calculator',
					'Updated grade calculation content and behavior.',
					'https://github.com/jdang00/learnterms/commit/5bc394c'
				)
			]
		},
		{
			version: 'Oct 2025',
			date: 'October 2025',
			title: 'More complete study progress',
			highlights: [
				highlight(
					ChartColumnIncreasing,
					'Progress across question types',
					'Made fill-in-the-blank and matching work count toward study progress.',
					'https://github.com/jdang00/learnterms/pull/91'
				),
				highlight(
					Eye,
					'Attachment viewer',
					'Fixed the default blur behavior when opening question attachments.',
					'https://github.com/jdang00/learnterms/pull/93'
				)
			]
		},
		{
			version: 'Sep 2025',
			date: 'September 2025',
			title: 'Matching and authoring fixes',
			highlights: [
				highlight(
					ClipboardCheck,
					'Matching answer order',
					'Separated matching answer shuffle from prompt order.',
					'https://github.com/jdang00/learnterms/pull/88'
				),
				highlight(
					CircleGauge,
					'Matching fixes',
					'Repaired matching-question behavior.',
					'https://github.com/jdang00/learnterms/pull/90'
				),
				highlight(
					Keyboard,
					'Fill-in-the-blank persistence',
					'Improved answer persistence and whitespace handling for fill-in-the-blank questions.',
					'https://github.com/jdang00/learnterms/commit/d6cbf2d'
				),
				highlight(
					FileText,
					'Question editor',
					'Fixed rich-text editing and duplicate-content warnings.',
					'https://github.com/jdang00/learnterms/commit/d77fc4d'
				)
			]
		},
		{
			version: 'Aug 2025',
			date: 'August 2025',
			title: 'Early v3 content tools',
			highlights: [
				highlight(
					WandSparkles,
					'AI generation',
					'Added early AI-generated practice questions.',
					'https://github.com/jdang00/learnterms/pull/59'
				),
				highlight(
					FolderOpen,
					'Content Library',
					'Introduced an admin library for study materials.',
					'https://github.com/jdang00/learnterms/pull/57'
				),
				highlight(
					FileCog,
					'Question management',
					'Expanded question creation, editing, and administrative curation.',
					'https://github.com/jdang00/learnterms/pull/53'
				),
				highlight(
					Image,
					'Question images',
					'Added image attachments to questions.',
					'https://github.com/jdang00/learnterms/pull/76'
				),
				highlight(
					Database,
					'Progress efficiency',
					'Reduced bandwidth used by progress storage and queries.',
					'https://github.com/jdang00/learnterms/pull/72'
				),
				highlight(
					Shield,
					'Cohort module access',
					'Tightened access checks for cohort modules.',
					'https://github.com/jdang00/learnterms/pull/78'
				)
			]
		},
		{
			version: 'Jul 2025',
			date: 'July 2025',
			title: 'Move toward the v3 platform',
			highlights: [
				highlight(
					GitBranch,
					'Convex migration',
					'Began moving data and modules to Convex.',
					'https://github.com/jdang00/learnterms/commit/e9fb836'
				),
				highlight(
					GalleryVerticalEnd,
					'Class navigation',
					'Reworked the sidebar and class navigation.',
					'https://github.com/jdang00/learnterms/commit/2344fc6'
				)
			]
		},
		{
			version: 'Jun 2025',
			date: 'June 2025',
			title: 'Course guides and assistant experiments',
			highlights: [
				highlight(
					BookOpen,
					'Ocular Motility pocket guide',
					'Added a pocket guide for Ocular Motility study.',
					'https://github.com/jdang00/learnterms/pull/45'
				),
				highlight(
					FolderOpen,
					'Course section retired',
					'Retired the earlier Ocular Motility section later in the month.',
					'https://github.com/jdang00/learnterms/pull/48'
				),
				highlight(
					BrainCircuit,
					'Chat assistant',
					'Introduced a course chatbot.',
					'https://github.com/jdang00/learnterms/pull/41'
				)
			]
		},
		{
			version: 'May 2025',
			date: 'May 2025',
			title: 'Course data maintenance',
			highlights: [
				highlight(
					Database,
					'Course store updates',
					'Updated course content and the supporting course store.',
					'https://github.com/jdang00/learnterms/pull/39'
				)
			]
		},
		{
			version: 'Apr 2025',
			date: 'April 2025',
			title: 'Calculators and course content',
			highlights: [
				highlight(
					CircleGauge,
					'Grade calculator',
					'Added and refined grade calculation tools.',
					'https://github.com/jdang00/learnterms/pull/37'
				),
				highlight(
					BookOpen,
					'Pharmacology updates',
					'Updated course material and grade-calculation support for pharmacology.',
					'https://github.com/jdang00/learnterms/pull/38'
				)
			]
		},
		{
			version: 'Mar 2025',
			date: 'March 2025',
			title: 'LearnTerms v2 released',
			highlights: [
				highlight(
					Sparkles,
					'v2 release',
					'Published v2 with broader exam practice, saved progress, flags, answer elimination, and keyboard controls.',
					'https://github.com/jdang00/learnterms/releases/tag/v2'
				),
				highlight(
					LayoutDashboard,
					'Dashboard overhaul',
					'Expanded and reorganized the study dashboard.',
					'https://github.com/jdang00/learnterms/pull/29'
				),
				highlight(
					ClipboardCheck,
					'Challenge questions',
					'Added challenge-question workflows after the v2 release.',
					'https://github.com/jdang00/learnterms/pull/26'
				),
				highlight(
					WandSparkles,
					'Content generation',
					'Expanded AI generation work for new chapters.',
					'https://github.com/jdang00/learnterms/pull/30'
				),
				highlight(
					FileText,
					'Question upload',
					'Added a question upload workflow.',
					'https://github.com/jdang00/learnterms/pull/27'
				)
			]
		},
		{
			version: 'Feb 2025',
			date: 'February 2025',
			title: 'Preparing the v2 release',
			highlights: [
				highlight(
					LayoutDashboard,
					'Admin dashboard',
					'Introduced admin dashboard and course-management features.',
					'https://github.com/jdang00/learnterms/pull/7'
				),
				highlight(
					Shield,
					'Route protection',
					'Protected administrative routes and fixed access behavior.',
					'https://github.com/jdang00/learnterms/pull/8'
				),
				highlight(
					ClipboardCheck,
					'Quiz stability',
					'Fixed quiz navigation and reset behavior during the v2 beta.',
					'https://github.com/jdang00/learnterms/pull/4'
				)
			]
		},
		{
			version: 'Jan 2025',
			date: 'January 2025',
			title: 'Exam-style practice takes shape',
			highlights: [
				highlight(
					Sparkles,
					'v2 beta',
					'Started the v2 beta with a broader exam-style study flow.',
					'https://github.com/jdang00/learnterms/commit/dd1d981'
				),
				highlight(
					ClipboardCheck,
					'Saved responses',
					'Added database-backed answer saving.',
					'https://github.com/jdang00/learnterms/commit/be5de29'
				),
				highlight(
					Eye,
					'Answer elimination',
					'Added a way to cross out answer choices while studying.',
					'https://github.com/jdang00/learnterms/commit/bf37960'
				),
				highlight(
					ChartColumnIncreasing,
					'Shuffle and progress',
					'Added question shuffle and study progress updates.',
					'https://github.com/jdang00/learnterms/commit/2ae5b36'
				),
				highlight(
					Keyboard,
					'Mobile navigation',
					'Added a mobile study dock and refined quiz controls.',
					'https://github.com/jdang00/learnterms/commit/4790eef'
				)
			]
		},
		{
			version: 'Dec 2024',
			date: 'December 2024',
			title: 'Rebuilding the study experience',
			highlights: [
				highlight(
					GitBranch,
					'Svelte 5 transition',
					'Moved the application toward Svelte 5.',
					'https://github.com/jdang00/learnterms/commit/2fc2e4c'
				),
				highlight(
					ClipboardCheck,
					'Exam-style quizzing',
					'Began an exam-style question interface.',
					'https://github.com/jdang00/learnterms/commit/4770c82'
				),
				highlight(
					Eye,
					'Solution display',
					'Added question solution display to the new study flow.',
					'https://github.com/jdang00/learnterms/commit/eb1abb2'
				),
				highlight(
					LayoutDashboard,
					'Public landing page',
					'Started a new landing-page and navigation experience.',
					'https://github.com/jdang00/learnterms/commit/fef7533'
				)
			]
		},
		{
			version: 'Oct 2024',
			date: 'October–November 2024',
			title: 'Saved progress and early experiments',
			highlights: [
				highlight(
					Database,
					'LearnTerms 1.1',
					'Added saved progress to the original flashcard experience.',
					'https://github.com/jdang00/learnterms/commit/15d0bcf'
				),
				highlight(
					GitBranch,
					'Framework transition',
					'Started the Svelte 5 transition that continued in December.',
					'https://github.com/jdang00/learnterms/commit/9208fe7'
				)
			]
		},
		{
			version: 'Sep 2024',
			date: 'September 2024',
			title: 'The first LearnTerms release',
			highlights: [
				highlight(
					Sparkles,
					'First commit',
					'Created the SvelteKit foundation for LearnTerms.',
					'https://github.com/jdang00/learnterms/commit/47b0f4e8e2f71d64ee2fe7fbe410f3bf78e57604'
				),
				highlight(
					ClipboardCheck,
					'First flashcards',
					'Added the original terminology flashcard logic.',
					'https://github.com/jdang00/learnterms/commit/1318e36'
				),
				highlight(
					Search,
					'Decks and search',
					'Added searchable term decks with flashcard and table views.',
					'https://github.com/jdang00/learnterms/commit/ce1a8b5'
				),
				highlight(
					Eye,
					'Guest access',
					'Allowed students to study without an account.',
					'https://github.com/jdang00/learnterms/commit/cd951d8'
				),
				highlight(
					ClipboardCheck,
					'Starred-card review',
					'Added a review flow for starred cards that need more practice.',
					'https://github.com/jdang00/learnterms/commit/2ea7db8'
				),
				highlight(
					BookOpen,
					'LearnTerms 1.0',
					'Published 1.0 with typed term recall, deck review, themes, and optional login.',
					'https://github.com/jdang00/learnterms/releases/tag/releases'
				)
			]
		}
	];
</script>

<svelte:window bind:scrollY />

<div class="relative isolate overflow-hidden pb-28">
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
				A history of LearnTerms updates, with links to the GitHub releases and code behind them.
			</p>
		</section>

		<!-- Timeline -->
		<div class="changelog-timeline">
			{#each changelog as entry, entryIdx (entry.version)}
				<section class="changelog-entry" use:reveal={{ y: 22, delay: entryIdx * 60 }}>
					<!-- Timeline dot & connector -->
					<div class="timeline-track">
						<div
							class="timeline-dot {entryIdx === 0 ? 'timeline-dot-active' : 'timeline-dot-past'}"
						></div>
						{#if entryIdx < changelog.length - 1}
							<div class="timeline-line"></div>
						{/if}
					</div>

					<!-- Content -->
					<div class="timeline-content">
						<div class="flex flex-wrap items-center gap-2 mb-1">
							<span class="font-mono text-sm font-bold text-base-content/80">{entry.version}</span>
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
									<div class="rounded-xl border border-base-300/80 bg-base-100/70 p-2 mb-3 w-fit">
										<Icon size={16} />
									</div>
									<h3 class="text-sm font-semibold">{highlight.title}</h3>
									<p class="mt-1 text-xs text-base-content/55 leading-relaxed">
										{highlight.description}
									</p>
									{#if highlight.href}
										<button
											type="button"
											class="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
											onclick={() => window.open(highlight.href, '_blank', 'noreferrer')}
										>
											View source
											<ArrowRight size={12} />
										</button>
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
					<a href={resolve('/sign-in')} class="btn btn-primary rounded-full px-6">
						Start studying
						<ArrowRight size={16} />
					</a>
					<a href={resolve('/contact')} class="btn btn-ghost rounded-full px-5"> Get in touch </a>
				</div>
			</div>
		</section>
	</div>
</div>

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

import type { LucideIcon } from '@lucide/svelte';
import Sparkles from '@lucide/svelte/icons/sparkles';
import BrainCircuit from '@lucide/svelte/icons/brain-circuit';
import BookOpen from '@lucide/svelte/icons/book-open';
import ChartColumnIncreasing from '@lucide/svelte/icons/chart-column-increasing';
import CircleGauge from '@lucide/svelte/icons/circle-gauge';
import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
import Database from '@lucide/svelte/icons/database';
import FileCog from '@lucide/svelte/icons/file-cog';
import FolderOpen from '@lucide/svelte/icons/folder-open';
import GalleryVerticalEnd from '@lucide/svelte/icons/gallery-vertical-end';
import GitBranch from '@lucide/svelte/icons/git-branch';
import Keyboard from '@lucide/svelte/icons/keyboard';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import FileText from '@lucide/svelte/icons/file-text';
import Eye from '@lucide/svelte/icons/eye';
import Image from '@lucide/svelte/icons/image';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import Palette from '@lucide/svelte/icons/palette';
import Search from '@lucide/svelte/icons/search';
import Shield from '@lucide/svelte/icons/shield';
import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
import WandSparkles from '@lucide/svelte/icons/wand-sparkles';
import Users from '@lucide/svelte/icons/users';
import Zap from '@lucide/svelte/icons/zap';

export type ChangelogEntry = {
	version: string;
	date: string;
	title: string;
	highlights: {
		icon: LucideIcon;
		title: string;
		description: string;
		href?: string;
	}[];
};

const highlight = (
	icon: LucideIcon,
	title: string,
	description: string,
	href: string
): ChangelogEntry['highlights'][number] => ({ icon, title, description, href });

export const changelog: ChangelogEntry[] = [
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

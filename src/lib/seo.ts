import { blogPosts } from '$lib/content/blog';

export const SITE_ORIGIN = 'https://learnterms.com';

export const publicPaths = [
	'/',
	'/features',
	'/about-us',
	'/contact',
	'/pricing',
	'/changelog',
	'/blog',
	...blogPosts.map((post) => `/blog/${post.slug}` as const),
	'/privacy',
	'/terms',
	'/tools/calculator',
	'/tools/grade-calculator'
] as const;

const routeMetadata: Record<string, readonly [string, string]> = {
	'/': [
		'LearnTerms | Smarter Studying, Simplified',
		'Study class-aligned question banks, practice with instant feedback, and track your learning progress with LearnTerms.'
	],
	'/features': [
		'Features and Study Tools',
		'Compare 28 study features across LearnTerms, Anki, Quizlet, and UWorld. Explore course-aligned questions, explanations, source references, and cohort progress.'
	],
	'/about-us': [
		'About',
		'Justin Dang is an optometry student and the developer of LearnTerms. Read how the project started with his own coursework.'
	],
	'/contact': [
		'Contact',
		'Contact Justin Dang for LearnTerms support, feedback, account questions, and privacy requests.'
	],
	'/pricing': [
		'Pricing',
		'Explore LearnTerms access for students and subscription options for curators building class-aligned question banks.'
	],
	'/changelog': [
		'Changelog',
		'See the latest LearnTerms improvements, new study features, and product updates.'
	],
	'/blog': [
		'Blog',
		'Read notes on building LearnTerms, release updates, and archived posts from the early days.'
	],
	'/blog/[slug]': ['Blog Post', 'An archived post from the early days of LearnTerms.'],
	'/status': [
		'Service Status',
		'View the LearnTerms service status page for hosting, authentication, data services, and AI processing.'
	],
	'/privacy': [
		'Privacy Policy',
		'Learn how LearnTerms collects, uses, stores, and shares account information, study activity, uploads, and analytics data.'
	],
	'/terms': [
		'Terms and Conditions',
		'Read the terms for using LearnTerms, including account responsibilities, course content, subscriptions, and acceptable use.'
	],
	'/tools/calculator': [
		'Scientific Calculator',
		'Use the LearnTerms scientific calculator with keyboard entry, calculation history, and click-to-copy results.'
	],
	'/tools/grade-calculator': [
		'Grade Calculator',
		'Calculate your current grade, explore target outcomes, and plan remaining coursework with grades stored in your browser.'
	],
	'/docs': [
		'Documentation',
		'Explore LearnTerms guides for students, cohort leaders, and content curators.'
	],
	'/classes': ['My Classes', 'Browse your classes and continue studying your course modules.'],
	'/cohort': ['My Cohort', 'Manage your LearnTerms cohort and membership.'],
	'/badges': ['My Badges', 'View your learning achievements and earned LearnTerms badges.'],
	'/badges/cohort': ['Cohort Badges', 'View badges and achievements in your cohort.'],
	'/study-space': ['Study Space', 'Organize your personal LearnTerms study workspace.'],
	'/join-class': ['Join a Class', 'Join your class on LearnTerms using a class invitation.'],
	'/sign-in': ['Sign In', 'Sign in to your LearnTerms account to continue studying.'],
	'/sign-in/[...path]': ['Sign In', 'Sign in to your LearnTerms account to continue studying.'],
	'/sign-up': [
		'Create an Account',
		'Create your LearnTerms account to join your cohort and start studying.'
	],
	'/sign-up/[...path]': [
		'Create an Account',
		'Create your LearnTerms account to join your cohort and start studying.'
	],
	'/pricing/success': [
		'Subscription Confirmation',
		'View your LearnTerms subscription confirmation.'
	],
	'/admin': ['Administration', 'Manage LearnTerms classes, content, and cohort settings.'],
	'/admin/library': ['Content Library', 'Manage your cohort course materials and question banks.'],
	'/admin/progress': ['Class Progress', 'Review cohort activity, engagement, and study insights.'],
	'/admin/badges': ['Badge Management', 'Manage LearnTerms cohort achievements and badges.'],
	'/admin/question-studio': [
		'Question Studio',
		'Create and review source-grounded questions for your course modules.'
	],
	'/admin/question-studio/dev-tools': [
		'Question Studio Diagnostics',
		'Inspect Question Studio processing and generation diagnostics.'
	],
	'/admin/[classId]': ['Manage Class', 'Manage class modules and study content.'],
	'/admin/[classId]/module/[moduleId]': [
		'Manage Module',
		'Edit module questions and course content.'
	],
	'/classes/[classId]/modules/[moduleId]': [
		'Study Module',
		'Practice module questions and review your study progress.'
	],
	'/classes/[classId]/tests/new': [
		'Create a Practice Test',
		'Choose course material for a new practice test.'
	],
	'/classes/[classId]/tests/[attemptId]': [
		'Practice Test',
		'Complete your LearnTerms practice test.'
	],
	'/classes/[classId]/tests/[attemptId]/results': [
		'Test Results',
		'Review your practice test results and explanations.'
	],
	'/docs/getting-started': [
		'Getting Started',
		'Get started with LearnTerms, join your cohort, and find your course materials.'
	],
	'/docs/onboarding': [
		'Onboarding',
		'Set up your LearnTerms account and begin studying with your cohort.'
	],
	'/docs/admin': [
		'Admin Documentation',
		'Learn how to manage LearnTerms classes, modules, and cohort content.'
	],
	'/docs/admin/content-library': [
		'Content Library Guide',
		'Learn how to organize course materials in the LearnTerms content library.'
	],
	'/docs/lt-models': [
		'Generation Models',
		'Learn about question generation options in LearnTerms.'
	],
	'/docs/students/study-flow': [
		'Student Study Flow',
		'Learn how to practice questions, review feedback, and track progress in LearnTerms.'
	]
};

export function getRouteSeo(routeId: string | null, pathname: string, status = 200) {
	const path = pathname.replace(/\/+$/, '') || '/';
	const post = blogPosts.find((post) => path === `/blog/${post.slug}`);
	const [label, description] = (post
		? [post.title, post.summary]
		: routeMetadata[routeId ?? path]) ?? [
		'LearnTerms',
		'Study and manage your class-aligned learning materials on LearnTerms.'
	];
	const isError = status >= 400;
	return {
		title: isError
			? `${status === 404 ? 'Page Not Found' : 'Something Went Wrong'} — LearnTerms`
			: path === '/'
				? label
				: label === 'LearnTerms'
					? label
					: `${label} — LearnTerms`,
		description: isError
			? status === 404
				? 'This LearnTerms page could not be found. Return home or contact support for help.'
				: 'This page could not be loaded. Try again or contact LearnTerms support.'
			: description,
		canonical: `${SITE_ORIGIN}${path}`,
		indexable: !isError && publicPaths.some((entry) => entry === path)
	};
}

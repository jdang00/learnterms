export type DocsPath =
	| '/docs'
	| '/docs/admin'
	| '/docs/getting-started'
	| '/docs/onboarding'
	| '/docs/admin/content-library'
	| '/docs/lt-models'
	| '/docs/students/study-flow';

export type DocsNavItem = {
	title: string;
	path: DocsPath;
};

export type DocsNavSection = {
	title: string;
	items: DocsNavItem[];
};

export const docsNav: DocsNavSection[] = [
	{
		title: 'Overview',
		items: [
			{ title: 'Introduction', path: '/docs' },
			{ title: 'Onboarding', path: '/docs/onboarding' }
		]
	},
	{
		title: 'Admin',
		items: [
			{ title: 'Content Library', path: '/docs/admin/content-library' },
			{ title: 'LearnTerms Generation Models', path: '/docs/lt-models' }
		]
	},
	{
		title: 'Students',
		items: [{ title: 'Study Flow', path: '/docs/students/study-flow' }]
	}
];

export function getPathToTitle(): Record<string, string> {
	const map: Record<string, string> = {};
	for (const section of docsNav) {
		for (const item of section.items) {
			map[item.path] = item.title;
		}
	}
	return map;
}

const validDocsPaths = new Set<DocsPath>([
	'/docs',
	'/docs/admin',
	'/docs/getting-started',
	'/docs/onboarding',
	'/docs/admin/content-library',
	'/docs/lt-models',
	'/docs/students/study-flow'
]);

function isDocsPath(path: string): path is DocsPath {
	return validDocsPaths.has(path as DocsPath);
}

export function buildBreadcrumbTrail(pathname: string): DocsNavItem[] {
	const pathToTitle = getPathToTitle();
	const segments = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
	const trail: DocsNavItem[] = [];

	let accum = '';
	for (const segment of segments) {
		accum += `/${segment}`;
		const title = pathToTitle[accum] ?? toTitleCase(segment);
		if (isDocsPath(accum)) {
			trail.push({ title, path: accum });
		}
	}
	return trail;
}

function toTitleCase(input: string): string {
	return input
		.split('-')
		.map((p) => p.charAt(0).toUpperCase() + p.slice(1))
		.join(' ');
}

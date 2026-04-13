export const validDocsPaths = [
	'/docs',
	'/docs/getting-started',
	'/docs/onboarding',
	'/docs/admin',
	'/docs/admin/content-library',
	'/docs/lt-models',
	'/docs/students/study-flow'
] as const;

export type DocsPath = (typeof validDocsPaths)[number];

export type DocsNavItem = {
	title: string;
	path: DocsPath;
};

export type DocsNavSection = {
	title: string;
	items: DocsNavItem[];
};

const docsNavEntries = [
	{ section: 'Overview', title: 'Introduction', path: '/docs' },
	{ section: 'Overview', title: 'Getting Started', path: '/docs/getting-started' },
	{ section: 'Overview', title: 'Onboarding', path: '/docs/onboarding' },
	{ section: 'Admin', title: 'Admin Documentation', path: '/docs/admin' },
	{ section: 'Admin', title: 'Content Library', path: '/docs/admin/content-library' },
	{ section: 'Admin', title: 'LearnTerms Generation Models', path: '/docs/lt-models' },
	{ section: 'Students', title: 'Study Flow', path: '/docs/students/study-flow' }
] as const satisfies ReadonlyArray<{ section: string; title: string; path: DocsPath }>;

const docsSections = ['Overview', 'Admin', 'Students'] as const;

export const docsNav: DocsNavSection[] = docsSections.map((section) => ({
	title: section,
	items: docsNavEntries
		.filter((item) => item.section === section)
		.map(({ title, path }) => ({ title, path }))
}));

export const validDocsPathsSet = new Set<DocsPath>(validDocsPaths);

export function getPathToTitle(): Record<string, string> {
	const map: Record<string, string> = {};
	for (const item of docsNavEntries) {
		map[item.path] = item.title;
	}
	return map;
}

function isDocsPath(path: string): path is DocsPath {
	return validDocsPathsSet.has(path as DocsPath);
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
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

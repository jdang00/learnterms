export const blogPosts = [
	{
		slug: 'learnterms-v3',
		legacySlug: 'LearnTerms v3',
		title: 'LearnTerms v3: rebuilding for our coursework',
		date: '2026-09-22',
		displayDate: 'September 22, 2026',
		summary:
			'A look back at the v3 rebuild: classes, custom tests, question curation, and the people who helped shape it.',
		archived: false,
		archiveNote: ''
	},
	{
		slug: 'learnterms-v2',
		legacySlug: 'LearnTerms v2',
		archived: true,
		title: 'LearnTerms v2 Release',
		date: '2025-02-28',
		displayDate: 'February 28, 2025',
		summary:
			'The move beyond terminology quizzes: a new exam module, saved progress, and question generation.',
		archiveNote:
			'The original article heading listed 2024; the archive index and release commit place this post in 2025.'
	},
	{
		slug: 'learnterms-v2-beta',
		legacySlug: 'LearnTerms v2 Beta',
		archived: true,
		title: 'LearnTerms v2 Beta',
		date: '2025-01-15',
		displayDate: 'January 15, 2025',
		summary:
			'An early look at the pharmacology exam module and the first question-generation workflow.',
		archiveNote:
			'The original article heading listed 2024; the archive index and beta commit place this post in 2025.'
	},
	{
		slug: 'lens',
		legacySlug: 'LENS',
		archived: true,
		title: 'The LENS Algorithm: Playing the Numbers Game',
		date: '2024-10-16',
		displayDate: 'October 16, 2024',
		summary:
			'An early experiment in choosing which terminology cards to include in the weekly decks.',
		archiveNote: ''
	},
	{
		slug: 'learnterms-1-0',
		legacySlug: 'LearnTerms 1.0',
		archived: true,
		title: 'LearnTerms 1.0 Release',
		date: '2024-09-23',
		displayDate: 'September 23, 2024',
		summary:
			'How a personal tool for Introduction to Optometry grew into a project shared with classmates.',
		archiveNote:
			'The original article heading said September 22; this archive uses September 23 from the original index and release commit.'
	}
] as const;

export type BlogSlug = (typeof blogPosts)[number]['slug'];
export function findBlogPost(slug: string) {
	return blogPosts.find((post) => post.slug === slug);
}

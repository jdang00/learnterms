export const reviewedOn = 'September 22, 2026';

export const sources = [
	{
		id: 'anki-study',
		title: 'Anki: studying, flags, and keyboard controls',
		url: 'https://docs.ankiweb.net/studying.html'
	},
	{
		id: 'anki-edit',
		title: 'Anki: editing, media, and cloze deletion',
		url: 'https://docs.ankiweb.net/editing.html'
	},
	{
		id: 'anki-schedule',
		title: 'Anki: deck options and FSRS',
		url: 'https://docs.ankiweb.net/deck-options.html'
	},
	{
		id: 'anki-filter',
		title: 'Anki: filtered decks',
		url: 'https://docs.ankiweb.net/filtered-decks.html'
	},
	{ id: 'anki-stats', title: 'Anki: statistics', url: 'https://docs.ankiweb.net/stats.html' },
	{ id: 'anki-app', title: 'Anki: apps and platform overview', url: 'https://apps.ankiweb.net/' },
	{
		id: 'anki-export',
		title: 'Anki: exporting decks',
		url: 'https://docs.ankiweb.net/exporting.html'
	},
	{
		id: 'quizlet-practice',
		title: 'Quizlet: AI Practice Tests and availability',
		url: 'https://help.quizlet.com/hc/en-us/articles/25946589648013-Studying-with-Practice-Tests'
	},
	{
		id: 'quizlet-test',
		title: 'Quizlet: Test, limits, and saved progress',
		url: 'https://help.quizlet.com/hc/en-us/articles/360030642972-Studying-with-Test-mode'
	},
	{
		id: 'quizlet-class',
		title: 'Quizlet: class sets and shared access',
		url: 'https://help.quizlet.com/hc/en-us/articles/360035357412-Adding-sets-to-a-class'
	},
	{
		id: 'quizlet-progress',
		title: 'Quizlet: Class Progress',
		url: 'https://help.quizlet.com/hc/en-us/articles/360030512432-Using-Class-Progress'
	},
	{
		id: 'quizlet-sets',
		title: 'Quizlet: flashcards, diagrams, and apps',
		url: 'https://help.quizlet.com/hc/en-au/articles/360032006352-What-are-flashcard-sets'
	},
	{
		id: 'quizlet-plans',
		title: 'Quizlet: subscriptions and offline studying',
		url: 'https://help.quizlet.com/hc/en-au/articles/360041181691-Subscribing-to-Quizlet'
	},
	{
		id: 'quizlet-export',
		title: 'Quizlet: export restrictions',
		url: 'https://help.quizlet.com/hc/en-us/articles/360034345672-Exporting-your-sets'
	},
	{
		id: 'uworld-tour',
		title: 'UWorld: USMLE product tour',
		url: 'https://medical.uworld.com/usmle/features/'
	},
	{
		id: 'uworld-step1',
		title: 'UWorld: Step 1 QBank and flashcards',
		url: 'https://medical.uworld.com/usmle/usmle-step-1/'
	},
	{
		id: 'uworld-notes',
		title: 'UWorld: My Notebook',
		url: 'https://medical.uworld.com/usmle/features/my-notebook/'
	},
	{
		id: 'uworld-educators',
		title: 'UWorld: institutional learning platform',
		url: 'https://medical.uworld.com/us/educators/'
	},
	{
		id: 'quizlet-personal-progress',
		title: 'Quizlet: targeted study and progress sync',
		url: 'https://help.quizlet.com/hc/en-us/articles/360048803491-Using-Progress-for-targeted-studying'
	},
	{
		id: 'anki-sync',
		title: 'Anki: syncing with AnkiWeb',
		url: 'https://docs.ankiweb.net/syncing.html'
	}
] as const;

type SourceId = (typeof sources)[number]['id'];
export type Cell = { text: string; source?: SourceId };
export type Competitor = 'anki' | 'quizlet' | 'uworld';
export type Feature = {
	name: string;
	learnterms: Cell;
	anki: Cell;
	quizlet: Cell;
	uworld: Cell;
};
export type FeatureGroup = { name: string; rows: Feature[] };
const cell = (text: string, source?: SourceId): Cell => ({ text, source });
const row = (
	name: string,
	learnterms: string,
	anki: Cell,
	quizlet: Cell,
	uworld: Cell
): Feature => ({
	name,
	learnterms: cell(learnterms),
	anki,
	quizlet,
	uworld
});

export const featureGroups: FeatureGroup[] = [
	{
		name: 'Your course',
		rows: [
			row(
				'Course organization',
				'Cohorts → classes → modules',
				cell('Decks, subdecks, tags', 'anki-edit'),
				cell('Sets in classes', 'quizlet-class'),
				cell('Subjects and systems', 'uworld-tour')
			),
			row(
				'Questions from your lectures',
				'Curators generate from course documents',
				cell('Author or import cards', 'anki-edit'),
				cell('AI Practice Tests from notes', 'quizlet-practice'),
				cell('Professionally authored QBank', 'uworld-step1')
			),
			row(
				'Links to original course pages',
				'Source page links on cited questions',
				cell('Add your own source fields', 'anki-edit'),
				cell('Page links not documented', 'quizlet-practice'),
				cell('Course-page links not documented', 'uworld-tour')
			),
			row(
				'Content review',
				'Curators review and edit before publishing',
				cell('Deck author controls content', 'anki-edit'),
				cell('Set creator controls content', 'quizlet-class'),
				cell('Physician-authored content', 'uworld-tour')
			),
			row(
				'Shared class content',
				'One published bank for your cohort',
				cell('Export and share deck copies', 'anki-export'),
				cell('Shared class sets', 'quizlet-class'),
				cell('Institutional assignments', 'uworld-educators')
			),
			row(
				'Images and diagrams',
				'Question attachments with zoom',
				cell('Images and image occlusion', 'anki-edit'),
				cell('Images and diagram sets', 'quizlet-sets'),
				cell('Medical illustrations', 'uworld-step1')
			)
		]
	},
	{
		name: 'Practice',
		rows: [
			row(
				'Multiple-choice questions',
				'Authored questions with answer checking',
				cell('Custom templates / add-ons', 'anki-edit'),
				cell('Learn, Test, Practice Tests', 'quizlet-test'),
				cell('Exam-style MCQs', 'uworld-tour')
			),
			row(
				'Multiple-select questions',
				'Select several correct answers',
				cell('Custom templates / add-ons', 'anki-edit'),
				cell('Not documented in Practice Tests', 'quizlet-practice'),
				cell('Not documented for Step 1', 'uworld-step1')
			),
			row(
				'Fill-in-the-blank practice',
				'Dedicated blank-answer questions',
				cell('Cloze deletion cards', 'anki-edit'),
				cell('Written-answer study options', 'quizlet-test'),
				cell('Custom flashcards', 'uworld-step1')
			),
			row(
				'Matching practice',
				'Dedicated matching questions',
				cell('Custom templates / add-ons', 'anki-edit'),
				cell('Match activity', 'quizlet-sets'),
				cell('Not documented for Step 1', 'uworld-step1')
			),
			row(
				'Explain in your own words',
				'Free-response modules with AI feedback',
				cell('Recall and self-rate', 'anki-study'),
				cell('Written AI Practice Test answers', 'quizlet-practice'),
				cell('QBank centers on selected answers', 'uworld-step1')
			),
			row(
				'Custom timed tests',
				'Choose modules, types, count, and time',
				cell('Filtered study; no native exam mode', 'anki-filter'),
				cell('AI Practice Tests with time limits', 'quizlet-practice'),
				cell('Custom timed tests', 'uworld-tour')
			)
		]
	},
	{
		name: 'Review',
		rows: [
			row(
				'Answer explanations',
				'Rationales where curators provide them',
				cell('Content on the card back', 'anki-edit'),
				cell('Feedback in AI Practice Tests', 'quizlet-practice'),
				cell('Detailed right/wrong rationales', 'uworld-tour')
			),
			row(
				'Mark items for later',
				'Flag questions and filter your module',
				cell('Flags and marked notes', 'anki-study'),
				cell('Star terms for focused study', 'quizlet-test'),
				cell('Marked questions', 'uworld-notes')
			),
			row(
				'Focus on missed material',
				'Filter incorrect module answers',
				cell('Relearning and filtered decks', 'anki-filter'),
				cell('Target terms using progress', 'quizlet-personal-progress'),
				cell('Incorrect-question review', 'uworld-notes')
			),
			row(
				'Personal notes',
				'Rich-text notes attached to questions',
				cell('Edit your card fields', 'anki-edit'),
				cell('Separate question notes not documented', 'quizlet-practice'),
				cell('Searchable My Notebook', 'uworld-notes')
			),
			row(
				'Highlight important text',
				'Save highlights in question stems',
				cell('Format text in the editor', 'anki-edit'),
				cell('Stem highlighting not documented', 'quizlet-practice'),
				cell('Notebook highlighting', 'uworld-notes')
			),
			row(
				'Progress across devices',
				'Saved study progress in your account',
				cell('Sync through AnkiWeb', 'anki-sync'),
				cell('Web and mobile progress sync', 'quizlet-personal-progress'),
				cell('Automatic progress sync', 'uworld-tour')
			)
		]
	},
	{
		name: 'Progress',
		rows: [
			row(
				'Automatic answer grading',
				'Automatic checks; AI for free response',
				cell('Learner rates recall', 'anki-study'),
				cell('Automatic grading in Test', 'quizlet-test'),
				cell('Automatic scoring', 'uworld-tour')
			),
			row(
				'Progress detail',
				'Question status and module mastery',
				cell('Review and retention statistics', 'anki-stats'),
				cell('Study activity and mastery data', 'quizlet-progress'),
				cell('Subject and topic analytics', 'uworld-tour')
			),
			row(
				'Spaced repetition',
				'Spaced mastery checks; no due-date scheduler',
				cell('FSRS review scheduling', 'anki-schedule'),
				cell('Progress-based review; FSRS not documented', 'quizlet-personal-progress'),
				cell('Spaced-repetition flashcards', 'uworld-step1')
			),
			row(
				'Practice-test history',
				'Saved attempts, results, and review',
				cell('Card review history', 'anki-stats'),
				cell('Test mode: no progress saved on exit', 'quizlet-test'),
				cell('Resume and review tests', 'uworld-tour')
			),
			row(
				'Staff progress dashboard',
				'Cohort, student, and module views',
				cell('No native class dashboard documented', 'anki-stats'),
				cell('Class Progress: teacher subscription', 'quizlet-progress'),
				cell('Institutional reporting', 'uworld-educators')
			)
		]
	},
	{
		name: 'Access',
		rows: [
			row(
				'Study on your phone',
				'Responsive browser experience',
				cell('Mobile apps and AnkiWeb', 'anki-app'),
				cell('Web, iOS, and Android', 'quizlet-sets'),
				cell('Web and mobile apps', 'uworld-tour')
			),
			row(
				'Offline study',
				'Internet required for the full study flow',
				cell('Local desktop and mobile collections', 'anki-app'),
				cell('Offline mobile study with a subscription', 'quizlet-plans'),
				cell('Internet connection required', 'uworld-tour')
			),
			row(
				'Dedicated flashcards',
				'Question-first study; no flashcard mode',
				cell('Core experience', 'anki-app'),
				cell('Core experience', 'quizlet-sets'),
				cell('ReadyDecks and SmartCards', 'uworld-step1')
			),
			row(
				'Content export',
				'Module export on eligible curator plans',
				cell('Deck packages and text', 'anki-export'),
				cell('Your own sets as text; no images', 'quizlet-export'),
				cell('QBank export not documented', 'uworld-tour')
			),
			row(
				'Free student access',
				'Free student study; curator plans',
				cell('Free desktop; paid official iOS app', 'anki-app'),
				cell('Free access plus paid study tiers', 'quizlet-plans'),
				cell('Exam-specific subscriptions', 'uworld-step1')
			)
		]
	}
];

export const featureCount = featureGroups.reduce((total, group) => total + group.rows.length, 0);
export function sourceNumber(id: SourceId) {
	return sources.findIndex((source) => source.id === id) + 1;
}

export type Availability = 'yes' | 'partial' | 'no';
type ProductAvailability = Record<'learnterms' | Competitor, Availability>;
const availability = (
	learnterms: Availability,
	anki: Availability,
	quizlet: Availability,
	uworld: Availability
): ProductAvailability => ({ learnterms, anki, quizlet, uworld });
export const featureAvailability: Record<string, ProductAvailability> = {
	'Course organization': availability('yes', 'yes', 'yes', 'yes'),
	'Questions from your lectures': availability('yes', 'partial', 'partial', 'partial'),
	'Links to original course pages': availability('yes', 'partial', 'partial', 'partial'),
	'Content review': availability('yes', 'partial', 'partial', 'yes'),
	'Shared class content': availability('yes', 'partial', 'yes', 'partial'),
	'Images and diagrams': availability('yes', 'yes', 'partial', 'yes'),
	'Multiple-choice questions': availability('yes', 'partial', 'yes', 'yes'),
	'Multiple-select questions': availability('yes', 'partial', 'partial', 'partial'),
	'Fill-in-the-blank practice': availability('yes', 'yes', 'partial', 'partial'),
	'Matching practice': availability('yes', 'partial', 'yes', 'partial'),
	'Explain in your own words': availability('yes', 'partial', 'partial', 'partial'),
	'Custom timed tests': availability('yes', 'no', 'partial', 'yes'),
	'Answer explanations': availability('yes', 'partial', 'partial', 'yes'),
	'Mark items for later': availability('yes', 'yes', 'yes', 'yes'),
	'Focus on missed material': availability('yes', 'yes', 'partial', 'yes'),
	'Personal notes': availability('yes', 'partial', 'partial', 'yes'),
	'Highlight important text': availability('yes', 'partial', 'partial', 'yes'),
	'Progress across devices': availability('yes', 'yes', 'yes', 'yes'),
	'Automatic answer grading': availability('yes', 'no', 'yes', 'yes'),
	'Progress detail': availability('yes', 'yes', 'partial', 'yes'),
	'Spaced repetition': availability('partial', 'yes', 'partial', 'yes'),
	'Practice-test history': availability('yes', 'partial', 'partial', 'yes'),
	'Staff progress dashboard': availability('yes', 'partial', 'partial', 'partial'),
	'Study on your phone': availability('yes', 'yes', 'yes', 'yes'),
	'Offline study': availability('no', 'yes', 'partial', 'no'),
	'Dedicated flashcards': availability('no', 'yes', 'yes', 'yes'),
	'Content export': availability('partial', 'yes', 'partial', 'partial'),
	'Free student access': availability('yes', 'partial', 'partial', 'no')
};

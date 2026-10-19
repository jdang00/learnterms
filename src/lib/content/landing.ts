// Demo data and workflow copy for the public landing page.

// Flag & filter demo seed
export const demoQuestions = [
	{ id: 1, answered: true, flagged: false },
	{ id: 2, answered: true, flagged: true },
	{ id: 3, answered: true, flagged: false },
	{ id: 4, answered: true, flagged: true },
	{ id: 5, answered: false, flagged: false },
	{ id: 6, answered: false, flagged: false },
	{ id: 7, answered: false, flagged: false },
	{ id: 8, answered: false, flagged: true }
];

// Keyboard shortcut animation, using the quiz's real bindings (quiz-dock/shortcuts.ts)
export const keySequence: { key: string; label: string; action: string }[] = [
	{ key: '3', label: 'Select C', action: 'selected-c' },
	{ key: '1', label: 'Select A', action: 'selected-a' },
	{ key: 'Enter', label: 'Check', action: 'checking' },
	{ key: 'Tab', label: 'Rationale', action: 'solution' },
	{ key: 'F', label: 'Flag', action: 'flagging' },
	{ key: '→', label: 'Next', action: 'next' }
];

export const keyOptions = [
	'Demodex blepharitis',
	'Seborrheic blepharitis',
	'Meibomian gland dysfunction'
];

// AI generation animation
export const aiSteps = ['parsing', 'generating', 'done'] as const;

// Analytics demo — cohort student roster
export const cohortStudents = [
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

// Workflow data — lean, no decorative fluff
export const studentSteps = [
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

export const adminSteps = [
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

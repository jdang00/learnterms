import type { FunctionReturnType } from 'convex/server';
import type { api } from '../../convex/_generated/api';

export type StudyOverview = FunctionReturnType<typeof api.studyOverview.getMine>;
export type ClassOverview = StudyOverview['classes'][number];
export type RecentModule = StudyOverview['recent'][number];

export type ModuleProgressSummary = {
	total: number;
	answered: number;
	mastered: number;
	flagged: number;
};

export type ModuleState = 'empty' | 'new' | 'started' | 'answered' | 'mastered';

export function moduleState(m: ModuleProgressSummary): ModuleState {
	if (!m.total) return 'empty';
	if (m.mastered >= m.total) return 'mastered';
	if (m.answered === 0) return 'new';
	return m.answered >= m.total ? 'answered' : 'started';
}

export function moduleStatusLabel(m: ModuleProgressSummary): string {
	switch (moduleState(m)) {
		case 'empty':
			return 'No questions';
		case 'mastered':
			return 'Mastered';
		case 'new':
			return 'Not started';
		case 'started':
			return `${m.total - m.answered} left`;
		case 'answered':
			return `${m.total - m.mastered} to master`;
	}
}

export function summarizeClassProgress(modules: ModuleProgressSummary[]) {
	return {
		modules: modules.length,
		started: modules.filter((m) => m.answered > 0).length,
		mastered: modules.filter((m) => moduleState(m) === 'mastered').length
	};
}

// Fallback class colors when no cardTheme is set; they track DaisyUI's semantic hues.
const CLASS_COLORS = [
	'#7c6fcd',
	'#5b8fd9',
	'#e07baa',
	'#5bba7a',
	'#d97b5b',
	'#c9a84c',
	'#4cb5bf',
	'#9b6fc9',
	'#6899d4',
	'#d4886a',
	'#5aad8e',
	'#cc7191'
];

function hash(value: string): number {
	let h = 0;
	for (let i = 0; i < value.length; i++) h = ((h << 5) - h + value.charCodeAt(i)) | 0;
	return Math.abs(h);
}

export function classColor(classItem: { _id: string; cardTheme?: { base?: string } }): string {
	return classItem.cardTheme?.base || CLASS_COLORS[hash(classItem._id) % CLASS_COLORS.length];
}

// Card copy: keep short descriptions whole, prefer a complete first sentence, else cut at a word.
export function briefDescription(text: string, max = 120): { text: string; truncated: boolean } {
	const clean = text.trim().replace(/\s+/g, ' ');
	if (clean.length <= max) return { text: clean, truncated: false };
	const sentence = clean.match(/^.+?[.!?](?=\s|$)/)?.[0];
	if (sentence && sentence.length <= max && sentence.length >= max / 3) {
		return { text: sentence, truncated: true };
	}
	const cut = clean.slice(0, max);
	const space = cut.lastIndexOf(' ');
	const head = (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:–—-]+$/, '');
	return { text: `${head}…`, truncated: true };
}

export function classActionLabel(counts: { modules: number; started: number; mastered: number }) {
	if (counts.modules > 0 && counts.mastered === counts.modules) return 'Review';
	return counts.started > 0 ? 'Continue' : 'Start';
}

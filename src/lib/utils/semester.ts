import { browser } from '$app/environment';

type SemesterLike = { name: string };

const STORAGE_KEY = 'lastSemesterName';

export function getLastSemesterName(): string | null {
	if (!browser) return null;
	const saved = localStorage.getItem(STORAGE_KEY);
	return saved && saved !== 'null' ? saved : null;
}

export function setLastSemesterName(name: string): void {
	if (!browser) return;
	localStorage.setItem(STORAGE_KEY, name);
}

export function pickDefaultSemesterName<T extends SemesterLike>(
	semesters: T[] | undefined | null,
	current?: string
): string {
	if (current) return current;
	if (!semesters || semesters.length === 0) return '';
	const saved = getLastSemesterName();
	if (saved) {
		const match = semesters.find((s) => s.name === saved);
		if (match) return match.name;
	}
	return semesters[0].name;
}

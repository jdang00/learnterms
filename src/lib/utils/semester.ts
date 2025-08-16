export const DEFAULT_SEMESTER_NAME = 'Summer 2025';

type SemesterLike = { name: string };

export function pickDefaultSemesterName<T extends SemesterLike>(
	semesters: T[] | undefined | null,
	current?: string
): string {
	if (current) return current;
	if (!semesters || semesters.length === 0) return '';
	const preferred = semesters.find((s) => s.name === DEFAULT_SEMESTER_NAME);
	return preferred?.name ?? semesters[0].name;
}



export function formatDate(dateString: string | null): string {
	if (!dateString) return '';

	const date = new Date(dateString);
	if (isNaN(date.getTime())) return 'Invalid date';

	return new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	}).format(date);
}

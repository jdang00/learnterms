export function relativeTime(timestamp: number | null | undefined, now: number): string {
	if (!timestamp) return 'No activity yet';
	const minutes = Math.max(0, Math.floor((now - timestamp) / 60000));
	if (minutes < 1) return 'Just now';
	if (minutes < 60) return `${minutes}m ago`;
	if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
	if (minutes < 43200) return `${Math.floor(minutes / 1440)}d ago`;
	return new Date(timestamp).toLocaleDateString();
}

export function plainText(html: string): string {
	return html
		.replace(/<[^>]*>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&#39;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/\s+/g, ' ')
		.trim();
}

export function percent(part: number, total: number): number {
	return total > 0 ? Math.min(100, Math.max(0, Math.round((part / total) * 100))) : 0;
}

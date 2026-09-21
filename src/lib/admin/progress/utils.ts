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

export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

export function startOfLocalDay(timestamp: number): number {
	const date = new Date(timestamp);
	date.setHours(0, 0, 0, 0);
	return date.getTime();
}

export function localDayKey(timestamp: number): number {
	return Math.floor((timestamp - new Date(timestamp).getTimezoneOffset() * 60_000) / DAY_MS);
}

export function compactNumber(value: number): string {
	return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(
		value
	);
}

export function changePercent(current: number, previous: number): number | null {
	if (previous <= 0) return null;
	return Math.round(((current - previous) / previous) * 100);
}

export type Engagement = 'live' | 'active' | 'cooling' | 'dormant' | 'none';

export const engagementMeta: Record<Engagement, { label: string; hint: string; dot: string }> = {
	live: {
		label: 'Studying now',
		hint: 'Active in the last 15 minutes',
		dot: 'status-success'
	},
	active: {
		label: 'Active this week',
		hint: 'Studied in the last 7 days',
		dot: 'status-primary'
	},
	cooling: {
		label: 'Cooling off',
		hint: 'Last studied 8–30 days ago',
		dot: 'status-warning'
	},
	dormant: {
		label: 'Gone quiet',
		hint: 'Started, but nothing for 30+ days',
		dot: 'status-error'
	},
	none: {
		label: 'Not started',
		hint: 'No questions tried yet',
		dot: 'status-neutral'
	}
};

export function engagementFor(
	lastActiveAt: number | null,
	questionsInteracted: number,
	now: number
): Engagement {
	if (!lastActiveAt && questionsInteracted === 0) return 'none';
	if (!lastActiveAt) return 'dormant';
	const age = now - lastActiveAt;
	if (age <= 15 * 60_000) return 'live';
	if (age <= 7 * DAY_MS) return 'active';
	if (age <= 30 * DAY_MS) return 'cooling';
	return 'dormant';
}

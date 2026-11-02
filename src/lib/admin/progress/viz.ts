import { DAY_MS, startOfLocalDay } from './utils';

// One visual language for every progress chart: live is success green, study volume and
// recency are a single primary ramp, and "nothing yet" is the muted track.

export const LIVE_MS = 15 * 60_000;

export type Recency = 'now' | 'today' | 'week' | 'earlier' | 'never';
export const recencyOrder: Recency[] = ['now', 'today', 'week', 'earlier', 'never'];

export const recencyMeta: Record<Recency, { label: string; fill: string }> = {
	now: { label: 'Now', fill: 'bg-success' },
	today: { label: 'Today', fill: 'bg-primary' },
	week: { label: 'This week', fill: 'bg-primary/45' },
	earlier: { label: 'Earlier', fill: 'bg-primary/15' },
	never: { label: 'Not yet', fill: 'bg-muted-strong' }
};

export function recencyFor(at: number | null | undefined, now: number): Recency {
	if (!at) return 'never';
	if (now - at <= LIVE_MS) return 'now';
	if (at >= startOfLocalDay(now)) return 'today';
	if (now - at <= 7 * DAY_MS) return 'week';
	return 'earlier';
}

export function windowStart(window: Exclude<Recency, 'earlier' | 'never'>, now: number) {
	if (window === 'now') return now - LIVE_MS;
	if (window === 'today') return startOfLocalDay(now);
	return now - 7 * DAY_MS;
}

/** Five-step volume ramp shared by the heatmap, grid coverage and legends. */
export const rampFills = [
	'bg-muted-strong',
	'bg-primary/20',
	'bg-primary/40',
	'bg-primary/65',
	'bg-primary'
] as const;

export function rampLevel(value: number, max: number) {
	if (!value || !max) return 0;
	return Math.min(4, Math.max(1, Math.ceil((value / max) * 4)));
}

export function plural(count: number, one: string, many = `${one}s`) {
	return `${count} ${count === 1 ? one : many}`;
}

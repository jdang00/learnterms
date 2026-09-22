import type { StudyToolDetails } from '$lib/analytics/studyToolEvents';

export type SidePanelId = 'calculator' | 'notes';

const KEY = 'lt:sidePanel';

// One right-hand panel at a time, so the question column only ever gives up one panel's width.
class SidePanelState {
	current = $state<SidePanelId | null>(null);
	#restored = false;
	source = $state<StudyToolDetails['source']>('automatic');

	set(id: SidePanelId | null, source: StudyToolDetails['source'] = 'button') {
		this.source = source;
		this.current = id;
		try {
			localStorage.setItem(KEY, id ?? '');
		} catch {
			/* Storage is optional. */
		}
	}
	toggle(id: SidePanelId, source: StudyToolDetails['source'] = 'button') {
		this.set(this.current === id ? null : id, source);
	}
	// Reopens the last panel after a reload; small screens start closed because the panel covers the page.
	restore() {
		if (this.#restored) return;
		this.#restored = true;
		try {
			const saved = localStorage.getItem(KEY);
			if (
				(saved === 'calculator' || saved === 'notes') &&
				matchMedia('(min-width: 1024px)').matches
			) {
				this.source = 'restore';
				this.current = saved;
			}
		} catch {
			/* Storage is optional. */
		}
	}
}

export const sidePanel = new SidePanelState();

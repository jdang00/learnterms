export type SidePanelId = 'calculator' | 'notes';

const KEY = 'lt:sidePanel';

// One right-hand panel at a time, so the question column only ever gives up one panel's width.
class SidePanelState {
	current = $state<SidePanelId | null>(null);
	#restored = false;

	set(id: SidePanelId | null) {
		this.current = id;
		try {
			localStorage.setItem(KEY, id ?? '');
		} catch {
			/* Storage is optional. */
		}
	}
	toggle(id: SidePanelId) {
		this.set(this.current === id ? null : id);
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
			)
				this.current = saved;
		} catch {
			/* Storage is optional. */
		}
	}
}

export const sidePanel = new SidePanelState();

import { getContext, setContext } from 'svelte';
import {
	cloneDock,
	DEFAULT_DOCK,
	sameDock,
	sanitizeDock,
	toStoredDock,
	type DockConfig,
	type StoredDock
} from './layouts';

const LAYOUT_KEY = 'lt:quizDock:layout';
const SYNCED_KEY = 'lt:quizDock:synced';
const MODE_KEY = 'lt:quizDock:advanced';
const SAVE_DELAY_MS = 400;

export type DockSync = { save: (layout: StoredDock | null) => Promise<unknown> };

// localStorage paints the dock instantly; the account copy in Convex is the source of truth.
export class DockPreferences {
	layout = $state<DockConfig>(cloneDock(DEFAULT_DOCK));
	customizing = $state(false);
	advanced = $state(false);
	syncError = $state(false);

	private sync: DockSync | null = null;
	private custom = false;
	private inFlight = 0;
	private timer: ReturnType<typeof setTimeout> | null = null;

	load() {
		const raw = readStorage(LAYOUT_KEY);
		if (raw) {
			try {
				this.layout = sanitizeDock(JSON.parse(raw));
				this.custom = true;
			} catch {
				// keep default
			}
		}
		this.advanced = readStorage(MODE_KEY) === 'true';
	}

	connect(sync: DockSync) {
		this.sync = sync;
	}

	hydrate(remote: StoredDock | null) {
		if (this.timer || this.inFlight > 0) return;
		const firstSync = readStorage(SYNCED_KEY) !== 'true';
		if (remote) {
			const next = sanitizeDock(remote);
			if (!sameDock(next, this.layout)) this.layout = next;
			this.custom = true;
			writeStorage(LAYOUT_KEY, JSON.stringify(remote));
		} else if (firstSync && this.custom) {
			this.queueSave(0);
		} else if (this.custom || !sameDock(this.layout, DEFAULT_DOCK)) {
			this.layout = cloneDock(DEFAULT_DOCK);
			this.custom = false;
			removeStorage(LAYOUT_KEY);
		}
		writeStorage(SYNCED_KEY, 'true');
	}

	set(config: DockConfig) {
		this.layout = config;
		this.custom = true;
		writeStorage(LAYOUT_KEY, JSON.stringify(toStoredDock(config)));
		this.queueSave();
	}

	reset() {
		this.layout = cloneDock(DEFAULT_DOCK);
		this.custom = false;
		removeStorage(LAYOUT_KEY);
		this.queueSave();
	}

	setAdvanced(advanced: boolean) {
		this.advanced = advanced;
		writeStorage(MODE_KEY, String(advanced));
	}

	open() {
		this.customizing = true;
	}

	close() {
		this.customizing = false;
	}

	private queueSave(delay = SAVE_DELAY_MS) {
		if (!this.sync) return;
		if (this.timer) clearTimeout(this.timer);
		this.timer = setTimeout(() => void this.flush(), delay);
	}

	private async flush() {
		this.timer = null;
		if (!this.sync) return;
		this.inFlight++;
		try {
			await this.sync.save(this.custom ? toStoredDock(this.layout) : null);
			this.syncError = false;
		} catch {
			this.syncError = true;
		} finally {
			this.inFlight--;
		}
	}
}

function readStorage(key: string): string | null {
	try {
		return window.localStorage.getItem(key);
	} catch {
		return null;
	}
}

function writeStorage(key: string, value: string) {
	try {
		window.localStorage.setItem(key, value);
	} catch {
		// storage unavailable
	}
}

function removeStorage(key: string) {
	try {
		window.localStorage.removeItem(key);
	} catch {
		// storage unavailable
	}
}

const DOCK_PREFERENCES_KEY = Symbol('dock-preferences');

export function setDockPreferences(preferences: DockPreferences) {
	return setContext(DOCK_PREFERENCES_KEY, preferences);
}

export function getDockPreferences(): DockPreferences | undefined {
	return getContext<DockPreferences | undefined>(DOCK_PREFERENCES_KEY);
}

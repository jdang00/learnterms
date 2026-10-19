import { dark } from '@clerk/ui/themes';
import { toStore } from 'svelte/store';
import { browser } from '$app/environment';

export type ThemeMode = 'light' | 'dark';

// Tints the browser chrome (and the installed app's status bar) to match the page background.
const CHROME_COLOR: Record<ThemeMode, string> = { light: '#ffffff', dark: '#1d232a' };

function applyTheme(theme: ThemeMode) {
	document.documentElement.setAttribute('data-theme', theme);
	document.querySelector('meta[name="theme-color"]')?.setAttribute('content', CHROME_COLOR[theme]);
}

class ThemeState {
	current = $state<ThemeMode>('light');

	get isDark() {
		return this.current === 'dark';
	}

	get clerkTheme() {
		return this.current === 'dark' ? dark : undefined;
	}

	init() {
		if (!browser) return;
		const saved = localStorage.getItem('theme');
		const mode: ThemeMode = saved === 'light' || saved === 'dark' ? saved : 'light';
		this.current = mode;
		applyTheme(mode);
	}

	toggle() {
		this.set(this.current === 'light' ? 'dark' : 'light');
	}

	set(mode: ThemeMode) {
		this.current = mode;
		if (!browser) return;
		localStorage.setItem('theme', mode);
		applyTheme(mode);
	}

	// Store contract so `$theme` keeps working in templates that haven't moved to `theme.current`.
	subscribe(run: (mode: ThemeMode) => void) {
		return themeStore.subscribe(run);
	}
}

export const theme = new ThemeState();
const themeStore = toStore(() => theme.current);

export const isDark = toStore(() => theme.isDark);
export const clerkTheme = toStore(() => theme.clerkTheme);

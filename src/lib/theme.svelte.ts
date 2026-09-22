import { dark } from '@clerk/themes';
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export type ThemeMode = 'light' | 'dark';

// Tints the browser chrome (and the installed app's status bar) to match base-100.
const CHROME_COLOR: Record<ThemeMode, string> = { light: '#ffffff', dark: '#1d232a' };

function applyTheme(theme: ThemeMode) {
	document.documentElement.setAttribute('data-theme', theme);
	document.querySelector('meta[name="theme-color"]')?.setAttribute('content', CHROME_COLOR[theme]);
}

const createThemeStore = () => {
	const { subscribe, set, update } = writable<ThemeMode>('light');

	const init = () => {
		if (browser) {
			const savedTheme = localStorage.getItem('theme');
			const theme: ThemeMode =
				savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'light';
			set(theme);
			applyTheme(theme);
		}
	};

	const toggle = () => {
		update((current) => {
			const newTheme = current === 'light' ? 'dark' : 'light';
			if (browser) {
				localStorage.setItem('theme', newTheme);
				applyTheme(newTheme);
			}
			return newTheme;
		});
	};

	const setTheme = (theme: ThemeMode) => {
		set(theme);
		if (browser) {
			localStorage.setItem('theme', theme);
			applyTheme(theme);
		}
	};

	return {
		subscribe,
		toggle,
		set: setTheme,
		init
	};
};

export const theme = createThemeStore();

export const clerkTheme = derived(theme, ($theme) => ($theme === 'dark' ? dark : undefined));

export const isDark = derived(theme, ($theme) => $theme === 'dark');

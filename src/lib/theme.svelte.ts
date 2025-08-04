import { dark } from '@clerk/themes';
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export type ThemeMode = 'light' | 'dark';

const createThemeStore = () => {
	const { subscribe, set, update } = writable<ThemeMode>('light');

	const init = () => {
		if (browser) {
			const savedTheme = localStorage.getItem('theme');
			const theme: ThemeMode = (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'light';
			set(theme);
			document.documentElement.setAttribute('data-theme', theme);
		}
	};

	const toggle = () => {
		update(current => {
			const newTheme = current === 'light' ? 'dark' : 'light';
			if (browser) {
				localStorage.setItem('theme', newTheme);
				document.documentElement.setAttribute('data-theme', newTheme);
			}
			return newTheme;
		});
	};

	const setTheme = (theme: ThemeMode) => {
		set(theme);
		if (browser) {
			localStorage.setItem('theme', theme);
			document.documentElement.setAttribute('data-theme', theme);
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

export const clerkTheme = derived(theme, ($theme) => 
	$theme === 'dark' ? dark : undefined
);

export const isDark = derived(theme, ($theme) => $theme === 'dark'); 
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const defaultTheme = 'light';

const initialTheme = browser ? localStorage.getItem('theme') || defaultTheme : defaultTheme;
const initialManuallySet = browser ? localStorage.getItem('themeManuallySet') === 'true' : false;

export const theme = writable<string>(initialTheme);
export const manuallySet = writable<boolean>(initialManuallySet);

theme.subscribe((value) => {
	if (browser) {
		localStorage.setItem('theme', value);
	}
});

manuallySet.subscribe((value) => {
	if (browser) {
		localStorage.setItem('themeManuallySet', value.toString());
	}
});

export function toggleTheme() {
	theme.update((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'));
	manuallySet.set(true);
}

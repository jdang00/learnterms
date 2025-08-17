import { getContext } from 'svelte';
import { theme, isDark, type ThemeMode } from '$lib/theme.svelte';

export function useTheme() {
	const context = getContext('theme');
	if (context) {
		return context;
	} else {
		return {
			theme,
			isDark,
			toggle: () => theme.toggle(),
			set: (mode: ThemeMode) => theme.set(mode)
		};
	}
}

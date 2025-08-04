import { getContext } from 'svelte';
import { theme, isDark, type ThemeMode } from '$lib/theme.svelte';

export function useTheme() {
	try {
		const context = getContext('theme');
		return context;
	} catch {
		return {
			theme,
			isDark,
			toggle: () => theme.toggle(),
			set: (mode: ThemeMode) => theme.set(mode)
		};
	}
} 
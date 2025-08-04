<script lang="ts">
	import { theme, isDark, type ThemeMode } from '$lib/theme.svelte';
	import { setContext } from 'svelte';

	setContext('theme', {
		theme,
		isDark,
		toggle: () => theme.toggle(),
		set: (mode: ThemeMode) => theme.set(mode)
	});

	const { children } = $props();
</script>

{@render children?.()} 
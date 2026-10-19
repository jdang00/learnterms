<script lang="ts">
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import { theme } from '#lib/theme.svelte.js';
	import { Button } from '#lib/components/ui/button/index.js';

	interface Props {
		size?: 'sm' | 'md' | 'lg';
		variant?: 'ghost' | 'outline' | 'primary';
		class?: string;
	}

	const { size = 'md', variant = 'ghost', class: className = '' }: Props = $props();

	const sizes = { sm: 'sm', md: 'md', lg: 'lg' } as const;
	const looks = {
		ghost: { variant: 'ghost', tone: 'neutral' },
		outline: { variant: 'outline', tone: 'neutral' },
		primary: { variant: 'solid', tone: 'primary' }
	} as const;
</script>

<Button
	variant={looks[variant].variant}
	tone={looks[variant].tone}
	size={sizes[size]}
	shape="circle"
	class="relative overflow-hidden {className}"
	onclick={() => theme.toggle()}
	aria-label="Toggle theme"
>
	<div
		class="absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out {theme.isDark
			? 'opacity-0 -rotate-90'
			: 'opacity-100 rotate-0'}"
	>
		<Sun size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />
	</div>
	<div
		class="absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out {theme.isDark
			? 'opacity-100 rotate-0'
			: 'opacity-0 rotate-90'}"
	>
		<Moon size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />
	</div>
</Button>

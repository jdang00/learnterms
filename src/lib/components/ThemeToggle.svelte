<script lang="ts">
	import { Sun, Moon } from 'lucide-svelte';
	import { theme, isDark } from '$lib/theme.svelte';

	interface Props {
		size?: 'sm' | 'md' | 'lg';
		variant?: 'ghost' | 'outline' | 'primary';
		class?: string;
	}

	const { size = 'md', variant = 'ghost', class: className = '' } = $props();

	const sizeClasses = {
		sm: 'btn-sm',
		md: '',
		lg: 'btn-lg'
	};

	const variantClasses = {
		ghost: 'btn-ghost',
		outline: 'btn-outline',
		primary: 'btn-primary'
	};
</script>

<button 
	class="btn {variantClasses[variant as keyof typeof variantClasses]} {sizeClasses[size as keyof typeof sizeClasses]} relative overflow-hidden {className}"
	onclick={() => theme.toggle()}
	aria-label="Toggle theme"
>
	<div
		class="absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out {$isDark
			? 'opacity-0 -rotate-90'
			: 'opacity-100 rotate-0'}"
	>
		<Sun size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />
	</div>
	<div
		class="absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out {$isDark
			? 'opacity-100 rotate-0'
			: 'opacity-0 rotate-90'}"
	>
		<Moon size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />
	</div>
</button> 
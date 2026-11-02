<script lang="ts">
	import LockKeyhole from '@lucide/svelte/icons/lock-keyhole';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import { isConvexAuthError } from '#lib/utils/errorHandling.js';
	import { Button } from '#lib/components/ui/button/index.js';

	let {
		error,
		showReload = false,
		size = 'normal',
		class: className = ''
	}: {
		error: unknown;
		showReload?: boolean;
		size?: 'small' | 'normal' | 'large';
		class?: string;
	} = $props();

	// An expired Convex session reads as routine, not as a failure.
	const isAuthError = $derived(isConvexAuthError(error));
	const textSize = $derived(
		size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : 'text-base'
	);
</script>

<div class="flex flex-col items-center justify-center p-6 text-center {className}" role="alert">
	<span
		class="mb-3 grid size-12 place-items-center rounded-2xl {isAuthError
			? 'bg-primary/10 text-primary-ink'
			: 'bg-error/10 text-error-ink'}"
	>
		{#if isAuthError}<LockKeyhole size={22} />{:else}<TriangleAlert size={22} />{/if}
	</span>
	<h3 class="mb-1.5 font-semibold {textSize}">
		{isAuthError ? 'Session refreshed' : 'Something went wrong'}
	</h3>
	<p class="mb-4 max-w-sm text-foreground/70 {textSize === 'text-lg' ? 'text-base' : 'text-sm'}">
		{isAuthError
			? 'Your session was refreshed for security. Reload to keep studying.'
			: 'This content didn’t load. Reloading usually fixes it.'}
	</p>
	{#if showReload}
		<Button
			size="sm"
			variant={isAuthError ? 'solid' : 'outline'}
			tone={isAuthError ? 'primary' : 'error'}
			onclick={() => window.location.reload()}
		>
			<RefreshCw />{isAuthError ? 'Continue' : 'Reload'}
		</Button>
	{/if}
</div>

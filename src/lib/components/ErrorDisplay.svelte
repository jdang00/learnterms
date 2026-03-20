<script lang="ts">
	import { AlertTriangle, RefreshCw } from 'lucide-svelte';

	let {
		error,
		showReload = false,
		size = 'normal',
		class: className = ''
	} = $props();

	function isConvexAuthError(error: any): boolean {
		if (!error) return false;

		const errorMessage = error.message || error.toString();
		const lowerMessage = errorMessage.toLowerCase();

		const authPatterns = [
			'unauthorized',
			'authentication',
			'not authenticated',
			'session expired',
			'token expired',
			'invalid token',
			'jwt',
			'access denied'
		];

		return authPatterns.some(pattern => lowerMessage.includes(pattern));
	}

	function handleReload() {
		window.location.reload();
	}

	let isAuthError = $state(false);
	let sizeClasses = $state('text-base');

	$effect(() => {
		isAuthError = isConvexAuthError(error);
		sizeClasses = size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : 'text-base';
	});
</script>

<div class="flex flex-col items-center justify-center p-6 {className}">
	<div class="mb-3">
		{#if isAuthError}
			<svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
			</svg>
		{:else}
			<svg class="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
			</svg>
		{/if}
	</div>

	<h3 class="font-semibold {sizeClasses} {isAuthError ? 'text-primary' : 'text-error'} mb-2 text-center">
		{isAuthError ? 'Session Refreshed' : 'Error'}
	</h3>

	<p class="{sizeClasses} text-base-content/80 text-center mb-4 max-w-sm">
		{isAuthError
			? 'Your session has been refreshed for security. Please reload to continue learning.'
			: 'Something went wrong while loading this content.'
		}
	</p>

	{#if showReload}
		<button
			class="btn btn-sm {isAuthError ? 'btn-primary' : 'btn-outline btn-error'} gap-2"
			onclick={handleReload}
			aria-label="Reload page"
		>
			<RefreshCw size="16" />
			<span>{isAuthError ? 'Continue' : 'Reload'}</span>
		</button>
	{/if}
</div>

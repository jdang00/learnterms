<script lang="ts">
	import { RefreshCw } from 'lucide-svelte';

	let {
		error,
		showReload = true,
		title = 'Something went wrong',
		message = 'An error occurred while loading this content.',
		class: className = '',
		suppressIfOtherAuthErrors = false
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
			'access denied',
			'forbidden'
		];

		return authPatterns.some(pattern => lowerMessage.includes(pattern));
	}

	function shouldSuppressError(error: any, hasOtherAuthErrors: boolean = false): boolean {
		if (!isConvexAuthError(error)) return false;

		const errorMessage = (error.message || error.toString()).toLowerCase();

		if (errorMessage === 'unauthorized' && hasOtherAuthErrors) {
			return true;
		}

		return false;
	}

	function handleReload() {
		window.location.reload();
	}

	$effect(() => {
		isAuthError = isConvexAuthError(error);
		shouldSuppress = shouldSuppressError(error, suppressIfOtherAuthErrors);
	});

	let isAuthError = $state(false);
	let shouldSuppress = $state(false);
</script>

{#if !shouldSuppress}
	<div class="rounded-lg border-l-4 {isAuthError ? 'border-primary bg-primary/5' : 'border-error bg-error/5'} p-4 shadow-sm {className}" role="alert">
	<div class="flex items-start gap-3">
		<div class="flex-shrink-0 mt-0.5">
			{#if isAuthError}
				<svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
				</svg>
			{:else}
				<svg class="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
				</svg>
			{/if}
		</div>

		<div class="flex-1 min-w-0">
				{#if isAuthError}
					<h3 class="font-semibold text-primary text-lg mb-1">Session Refreshed</h3>
					<div class="text-sm text-base-content/80">
						<p class="mb-2">Your session has been refreshed for security. Please reload to continue learning.</p>
						<p class="text-base-content/60">This automatic refresh helps protect your learning data.</p>
					</div>
				{:else}
					<h3 class="font-semibold text-error text-lg mb-1">{title}</h3>
					<div class="text-sm text-base-content/80">
						<p class="mb-2">{message}</p>
						{#if error?.message}
							<div class="bg-base-200 border border-base-300 rounded p-2 mt-2">
								<p class="text-error font-mono text-xs">{error.message}</p>
							</div>
						{/if}
					</div>
				{/if}
			</div>

		{#if showReload}
				<div class="flex-shrink-0">
					<button
						class="btn btn-sm {isAuthError ? 'btn-primary' : 'btn-outline btn-error'} gap-2"
						onclick={handleReload}
						aria-label="Reload page"
					>
						<RefreshCw size="14" />
						<span class="hidden sm:inline">
							{isAuthError ? 'Continue' : 'Try Again'}
						</span>
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

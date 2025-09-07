<script lang="ts">
	import ErrorBoundary from './ErrorBoundary.svelte';

	let {
		questions,
		module,
		moduleProgress,
		className = ''
	} = $props();

	function isAuthError(error: any): boolean {
		if (!error) return false;
		const message = error.message || error.toString();
		const patterns = ['unauthorized', 'authentication', 'not authenticated', 'session expired', 'token expired', 'invalid token', 'jwt', 'access denied', 'forbidden'];
		return patterns.some(pattern => message.toLowerCase().includes(pattern));
	}

	function getErrorPriority(error: any): number {
		if (!error) return 0;
		if (isAuthError(error)) return 3;
		if (error.message?.toLowerCase().includes('network')) return 2;
		return 1;
	}

	let allErrors = $derived([
		{ error: questions?.error, source: 'questions', priority: getErrorPriority(questions?.error) },
		{ error: module?.error, source: 'module', priority: getErrorPriority(module?.error) },
		{ error: moduleProgress?.error, source: 'progress', priority: getErrorPriority(moduleProgress?.error) }
	].filter(item => item.error));

	let authErrorCount = $derived(allErrors.filter(item => isAuthError(item.error)).length);
	let hasMultipleAuthErrors = $derived(authErrorCount > 1);

	let primaryError = $derived(allErrors.length > 0 ? allErrors.reduce((prev, current) => current.priority > prev.priority ? current : prev) : null);

	function getConsolidatedError(): { title: string, message: string } {
		if (!primaryError) return { title: '', message: '' };

		const hasAuthErrors = allErrors.some(item => isAuthError(item.error));
		const hasNonAuthErrors = allErrors.some(item => !isAuthError(item.error));

		if (hasMultipleAuthErrors) {
			return {
				title: 'Session Refreshed',
				message: 'Your session has been refreshed for security. Multiple services need to reconnect. Please reload to continue learning.'
			};
		} else if (hasAuthErrors && hasNonAuthErrors) {
			return {
				title: 'Authentication Required',
				message: 'Your session needs to be refreshed and some services are temporarily unavailable. Please reload to restore full functionality.'
			};
		} else if (hasAuthErrors) {
			return {
				title: 'Session Refreshed',
				message: 'Your session has been refreshed for security. Please reload to continue learning.'
			};
		} else {
			// Non-auth errors - show the primary one
			const errorMsg = primaryError.error.message || 'An error occurred';
			if (errorMsg.toLowerCase().includes('network')) {
				return {
					title: 'Connection Issue',
					message: 'Unable to connect to the server. Please check your internet connection and try again.'
				};
			} else {
				return {
					title: 'Loading Error',
					message: 'Unable to load some content. Please try reloading the page.'
				};
			}
		}
	}

	let consolidatedError = $derived(getConsolidatedError());
</script>

{#if primaryError && consolidatedError.title}
	<ErrorBoundary
		error={primaryError.error}
		title={consolidatedError.title}
		message={consolidatedError.message}
		suppressIfOtherAuthErrors={hasMultipleAuthErrors && !isAuthError(primaryError.error)}
		class={className}
	/>
{/if}

/**
 * Utility functions for handling errors in the application
 */

/**
 * Check if an error is related to Convex authentication
 */
export function getErrorText(error: unknown): string {
	if (!error) return '';

	if (error instanceof Error) return error.message;
	if (typeof error === 'string') return error;
	return String(error);
}

export function isConvexAuthError(error: unknown): boolean {
	if (!error) return false;

	const errorMessage = getErrorText(error);
	const lowerMessage = errorMessage.toLowerCase();

	// Common Convex auth error patterns
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

	return authPatterns.some((pattern) => lowerMessage.includes(pattern));
}

/**
 * Get user-friendly error message based on error type
 */
export function getErrorMessage(error: unknown): string {
	if (isConvexAuthError(error)) {
		return 'Your session has expired. Please reload the page to continue.';
	}

	const message = getErrorText(error);
	if (message) return message;

	return 'An unexpected error occurred.';
}

/**
 * Check if an error should trigger a page reload
 */
export function shouldReloadOnError(error: unknown): boolean {
	return isConvexAuthError(error);
}

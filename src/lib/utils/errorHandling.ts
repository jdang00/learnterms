/**
 * Utility functions for handling errors in the application
 */

/**
 * Check if an error is related to Convex authentication
 */
export function isConvexAuthError(error: any): boolean {
	if (!error) return false;

	const errorMessage = error.message || error.toString();
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

	return authPatterns.some(pattern => lowerMessage.includes(pattern));
}

/**
 * Get user-friendly error message based on error type
 */
export function getErrorMessage(error: any): string {
	if (isConvexAuthError(error)) {
		return 'Your session has expired. Please reload the page to continue.';
	}

	if (error?.message) {
		return error.message;
	}

	return 'An unexpected error occurred.';
}

/**
 * Check if an error should trigger a page reload
 */
export function shouldReloadOnError(error: any): boolean {
	return isConvexAuthError(error);
}

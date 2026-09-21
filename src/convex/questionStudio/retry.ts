/** Retry only rolled-back Convex conflicts, never a paid provider request. */
export async function retryConflict<T>(operation: () => Promise<T>): Promise<T> {
	for (let attempt = 0; ; attempt++) {
		try {
			return await operation();
		} catch (error) {
			if (
				attempt >= 2 ||
				!(error instanceof Error) ||
				!error.message.includes(
					'changed while this mutation was being run and on every subsequent retry'
				)
			)
				throw error;
			await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
		}
	}
}

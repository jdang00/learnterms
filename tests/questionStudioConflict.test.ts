import { expect, test } from 'bun:test';
import { retryConflict } from '../src/convex/questionStudio/retry';
test('rolled-back claims can recover, but provider and authorization failures are not retried', async () => {
	let calls = 0;
	expect(
		await retryConflict(async () => {
			if (calls++ === 0)
				throw new Error(
					'Documents read from or written to the table changed while this mutation was being run and on every subsequent retry'
				);
			return 'claimed';
		})
	).toBe('claimed');
	expect(calls).toBe(2);
	calls = 0;
	await expect(
		retryConflict(async () => {
			calls++;
			throw new Error('Unauthorized');
		})
	).rejects.toThrow('Unauthorized');
	expect(calls).toBe(1);
});

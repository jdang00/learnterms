// @ts-nocheck
import type { authLog } from '$lib/types';

export const load = async ({ locals }: Parameters<PageServerLoad>[0]) => {
	try {
		const user = locals.session;

		if (!user) {
			console.warn('No user found in session.');
			return {
				loggedIn: false,
				userName: 'Guest'
			};
		}

		const log: authLog = {
			loggedIn: true,
			userName: user.claims.userName || 'Guest'
		};

		console.log(log);
		return log;
	} catch (error) {
		console.error('Error loading user data:', error);

		return {
			loggedIn: false,
			userName: 'Error'
		};
	}
};

import type { authLog } from '$lib/types';

export const load = async ({ locals }) => {
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

		return log;
	} catch (error) {
		console.error('Error loading user data:', error);

		return {
			loggedIn: false,
			userName: 'Error'
		};
	}
};

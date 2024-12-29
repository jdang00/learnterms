interface authLog {
	loggedIn: boolean;
	userName: string;
}

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
			userName: user.userName || 'Guest' // Fallback if userName is missing
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

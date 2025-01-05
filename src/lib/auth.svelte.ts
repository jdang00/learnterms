import type { authLog } from '$lib/types';

export const auth = $state<authLog>({
	loggedIn: false,
	userName: 'Guest'
});

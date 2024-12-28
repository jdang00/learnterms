export const load = async ({ locals }) => {
	const user = locals.session;

	return user;
};

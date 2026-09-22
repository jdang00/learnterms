type UserProfile = {
	fullName?: string | null;
	username?: string | null;
	primaryEmailAddressId?: string | null;
	emailAddresses?: ReadonlyArray<{ id: string; emailAddress: string }>;
};

export function userDisplayName(user: UserProfile): string {
	return (
		user.fullName?.trim() ||
		user.username?.trim() ||
		user.emailAddresses
			?.find((email) => email.id === user.primaryEmailAddressId)
			?.emailAddress.trim() ||
		'LearnTerms User'
	);
}

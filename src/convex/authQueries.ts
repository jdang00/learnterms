import { query, mutation, action } from './_generated/server';
import { v } from 'convex/values';

// Clerk API configuration
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const CLERK_API_BASE = 'https://api.clerk.com/v1';

// Type definitions based on actual API responses
interface JWTPayload {
	azp: string;
	exp: number;
	fva: number[];
	iat: number;
	iss: string;
	jti: string;
	nbf: number;
	sid: string;
	sub: string;
	userName: string;
	v: number;
}

interface ClerkEmailAddress {
	id: string;
	object: string;
	email_address: string;
	reserved: boolean;
	verification: {
		object: string;
		status: string;
		strategy: string;
		attempts: null;
		expire_at: null;
	};
	linked_to: Array<{
		type: string;
		id: string;
	}>;
	matches_sso_connection: boolean;
	created_at: number;
	updated_at: number;
}

interface ClerkExternalAccount {
	object: string;
	id: string;
	provider: string;
	identification_id: string;
	provider_user_id: string;
	approved_scopes: string;
	email_address: string;
	first_name: string;
	last_name: string;
	avatar_url: string;
	image_url: string;
	username: string;
	public_metadata: Record<string, unknown>;
	label: null;
	created_at: number;
	updated_at: number;
	verification: {
		object: string;
		status: string;
		strategy: string;
		attempts: null;
		expire_at: number;
	};
	external_account_id: string;
	google_id: string;
	given_name: string;
	family_name: string;
	picture: string;
}

interface ClerkUser {
	id: string;
	object: string;
	username: null;
	first_name: string;
	last_name: string;
	image_url: string;
	has_image: boolean;
	primary_email_address_id: string;
	primary_phone_number_id: null;
	primary_web3_wallet_id: null;
	password_enabled: boolean;
	two_factor_enabled: boolean;
	totp_enabled: boolean;
	backup_code_enabled: boolean;
	email_addresses: ClerkEmailAddress[];
	phone_numbers: any[];
	web3_wallets: any[];
	passkeys: any[];
	external_accounts: ClerkExternalAccount[];
	saml_accounts: any[];
	enterprise_accounts: any[];
	public_metadata: {
		plan: string;
		role: string;
		create: string;
	};
	private_metadata: Record<string, unknown>;
	unsafe_metadata: Record<string, unknown>;
	external_id: null;
	last_sign_in_at: number;
	banned: boolean;
	locked: boolean;
	lockout_expires_in_seconds: null;
	verification_attempts_remaining: number;
	created_at: number;
	updated_at: number;
	delete_self_enabled: boolean;
	create_organization_enabled: boolean;
	last_active_at: number;
	mfa_enabled_at: null;
	mfa_disabled_at: null;
	legal_accepted_at: null;
	profile_image_url: string;
}

interface AuthenticatedUser {
	clerkUserId: string;
	email: string | null;
	name: string | null;
	firstName: string | null;
	lastName: string | null;
	role: string;
	plan: string | null;
	createAccess: string | null;
	publicMetadata: Record<string, unknown>;
	privateMetadata: Record<string, unknown>;
	isAdmin: boolean;
	isStudent: boolean;
	sessionId: string | null;
	expiresAt: number | null;
	permissions?: {
		isAdmin: boolean;
		isStudent: boolean;
		canCreateContent: boolean;
		canEditContent: boolean;
		canDeleteContent: boolean;
	};
}

interface AuthResult {
	authenticated: boolean;
	user?: AuthenticatedUser;
	error?: string;
	timestamp: number;
}

async function getAuthenticatedUser(token: string): Promise<AuthenticatedUser> {
	if (!CLERK_SECRET_KEY) {
		throw new Error('CLERK_SECRET_KEY environment variable not set');
	}

	try {
		// Decode JWT to get user ID
		const parts = token.split('.');
		if (parts.length !== 3) {
			throw new Error('Invalid JWT format');
		}
		
		const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/') + '=='.slice((4 - parts[1].length % 4) % 4);
		const decoded: JWTPayload = JSON.parse(atob(payload));
		
		// Check expiration
		const now = Math.floor(Date.now() / 1000);
		if (decoded.exp < now) {
			throw new Error('JWT token has expired');
		}
		
		// Fetch user data from Clerk API
		const userResponse = await fetch(`${CLERK_API_BASE}/users/${decoded.sub}`, {
			headers: {
				'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
				'Content-Type': 'application/json'
			}
		});

		if (!userResponse.ok) {
			throw new Error(`Clerk API error: ${userResponse.status}`);
		}

		const clerkUser: ClerkUser = await userResponse.json();
		
		const authenticatedUser: AuthenticatedUser = {
			clerkUserId: decoded.sub,
			email: clerkUser.email_addresses[0]?.email_address || null,
			name: `${clerkUser.first_name} ${clerkUser.last_name}`.trim() || null,
			firstName: clerkUser.first_name,
			lastName: clerkUser.last_name,
			role: clerkUser.public_metadata.role,
			plan: clerkUser.public_metadata.plan,
			createAccess: clerkUser.public_metadata.create,
			publicMetadata: clerkUser.public_metadata,
			privateMetadata: clerkUser.private_metadata,
			isAdmin: (clerkUser.public_metadata.role === 'admin' || clerkUser.public_metadata.role === 'teacher'),
			isStudent: (clerkUser.public_metadata.role === 'student'),
			sessionId: decoded.sid,
			expiresAt: decoded.exp
		};
		
		return authenticatedUser;
	} catch (error) {
		console.error('Authentication failed:', error);
		throw error;
	}
}



// Single comprehensive authentication action
export const authenticateUser = action({
	args: { token: v.string() },
	handler: async (ctx: any, args: { token: string }): Promise<AuthResult> => {
		try {
			const user = await getAuthenticatedUser(args.token);
			
			return {
				authenticated: true,
				user: {
					clerkUserId: user.clerkUserId,
					name: user.name,
					email: user.email,
					firstName: user.firstName,
					lastName: user.lastName,
					role: user.role,
					plan: user.plan,
					createAccess: user.createAccess,
					sessionId: user.sessionId,
					expiresAt: user.expiresAt,
					isAdmin: user.isAdmin,
					isStudent: user.isStudent,
					publicMetadata: user.publicMetadata,
					privateMetadata: user.privateMetadata,
					permissions: {
						isAdmin: user.isAdmin,
						isStudent: user.isStudent,
						canCreateContent: user.isAdmin,
						canEditContent: user.isAdmin,
						canDeleteContent: user.role === 'admin'
					}
				},
				timestamp: Date.now()
			};
		} catch (error: unknown) {
			return {
				authenticated: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: Date.now()
			};
		}
	}
});

// Simplified wrapper factory
const createAuthWrapper = (type: 'query' | 'mutation', roleCheck?: (user: AuthenticatedUser) => boolean) => {
	const wrapper = type === 'query' ? query : mutation;
	
	return (queryDef: { args: any; handler: (ctx: any, args: any) => Promise<any> }) => {
		return wrapper({
			...queryDef,
			handler: async (ctx: any, args: { userData: AuthenticatedUser; [key: string]: unknown }) => {
				if (!args.userData) {
					throw new Error(`Pre-authenticated user data is required for ${type}`);
				}
				
				if (roleCheck && !roleCheck(args.userData)) {
					const roleName = type.includes('admin') ? 'admin' : type.includes('student') ? 'student' : 'user';
					throw new Error(`Access denied. ${roleName} access required, your role: ${args.userData.role}`);
				}
				
				return await queryDef.handler({ ...ctx, user: args.userData }, args);
			}
		});
	};
};

// Create specific wrappers
const userQuery = createAuthWrapper('query');
const userMutation = createAuthWrapper('mutation');
const adminQuery = createAuthWrapper('query', (user: any) => user.isAdmin);
const adminMutation = createAuthWrapper('mutation', (user: any) => user.isAdmin);
const studentQuery = createAuthWrapper('query', (user: any) => user.isStudent);

// Example: User query using pre-authenticated user data
export const getAuthenticatedUserInfo = userQuery({
	args: { userData: v.any() },
	handler: async (ctx, args) => {
		return {
			message: "User authenticated with Clerk API!",
			user: {
				clerkUserId: ctx.user.clerkUserId,
				name: ctx.user.name,
				email: ctx.user.email,
				role: ctx.user.role,
				isAdmin: ctx.user.isAdmin,
				isStudent: ctx.user.isStudent,
				plan: ctx.user.plan
			},
			timestamp: Date.now()
		};
	}
});

// Get user data from database including cohort and school
export const getUserData = userQuery({
	args: { userData: v.any() },
	handler: async (ctx, args) => {
		// Get user record from database
		const userRecord = await ctx.db
			.query('users')
			.filter((q: any) => q.eq(q.field('clerkUserId'), ctx.user.clerkUserId))
			.first();

		if (!userRecord) {
			return {
				message: "User not found in database",
				user: {
					clerkUserId: ctx.user.clerkUserId,
					name: ctx.user.name,
					email: ctx.user.email,
					role: ctx.user.role,
					isAdmin: ctx.user.isAdmin,
					isStudent: ctx.user.isStudent,
					plan: ctx.user.plan
				},
				hasDbRecord: false,
				cohort: null,
				school: null,
				timestamp: Date.now()
			};
		}

		// Get cohort if user has one
		let cohort = null;
		if (userRecord.cohortId) {
			cohort = await ctx.db.get(userRecord.cohortId);
		}

		// Get school if cohort has one
		let school = null;
		if (cohort && cohort.schoolId) {
			school = await ctx.db.get(cohort.schoolId);
		}

		return {
			message: "User data retrieved from database",
			user: {
				clerkUserId: ctx.user.clerkUserId,
				name: ctx.user.name,
				email: ctx.user.email,
				role: ctx.user.role,
				isAdmin: ctx.user.isAdmin,
				isStudent: ctx.user.isStudent,
				plan: ctx.user.plan,
				dbName: userRecord.name
			},
			hasDbRecord: true,
			cohort: cohort ? {
				id: cohort._id,
				name: cohort.name,
				description: cohort.description,
				startYear: cohort.startYear,
				endYear: cohort.endYear,
				classCode: cohort.classCode,
				pic_url: cohort.pic_url
			} : null,
			school: school ? {
				id: school._id,
				name: school.name,
				description: school.description
			} : null,
			timestamp: Date.now()
		};
	}
});

// Export the auth wrappers for use in other files
export { 
	userQuery,      // Query with pre-authenticated user data
	userMutation,   // Mutation with pre-authenticated user data
	adminQuery,     // Admin query with pre-authenticated user data
	adminMutation,  // Admin mutation with pre-authenticated user data
	studentQuery    // Student query with pre-authenticated user data
};
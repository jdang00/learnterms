import { building } from '$app/env';
import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	PUBLIC_CONVEX_URL: { public: true, static: true },
	PUBLIC_CLERK_PUBLISHABLE_KEY: { public: true, static: true },
	// svelte-clerk reads it through $env/dynamic/private, which only exposes declared variables.
	CLERK_SECRET_KEY: {
		schema: (value) => {
			if (!value && !building) throw new Error('CLERK_SECRET_KEY is not set');
			return value;
		}
	}
});

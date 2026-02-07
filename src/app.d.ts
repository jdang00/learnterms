// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
/// <reference types="svelte-clerk/env" />

declare global {
	namespace App {
		// Define the Locals interface with session and user details
		interface Locals {
			session?: {
				id: string;
				claims?: {
					userName?: string;
					email?: string;
					firstName?: string;
					lastName?: string;
				};
			};
			isCrawler?: boolean;
		}
		// Optional: Define PageData for Clerk-related data
		interface PageData {
			session?: {
				id: string;
				claims?: {
					userName?: string;
					email?: string;
					firstName?: string;
					lastName?: string;
				};
			};
		}
	}
}

export {};

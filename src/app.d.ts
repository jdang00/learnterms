// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
/// <reference types="svelte-clerk/env" />

declare global {
	namespace App {
		interface PageState {
			classId?: string;
			// Set when the class was opened in place, so going back can pop history instead.
			classOpenedInPlace?: boolean;
			progressSearch?: string;
			quizView?: { moduleId: string; screen: 'questions' | 'progress' };
		}
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

import prettier from 'eslint-config-prettier';
import js from '@eslint/js';
import { includeIgnoreFile } from '@eslint/compat';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import ts from 'typescript-eslint';
const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

export default ts.config(
	includeIgnoreFile(gitignorePath),
	{ ignores: ['src/convex/_generated/', 'dev/', '.agents/'] },
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	prettier,
	...svelte.configs['flat/prettier'],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	},
	{
		files: ['**/*.svelte'],

		languageOptions: {
			parserOptions: {
				parser: ts.parser
			}
		}
	},
	{
		files: ['**/*.ts'],
		languageOptions: {
			parser: ts.parser
		}
	},
	{
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
					ignoreRestSiblings: true
				}
			],
			'@typescript-eslint/no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: 'lucide-svelte',
							message: "Use per-icon imports: import X from '@lucide/svelte/icons/x'."
						},
						{
							name: '@lucide/svelte',
							message: "Use per-icon imports: import X from '@lucide/svelte/icons/x'.",
							allowTypeImports: true
						}
					]
				}
			]
		}
	},
	{
		// New Convex modules go through the auth wrappers. This list only shrinks: move a file to
		// authQueries wrappers, then delete it here.
		files: ['src/convex/**/*.ts'],
		ignores: [
			'src/convex/_generated/**',
			'src/convex/authQueries.ts',
			'src/convex/badges.ts',
			'src/convex/cohort.ts',
			'src/convex/featureAnnouncements.ts',
			'src/convex/freeResponse.ts',
			'src/convex/gradeCalculator.ts',
			'src/convex/moduleEmoji.ts',
			'src/convex/ogRateLimit.ts',
			'src/convex/polar.ts',
			'src/convex/publicQueries.ts',
			'src/convex/questionMedia.ts',
			'src/convex/questionMediaActions.ts',
			'src/convex/questionMediaUploads.ts',
			'src/convex/questionNotes.ts',
			'src/convex/questionStudio/context.ts',
			'src/convex/questionStudio/devTools.ts',
			'src/convex/questionStudio/generation.ts',
			'src/convex/questionStudio/jobs.ts',
			'src/convex/questionStudio/saving.ts',
			'src/convex/quizDock.ts',
			'src/convex/r2Documents.ts',
			'src/convex/ragKnowledge/indexing.ts',
			'src/convex/ragKnowledge/management.ts',
			'src/convex/ragKnowledge/previews.ts',
			'src/convex/stemHighlights.ts',
			'src/convex/studyOverview.ts',
			'src/convex/studyProgress.ts',
			'src/convex/userProgress.ts',
			'src/convex/users.ts'
		],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: './_generated/server',
							importNames: ['query', 'mutation'],
							message:
								'Use authQuery/authMutation or a role-gated wrapper from ./authQueries instead of a raw query/mutation.'
						},
						{
							name: '../_generated/server',
							importNames: ['query', 'mutation'],
							message:
								'Use authQuery/authMutation or a role-gated wrapper from ../authQueries instead of a raw query/mutation.'
						}
					]
				}
			]
		}
	},
	{
		// Browser code talks to Convex through convex-svelte; HTTP clients stay server-side.
		files: [
			'src/**/*.svelte',
			'src/lib/**/*.ts',
			'src/routes/**/+page.ts',
			'src/routes/**/+layout.ts'
		],
		ignores: ['src/lib/server/**'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: 'convex/browser',
							importNames: ['ConvexHttpClient'],
							message:
								'Use useQuery/convexLoad from convex-svelte; ConvexHttpClient belongs in server loads, hooks or $lib/server.'
						},
						{
							name: 'convex-svelte/sveltekit/server',
							message: 'Server-only; use it from hooks, server loads or $lib/server.'
						}
					]
				}
			]
		}
	},
	{
		files: ['scripts/**', 'tests/**', 'convex-tests/**'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off'
		}
	}
);

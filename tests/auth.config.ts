import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL('../src/lib', import.meta.url)),
			'svelte-clerk/server': fileURLToPath(
				new URL('../node_modules/svelte-clerk/dist/server/index.js', import.meta.url)
			)
		}
	},
	test: { environment: 'node', include: ['tests/auth/**/*.test.ts'] }
});

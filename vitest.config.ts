import { defineConfig } from 'vitest/config';
import { transformWithEsbuild } from 'vite';
import { compileModule } from 'svelte/compiler';
import { fileURLToPath } from 'node:url';

const $lib = fileURLToPath(new URL('./src/lib', import.meta.url));

export default defineConfig({
	test: {
		projects: [
			{
				test: {
					name: 'convex',
					environment: 'edge-runtime',
					include: ['convex-tests/**/*.test.ts']
				}
			},
			{
				resolve: {
					alias: {
						$lib,
						'svelte-clerk/server': fileURLToPath(
							new URL('./node_modules/svelte-clerk/dist/server/index.js', import.meta.url)
						)
					}
				},
				test: {
					name: 'auth',
					environment: 'node',
					include: ['tests/auth/**/*.test.ts']
				}
			},
			{
				resolve: { alias: { $lib } },
				// Compiles .svelte.ts rune modules so their state classes can run outside a component.
				plugins: [
					{
						name: 'svelte-state-test',
						async transform(code, id) {
							if (!id.endsWith('.svelte.ts')) return;
							const js = await transformWithEsbuild(code, id, { loader: 'ts' });
							return compileModule(js.code, { filename: id, generate: 'client' }).js;
						}
					}
				],
				test: {
					name: 'state',
					environment: 'node',
					include: ['tests/moduleCompletion.state.spec.ts']
				}
			}
		]
	}
});

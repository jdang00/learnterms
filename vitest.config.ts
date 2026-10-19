import { defineConfig } from 'vitest/config';
import { transformWithOxc } from 'vite';
import { compile, compileModule } from 'svelte/compiler';
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
						),
						'svelte-clerk/client': fileURLToPath(
							new URL('./node_modules/svelte-clerk/dist/client/index.js', import.meta.url)
						)
					}
				},
				// Server-renders components, including convex-svelte's rune modules, to check auth context.
				plugins: [
					{
						name: 'svelte-ssr-test',
						async transform(code, id) {
							if (id.endsWith('.svelte')) {
								return compile(code, { filename: id, generate: 'server' }).js;
							}
							if (/\.svelte\.[jt]s$/.test(id)) {
								const js = await transformWithOxc(code, id, { lang: 'ts' });
								return compileModule(js.code, { filename: id, generate: 'server' }).js;
							}
						}
					}
				],
				test: {
					name: 'auth',
					environment: 'node',
					include: ['tests/auth/**/*.test.ts'],
					server: { deps: { inline: ['convex-svelte'] } }
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
							const js = await transformWithOxc(code, id, { lang: 'ts' });
							return compileModule(js.code, { filename: id, generate: 'client' }).js;
						}
					}
				],
				test: {
					name: 'state',
					environment: 'node',
					include: ['tests/*.state.spec.ts']
				}
			}
		]
	}
});

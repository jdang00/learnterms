import { defineConfig } from 'vitest/config';
import { transformWithEsbuild } from 'vite';
import { compileModule } from 'svelte/compiler';
import { fileURLToPath } from 'node:url';
export default defineConfig({
	resolve: { alias: { $lib: fileURLToPath(new URL('../src/lib', import.meta.url)) } },
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
	test: { environment: 'node', include: ['tests/moduleCompletion.state.spec.ts'] }
});

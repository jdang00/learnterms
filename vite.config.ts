import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { readFile } from 'node:fs/promises';
import pdfjsPackage from 'pdfjs-dist/package.json' with { type: 'json' };

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		// PDF.js loads these on demand from its worker, including non-Latin fonts
		// and image decoders. Keep them local and versioned with the renderer.
		viteStaticCopy({
			targets: [
				{
					src: 'node_modules/mathlive/fonts/*',
					dest: 'mathlive/fonts',
					rename: { stripBase: true }
				},
				...['cmaps', 'standard_fonts', 'wasm', 'iccs'].map((directory) => ({
					src: `node_modules/pdfjs-dist/${directory}/*`,
					dest: `pdfjs/${pdfjsPackage.version}/${directory}`,
					rename: { stripBase: true as const }
				}))
			]
		})
	],
	resolve: {
		// Tiptap plugins must share the same ProseMirror classes and plugin keys.
		// Transitive dependencies can otherwise resolve different installed versions.
		dedupe: ['prosemirror-state', 'prosemirror-model', 'prosemirror-transform', 'prosemirror-view']
	},
	optimizeDeps: {
		include: ['convex-svelte', 'svelte-confetti', 'posthog-js'],
		esbuildOptions: {
			target: 'esnext',
			plugins: [
				{
					// postcss (bundled into marp-core) has the only `new URL(` in a 6 MB prebundle with no
					// import.meta.url after it. Vite's asset-URL regex then backtracks through the whole file
					// and overflows Node's stack, so the Content Library fails to load in dev.
					name: 'postcss-input-url',
					setup(build) {
						build.onLoad({ filter: /[\\/]postcss[\\/]lib[\\/]input\.js$/ }, async (args) => ({
							contents: (await readFile(args.path, 'utf8')).replaceAll(
								'new URL(',
								'new globalThis.URL('
							),
							loader: 'js'
						}));
					}
				}
			]
		}
	},
	build: {
		target: 'esnext'
	},
	server: {},
	esbuild: {
		jsx: 'automatic',
		jsxImportSource: 'react'
	}
});

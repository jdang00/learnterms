import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import pdfjsPackage from 'pdfjs-dist/package.json' with { type: 'json' };

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		// PDF.js loads these on demand from its worker, including non-Latin fonts
		// and image decoders. Keep them local and versioned with the renderer.
		viteStaticCopy({
			targets: ['cmaps', 'standard_fonts', 'wasm', 'iccs'].map((directory) => ({
				src: `node_modules/pdfjs-dist/${directory}/*`,
				dest: `pdfjs/${pdfjsPackage.version}/${directory}`,
				rename: { stripBase: true }
			}))
		})
	],
	resolve: {
		// Tiptap plugins must share the same ProseMirror classes and plugin keys.
		// Transitive dependencies can otherwise resolve different installed versions.
		dedupe: ['prosemirror-state', 'prosemirror-model', 'prosemirror-transform', 'prosemirror-view']
	},
	optimizeDeps: {
		include: ['lucide-svelte', 'convex-svelte', 'svelte-confetti', 'posthog-js'],
		esbuildOptions: {
			target: 'esnext'
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

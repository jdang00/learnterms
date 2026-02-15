import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	ssr: {
		noExternal: ['lucide-svelte', '@lucide/svelte']
	},
	optimizeDeps: {
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

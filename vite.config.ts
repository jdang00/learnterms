import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	optimizeDeps: {
		include: ['lucide-svelte', 'convex-svelte', 'svelte-confetti', 'posthog-js'],
		esbuildOptions: {
			target: 'esnext'
		},
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

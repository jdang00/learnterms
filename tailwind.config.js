import daisyui from 'daisyui';
import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,svelte,js,ts}'],
	theme: {
		extend: {}
	},
	plugins: [typography, daisyui],
	daisyui: {
		themes: ['light', 'dark', 'dracula', 'valentine', 'retro', 'bumblebee', 'nord']
	}
};

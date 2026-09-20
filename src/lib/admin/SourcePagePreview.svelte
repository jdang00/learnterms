<script lang="ts">
	import { Marked, Renderer } from 'marked';
	import {
		renderLatex,
		stripPreviewArtifactReferences,
		isLocalArtifactLink
	} from './contentLibraryPreview';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';
	import 'katex/dist/katex.min.css';
	let { text }: { text: string } = $props();
	const renderer = new Renderer();
	renderer.image = ({ text }) => (text ? `<p><em>${text}</em></p>` : '');
	renderer.link = ({ href, text }) =>
		isLocalArtifactLink(href)
			? text
			: `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
	const parser = new Marked({ gfm: true, breaks: false, renderer });
	const html = $derived(
		sanitizeHtml(String(parser.parse(renderLatex(stripPreviewArtifactReferences(text)))))
	);
</script>

<!-- The rendered Markdown passes through sanitizeHtml before insertion. -->
<!-- eslint-disable-next-line svelte/no-at-html-tags -->
<div class="source-page prose prose-sm max-w-none p-5 sm:p-7">{@html html}</div>

<style>
	.source-page {
		color: #1f2937;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 15px;
		line-height: 1.65;
		overflow-wrap: anywhere;
	}
	.source-page :global(h1),
	.source-page :global(h2),
	.source-page :global(h3),
	.source-page :global(strong) {
		color: #111827;
	}
	.source-page :global(h1),
	.source-page :global(h2),
	.source-page :global(h3) {
		line-height: 1.25;
		font-family: inherit;
	}
	.source-page :global(h1) {
		font-size: 1.65em;
	}
	.source-page :global(h2) {
		font-size: 1.35em;
	}
	.source-page :global(table) {
		display: block;
		overflow-x: auto;
		width: 100%;
		font-size: 0.85em;
		border-collapse: collapse;
	}
	.source-page :global(th),
	.source-page :global(td) {
		border: 1px solid #d1d5db;
		padding: 0.45em 0.65em;
		color: #1f2937;
	}
	.source-page :global(th) {
		background: #f1f5f9;
	}
	.source-page :global(pre) {
		overflow-x: auto;
	}
	.source-page :global(.katex-display) {
		overflow-x: auto;
		overflow-y: hidden;
		padding-block: 0.25em;
	}
	.source-page :global(.math-copy) {
		display: none;
	}
	.source-page :global(a) {
		color: #2563eb;
	}
</style>

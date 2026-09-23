<script lang="ts">
	import { X } from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';

	let {
		html,
		label,
		onClose
	}: {
		html: string;
		label: string;
		onClose: () => void;
	} = $props();
</script>

{#if html}
	<div
		class="fixed inset-0 z-[70] flex flex-col bg-base-100"
		role="dialog"
		aria-modal="true"
		aria-label={label}
		transition:fade={{ duration: 120 }}
	>
		<div class="flex items-center gap-3 border-b border-base-300 px-5 py-3">
			<div>
				<p class="text-sm font-semibold">{label}</p>
				<p class="text-xs text-base-content/50">Fullscreen table preview</p>
			</div>
			<div class="flex-1"></div>
			<button
				class="btn btn-ghost btn-sm btn-circle"
				onclick={onClose}
				aria-label="Close table preview"
			>
				<X size={16} />
			</button>
		</div>
		<div class="fullscreen-table markdown-preview flex-1 overflow-auto p-6 pb-24">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html sanitizeHtml(html)}
		</div>
	</div>
{/if}

<style>
	.fullscreen-table {
		--maximize-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M8 3H5a2 2 0 0 0-2 2v3'/%3E%3Cpath d='M21 8V5a2 2 0 0 0-2-2h-3'/%3E%3Cpath d='M3 16v3a2 2 0 0 0 2 2h3'/%3E%3Cpath d='M16 21h3a2 2 0 0 0 2-2v-3'/%3E%3C/svg%3E");
		color: color-mix(in oklab, currentColor 92%, transparent);
		font-family: Georgia, 'Times New Roman', Times, serif;
		overflow-wrap: break-word;
		scroll-padding-bottom: 6rem;
	}

	.fullscreen-table :global(.table-frame) {
		overflow: hidden;
		border: 1px solid color-mix(in oklab, currentColor 14%, transparent);
		border-radius: 0.6rem;
		background: color-mix(in oklab, currentColor 2%, transparent);
	}

	.fullscreen-table :global(.table-toolbar) {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		border-bottom: 1px solid color-mix(in oklab, currentColor 12%, transparent);
		padding: 0.4rem 0.55rem;
		font-family:
			ui-sans-serif,
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
		font-size: 0.72rem;
		font-weight: 600;
		color: color-mix(in oklab, currentColor 58%, transparent);
	}

	.fullscreen-table :global(.table-toolbar span) {
		flex: 1;
	}

	.fullscreen-table :global(.table-fullscreen) {
		display: none;
	}

	.fullscreen-table :global(.table-scroll) {
		max-width: 100%;
		overflow-x: auto;
	}

	.fullscreen-table :global(table) {
		width: 100%;
		table-layout: auto;
		border-collapse: collapse;
		font-size: 0.95rem;
	}

	.fullscreen-table :global(th),
	.fullscreen-table :global(td) {
		border: 1px solid color-mix(in oklab, currentColor 16%, transparent);
		padding: 0.45rem 0.65rem;
		text-align: left;
		vertical-align: top;
		white-space: normal;
		overflow-wrap: break-word;
		word-break: break-word;
	}

	.fullscreen-table :global(th) {
		font-weight: 700;
	}

	.fullscreen-table :global(tr:nth-child(2n)) {
		background: color-mix(in oklab, currentColor 3.5%, transparent);
	}
</style>

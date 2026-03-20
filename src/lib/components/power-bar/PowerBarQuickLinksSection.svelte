<script lang="ts">
	import { ExternalLink } from 'lucide-svelte';
	import type { QuickLinkItem } from './types';

	interface Props {
		quickLinks?: QuickLinkItem[];
		searchQuery?: string;
		onNavigate?: () => void;
	}

	let { quickLinks = [], searchQuery = '', onNavigate }: Props = $props();

	const filteredQuickLinks = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return quickLinks;
		return quickLinks.filter((link) =>
			`${link.title} ${link.description} ${link.href}`.toLowerCase().includes(query)
		);
	});
</script>

<section class="space-y-2">
	<div class="px-3 pt-1">
		<p class="text-[11px] font-medium uppercase tracking-wider text-base-content/35">Quick Links</p>
	</div>

	{#if filteredQuickLinks.length === 0}
		{#if !searchQuery.trim()}
			<p class="px-3 py-4 text-sm text-base-content/45">No quick links available</p>
		{/if}
	{:else}
		{#each filteredQuickLinks as link (link.href)}
			<a
				href={link.href}
				class="group flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-left transition-colors duration-100 hover:bg-base-200/60"
				onclick={() => onNavigate?.()}
				data-power-item="true"
			>
				<span class="flex h-7 w-7 items-center justify-center rounded-lg bg-base-200 text-sm">
					{link.icon}
				</span>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-[13px] font-semibold leading-snug">{link.title}</span>
					<span class="block truncate text-[11px] text-base-content/50">{link.description}</span>
				</span>
				<ExternalLink size={13} class="shrink-0 text-base-content/30" />
			</a>
		{/each}
	{/if}
</section>

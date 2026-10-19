<script lang="ts">
	import { base } from '$app/paths';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import { Command } from 'bits-ui';
	import { POWER_HEADING_CLASS, POWER_ITEM_CLASS } from './styles';
	import type { QuickLinkItem } from './types';

	interface Props {
		quickLinks?: QuickLinkItem[];
		searchQuery?: string;
		onNavigate?: () => void;
	}

	let { quickLinks = [], searchQuery = '', onNavigate }: Props = $props();
	const isExternalLink = (href: QuickLinkItem['href']) => href.startsWith('http');
	const resolveInternalHref = (href: string) => `${base}${href}`;
	const filteredQuickLinks = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return quickLinks;
		return quickLinks.filter((link) =>
			`${link.title} ${link.description} ${link.href}`.toLowerCase().includes(query)
		);
	});
</script>

<Command.Group value="quick-links">
	<Command.GroupHeading class={POWER_HEADING_CLASS}>Quick Links</Command.GroupHeading>
	<Command.GroupItems class="space-y-1">
		{#if filteredQuickLinks.length === 0}
			{#if !searchQuery.trim()}
				<p class="px-3 py-4 text-sm text-foreground/45">No quick links available</p>
			{/if}
		{:else}
			{#each filteredQuickLinks as link (link.href)}
				{#if isExternalLink(link.href)}
					<Command.Item
						value="link:{link.href}"
						class={POWER_ITEM_CLASS}
						onSelect={() => {
							window.open(link.href, '_blank', 'noreferrer');
							onNavigate?.();
						}}
					>
						<span class="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-sm">
							{link.icon}
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-[13px] font-semibold leading-snug">{link.title}</span
							>
							<span class="block truncate text-[11px] text-foreground/50">{link.description}</span>
						</span>
						<ExternalLink size={13} class="shrink-0 text-foreground/30" />
					</Command.Item>
				{:else}
					<!-- eslint-disable svelte/no-navigation-without-resolve -- base-prefixed by resolveInternalHref -->
					<Command.LinkItem
						value="link:{link.href}"
						href={resolveInternalHref(link.href)}
						class={POWER_ITEM_CLASS}
						onSelect={() => onNavigate?.()}
					>
						<span class="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-sm">
							{link.icon}
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-[13px] font-semibold leading-snug">{link.title}</span
							>
							<span class="block truncate text-[11px] text-foreground/50">{link.description}</span>
						</span>
						<ExternalLink size={13} class="shrink-0 text-foreground/30" />
					</Command.LinkItem>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				{/if}
			{/each}
		{/if}
	</Command.GroupItems>
</Command.Group>

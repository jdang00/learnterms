<script lang="ts">
	import { useConvexClient } from 'convex-svelte';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import { api } from '../../../convex/_generated/api';
	import type { Id } from '../../../convex/_generated/dataModel';
	import { Button } from '$lib/components/ui/button';
	import { Spinner } from '$lib/components/ui/spinner';

	let {
		title,
		currentEmoji,
		classId,
		active,
		disabled = false,
		onselect
	}: {
		title: string;
		currentEmoji: string;
		classId: Id<'class'>;
		active: boolean;
		disabled?: boolean;
		onselect: (emoji: string) => void;
	} = $props();
	const client = useConvexClient();
	// Request bookkeeping does not drive rendering.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const cache = new Map<string, Promise<string | null>>();
	let suggestion = $state<string | null>(null);
	let loading = $state(false);
	const normalizedTitle = $derived(title.trim().replace(/\s+/g, ' '));
	const eligible = $derived(
		active && !currentEmoji.trim() && normalizedTitle.length >= 2 && normalizedTitle.length <= 100
	);

	$effect(() => {
		const text = normalizedTitle;
		const scope = classId;
		suggestion = null;
		loading = false;
		if (!eligible) return;
		let cancelled = false;
		const key = `${scope}:${text.toLowerCase()}`;
		const timer = setTimeout(
			async () => {
				loading = true;
				let request = cache.get(key);
				if (!request) {
					request = client
						.action(api.moduleEmoji.suggest, { classId: scope, title: text })
						.catch(() => null);
					if (cache.size >= 30) cache.delete(cache.keys().next().value!);
					cache.set(key, request);
				}
				const emoji = await request;
				if (!cancelled) {
					suggestion = emoji;
					loading = false;
				}
			},
			cache.has(key) ? 0 : 350
		);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	});
</script>

{#if eligible}
	<div class="mt-2 min-h-7" aria-live="polite">
		{#if loading}
			<span class="inline-flex items-center gap-1.5 text-xs text-foreground/50"
				><Spinner class="size-3" />Finding an emoji…</span
			>
		{:else if suggestion}
			<Button
				variant="ghost"
				tone="secondary"
				size="sm"
				class="gap-2"
				{disabled}
				onclick={() => onselect(suggestion!)}
				aria-label={`Use suggested emoji ${suggestion}`}
			>
				<Sparkles size={14} /><span class="text-lg">{suggestion}</span><span>Use suggestion</span>
			</Button>
		{/if}
	</div>
{/if}

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ChevronDown, ChevronLeft } from 'lucide-svelte';

	// The one top bar study screens show below lg: back, where you are, and one or two instruments.
	let {
		title,
		emoji,
		subtitle,
		backLabel = 'Back',
		onback,
		onnavigate,
		trailing,
		tools
	}: {
		title: string;
		emoji?: string;
		subtitle: string;
		backLabel?: string;
		onback: () => void;
		onnavigate: () => void;
		trailing?: Snippet;
		tools?: Snippet;
	} = $props();
</script>

<header
	class="sticky top-0 z-40 shrink-0 border-b border-base-300/70 bg-base-100/95 pt-safe backdrop-blur-md lg:hidden"
>
	<div class="flex h-14 items-center gap-0.5 px-1">
		<button
			type="button"
			class="btn btn-ghost btn-circle size-11 shrink-0"
			aria-label={backLabel}
			onclick={onback}
		>
			<ChevronLeft size={22} />
		</button>
		<button
			type="button"
			class="flex min-w-0 flex-1 flex-col items-start rounded-xl px-2 py-1 text-left transition-colors active:bg-base-200"
			aria-haspopup="dialog"
			aria-label="{title}, {subtitle}. Show all questions"
			onclick={onnavigate}
		>
			<span
				class="flex max-w-full min-w-0 items-center gap-1.5 text-sm font-semibold leading-tight"
			>
				{#if emoji}<span class="shrink-0 text-base leading-none">{emoji}</span>{/if}
				<span class="truncate">{title}</span>
			</span>
			<span class="flex items-center gap-0.5 text-xs text-base-content/60 tabular-nums">
				{subtitle}
				<ChevronDown size={13} aria-hidden="true" />
			</span>
		</button>
		{@render trailing?.()}
		{@render tools?.()}
	</div>
</header>

<script lang="ts">
	let { text, class: className = '' }: { text: string; class?: string } = $props();

	let el: HTMLParagraphElement | undefined = $state();
	let expanded = $state(false);
	let overflows = $state(false);

	// Only measure while clamped, so the toggle stays put once the text is expanded.
	$effect(() => {
		if (!el || expanded) return;
		const node = el;
		const measure = () => (overflows = node.scrollHeight > node.clientHeight + 1);
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(node);
		return () => ro.disconnect();
	});
</script>

<p bind:this={el} class="{className} {expanded ? '' : 'line-clamp-2'}">{text}</p>
{#if overflows}
	<button
		class="mt-1 py-1 text-sm font-medium text-primary-ink hover:underline"
		aria-expanded={expanded}
		onclick={() => (expanded = !expanded)}
	>
		{expanded ? 'Show less' : 'Show more'}
	</button>
{/if}

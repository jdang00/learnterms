<script lang="ts">
	// The live marker: a solid success dot with a ping while something is happening.
	let { active = true, class: className = '' }: { active?: boolean; class?: string } = $props();
</script>

<span class="relative inline-flex size-2 shrink-0 {className}" aria-hidden="true">
	{#if active}<span
			class="absolute inset-0 rounded-full bg-success opacity-60 motion-safe:animate-ping"
		></span>{/if}
	<span class="relative size-2 rounded-full {active ? 'bg-success' : 'bg-muted-foreground/40'}"
	></span>
</span>

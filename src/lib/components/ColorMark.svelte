<script lang="ts">
	// The brand mark in a class color: the solid pair carries the color, the open pair stays ink.
	let { color, class: className = 'size-6' }: { color: string; class?: string } = $props();
</script>

<svg viewBox="0 0 48 48" class="shrink-0 {className}" aria-hidden="true">
	<circle cx="33.19" cy="14.81" r="6" fill={color} />
	<circle cx="14.81" cy="33.19" r="6" fill={color} />
	<circle cx="14.81" cy="14.81" r="5" fill="none" stroke="currentColor" stroke-width="3.5" />
	<circle cx="33.19" cy="33.19" r="5" fill="none" stroke="currentColor" stroke-width="3.5" />
</svg>

<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="grid grid-cols-1 items-start gap-5 *:min-w-0 lg:grid-cols-2">
	{@render children()}
</div>

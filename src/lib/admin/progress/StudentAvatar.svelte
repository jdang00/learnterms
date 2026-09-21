<script lang="ts">
	let { name, imageUrl }: { name: string; imageUrl?: string } = $props();
	let failedUrl = $state<string | undefined>();
	const initials = $derived(
		name
			.split(/\s+/)
			.map((part) => part[0])
			.join('')
			.slice(0, 2)
			.toUpperCase()
	);
</script>

<span class="avatar avatar-placeholder shrink-0">
	<span
		class="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-base-200 text-sm font-semibold text-base-content"
	>
		{#if imageUrl && failedUrl !== imageUrl}
			<img
				src={imageUrl}
				alt=""
				class="h-full w-full object-cover"
				onerror={() => (failedUrl = imageUrl)}
			/>
		{:else}
			{initials}
		{/if}
	</span>
</span>

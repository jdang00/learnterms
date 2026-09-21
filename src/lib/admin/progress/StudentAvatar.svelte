<script lang="ts">
	let {
		name,
		imageUrl,
		size = 'md'
	}: { name: string; imageUrl?: string; size?: 'xs' | 'sm' | 'md' } = $props();
	let failedUrl = $state<string | undefined>();
	const initials = $derived(
		name
			.split(/\s+/)
			.map((part) => part[0])
			.join('')
			.slice(0, 2)
			.toUpperCase()
	);
	const sizes = { xs: 'h-7 w-7 text-[10px]', sm: 'h-9 w-9 text-xs', md: 'h-10 w-10 text-sm' };
</script>

<span class="avatar avatar-placeholder shrink-0">
	<span
		class="flex items-center justify-center overflow-hidden rounded-full bg-base-200 font-semibold text-base-content {sizes[
			size
		]}"
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

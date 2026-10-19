<script lang="ts">
	import * as Avatar from '#lib/components/ui/avatar/index.js';

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
	const sizes = { xs: 'size-7', sm: 'size-9', md: 'size-10' };
	const textSizes = { xs: 'text-[10px]', sm: 'text-xs', md: 'text-sm' };
</script>

<Avatar.Root class="shrink-0 {sizes[size]}">
	{#if imageUrl && failedUrl !== imageUrl}
		<Avatar.Image
			src={imageUrl}
			alt=""
			class="object-cover"
			onerror={() => (failedUrl = imageUrl)}
		/>
	{/if}
	<Avatar.Fallback class="font-semibold text-foreground {textSizes[size]}">
		{initials}
	</Avatar.Fallback>
</Avatar.Root>

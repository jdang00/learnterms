<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Library from '@lucide/svelte/icons/library';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';

	let { totalDocs }: { totalDocs: number } = $props();
</script>

<div class="mb-5 flex items-center gap-4">
	<Button href={resolve('/admin')} variant="ghost" tone="neutral" size="sm" class="gap-2">
		<ArrowLeft size={16} />
		<span class="hidden sm:inline">Back</span>
	</Button>
	<div class="h-6 w-px bg-muted-strong"></div>
	<div class="flex items-center gap-3">
		<div class="hidden rounded-xl bg-primary/10 p-2 text-primary-ink sm:flex">
			<Library size={18} />
		</div>
		<div>
			<h1 class="font-display text-xl font-semibold leading-tight">Content Library</h1>
			<p class="hidden text-xs text-foreground/60 sm:block">
				{totalDocs}
				{totalDocs === 1 ? 'file' : 'files'}
			</p>
		</div>
	</div>
</div>

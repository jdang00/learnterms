<script lang="ts">
	import { ArrowLeft, Library } from 'lucide-svelte';
	import { resolve } from '$app/paths';

	let { totalDocs }: { totalDocs: number } = $props();
</script>

<div class="mb-5 flex items-center gap-4">
	<a class="btn btn-ghost btn-sm gap-2 rounded-full" href={resolve('/admin')}>
		<ArrowLeft size={16} />
		<span class="hidden sm:inline">Back</span>
	</a>
	<div class="h-6 w-px bg-base-300"></div>
	<div class="flex items-center gap-3">
		<div class="hidden rounded-xl bg-primary/10 p-2 text-primary sm:flex">
			<Library size={18} />
		</div>
		<div>
			<h1 class="font-display text-xl font-semibold leading-tight">Content Library</h1>
			<p class="hidden text-xs text-base-content/60 sm:block">
				{totalDocs}
				{totalDocs === 1 ? 'file' : 'files'}
			</p>
		</div>
	</div>
</div>

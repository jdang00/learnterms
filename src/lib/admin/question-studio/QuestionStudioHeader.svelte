<script lang="ts">
	import { ArrowLeft, Sparkles } from 'lucide-svelte';
	import { resolve } from '$app/paths';
</script>

<header class="mb-4 flex items-center gap-4">
	<a class="btn btn-ghost btn-sm gap-2 rounded-full" href={resolve('/admin')}>
		<ArrowLeft size={16} />
		<span class="hidden sm:inline">Back</span>
	</a>
	<div class="h-6 w-px bg-base-300"></div>
	<div class="flex items-center gap-3">
		<div class="hidden rounded-xl bg-primary/10 p-2 text-primary sm:flex">
			<Sparkles size={18} />
		</div>
		<h1 class="font-display text-xl font-semibold leading-tight">Question Studio</h1>
	</div>
</header>

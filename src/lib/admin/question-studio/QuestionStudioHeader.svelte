<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button/index.js';
</script>

<header class="mb-4 flex items-center gap-4">
	<Button href={resolve('/admin')} variant="ghost" tone="neutral" size="sm" class="gap-2">
		<ArrowLeft size={16} />
		<span class="hidden sm:inline">Back</span>
	</Button>
	<div class="h-6 w-px bg-muted-strong"></div>
	<div class="flex items-center gap-3">
		<div class="hidden rounded-xl bg-primary/10 p-2 text-primary-ink sm:flex">
			<Sparkles size={18} />
		</div>
		<h1 class="font-display text-xl font-semibold leading-tight">Question Studio</h1>
	</div>
</header>

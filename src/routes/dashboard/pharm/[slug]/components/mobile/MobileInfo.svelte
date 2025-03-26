<script>
	let { qm } = $props();
	import { ArrowLeft } from 'lucide-svelte';
</script>

<div
	class="lg:hidden flex flex-row mt-2 items-center w-full justify-between sticky top-0 bg-base-100 z-40 py-2"
>
	<a class="btn btn-ghost flex-shrink-0 flex items-center ms-3" href="/dashboard">
		<ArrowLeft />
	</a>

	<div class="flex flex-row gap-2 justify-center grow">
		<p class="font-bold tracking-wide text-secondary hidden md:block">
			CHAPTER {qm.chapterData.chapter}
		</p>
		<p class="hidden md:block">·</p>
		<h1 class="font-bold">{qm.chapterData.name}</h1>
	</div>

	<div class="flex-shrink-0 w-24"></div>
</div>

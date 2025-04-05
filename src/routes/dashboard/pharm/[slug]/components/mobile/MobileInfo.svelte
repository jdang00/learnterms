<script>
	let { qm = $bindable() } = $props();
	import { ArrowLeft } from 'lucide-svelte';
</script>

<div
	class="lg:hidden flex flex-row mt-2 items-center w-full justify-between sticky top-0 bg-base-100 z-40 py-2 px-2"
>
	<a class="btn btn-ghost btn-sm flex-shrink-0 flex items-center" href="/dashboard">
		<ArrowLeft />
	</a>
	<div
		class="flex flex-row gap-1 sm:gap-2 justify-center text-center max-w-xs mx-auto absolute left-0 right-0"
	>
		<p class="font-bold tracking-wide text-secondary hidden md:block">
			CHAPTER {qm.chapterData.chapter}
		</p>
		<p class="hidden md:block">·</p>
		<h1 class="font-bold text-sm sm:text-base truncate">{qm.chapterData.name}</h1>
	</div>
	<div class="flex-shrink-0 w-10 sm:w-12"></div>
</div>

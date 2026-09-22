<script lang="ts">
	let { module, classId, qs } = $props();
	import ModuleProgress from './ModuleProgress.svelte';
	import { ArrowLeft } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	async function goToModuleSelection() {
		await goto(resolve('/classes'), { state: { classId } });
	}
</script>

<div
	class="lg:hidden flex flex-row mt-2 items-center w-full justify-between sticky top-0 bg-base-100 z-40 py-2 px-2"
>
	<button
		type="button"
		class="btn btn-ghost btn-sm btn-circle shrink-0 flex items-center"
		onclick={goToModuleSelection}
	>
		<ArrowLeft size={20} />
	</button>
	<div
		class="flex flex-row gap-1 sm:gap-2 justify-center text-center max-w-xs mx-auto absolute left-0 right-0"
	>
		<p class="font-bold tracking-wide text-secondary hidden md:block">
			CHAPTER {module.data.order}
		</p>
		<p class="hidden md:block">·</p>
		<h1 class="font-bold text-sm sm:text-base truncate flex items-center gap-1">
			<span class="text-base sm:text-lg">{module.data?.emoji || '📘'}</span>
			<span class="truncate">{module.data.title}</span>
		</h1>
	</div>
	<div class="shrink-0 w-10 sm:w-12"></div>
</div>

{#if qs?.getCompletionSummary}
	<div class="lg:hidden px-3 pb-2">
		<ModuleProgress
			summary={qs.getCompletionSummary()}
			compact
			onclick={() => qs.openCompletion()}
			onreset={() => (qs.isResetModalOpen = true)}
		/>
	</div>
{/if}

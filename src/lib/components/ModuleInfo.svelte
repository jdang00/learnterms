<script lang="ts">
	import { ChevronLeft } from 'lucide-svelte';
	import type { Doc, Id } from '../../convex/_generated/dataModel';

	let {
		module,
		classId,
		progressPercentage
	}: {
		module: { data?: Doc<'module'> | null; isLoading: boolean; error: any };
		classId: Id<'class'>;
		progressPercentage: number;
	} = $props();
</script>

{#if module.isLoading}
	<p>Loading...</p>
{:else if module.error}
	<p>Error: {module.error.message}</p>
{:else}
	<div class="mx-auto max-w-5xl mt-8 sm:mt-12 px-2 sm:px-0">
		<div class="p-4 md:p-5 lg:p-6 pt-8 sm:pt-12 pl-8 sm:pl-12 mt-4 sm:mt-8">
			<h4 class="font-bold text-sm tracking-wide text-secondary -ms-6">
				<a class="btn btn-ghost font-bold" href={`/classes?classId=${classId}`}>
					<ChevronLeft size={16} /> Back to Module {(module.data?.order ?? 0) + 1}
				</a>
			</h4>
			<h2 class="font-semibold text-2xl sm:text-3xl mt-2 flex items-center gap-2 sm:gap-3">
				<span class="text-2xl sm:text-3xl">{module.data?.emoji || '📘'}</span>
				<span class="leading-tight">{module.data?.title || ''}</span>
			</h2>
			<p class="text-base-content/70 mt-2 text-sm sm:text-base">{module.data?.description || ''}</p>

			<div class="mt-6">
				<p class="text-base-content/60 mb-2">{progressPercentage}% done.</p>
				<progress
					class="progress progress-success w-full transition-colors"
					value={progressPercentage}
					max="100"
				></progress>
			</div>
		</div>
	</div>
{/if}

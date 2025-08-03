<script lang="ts">
	import { ArrowRight } from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import type { Id } from '../../convex/_generated/dataModel';

	interface Module {
		_id: Id<'module'>;
		title: string;
		description?: string;
	}

	interface Progress {
		completionPercentage: number;
		interactedQuestions: number;
		totalQuestions: number;
	}

	interface Props {
		module: Module;
		classId: Id<'class'>;
		progress?: Progress;
	}

	let { module, classId, progress }: Props = $props();
</script>

<div in:fade={{ duration: 300 }} class="relative">
	<a href={`/classes/${classId}/modules/${module._id}`}>
		<div
			class="rounded-lg bg-base-100 border border-base-300 shadow-sm h-40 transition-all duration-200 overflow-hidden hover:shadow-md hover:border-primary/30"
		>
			<div class="p-4 flex flex-col h-full">
				<div class="flex flex-row justify-between mb-4">
					<h2 class="font-semibold text-base-content text-left truncate">{module.title}</h2>
					{#if progress}
						<div class="text-xs text-base-content/60 font-mono badge rounded-full">
							{progress.interactedQuestions}/{progress.totalQuestions}
						</div>
					{/if}
				</div>
				<p class="text-sm text-base-content/70 mb-4 text-left line-clamp-4">
					{module.description || 'No description available'}
				</p>

				<div class="mt-auto flex justify-end">
					<div class="btn btn-sm btn-primary btn-outline rounded-full">
						<ArrowRight size={16} />
					</div>
				</div>
			</div>
		</div>
	</a>
</div>

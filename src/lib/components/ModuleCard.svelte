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
			class="card bg-base-100 border border-base-300 shadow-md h-full transition-all duration-300 overflow-hidden hover:shadow-lg hover:translate-y-[-2px]"
		>
			<div class="card-body">
				<div class="flex justify-between items-start mb-4">
					<h2 class="card-title text-lg">{module.title}</h2>
					{#if progress}
						<div class="text-xs text-base-content/50 text-right">
							{progress.interactedQuestions}/{progress.totalQuestions} questions
						</div>
					{/if}
				</div>
				<p class="text-base-content/70 text-sm text-left mb-4">
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

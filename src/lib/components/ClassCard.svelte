<script lang="ts">
	import { ArrowRight } from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import type { ClassWithSemester } from '../types';
	interface Props {
		classItem: ClassWithSemester;
		onSelect: (classItem: ClassWithSemester) => void;
	}

	let { classItem, onSelect }: Props = $props();
</script>

<div in:fade={{ duration: 300 }} class="relative">
	<button onclick={() => onSelect(classItem)} class="w-full">
		<div
			class="rounded-lg bg-base-100 border border-base-300 shadow-sm h-60 transition-all duration-200 overflow-hidden hover:shadow-md hover:border-primary/30"
		>
			<div class="p-4 flex flex-col h-full">
				<div class="flex flex-row justify-between mb-4">
					<h2 class="font-semibold text-base-content text-left truncate">{classItem.name}</h2>
					<div class="text-xs text-base-content/60 font-mono mb-3 badge rounded-full">
						{classItem.code}
					</div>
				</div>
				<p class="text-sm text-base-content/70 mb-4 text-left line-clamp-4">
					{classItem.description || 'No description available'}
				</p>
				<div class="mt-auto flex justify-end">
					<div class="btn btn-sm btn-primary btn-outline rounded-full">
						<ArrowRight size={16} />
					</div>
				</div>
			</div>
		</div>
	</button>
</div>

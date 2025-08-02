<script lang="ts">
	import { ArrowRight } from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import type { Id } from '../../convex/_generated/dataModel';

	interface ClassType {
		_id: Id<'class'>;
		name: string;
		code: string;
		description?: string;
	}

	interface Props {
		classItem: ClassType;
		onSelect: (classItem: ClassType) => void;
	}

	let { classItem, onSelect }: Props = $props();
</script>

<div in:fade={{ duration: 300 }} class="relative">
	<button onclick={() => onSelect(classItem)} class="w-full">
		<div
			class="card bg-base-100 border border-base-300 shadow-md h-80 transition-all duration-300 overflow-hidden hover:shadow-lg hover:translate-y-[-2px]"
		>
			<div class="card-body flex flex-col">
				<div class="flex items-center gap-2 mb-2">
					<div class="w-2 h-2 rounded-full bg-primary flex-shrink-0"></div>
					<h2 class="card-title text-lg text-left truncate">{classItem.name}</h2>
				</div>
				<div class="badge badge-ghost badge-sm mb-2">{classItem.code}</div>
				<p class="text-base-content/70 text-sm mb-4 text-left line-clamp-4">
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
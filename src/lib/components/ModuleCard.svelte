<script lang="ts">
	import { ArrowRight } from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import type { Id } from '../../convex/_generated/dataModel';

	interface TagSummary {
		_id: Id<'tags'>;
		name: string;
		color?: string;
	}

	interface Module {
		_id: Id<'module'>;
		title: string;
		description?: string;
		emoji?: string | null;
		questionCount?: number;
		tags?: TagSummary[];
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
		onSelect?: (module: Module) => void;
	}

	let { module, classId, onSelect }: Props = $props();
</script>

<div in:fade={{ duration: 300 }} class="relative">
	{#if typeof onSelect === 'function'}
		<div
			role="button"
			tabindex="0"
			onclick={() => onSelect?.(module)}
			onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect?.(module)}
			class="w-full text-left"
		>
			<div
				class="rounded-lg bg-base-100 border border-base-300 shadow-sm min-h-[10rem] transition-all duration-200 hover:shadow-md hover:border-primary/30"
			>
				<div class="p-4 flex flex-col h-full">
					<div class="flex flex-row justify-between mb-2">
						<h2 class="font-semibold text-base-content text-left truncate flex items-center gap-2">
							<span class="text-xl leading-none">{module.emoji || '📘'}</span>
							<span class="truncate">{module.title}</span>
						</h2>
					</div>
					<div class="flex items-center gap-2 mb-2">
						{#if module.questionCount !== undefined}
							<div class="text-xs text-base-content/60">
								{module.questionCount} question{module.questionCount === 1 ? '' : 's'}
							</div>
						{/if}
						{#if module.tags && module.tags.length > 0}
							<div class="dropdown dropdown-hover z-50">
								<div
									tabindex="0"
									role="button"
									class="btn btn-ghost btn-xs rounded-full border border-base-300 px-2 gap-1 h-auto min-h-0 py-0.5"
									onclick={(e) => { e.stopPropagation(); e.preventDefault(); }}
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
									<span>{module.tags.length}</span>
								</div>
								<div
									class="dropdown-content z-50 mt-2 left-0 w-44 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
								>
									<div class="flex flex-col gap-1">
										{#each module.tags as tag (tag._id)}
											<div class="flex items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-base-200/70">
												<span
													class="h-2 w-2 rounded-full"
													style={`background-color: ${tag.color || '#94a3b8'}`}
												></span>
												<span class="truncate">{tag.name}</span>
											</div>
										{/each}
									</div>
								</div>
							</div>
						{/if}
					</div>
					<p class="text-sm text-base-content/70 mb-4 text-left line-clamp-3">
						{module.description || 'No description available'}
					</p>
					<div class="mt-auto flex justify-end">
						<div class="btn btn-sm btn-primary btn-outline rounded-full">
							<ArrowRight size={16} />
						</div>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<a href={`/classes/${classId}/modules/${module._id}`}>
			<div
				class="rounded-lg bg-base-100 border border-base-300 shadow-sm min-h-[10rem] transition-all duration-200 hover:shadow-md hover:border-primary/30"
			>
				<div class="p-4 flex flex-col h-full">
					<div class="flex flex-row justify-between mb-2">
						<h2 class="font-semibold text-base-content text-left truncate flex items-center gap-2">
							<span class="text-xl leading-none">{module.emoji || '📘'}</span>
							<span class="truncate">{module.title}</span>
						</h2>
					</div>
					<div class="flex items-center gap-2 mb-2">
						{#if module.questionCount !== undefined}
							<div class="text-xs text-base-content/60">
								{module.questionCount} question{module.questionCount === 1 ? '' : 's'}
							</div>
						{/if}
						{#if module.tags && module.tags.length > 0}
							<div class="dropdown dropdown-hover z-50">
								<div
									tabindex="0"
									role="button"
									class="btn btn-ghost btn-xs rounded-full border border-base-300 px-2 gap-1 h-auto min-h-0 py-0.5"
									onclick={(e) => { e.stopPropagation(); e.preventDefault(); }}
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
									<span>{module.tags.length}</span>
								</div>
								<div
									class="dropdown-content z-50 mt-2 left-0 w-44 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
								>
									<div class="flex flex-col gap-1">
										{#each module.tags as tag (tag._id)}
											<div class="flex items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-base-200/70">
												<span
													class="h-2 w-2 rounded-full"
													style={`background-color: ${tag.color || '#94a3b8'}`}
												></span>
												<span class="truncate">{tag.name}</span>
											</div>
										{/each}
									</div>
								</div>
							</div>
						{/if}
					</div>
					<p class="text-sm text-base-content/70 mb-4 text-left line-clamp-3">
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
	{/if}
</div>

<script lang="ts">
	import { ArrowRight, BookOpen } from 'lucide-svelte';
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

	interface Props {
		module: Module;
		classId: Id<'class'>;
		onSelect?: (module: Module) => void;
	}

	let { module, classId, onSelect }: Props = $props();
</script>

{#snippet cardContent()}
	<div
		class="module-card group relative rounded-2xl bg-base-100 border border-base-300 shadow-sm min-h-[11rem] transition-all duration-300 overflow-hidden hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5"
	>
		<div class="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
			style="background: radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--color-primary) 6%, transparent), transparent 70%);"
		></div>

		<div class="relative p-5 flex flex-col h-full">
			<div class="flex items-start gap-3 mb-3">
				<span class="text-3xl leading-none shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">{module.emoji || '📘'}</span>
				<div class="min-w-0 flex-1">
					<h2 class="font-semibold text-base-content text-left truncate text-[0.95rem] leading-snug mb-1.5">
						{module.title}
					</h2>
					<div class="flex items-center gap-2 flex-wrap">
						{#if module.questionCount !== undefined}
							<span class="inline-flex items-center gap-1 text-xs text-base-content/50 bg-base-200/60 rounded-full px-2 py-0.5">
								<BookOpen size={11} />
								{module.questionCount} q{module.questionCount === 1 ? '' : 's'}
							</span>
						{/if}
						{#if module.tags && module.tags.length > 0}
							<div class="dropdown dropdown-hover z-50">
								<div
									tabindex="0"
									role="button"
									class="inline-flex items-center gap-1 text-xs text-base-content/50 bg-base-200/60 rounded-full px-2 py-0.5 hover:bg-base-200 transition-colors duration-150 cursor-default"
									onclick={(e) => { e.stopPropagation(); e.preventDefault(); }}
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
									{module.tags.length} tag{module.tags.length === 1 ? '' : 's'}
								</div>
								<div
									class="dropdown-content z-50 mt-2 left-0 w-44 rounded-xl border border-base-300 bg-base-100 p-2 shadow-lg"
								>
									<div class="flex flex-col gap-0.5">
										{#each module.tags as tag (tag._id)}
											<div class="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs hover:bg-base-200/70 transition-colors duration-150">
												<span
													class="h-2 w-2 rounded-full shrink-0"
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
				</div>
			</div>

			<p class="text-sm text-base-content/55 mb-4 text-left line-clamp-2 leading-relaxed">
				{module.description || 'No description available'}
			</p>

				<div class="mt-auto flex items-center justify-between">
					<div class="btn btn-sm btn-primary btn-soft rounded-full gap-1 transition-all duration-200 group-hover:gap-2 ml-auto">
						Start <ArrowRight size={14} class="transition-transform duration-200 group-hover:translate-x-0.5" />
					</div>
				</div>
		</div>
	</div>
{/snippet}

<div in:fade={{ duration: 300 }} class="relative">
	{#if typeof onSelect === 'function'}
		<div
			role="button"
			tabindex="0"
			onclick={() => onSelect?.(module)}
			onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect?.(module)}
			class="w-full text-left"
		>
			{@render cardContent()}
		</div>
	{:else}
		<a href={`/classes/${classId}/modules/${module._id}`}>
			{@render cardContent()}
		</a>
	{/if}
</div>

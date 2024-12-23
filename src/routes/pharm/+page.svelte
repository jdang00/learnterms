<script lang="ts">
	import { ArrowRight } from 'lucide-svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	import type { Chapter } from './types';
	let chapters: Chapter[] = data.chapters;
	const chapterprog: number[] = [12, 0];
</script>

<div class="container mx-auto px-4 max-w-4xl mt-12 lg:mt-8">
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		{#each chapters as chapter, index}
			<div class="card bg-neutral text-neutral-content">
				<div class="card-body">
					<h2 class="card-title">{chapter.name}</h2>
					<p>{chapter.desc}</p>

					<div class="flex flex-row justify-between mt-4">
						<div class="flex flex-row self-center gap-4">
							<div
								class="radial-progress self-center text-success"
								style="--value:{(chapterprog[index] / Number(chapter.numprobs)) *
									100}; --size:2rem;"
								role="progressbar"
							></div>
							<div class="self-center">
								{Math.round((chapterprog[index] / Number(chapter.numprobs)) * 100)}% done.
							</div>
						</div>

						<div class="card-actions justify-end">
							<a class="btn" href="pharm/chapter/{index + 1}">
								{#if chapterprog[index] / Number(chapter.numprobs) === 0}Start{:else}Resume{/if}
								<ArrowRight />
							</a>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>

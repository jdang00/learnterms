<script lang="ts">
	import type { PageData } from './$types';
	import type { Chapter } from '$lib/types';
	import { useClerkContext } from 'svelte-clerk';

	const ctx = useClerkContext();
	const user = $derived(ctx.user);

	let { data }: { data: PageData } = $props();
	let chapters: Chapter[] = data.chapters;
	const chapterprog: number[] = [12, 0];
</script>

<div class="container mx-auto px-4 max-w-7xl mt-12 lg:mt-8">
	<div class="mb-12">
		{#if user === undefined}
			<div class="flex w-52 flex-col gap-4">
				<div class="flex items-center gap-4">
					<div class="skeleton h-16 w-16 shrink-0 rounded-full"></div>
					<div class="flex flex-col gap-4">
						<div class="skeleton h-4 w-20"></div>
						<div class="skeleton h-4 w-28"></div>
					</div>
				</div>
			</div>
		{:else if user === null}
			<h1 class="font-semibold text-4xl">Hi, Guest</h1>
		{:else}
			<h1 class="font-semibold text-4xl">Hi, {user.firstName.split(' ')[0]}</h1>
		{/if}
	</div>

	<ul class="list bg-base-200 rounded-box shadow-md">
		{#each chapters as chapter, index}
			<a href="/dashboard/pharm/{index + 1}" class="hover:text-primary">
				<li class="list-row">
					<div class="text-4xl font-thin opacity-30 tabular-nums">{index + 1}</div>

					<div>
						<div class="text-2xl font-semibold">{chapter.name}</div>
						<div class=" uppercase font-semibold opacity-60">
							{Math.round((chapterprog[index] / Number(chapter.numprobs)) * 100)}% complete
						</div>
					</div>
					<p class="list-col-wrap">
						{chapter.desc}
					</p>
				</li>
			</a>
		{/each}
	</ul>
</div>

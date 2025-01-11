<script lang="ts">
	import type { PageData } from './$types';
	import type { Chapter } from '$lib/types';
	import { useClerkContext } from 'svelte-clerk';
	import { ArrowRight } from 'lucide-svelte';

	const ctx = useClerkContext();
	const user = $derived(ctx.user);

	let { data }: { data: PageData } = $props();
	let chapters: Chapter[] = data.chapters;
	const chapterprog: number[] = Array(14).fill(0);
</script>

<div class="flex flex-row max-h-screen lg:h-screen lg:border-t border-b border-base-300">
	<div class="w-1/4 hidden lg:block lg:border-r border-base-300">
		<div class="mb-12">
			{#if user === undefined}
				<div class="flex w-52 flex-col gap-4">
					<div class="flex items-center gap-4">
						<div class="skeleton h-16 w-16 rounded-full bg-neutral"></div>
						<div class="flex flex-col gap-4">
							<div class="skeleton h-4 w-20 bg-neutral"></div>
							<div class="skeleton h-4 w-28 bg-neutral"></div>
						</div>
					</div>
				</div>
			{:else if user === null}
				<h1 class="font-semibold text-4xl">Hi, Guest</h1>
			{:else}
				<div class="flex flex-row gap-8 mt-12 mx-8">
					<div class="avatar">
						<div class="ring-primary ring-offset-base-100 w-24 rounded-full ring ring-offset-2">
							<img src={user.imageUrl} alt="user profile" />
						</div>
					</div>
					<h1 class="font-semibold text-4xl self-center">Hi, {user.firstName.split(' ')[0]}</h1>
				</div>
			{/if}
		</div>
	</div>

	<div class="w-3/4 pt-8 pb-56 px-6 overflow-auto bg-base-200">
		<div class="flex flex-col gap-6">
			{#each chapters as chapter, index}
				<div class="card shadow-lg hover:shadow-xl transition duration-300">
					<div class="card-body flex flex-row justify-between items-center bg-base-100">
						<div>
							<h2 class="card-title base-content">
								{index + 1} -
								{chapter.name}
							</h2>
							<p class="base-content mt-1">{chapter.desc}</p>
						</div>
						<div class="flex items-center gap-6">
							<div
								class="tooltip tooltip-left"
								data-tip="{Math.round(
									(chapterprog[index] / Number(chapter.numprobs)) * 100
								)}% Complete"
							>
								<div
									class="radial-progress text-success"
									style="--value:{(chapterprog[index] / Number(chapter.numprobs)) *
										100}; --size:3rem;"
									role="progressbar"
								>
									{Math.round((chapterprog[index] / Number(chapter.numprobs)) * 100)}%
								</div>
							</div>
							<a class="btn btn-primary btn-circle btn-soft" href="dashboard/pharm/{index + 1}">
								<ArrowRight />
							</a>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

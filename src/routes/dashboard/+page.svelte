<script lang="ts">
	import type { PageData } from './$types';
	import type { Chapter } from '$lib/types';
	import { useClerkContext } from 'svelte-clerk';
	import { ArrowRight } from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	const ctx = useClerkContext();
	const user = $derived(ctx.user);

	let { data }: { data: PageData } = $props();
	let chapters: Chapter[] = data.chapters;
	const chapterprog: number[] = Array(14).fill(0);

	const enabledThreshold = 2;
</script>

<div class="flex flex-row max-h-screen lg:h-screen lg:border-t border-b border-base-300">
	<!-- Sidebar -->
	<div class="w-1/4 hidden lg:block lg:border-r border-base-300">
		<div class="mb-12">
			{#if user === undefined}
				<div class="flex w-52 flex-col gap-8 mt-12 mx-8">
					<div class="flex items-center gap-4">
						<div class="skeleton h-16 w-16 rounded-full"></div>
						<div class="flex flex-col gap-4">
							<div class="skeleton h-4 w-20"></div>
							<div class="skeleton h-4 w-28"></div>
						</div>
					</div>
				</div>
			{:else if user === null}
				<h1 class="font-semibold text-4xl">Hi, Guest</h1>
			{:else}
				<div class="flex flex-row gap-8 mt-12 mx-12" in:fade>
					<div class="avatar hidden xl:block">
						<div class="ring-primary ring-offset-base-100 w-24 rounded-full ring ring-offset-2">
							<img src={user.imageUrl} alt="user profile" />
						</div>
					</div>
					<h1 class="font-semibold text-4xl self-center">
						Hi, {user.firstName?.split(' ')[0]}
					</h1>
				</div>
			{/if}
		</div>
	</div>

	<!-- Scrollable Content -->
	<div class="w-full lg:w-3/4 pt-8 pb-32 px-4 lg:px-6 overflow-hidden bg-base-200">
		<div class="h-full overflow-y-auto">
			<div class="flex flex-col gap-6">
				{#each chapters as chapter, index}
					<a
						href={index < enabledThreshold ? `dashboard/pharm/${index + 1}` : null}
						class={index < enabledThreshold ? '' : 'pointer-events-none'}
					>
						<div
							class="card shadow-lg transition duration-300"
							class:hover={index < enabledThreshold}
							class:disabled={index >= enabledThreshold}
						>
							<div class="card-body flex flex-row justify-between items-center bg-base-100">
								<div class="flex flex-row gap-8">
									<h1 class="text-xl font-bold self-center text-base-content/70 hidden md:block">
										{index + 1}
									</h1>

									<div>
										<h2 class="card-title base-content">
											{chapter.emoji + ' ' + chapter.name}
										</h2>
										<p class="text-base-content/70 mt-1">{chapter.desc}</p>
									</div>
								</div>
								<div class="flex items-center gap-6">
									{#if index < enabledThreshold}
										<div
											class="tooltip tooltip-left hidden md:block"
											data-tip="{Math.round(
												(chapterprog[index] / Number(chapter.numprobs)) * 100
											)}% Complete"
										>
											<!--
<div
    class="radial-progress text-success"
    style="--value:{(chapterprog[index] / Number(chapter.numprobs)) * 100}; --size:3rem;"
    role="progressbar"
>
    {Math.round((chapterprog[index] / Number(chapter.numprobs)) * 100)}%
</div>
-->
										</div>
									{/if}
									<div
										class="btn btn-primary btn-circle btn-soft"
										class:btn-disabled={index >= enabledThreshold}
									>
										<ArrowRight />
									</div>
								</div>
							</div>
						</div>
					</a>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	.disabled {
		opacity: 0.5;
		cursor: not-allowed;
		pointer-events: none;
	}

	.card:hover:not(.disabled) {
		transform: scale(1.01);
		text-decoration: underline;
	}
</style>

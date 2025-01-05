<script lang="ts">
	import type { PageData } from './$types';
	import type { Chapter, authLog } from '$lib/types';

	let { data }: { data: PageData } = $props();

	let chapters: Chapter[] = data.chapters;
	const chapterprog: number[] = [12, 0];

	let userInfo: authLog = data.auth;
</script>

<div class="container mx-auto px-4 max-w-7xl mt-12 lg:mt-8">
	<div class="mb-12">
		<h1 class="font-semibold text-4xl">Hi, {userInfo.userName.split(' ')[0]}</h1>
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

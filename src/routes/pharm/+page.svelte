<script lang="ts">
	import type { PageData } from './$types';
	import type { Chapter, authLog } from '$lib/types';

	let { data }: { data: PageData } = $props();

	let chapters: Chapter[] = data.chapters;
	const chapterprog: number[] = [12, 0];

	let userInfo: authLog = data.log;
</script>

<div class="container mx-auto px-4 max-w-7xl mt-12 lg:mt-8">
	<div class="mb-12">
		<h1 class="font-semibold text-4xl">Hi, {userInfo.userName.split(' ')[0]}</h1>
	</div>

	<div class="overflow-x-auto">
		<table class="table table-lg">
			<!-- head -->
			<thead>
				<tr>
					<th>Chapter</th>
					<th>Module</th>
					<th>Progress</th>
				</tr>
			</thead>
			<tbody>
				{#each chapters as chapter, index}
					<tr class="hover">
						<th>{index + 1}</th>
						<td>
							<a class="flex flex-col" href="pharm/chapter/{index + 1}">
								<h3 class="font-semibold text-lg">{chapter.name}</h3>
								<p class="hidden lg:block">{chapter.desc}</p>
							</a>
						</td>
						<td>
							<div class="flex flex-row self-center gap-4">
								<div
									class="radial-progress self-center text-success"
									style="--value:{(chapterprog[index] / Number(chapter.numprobs)) *
										100}; --size:2rem;"
									role="progressbar"
								></div>
								<div class="self-center">
									{Math.round((chapterprog[index] / Number(chapter.numprobs)) * 100)}%.
								</div>
							</div></td
						>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

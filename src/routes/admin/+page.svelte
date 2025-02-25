<script lang="ts">
	import type { PageData } from './$types';
	import type { RawUserProgress, UserProgress } from '$lib/types';

	// Props and data
	let { data }: { data: PageData } = $props();
	const userProgress: RawUserProgress[] = data.userProgress;

	// Process user progress data
	const usersProgress: Record<string, Omit<UserProgress, 'overall_progress'>> = userProgress.reduce(
		(acc, progress) => {
			const {
				user_id,
				user_name,
				chapter_id,
				chapter_name,
				total_questions,
				attempted_questions,
				progress_percentage
			} = progress;
			if (!acc[user_id]) {
				acc[user_id] = {
					user_id,
					user_name,
					chapters: [],
					total_attempted: 0,
					total_questions: 0
				};
			}
			acc[user_id].chapters.push({
				chapter_id,
				chapter_name,
				total_questions,
				attempted_questions,
				progress_percentage
			});
			acc[user_id].total_attempted += attempted_questions;
			acc[user_id].total_questions += total_questions;
			return acc;
		},
		{} as Record<string, Omit<UserProgress, 'overall_progress'>>
	);

	// Sort chapters and compute overall progress
	Object.values(usersProgress).forEach((user) => {
		user.chapters.sort((a, b) => a.chapter_name.localeCompare(b.chapter_name));
	});

	const users: UserProgress[] = Object.values(usersProgress)
		.map((user) => ({
			...user,
			overall_progress:
				user.total_questions > 0 ? (user.total_attempted / user.total_questions) * 100 : 0
		}))
		.sort((a, b) => a.user_name.localeCompare(b.user_name));

	// Reactive state
	let selectedUserId = $state(users[0]?.user_id || null);
	let selectedUser = $derived(
		selectedUserId ? users.find((u) => u.user_id === selectedUserId) : null
	);
	let drawerOpen = $state(false);
</script>

<div class="drawer lg:drawer-open">
	<input id="my-drawer" type="checkbox" class="drawer-toggle" bind:checked={drawerOpen} />
	<div class="drawer-content flex flex-col">
		<!-- Navbar -->
		<div class="navbar bg-base-100">
			<div class="flex-none lg:hidden">
				<label for="my-drawer" class="btn btn-square btn-ghost">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						class="inline-block w-6 h-6 stroke-current"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6h16M4 12h16M4 18h16"
						></path>
					</svg>
				</label>
			</div>
			<div class="flex-1">
				<div class="btn btn-ghost normal-case text-xl">User Progress</div>
			</div>
		</div>
		<!-- Main content -->
		<div class="flex-1 p-4 overflow-auto">
			{#if selectedUser}
				<h2 class="text-2xl font-bold mb-4 self-center">{selectedUser.user_name}'s Progress</h2>

				<div class="overflow-x-auto">
					<table class="table w-full">
						<thead>
							<tr>
								<th>Chapter</th>
								<th>Total Questions</th>
								<th>Attempted Questions</th>
								<th>Progress</th>
							</tr>
						</thead>
						<tbody>
							{#each selectedUser.chapters as chapter}
								<tr class="hover:bg-base-300">
									<td>{chapter.chapter_name}</td>
									<td>{chapter.total_questions}</td>
									<td>{chapter.attempted_questions}</td>
									<td>
										<div class="flex items-center">
											<progress
												class="progress w-56 progress-success"
												value={chapter.progress_percentage ?? 0}
												max="100"
											></progress>
											<span class="ml-2">{(chapter.progress_percentage ?? 0).toFixed(2)}%</span>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="text-center text-gray-500">No user selected or no users available.</p>
			{/if}
		</div>
	</div>
	<div class="drawer-side">
		<label for="my-drawer" class="drawer-overlay"></label>
		<div class="menu p-4 w-80 bg-base-100">
			<h2 class="text-xl font-bold mb-4">Users</h2>
			<ul>
				{#each users as user}
					<li>
						<button
							class="flex justify-between w-full"
							class:active={selectedUserId === user.user_id}
							onclick={() => {
								selectedUserId = user.user_id;
								if (window.innerWidth < 1024) {
									drawerOpen = false;
								}
							}}
						>
							<span>{user.user_name}</span>
							<span>{user.overall_progress.toFixed(2)}%</span>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</div>

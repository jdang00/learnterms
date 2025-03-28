<script lang="ts">
	import type { PageData } from './$types';
	import type { RawUserProgress, UserProgress } from '$lib/types';
	import { Search, ArrowLeft } from 'lucide-svelte';

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
		user.chapters.sort((a, b) => a.chapter_id - b.chapter_id);
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
	let searchQuery = $state('');

	// Filtered users based on search
	let filteredUsers = $derived(
		searchQuery
			? users.filter((user) => user.user_name.toLowerCase().includes(searchQuery.toLowerCase()))
			: users
	);
</script>

<div class="drawer lg:drawer-open min-h-screen bg-base-200">
	<input id="my-drawer" type="checkbox" class="drawer-toggle" bind:checked={drawerOpen} />
	<div class="drawer-content flex flex-col">
		<!-- Mobile drawer toggle and edit button -->
		<div class="flex justify-between items-center p-4 lg:hidden">
			<label for="my-drawer" class="btn btn-square btn-ghost" aria-label="Toggle navigation menu">
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

		<!-- Main content -->
		<div class="p-4 md:p-6 overflow-auto">
			{#if selectedUser}
				<div class="card bg-base-100 shadow-xl">
					<div class="card-body p-4 md:p-6">
						<div class="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
							<h2 class="card-title text-xl md:text-2xl font-bold">
								{selectedUser.user_name}'s Progress
								<div class="badge badge-primary font-semibold ml-2">
									{selectedUser.overall_progress.toFixed(1)}%
								</div>
							</h2>
						</div>

						<div class="divider my-2"></div>

						<div class="overflow-x-auto -mx-4 md:mx-0">
							<table class="table table-zebra w-full">
								<thead>
									<tr class="bg-base-300">
										<th>Chapter</th>
										<th class="text-center">Questions</th>
										<th class="text-center">Attempted</th>
										<th>Progress</th>
									</tr>
								</thead>
								<tbody>
									{#each selectedUser.chapters as chapter (chapter)}
										<tr class="hover:bg-base-200">
											<td class="font-medium">{chapter.chapter_name}</td>
											<td class="text-center">{chapter.total_questions}</td>
											<td class="text-center">{chapter.attempted_questions}</td>
											<td>
												<div class="flex items-center gap-2">
													<progress
														class="progress w-full progress-success"
														value={chapter.progress_percentage ?? 0}
														max="100"
													></progress>
													<span class="min-w-12 md:min-w-16 text-end font-mono text-xs md:text-sm">
														{(chapter.progress_percentage ?? 0).toFixed(1)}%
													</span>
												</div>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			{:else}
				<div class="card bg-base-100 shadow-xl">
					<div class="card-body items-center text-center">
						<div class="text-4xl mb-4">🔍</div>
						<h2 class="card-title text-xl">No user selected</h2>
						<p class="text-base-content/70">
							Select a user from the sidebar to view their progress
						</p>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<div class="drawer-side z-20">
		<label for="my-drawer" class="drawer-overlay"></label>
		<div class="menu p-4 w-80 h-full bg-base-100 shadow-lg">
			<div class="flex flex-col gap-4">
				<div class="flex flex-row gap-2">
					<a href="/admin" class="btn btn-ghost"><ArrowLeft /></a>

					<h2 class="text-xl font-bold px-1 pt-2">Users</h2>
				</div>

				<div class="relative">
					<input
						type="text"
						placeholder="Search users..."
						class="input input-bordered w-full pr-10"
						bind:value={searchQuery}
					/>
					<div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
						<Search class="w-5 h-5 text-base-content/50" />
					</div>
				</div>

				<div class="divider my-1"></div>

				{#if filteredUsers.length === 0}
					<div class="text-center py-4 text-base-content/70">No users found</div>
				{:else}
					<ul class="overflow-y-auto max-h-[calc(100vh-180px)]">
						{#each filteredUsers as user (user.user_id)}
							<li class="mb-2">
								<button
									class="flex justify-between items-center w-full rounded-lg py-3 px-4 {selectedUserId ===
									user.user_id
										? 'bg-primary text-primary-content'
										: 'hover:bg-base-200'}"
									aria-current={selectedUserId === user.user_id ? 'page' : undefined}
									onclick={() => {
										selectedUserId = user.user_id;
										if (window.innerWidth < 1024) {
											drawerOpen = false;
										}
									}}
								>
									<div class="flex items-center">
										<span class="truncate">{user.user_name}</span>
									</div>
									<div>
										{user.overall_progress.toFixed(0)}%
									</div>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	</div>
</div>

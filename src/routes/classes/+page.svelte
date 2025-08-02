<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import type { PageData } from './$types';
	import { api } from '../../convex/_generated/api.js';
	import type { Id } from '../../convex/_generated/dataModel';
	import { fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { ArrowLeft } from 'lucide-svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import ModuleCard from '../../lib/components/ModuleCard.svelte';
	import Sidebar from '../../lib/components/Sidebar.svelte';
	import ClassList from '../../lib/components/ClassList.svelte';

	import { useClerkContext } from 'svelte-clerk/client';
	const ctx = useClerkContext();
	const name = $derived(ctx.user?.firstName);
	const user = $derived(ctx.user);

	let { data }: { data: PageData } = $props();
	const userData = data.userData;

	type ClassType = { _id: Id<'class'>; name: string; code: string; description?: string };

	let currentView: 'classes' | 'modules' = $state('classes');
	let selectedClass: ClassType | null = $state(null);
	let isNavigatingBack = $state(false);

	const classes = useQuery(api.class.getUserClasses, {
		id: (userData?.cohortId as Id<'cohort'>) || ''
	});

	let modules = $state<{ isLoading: boolean; error: any; data?: any[] }>({
		isLoading: false,
		error: null,
		data: []
	});

	let classProgress = $state<any>(null);

	const userDataQuery = userData?.clerkUserId
		? useQuery(api.users.getUserById, {
				id: userData.clerkUserId
			})
		: { data: undefined, isLoading: false, error: null };

	$effect(() => {
		if (selectedClass && currentView === 'modules') {
			const query = useQuery(api.module.getClassModules, { id: selectedClass._id });
			modules = query;
		} else {
			modules = { isLoading: false, error: null, data: [] };
		}
	});

	$effect(() => {
		if (selectedClass && currentView === 'modules' && userDataQuery.data?._id) {
			const progressQuery = useQuery(api.userProgress.getProgressForClass, {
				userId: userDataQuery.data._id as Id<'users'>,
				classId: selectedClass._id
			});
			classProgress = progressQuery;
		} else {
			classProgress = null;
		}
	});

	$effect(() => {
		if (isNavigatingBack) return;

		const classId = page.url.searchParams.get('classId');

		if (classId && classes.data && classes.data.length > 0) {
			const foundClass = classes.data.find((cls) => cls._id === classId);
			console.log('URL effect - foundClass:', foundClass);
			if (foundClass && !selectedClass) {
				console.log('URL effect - setting selectedClass and currentView');
				selectedClass = foundClass;
				currentView = 'modules';
			}
		}
	});

	async function selectClass(classItem: ClassType) {
		selectedClass = classItem;
		currentView = 'modules';
		await goto(`/classes?classId=${classItem._id}`, { replaceState: true });
	}

	async function goBackToClasses() {
		isNavigatingBack = true;
		currentView = 'classes';
		selectedClass = null;
		await goto('/classes', { replaceState: true });
		isNavigatingBack = false;
	}
</script>

<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<div class="mb-8">
		{#if user === undefined}
			<div class="skeleton h-8 w-64 mb-2"></div>
			<div class="skeleton h-4 w-80"></div>
		{:else if user === null}
			<h2 class="text-2xl font-bold mb-2">Welcome, Guest!</h2>
			<p class="text-base-content/70">Here's your learning dashboard.</p>
		{:else}
			<div class="flex flex-row gap-8">
				<div class="avatar hidden xl:block self-center">
					<div class="ring-primary ring-offset-base-100 w-16 rounded-full ring ring-offset-2">
						<img src={user.imageUrl} alt="user profile" />
					</div>
				</div>

				<div>
					<h2 class="text-2xl font-bold mb-2">Hi, {name}!</h2>
					{#if userData === null}
						<div class="skeleton h-4 w-80"></div>
					{:else}
						<p class="text-base-content/70">
							{userData.schoolName}
						</p>
						{#if userData && !classes.isLoading}
							<div class="badge badge-primary badge-soft mt-2">
								{userData.cohortName}
							</div>
						{/if}
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<div class="divider"></div>

	<div class="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-8">
		<div class="lg:col-span-3 overflow-hidden">
			{#if currentView === 'classes'}
				<ClassList {classes} onSelectClass={selectClass} />
			{:else if currentView === 'modules' && selectedClass}
				<div in:fade={{ duration: 400, easing: cubicOut }} class="w-full">
					<div class="flex items-center gap-4 mb-6">
						<button onclick={goBackToClasses} class="btn btn-sm btn-ghost">
							<ArrowLeft size={16} />
						</button>
						<h3 class="text-lg font-semibold">{selectedClass.name}</h3>
						<div class="badge badge-primary badge-soft">{selectedClass.code}</div>
					</div>

					{#if modules.isLoading}
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							{#each Array(4), index (index)}
								<div class="card bg-base-100 shadow-md animate-pulse">
									<div class="card-body">
										<div class="skeleton h-8 w-32 mb-4"></div>
										<div class="skeleton h-4 w-full mb-2"></div>
										<div class="skeleton h-4 w-full mb-2"></div>
										<div class="skeleton h-4 w-2/3 mb-4"></div>
										<div class="skeleton h-8 w-8 rounded-full ml-auto"></div>
									</div>
								</div>
							{/each}
						</div>
					{:else if modules.error}
						<div class="alert alert-error">
							<span>Failed to load modules: {modules.error.toString()}</span>
						</div>
					{:else if !modules.data || modules.data.length === 0}
						<div class="card bg-base-100 shadow-md">
							<div class="card-body py-12">
								<div class="text-4xl mb-4">📚</div>
								<h3 class="text-lg font-semibold mb-2">No modules yet</h3>
								<p class="text-base-content/70">
									Modules will appear here once they are added to this class.
								</p>
							</div>
						</div>
					{:else}
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							{#each modules.data as module (module._id)}
								<ModuleCard
									{module}
									classId={selectedClass._id}
									progress={classProgress?.data?.[module._id]}
								/>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<Sidebar />
	</div>
</main>

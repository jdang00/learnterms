<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import type { PageData } from './$types';
	import { api } from '../../convex/_generated/api.js';
	import type { Doc, Id } from '../../convex/_generated/dataModel';
	import { fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { ArrowLeft, ShieldCheckIcon, UserRoundPenIcon } from 'lucide-svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import ModuleCard from '../../lib/components/ModuleCard.svelte';
	import Sidebar from '../../lib/components/Sidebar.svelte';
	import ClassList from '../../lib/components/ClassList.svelte';
	import type { ClassWithSemester, ClassProgress } from '../../lib/types';
	import { useClerkContext } from 'svelte-clerk/client';
	const ctx = useClerkContext();
	const name = $derived(ctx.user?.firstName);
	const user = $derived(ctx.user);
	const admin = $derived(ctx.user?.publicMetadata.role === 'admin');
	const contributor = $derived(ctx.user?.publicMetadata.create === 'contributor');

	let { data }: { data: PageData } = $props();
	const userData = data.userData;

	let currentView: 'classes' | 'modules' = $state('classes');
	let selectedClass: ClassWithSemester | null = $state(null);
	let isNavigatingBack = $state(false);

	const classesQuery = useQuery(api.class.getUserClasses, {
		id: (userData?.cohortId as Id<'cohort'>) || ''
	});

	const classes = $derived({
		data: classesQuery.data || [],
		isLoading: classesQuery.isLoading,
		error: classesQuery.error
	});

	let modules = $state<{ isLoading: boolean; error: any; data?: Doc<'module'>[] }>({
		isLoading: false,
		error: null,
		data: []
	});

	let classProgress: { data: ClassProgress | undefined; isLoading: boolean; error: any } | null =
		$state(null);

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
			if (foundClass && !selectedClass) {
				selectedClass = foundClass;
				currentView = 'modules';
			}
		}
	});

	async function selectClass(classItem: ClassWithSemester | null) {
		selectedClass = classItem;
		currentView = 'modules';
		if (classItem != null) {
			await goto(`/classes?classId=${classItem._id}`, { replaceState: true });
		}
	}

	async function goBackToClasses() {
		isNavigatingBack = true;
		currentView = 'classes';
		selectedClass = null;
		await goto('/classes', { replaceState: true });
		isNavigatingBack = false;
	}
</script>

<main class="min-h-screen p-8 mb-56">
	<div class="mb-8 flex flex-col gap-2">
		{#if user === undefined}
			<div class="skeleton h-8 w-64 mb-2"></div>
			<div class="skeleton h-4 w-80"></div>
		{:else if user === null}
			<h1 class="text-2xl font-bold text-base-content">Welcome, Guest!</h1>
			<p class="text-base-content/70">Here's your learning dashboard.</p>
		{:else}
			<div class="flex flex-row gap-8 items-center">
				<div class="avatar hidden xl:block">
					<div class="ring-primary ring-offset-base-100 w-16 rounded-full ring ring-offset-2">
						<img src={user.imageUrl} alt="user profile" />
					</div>
				</div>

				<div>
					<h1 class="text-2xl font-bold text-base-content mb-2">Hi, {name}!</h1>
					{#if userData === null}
						<div class="skeleton h-4 w-80"></div>
					{:else}
						<p class="text-base-content/70">
							{userData.schoolName}
						</p>
						{#if userData && !classes.isLoading}
							<div class="badge badge-primary rounded-full badge-soft mt-2">
								{userData.cohortName}
							</div>
							{#if admin}
								<div class="badge badge-secondary rounded-full badge-soft mt-2">
									<ShieldCheckIcon size={16} /> Admin
								</div>
							{/if}
							{#if contributor}
								<div class="badge badge-accent rounded-full badge-soft mt-2">
									<UserRoundPenIcon size={16} /> Contributor
								</div>
							{/if}
						{/if}
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
		<div class="lg:col-span-3 overflow-hidden">
			{#if currentView === 'classes'}
				<ClassList {classes} onSelectClass={selectClass} />
			{:else if currentView === 'modules' && selectedClass}
				<div in:fade={{ duration: 400, easing: cubicOut }} class="w-full">
					<div class="flex items-center gap-4 mb-6">
						<button onclick={goBackToClasses} class="btn">
							<ArrowLeft size={16} />
						</button>
						<h3 class="text-lg font-semibold text-base-content">{selectedClass.name}</h3>
						<div class="text-xs text-base-content/60 font-mono">{selectedClass.code}</div>
					</div>

					{#if modules.isLoading}
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							{#each Array(4), index (index)}
								<div
									class="rounded-lg bg-base-100 shadow-sm border border-base-300 p-4 animate-pulse"
								>
									<div class="space-y-3">
										<div class="skeleton h-6 w-32 mb-3"></div>
										<div class="skeleton h-4 w-full mb-2"></div>
										<div class="skeleton h-4 w-full mb-2"></div>
										<div class="skeleton h-4 w-2/3 mb-4"></div>
										<div class="skeleton h-8 w-8 rounded-full ml-auto"></div>
									</div>
								</div>
							{/each}
						</div>
					{:else if modules.error}
						<div class="alert alert-error rounded-lg shadow-sm border border-error/20">
							<span>Failed to load modules: {modules.error.toString()}</span>
						</div>
					{:else if !modules.data || modules.data.length === 0}
						<div class="rounded-lg bg-base-100 shadow-sm border border-base-300 p-8">
							<div class="text-center py-8">
								<div class="text-4xl mb-4">📚</div>
								<h3 class="text-lg font-semibold mb-2 text-base-content">No modules yet</h3>
								<p class="text-base-content/70">
									Modules will appear here once they are added to this class.
								</p>
							</div>
						</div>
					{:else}
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							{#each modules.data as module (module._id)}
								<ModuleCard {module} classId={selectedClass._id} />
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<Sidebar />
	</div>
</main>

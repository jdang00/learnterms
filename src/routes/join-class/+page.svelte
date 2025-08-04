<script lang="ts">
	import { ArrowRight, Sparkles, School, CheckCircle, Users, Calendar } from 'lucide-svelte';
	import { useClerkContext } from 'svelte-clerk';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { CohortInfo } from '../../lib/types';

	import { fade, fly } from 'svelte/transition';
	const client = useConvexClient();

	let classCode = $state('');
	let isSubmitting = $state(false);
	let error = $state('');
	let cohortInfo = $state<CohortInfo | null>(null);
	let showConfirmation = $state(false);

	async function handleJoinClass() {
		if (!classCode.trim()) {
			error = 'Please enter a class code';
			return;
		}

		isSubmitting = true;
		error = '';

		try {
			const result = await client.action(api.cohort.validateCohortCode, { code: classCode });
			cohortInfo = result;
			showConfirmation = true;
		} catch (err) {
			console.error(err);
			error = 'Invalid class code. Please check and try again.';
		} finally {
			isSubmitting = false;
		}
	}

	async function confirmJoin() {
		if (!cohortInfo || !user) return;

		try {
			await client.mutation(api.cohort.joinCohort, {
				clerkUserId: user.id,
				cohortId: cohortInfo.cohort._id
			});
			window.location.href = '/classes';
		} catch (err) {
			console.error(err);
			error = 'Failed to join class. Please try again.';
		}
	}

	function resetForm() {
		classCode = '';
		error = '';
		cohortInfo = null;
		showConfirmation = false;
	}

	const ctx = useClerkContext();
	const user = $derived(ctx.user);
</script>

<div class="min-h-screen flex items-center justify-center bg-base-100 px-4">
	<div class="w-full max-w-2xl mx-auto">
		<div in:fade={{ duration: 1000 }}>
			{#if user === undefined}
				<!-- Skeleton Loading State -->
				<div class="flex items-center justify-center gap-4 mb-8">
					<div class="skeleton h-16 w-16 rounded-full"></div>
					<div class="skeleton h-8 w-32"></div>
				</div>
			{:else if user === null}
				<div class="flex items-center justify-center gap-4 mb-8">
					<div class="skeleton h-16 w-16 rounded-full"></div>
				</div>
			{:else}
				<!-- Authenticated User State -->
				<div class="flex items-center justify-center mb-8" in:fade>
					<div class="avatar">
						<div
							class="ring-primary ring-offset-base-100 {showConfirmation
								? 'w-16'
								: 'w-32'} rounded-full ring ring-offset-2 transition-all duration-300"
						>
							<img src={user.imageUrl} alt="user profile" />
						</div>
					</div>

					<div class="avatar avatar-placeholder">
						<div
							class="bg-secondary text-neutral-content {showConfirmation
								? 'w-16'
								: 'w-32'} rounded-full ing-primary ring-offset-base-100 ring ring-offset-2 transition-all duration-300"
						>
							<span class={showConfirmation ? 'text-xl' : 'text-3xl'}
								><School size={showConfirmation ? 24 : 48} /></span
							>
						</div>
					</div>
				</div>
			{/if}

			{#if !showConfirmation}
				<div class="text-center mb-12">
					<h1 class="font-bold text-4xl lg:text-5xl mb-4">Join Your Class</h1>

					<p class="text-xl text-base-content/80 max-w-lg mx-auto">
						To access your class's content, enter the class code found on your invitation.
					</p>
				</div>

				<div
					class="card bg-base-100 shadow-xl border border-base-200"
					in:fly={{ y: 20, duration: 500, delay: 300 }}
				>
					<div class="card-body p-8">
						<form onsubmit={handleJoinClass} class="space-y-6">
							<div class="form-control">
								<input
									id="class-code"
									type="text"
									placeholder="Enter your class code..."
									class="input input-bordered input-lg w-full text-center text-xl font-mono tracking-wider"
									bind:value={classCode}
									disabled={isSubmitting}
								/>
							</div>

							{#if error}
								<div class="alert alert-error" in:fly={{ y: -10, duration: 300 }}>
									<span>{error}</span>
								</div>
							{/if}

							<div class="form-control mt-8">
								<button
									type="submit"
									class="btn btn-primary btn-lg w-full gap-3 text-lg"
									disabled={isSubmitting || !classCode.trim()}
								>
									{#if isSubmitting}
										<span class="loading loading-spinner loading-md"></span>
										<span>Checking Code...</span>
									{:else}
										<Sparkles size={20} />
										<span>Join Class</span>
										<ArrowRight size={20} />
									{/if}
								</button>
							</div>
						</form>
					</div>
				</div>
			{:else}
				<!-- Confirmation State -->
				<div class="text-center mb-12">
					<h1 class="font-bold text-4xl lg:text-5xl mb-4">Gotcha!</h1>
					<p class="text-xl text-base-content/80 max-w-lg mx-auto">
						We found your class. Review the details below and confirm to join.
					</p>
				</div>

				<div
					class="card bg-base-100 shadow-xl border border-base-200"
					in:fly={{ y: 20, duration: 500, delay: 300 }}
				>
					<div class="card-body p-8">
						<div class="text-center mb-6">
							<div class="flex justify-center mb-4">
								<div class="avatar">
									<div
										class="ring-success ring-offset-base-100 w-20 rounded-full ring ring-offset-2"
									>
										<img src={cohortInfo?.cohort.pic_url} alt="Cohort Avatar" />
									</div>
								</div>
							</div>
							<h2 class="text-2xl font-bold mb-2">{cohortInfo?.cohort.name}</h2>
							<p class="text-base-content/70">{cohortInfo?.school.name}</p>
						</div>

						<div class="space-y-4 mb-8">
							<div class="flex items-center gap-3 p-4 bg-base-200 rounded-lg">
								<Users size={20} class="text-primary" />
								<div>
									<p class="font-medium">Cohort</p>
									<p class="text-sm text-base-content/70">{cohortInfo?.cohort.name}</p>
								</div>
							</div>

							<div class="flex items-center gap-3 p-4 bg-base-200 rounded-lg">
								<Calendar size={20} class="text-primary" />
								<div>
									<p class="font-medium">Academic Year</p>
									<p class="text-sm text-base-content/70">
										{cohortInfo?.cohort.startYear} - {cohortInfo?.cohort.endYear}
									</p>
								</div>
							</div>

							{#if cohortInfo?.cohort.description}
								<div class="p-4 bg-base-200 rounded-lg">
									<p class="font-medium mb-1">Description</p>
									<p class="text-sm text-base-content/70">{cohortInfo.cohort.description}</p>
								</div>
							{/if}
						</div>

						{#if error}
							<div class="alert alert-error mb-6" in:fly={{ y: -10, duration: 300 }}>
								<span>{error}</span>
							</div>
						{/if}

						<div class="flex gap-4">
							<button type="button" class="btn btn-outline btn-lg flex-1" onclick={resetForm}>
								Back
							</button>
							<button
								type="button"
								class="btn btn-primary btn-lg flex-1 gap-3"
								onclick={confirmJoin}
							>
								<CheckCircle size={20} />
								Confirm & Join
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

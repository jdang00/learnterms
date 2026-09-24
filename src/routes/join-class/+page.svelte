<script lang="ts">
	import { ArrowLeft, ArrowRight, Calendar, Check, School, Users } from 'lucide-svelte';
	import { useClerkContext } from 'svelte-clerk';
	import { useConvexClient } from 'convex-svelte';
	import { resolve } from '$app/paths';
	import { api } from '../../convex/_generated/api';
	import type { CohortInfo } from '../../lib/types';

	import { fade, fly } from 'svelte/transition';
	const client = useConvexClient();

	let classCode = $state('');
	let isSubmitting = $state(false);
	let isConfirming = $state(false);
	let error = $state('');
	let cohortInfo = $state<CohortInfo | null>(null);
	let showConfirmation = $state(false);

	let cohortImageFailed = $state(false);

	async function handleJoinClass(event?: SubmitEvent) {
		event?.preventDefault();
		if (!classCode.trim()) {
			error = 'Please enter a class code';
			return;
		}

		isSubmitting = true;
		error = '';

		try {
			const result = await client.action(api.cohort.validateCohortCode, { code: classCode.trim() });
			cohortInfo = result;
			cohortImageFailed = false;
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

		isConfirming = true;
		error = '';

		try {
			const response = await fetch(resolve('/join-class'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ cohortId: cohortInfo.cohort._id, code: classCode.trim() })
			});
			if (!response.ok) {
				const result = (await response.json().catch(() => null)) as { error?: string } | null;
				throw new Error(result?.error ?? 'Unable to join class. Please try again.');
			}
			window.location.href = resolve('/classes');
		} catch (err) {
			console.error(err);
			error = err instanceof Error ? err.message : 'Unable to join class. Please try again.';
		} finally {
			isConfirming = false;
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

<main class="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
	<div class="w-full max-w-md" in:fade={{ duration: 300 }}>
		{#if !showConfirmation}
			<div class="mb-6 flex flex-col items-center text-center">
				{#if user === undefined}
					<div class="skeleton mb-5 h-14 w-14 rounded-full"></div>
				{:else if user}
					<div class="avatar mb-5">
						<div class="ring-primary ring-offset-base-100 w-14 rounded-full ring-3 ring-offset-2">
							<img src={user.imageUrl} alt="Your profile" />
						</div>
					</div>
				{:else}
					<div class="mb-5 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
						<School size={26} />
					</div>
				{/if}
				<h1 class="font-display text-2xl font-bold text-base-content sm:text-3xl">
					Join your class
				</h1>
				<p class="mt-1.5 max-w-sm text-sm text-base-content/60">
					Enter the class code from your invitation to access your class's content.
				</p>
			</div>

			<div
				class="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-xs sm:p-6"
				in:fly={{ y: 12, duration: 350, delay: 100 }}
			>
				{#if user === null}
					<p class="mb-4 text-center text-sm text-base-content/70">
						Sign in to enter your class code and join your cohort.
					</p>
					<!-- eslint-disable svelte/no-navigation-without-resolve -- resolve() with a query string -->
					<a
						href={`${resolve('/sign-in')}?redirect_url=%2Fjoin-class`}
						class="btn btn-primary w-full gap-2 rounded-full"
					>
						Sign in to continue <ArrowRight size={16} />
					</a>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				{:else}
					<form onsubmit={handleJoinClass} class="space-y-4">
						<label class="block">
							<span class="mb-1.5 block text-xs font-medium text-base-content/60">Class code</span>
							<input
								id="class-code"
								type="text"
								placeholder="e.g. nsuoco2030"
								autocomplete="off"
								autocapitalize="off"
								spellcheck="false"
								class="input w-full rounded-xl text-center font-mono text-lg tracking-wider"
								bind:value={classCode}
								disabled={isSubmitting || !user}
							/>
						</label>

						{#if error}
							<div
								class="rounded-xl bg-error/10 px-4 py-3 text-sm text-error"
								role="alert"
								in:fly={{ y: -6, duration: 200 }}
							>
								{error}
							</div>
						{/if}

						<button
							type="submit"
							class="btn btn-primary w-full gap-2 rounded-full"
							disabled={isSubmitting || !classCode.trim() || !user}
						>
							{#if isSubmitting}
								<span class="loading loading-spinner loading-sm"></span>
								Checking code…
							{:else}
								Continue <ArrowRight size={16} />
							{/if}
						</button>
					</form>
				{/if}
			</div>
		{:else if cohortInfo}
			<div class="mb-6 text-center">
				<span class="badge badge-success badge-soft rounded-full">
					<Check size={13} /> Class found
				</span>
				<h1 class="mt-3 font-display text-2xl font-bold text-base-content sm:text-3xl">
					Confirm your class
				</h1>
				<p class="mt-1.5 text-sm text-base-content/60">
					Make sure this is the right class before joining.
				</p>
			</div>

			<div
				class="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-xs sm:p-6"
				in:fly={{ y: 12, duration: 350, delay: 100 }}
			>
				<div class="flex items-center gap-4">
					{#if cohortInfo.cohort.pic_url && !cohortImageFailed}
						<img
							src={cohortInfo.cohort.pic_url}
							alt=""
							class="size-14 shrink-0 rounded-2xl object-cover"
							onerror={() => (cohortImageFailed = true)}
						/>
					{:else}
						<div
							class="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"
						>
							<School size={24} />
						</div>
					{/if}
					<div class="min-w-0">
						<h2 class="text-lg font-semibold leading-tight text-base-content">
							{cohortInfo.cohort.name}
						</h2>
						<p class="mt-0.5 text-sm text-base-content/60">{cohortInfo.school.name}</p>
					</div>
				</div>

				<dl class="mt-5 grid grid-cols-2 gap-2">
					<div class="rounded-xl bg-base-200/60 px-3 py-2.5">
						<dt class="flex items-center gap-1.5 text-xs text-base-content/50">
							<Users size={13} /> Cohort
						</dt>
						<dd class="mt-0.5 truncate text-sm font-medium">{cohortInfo.cohort.name}</dd>
					</div>
					<div class="rounded-xl bg-base-200/60 px-3 py-2.5">
						<dt class="flex items-center gap-1.5 text-xs text-base-content/50">
							<Calendar size={13} /> Academic years
						</dt>
						<dd class="mt-0.5 text-sm font-medium">
							{cohortInfo.cohort.startYear}–{cohortInfo.cohort.endYear}
						</dd>
					</div>
				</dl>

				{#if cohortInfo.cohort.description}
					<p class="mt-3 text-sm text-base-content/60">{cohortInfo.cohort.description}</p>
				{/if}

				{#if error}
					<div
						class="mt-4 rounded-xl bg-error/10 px-4 py-3 text-sm text-error"
						role="alert"
						in:fly={{ y: -6, duration: 200 }}
					>
						{error}
					</div>
				{/if}

				<div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
					<button
						type="button"
						class="btn btn-ghost gap-1.5 rounded-full sm:flex-1"
						onclick={resetForm}
						disabled={isConfirming}
					>
						<ArrowLeft size={16} /> Back
					</button>
					<button
						type="button"
						class="btn btn-primary gap-1.5 whitespace-nowrap rounded-full sm:flex-[2]"
						disabled={isConfirming}
						onclick={confirmJoin}
					>
						{#if isConfirming}
							<span class="loading loading-spinner loading-sm"></span>
							Joining…
						{:else}
							<Check size={16} /> Join class
						{/if}
					</button>
				</div>
			</div>
		{/if}
	</div>
</main>

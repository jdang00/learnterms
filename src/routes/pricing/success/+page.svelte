<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api';
	import { Sparkles, PartyPopper, Rocket, ArrowRight, Loader2 } from 'lucide-svelte';
	import { Confetti } from 'svelte-confetti';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Reactively poll subscription status - Convex queries auto-update
	const subscriptionQuery = useQuery(api.polar.getCurrentUserWithSubscription, {});

	// Check subscription status reactively
	const isPro = $derived(
		subscriptionQuery.data?.isPro ||
			subscriptionQuery.data?.subscription?.status === 'active' ||
			subscriptionQuery.data?.subscription?.status === 'trialing'
	);

	// Loading state based on query and pro status
	const isSyncing = $derived(subscriptionQuery.isLoading || (!isPro && !subscriptionQuery.data));
	const syncComplete = $derived(isPro);
</script>

<div class="min-h-[80vh] flex items-center justify-center px-4">
	<div class="max-w-lg text-center">
		<!-- Confetti -->
		{#if syncComplete}
			<div class="fixed top-0 left-1/2 -translate-x-1/2 pointer-events-none">
				<Confetti
					x={[-0.5, 0.5]}
					y={[0.25, 1]}
					delay={[0, 50]}
					duration={3000}
					amount={150}
					fallDistance="100vh"
				/>
			</div>
		{/if}

		<!-- Icon -->
		<div class="mb-8">
			<div class="w-24 h-24 bg-gradient-to-br from-primary/20 to-success/20 rounded-full flex items-center justify-center mx-auto relative">
				{#if isSyncing}
					<Loader2 size={48} class="text-primary animate-spin" />
				{:else}
					<PartyPopper size={48} class="text-primary" />
				{/if}
				<div class="absolute -top-1 -right-1">
					<span class="flex h-6 w-6">
						<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
						<span class="relative inline-flex rounded-full h-6 w-6 bg-success items-center justify-center">
							<Sparkles size={14} class="text-success-content" />
						</span>
					</span>
				</div>
			</div>
		</div>

		<!-- Message -->
		<h1 class="text-4xl font-bold mb-4">
			{#if isSyncing}
				Setting up your account...
			{:else}
				Welcome to Pro, {data.userName}!
			{/if}
		</h1>

		<p class="text-base-content/70 text-lg mb-8">
			{#if isSyncing}
				Just a moment while we activate your subscription.
			{:else}
				Your subscription is now active. You've unlocked the full power of LearnTerms.
			{/if}
		</p>

		<!-- What's unlocked -->
		{#if !isSyncing}
			<div class="bg-base-200 rounded-xl p-6 mb-8 text-left">
				<h3 class="font-semibold mb-4 flex items-center gap-2">
					<Rocket size={18} class="text-primary" />
					What you've unlocked
				</h3>
				<ul class="space-y-3 text-sm">
					<li class="flex items-start gap-3">
						<span class="text-success font-bold">300</span>
						<span>AI question generations per day</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="text-success font-bold">∞</span>
						<span>Unlimited PDF document ingestions</span>
					</li>
					<li class="flex items-start gap-3">
						<Sparkles size={16} class="text-success mt-0.5" />
						<span>Export questions to TXT, CSV, and JSON</span>
					</li>
					<li class="flex items-start gap-3">
						<Sparkles size={16} class="text-success mt-0.5" />
						<span>Advanced cohort analytics</span>
					</li>
					<li class="flex items-start gap-3">
						<Sparkles size={16} class="text-success mt-0.5" />
						<span>Priority processing for all tasks</span>
					</li>
				</ul>
			</div>

			<!-- CTA -->
			<div class="flex flex-col sm:flex-row gap-3 justify-center">
				<a href="/admin/question-studio" class="btn btn-primary">
					Open Question Studio
					<ArrowRight size={18} />
				</a>
				<a href="/admin" class="btn btn-outline">
					Go to Dashboard
				</a>
			</div>
		{/if}
	</div>
</div>

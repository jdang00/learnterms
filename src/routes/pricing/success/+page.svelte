<script lang="ts">
	import { Spinner } from '$lib/components/ui/spinner';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import PartyPopper from '@lucide/svelte/icons/party-popper';
	import Rocket from '@lucide/svelte/icons/rocket';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { Confetti } from 'svelte-confetti';
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';

	let { data }: { data: PageData } = $props();

	const userName = $derived(data.account?.data?.firstName || data.account?.data?.name || 'there');

	// The account row carries the subscription and stays live, so the page flips once Polar syncs.
	const subscriptionQuery = $derived(data.account);

	// Check subscription status reactively
	const isPro = $derived(
		subscriptionQuery?.data?.isPro ||
			subscriptionQuery?.data?.subscription?.status === 'active' ||
			subscriptionQuery?.data?.subscription?.status === 'trialing'
	);

	// Loading state based on query and pro status
	const isSyncing = $derived(!isPro && !subscriptionQuery?.data);
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
			<div
				class="w-24 h-24 bg-gradient-to-br from-primary/20 to-success/20 rounded-full flex items-center justify-center mx-auto relative"
			>
				{#if isSyncing}
					<Spinner class="size-12 text-primary" />
				{:else}
					<PartyPopper size={48} class="text-primary" />
				{/if}
				<div class="absolute -top-1 -right-1">
					<span class="flex h-6 w-6">
						<span
							class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"
						></span>
						<span
							class="relative inline-flex rounded-full h-6 w-6 bg-success items-center justify-center"
						>
							<Sparkles size={14} class="text-success-foreground" />
						</span>
					</span>
				</div>
			</div>
		</div>

		<!-- Message -->
		<h1 class="title-hero mb-4">
			{#if isSyncing}
				Setting up your account...
			{:else}
				Welcome to Pro, {userName}!
			{/if}
		</h1>

		<p class="text-foreground/70 text-lg mb-8">
			{#if isSyncing}
				Just a moment while we activate your subscription.
			{:else}
				Your subscription is now active. You've unlocked the full power of LearnTerms.
			{/if}
		</p>

		<!-- What's unlocked -->
		{#if !isSyncing}
			<div class="bg-muted rounded-xl p-6 mb-8 text-left">
				<h3 class="font-semibold mb-4 flex items-center gap-2">
					<Rocket size={18} class="text-primary" />
					What you've unlocked
				</h3>
				<ul class="space-y-3 text-sm">
					<li class="flex items-start gap-3">
						<span class="text-success-ink font-bold">AI</span>
						<span>Question Studio curator beta; usage limits apply</span>
					</li>
					<li class="flex items-start gap-3">
						<Sparkles size={16} class="text-success mt-0.5" />
						<span>PDF indexing: up to 150 pages and 30 MB per file</span>
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
						<span>Source evidence review before publishing</span>
					</li>
				</ul>
			</div>

			<!-- CTA -->
			<div class="flex flex-col sm:flex-row gap-3 justify-center">
				<Button href={resolve('/admin/question-studio')}>
					Open Question Studio
					<ArrowRight size={18} />
				</Button>
				<Button href={resolve('/admin')} variant="outline" tone="neutral">Go to Dashboard</Button>
			</div>
		{/if}
	</div>
</div>

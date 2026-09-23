<script lang="ts">
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import { ArrowRight, BookOpen, Check, Loader2, Minus } from 'lucide-svelte';
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import PublicPage from '$lib/components/landing/PublicPage.svelte';
	import PublicCta from '$lib/components/landing/PublicCta.svelte';

	let { data }: { data: PageData } = $props();

	const client = useConvexClient();

	// Get available products from Polar (always fetch for display)
	const productsQuery = useQuery(api.polar.listAllProducts, {});

	// Get current subscription if authenticated curator/admin
	const subscriptionQuery = useQuery(api.polar.getCurrentUserWithSubscription, () =>
		data.isCuratorOrAdmin ? {} : 'skip'
	);

	// Find semester and annual pro products
	const proSemester = $derived(
		productsQuery.data?.find((p: { name?: string }) => p.name?.toLowerCase().includes('semester'))
	);
	const proAnnual = $derived(
		productsQuery.data?.find((p: { name?: string }) => p.name?.toLowerCase().includes('annual'))
	);

	let isCheckoutLoading = $state(false);
	let selectedInterval = $state<'semester' | 'annual'>('semester');

	const currentProduct = $derived(selectedInterval === 'semester' ? proSemester : proAnnual);

	// Determine pro status from subscription query only
	const isPro = $derived(
		subscriptionQuery.data?.isPro ||
			subscriptionQuery.data?.subscription?.status === 'active' ||
			subscriptionQuery.data?.subscription?.status === 'trialing'
	);

	// Format price from cents
	function formatPrice(cents: number | undefined): string {
		if (!cents) return '$0';
		return `$${(cents / 100).toFixed(0)}`;
	}

	const semesterPrice = $derived(
		proSemester ? formatPrice(proSemester.prices?.[0]?.priceAmount) : '$15'
	);

	const studentFeatures = [
		'Join your cohort’s classes and modules',
		'Unlimited practice questions',
		'Rationales and source references',
		'Custom timed practice tests',
		'Flags, notes, highlights, and progress tracking'
	];
	const curatorFeatures = [
		'Create and edit questions by hand',
		'Organize classes, modules, and tags',
		'Content Library for course documents',
		'Question Studio beta: up to 30 drafts per run, review required'
	];
	const proFeatures = [
		'Everything in Curator',
		'Source-grounded Question Studio (beta)',
		'RAG document indexing',
		'Export questions (TXT, CSV, JSON)',
		'Advanced cohort analytics',
		'Priority processing'
	];
	const steps = [
		{
			title: 'Curators build the question bank',
			detail:
				'A student or faculty member uploads course material and writes or generates questions for each module.'
		},
		{
			title: 'Students join their cohort',
			detail: 'Everyone in the program studies the same bank for free in the browser.'
		},
		{
			title: 'Curators review and update',
			detail: 'Flags and progress data show curators which questions need another look.'
		}
	];
	const faqs = [
		{
			q: 'Is LearnTerms free for students?',
			a: 'Yes. Students never pay. Your cohort’s curators create the question bank and you study it at no cost.'
		},
		{
			q: 'Who creates the questions?',
			a: 'Curators: students or faculty in your program who build and review questions from your course material. Questions can be written by hand or drafted in Question Studio and edited before publishing.'
		},
		{
			q: 'Can I cancel Curator Pro anytime?',
			a: 'Yes. You can cancel at any time and keep Pro access until the end of your billing period.'
		},
		{
			q: 'What happens when I hit my limits?',
			a: 'Question Studio currently has shared beta usage limits for curators. A run can request up to 30 candidates, and PDFs can contain up to 150 pages (30 MB). If a rate limit is reached, wait before retrying. A paid plan does not guarantee a daily AI allowance.'
		}
	];

	async function handleUpgrade() {
		if (!currentProduct?.id) {
			console.error('No product selected');
			return;
		}

		isCheckoutLoading = true;

		try {
			const result = await client.action(api.polar.generateCheckoutLink, {
				productIds: [currentProduct.id],
				origin: window.location.origin,
				successUrl: `${window.location.origin}/pricing/success`
			});

			if (result?.url) {
				window.location.href = result.url;
			}
		} catch (error) {
			console.error('Failed to generate checkout link:', error);
			isCheckoutLoading = false;
		}
	}

	async function handleManageSubscription() {
		try {
			const result = await client.action(api.polar.generateCustomerPortalUrl, {});
			if (result?.url) {
				window.location.href = result.url;
			}
		} catch (error) {
			console.error('Failed to generate portal URL:', error);
		}
	}
</script>

{#snippet featureList(items: string[])}
	<ul class="space-y-2.5 text-sm">
		{#each items as item (item)}
			<li class="flex items-start gap-2.5">
				<Check size={16} class="mt-0.5 shrink-0 text-success" />
				<span>{item}</span>
			</li>
		{/each}
	</ul>
{/snippet}

{#snippet priceTag(amount: string, period: string)}
	<p class="mt-5 flex items-baseline gap-1.5">
		<span class="text-4xl font-extrabold">{amount}</span>
		<span class="text-sm text-base-content/60">{period}</span>
	</p>
{/snippet}

{#snippet faqSection()}
	<section class="mx-auto mt-20 max-w-3xl" aria-labelledby="faq-title">
		<h2 id="faq-title" class="text-2xl font-bold sm:text-3xl">Questions</h2>
		<div class="mt-6 divide-y divide-base-content/10 border-y border-base-content/10">
			{#each faqs as faq (faq.q)}
				<details class="group py-1">
					<summary
						class="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden"
					>
						{faq.q}
						<span
							class="text-xl leading-none text-base-content/40 transition-transform group-open:rotate-45"
							aria-hidden="true">+</span
						>
					</summary>
					<p class="pb-5 text-sm leading-relaxed text-base-content/70">{faq.a}</p>
				</details>
			{/each}
		</div>
	</section>
{/snippet}

{#if !data.isAuthenticated}
	<PublicPage
		title="Pricing"
		lede="LearnTerms is free for students. Curators, the students or faculty who build a cohort’s question bank, can upgrade to Curator Pro for source-grounded generation, exports, and analytics."
	>
		<section class="grid gap-4 lg:grid-cols-3" aria-label="Plans">
			<div class="panel-graph flex flex-col p-6">
				<h2 class="text-lg font-semibold">Student</h2>
				<p class="mt-1 text-sm text-base-content/65">Study your cohort’s question bank.</p>
				{@render priceTag('$0', 'always')}
				<div class="mt-6 flex-1">{@render featureList(studentFeatures)}</div>
				<a href={resolve('/sign-up')} class="btn btn-primary mt-8 rounded-full">
					Create a free account
				</a>
			</div>

			<div class="panel-graph flex flex-col p-6">
				<h2 class="text-lg font-semibold">Curator</h2>
				<p class="mt-1 text-sm text-base-content/65">Build content for your cohort.</p>
				{@render priceTag('$0', 'forever')}
				<div class="mt-6 flex-1">{@render featureList(curatorFeatures)}</div>
				<a href={resolve('/contact')} class="btn btn-ghost mt-8 rounded-full border-base-300">
					Ask about curating
				</a>
			</div>

			<div class="panel-graph pro-plan flex flex-col p-6">
				<div class="flex items-center justify-between gap-2">
					<h2 class="text-lg font-semibold">Curator Pro</h2>
					<span class="badge badge-primary badge-sm rounded-full">For curators</span>
				</div>
				<p class="mt-1 text-sm text-base-content/65">
					Generate questions from your course sources.
				</p>
				{#if productsQuery.isLoading}
					<div class="mt-5 h-12 w-28 animate-pulse rounded-lg bg-base-200"></div>
				{:else}
					{@render priceTag(semesterPrice, 'per 6 months')}
				{/if}
				{#if proAnnual}
					<p class="mt-1 text-xs text-base-content/55">
						or {formatPrice(proAnnual.prices?.[0]?.priceAmount)} per year
					</p>
				{/if}
				<div class="mt-6 flex-1">{@render featureList(proFeatures)}</div>
				<a href={resolve('/sign-up')} class="btn btn-primary mt-8 rounded-full">
					Get started
					<ArrowRight size={16} />
				</a>
			</div>
		</section>

		<section class="mt-20" aria-labelledby="how-title">
			<h2 id="how-title" class="text-2xl font-bold sm:text-3xl">How LearnTerms works</h2>
			<ol class="mt-6 grid gap-8 md:grid-cols-3">
				{#each steps as step (step.title)}
					<li class="border-t border-base-content/15 pt-5">
						<h3 class="text-lg font-semibold">{step.title}</h3>
						<p class="mt-2 text-sm leading-relaxed text-base-content/70">{step.detail}</p>
					</li>
				{/each}
			</ol>
		</section>

		{@render faqSection()}

		<PublicCta />
	</PublicPage>
{:else if !data.isCuratorOrAdmin}
	<PublicPage
		title="You’re all set"
		lede="LearnTerms is completely free for students. You have full access to your cohort’s study materials, practice questions, and progress tracking."
		width="narrow"
	>
		{#snippet actions()}
			<a href={resolve('/classes')} class="btn btn-primary rounded-full px-6">
				<BookOpen size={18} />
				Continue studying
			</a>
		{/snippet}

		<div class="panel-graph p-6">
			<h2 class="font-semibold">What you get as a student</h2>
			<div class="mt-4">{@render featureList(studentFeatures)}</div>
		</div>
		<p class="mt-6 text-sm leading-relaxed text-base-content/65">
			Pro subscriptions are for <span class="font-medium text-base-content">question curators</span>
			who create and manage content for their cohorts. If you’re interested in becoming a curator, talk
			to your program admin.
		</p>
	</PublicPage>
{:else if isPro}
	<PublicPage
		title="You’re on Curator Pro"
		lede={subscriptionQuery.data?.subscription?.currentPeriodEnd
			? `Your subscription renews on ${new Date(
					subscriptionQuery.data.subscription.currentPeriodEnd
				).toLocaleDateString()}.`
			: 'You have full access to all Pro features.'}
		width="narrow"
	>
		{#snippet actions()}
			<a href={resolve('/admin/question-studio')} class="btn btn-primary rounded-full px-6">
				Open Question Studio
				<ArrowRight size={16} />
			</a>
			<button class="btn btn-ghost rounded-full border-base-300" onclick={handleManageSubscription}>
				Manage subscription
			</button>
		{/snippet}

		<div class="panel-graph p-6">
			<h2 class="font-semibold">Your Pro benefits</h2>
			<dl class="mt-5 grid gap-5 sm:grid-cols-2">
				<div>
					<dt class="font-medium">AI generations</dt>
					<dd class="text-sm text-base-content/60">Curator beta; usage limits apply</dd>
				</div>
				<div>
					<dt class="font-medium">RAG indexing</dt>
					<dd class="text-sm text-base-content/60">Document ingestion</dd>
				</div>
				<div>
					<dt class="font-medium">Export questions</dt>
					<dd class="text-sm text-base-content/60">TXT, CSV, JSON</dd>
				</div>
				<div>
					<dt class="font-medium">Source review</dt>
					<dd class="text-sm text-base-content/60">Inspect evidence before publishing</dd>
				</div>
			</dl>
		</div>
	</PublicPage>
{:else}
	<PublicPage title="Curator plans" lede="Scale your content creation with Pro.">
		{#if proSemester && proAnnual}
			<div class="mb-8 inline-flex rounded-full border border-base-300 bg-base-100 p-1">
				<button
					class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors {selectedInterval ===
					'semester'
						? 'bg-base-content text-base-100'
						: 'text-base-content/70 hover:text-base-content'}"
					aria-pressed={selectedInterval === 'semester'}
					onclick={() => (selectedInterval = 'semester')}
				>
					Semester
				</button>
				<button
					class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors {selectedInterval ===
					'annual'
						? 'bg-base-content text-base-100'
						: 'text-base-content/70 hover:text-base-content'}"
					aria-pressed={selectedInterval === 'annual'}
					onclick={() => (selectedInterval = 'annual')}
				>
					Annual <span class="ml-1 text-xs font-semibold text-success">Best value</span>
				</button>
			</div>
		{/if}

		<div class="grid max-w-4xl gap-4 md:grid-cols-2">
			<div class="panel-graph flex flex-col p-6">
				<div class="flex items-center justify-between gap-2">
					<h2 class="text-lg font-semibold">Curator</h2>
					<span class="badge badge-outline badge-sm rounded-full">Current</span>
				</div>
				<p class="mt-1 text-sm text-base-content/65">
					Get started creating content for your cohort.
				</p>
				{@render priceTag('$0', 'forever')}
				<div class="mt-6 flex-1">{@render featureList(curatorFeatures)}</div>
				<p class="mt-6 flex items-center gap-2 text-sm text-base-content/50">
					<Minus size={14} /> No question exports
				</p>
			</div>

			<div class="panel-graph pro-plan flex flex-col p-6">
				<div class="flex items-center justify-between gap-2">
					<h2 class="text-lg font-semibold">Curator Pro</h2>
					<span class="badge badge-primary badge-sm rounded-full">Pro</span>
				</div>
				<p class="mt-1 text-sm text-base-content/65">
					Create and organize your cohort’s study material.
				</p>
				{#if productsQuery.isLoading}
					<div class="mt-5 h-12 w-28 animate-pulse rounded-lg bg-base-200"></div>
				{:else if currentProduct}
					{@render priceTag(
						formatPrice(currentProduct.prices?.[0]?.priceAmount),
						selectedInterval === 'semester' ? 'per 6 months' : 'per year'
					)}
				{:else}
					{@render priceTag('$15', 'per 6 months')}
				{/if}
				<div class="mt-6 flex-1">{@render featureList(proFeatures)}</div>
				{#if subscriptionQuery.isLoading}
					<button class="btn btn-primary mt-8 rounded-full" disabled>
						<Loader2 size={18} class="animate-spin" />
					</button>
				{:else}
					<button
						class="btn btn-primary mt-8 rounded-full"
						onclick={handleUpgrade}
						disabled={isCheckoutLoading || !currentProduct}
					>
						{#if isCheckoutLoading}
							<Loader2 size={18} class="animate-spin" />
							Redirecting...
						{:else}
							Upgrade to Pro
						{/if}
					</button>
				{/if}
			</div>
		</div>

		{@render faqSection()}
	</PublicPage>
{/if}

<style>
	.pro-plan {
		border-color: color-mix(in oklab, var(--color-primary) 55%, transparent);
		box-shadow:
			0 0 0 1px color-mix(in oklab, var(--color-primary) 25%, transparent),
			0 18px 40px -24px color-mix(in oklab, var(--color-primary) 45%, transparent);
	}
</style>

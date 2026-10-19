<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Check from '@lucide/svelte/icons/check';
	import Minus from '@lucide/svelte/icons/minus';
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import PublicPage from '$lib/components/landing/PublicPage.svelte';
	import PublicCta from '$lib/components/landing/PublicCta.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';

	let { data }: { data: PageData } = $props();

	const client = useConvexClient();

	const role = $derived(data.account?.data?.role);
	const isCuratorOrAdmin = $derived(role === 'dev' || role === 'admin' || role === 'curator');

	// Get available products from Polar (always fetch for display)
	const productsQuery = useQuery(api.polar.listAllProducts, {});

	// Get current subscription if authenticated curator/admin
	const subscriptionQuery = useQuery(api.polar.getCurrentUserWithSubscription, () =>
		isCuratorOrAdmin ? {} : 'skip'
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
		<span class="text-sm text-foreground/60">{period}</span>
	</p>
{/snippet}

{#snippet faqSection()}
	<section class="mx-auto mt-20 max-w-3xl" aria-labelledby="faq-title">
		<h2 id="faq-title" class="text-2xl font-bold sm:text-3xl">Questions</h2>
		<div class="mt-6 divide-y divide-foreground/10 border-y border-foreground/10">
			{#each faqs as faq (faq.q)}
				<details class="group py-1">
					<summary
						class="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden"
					>
						{faq.q}
						<span
							class="text-xl leading-none text-foreground/40 transition-transform group-open:rotate-45"
							aria-hidden="true">+</span
						>
					</summary>
					<p class="pb-5 text-sm leading-relaxed text-foreground/70">{faq.a}</p>
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
				<p class="mt-1 text-sm text-foreground/65">Study your cohort’s question bank.</p>
				{@render priceTag('$0', 'always')}
				<div class="mt-6 flex-1">{@render featureList(studentFeatures)}</div>
				<Button href={resolve('/sign-up')} class="mt-8">Create a free account</Button>
			</div>

			<div class="panel-graph flex flex-col p-6">
				<h2 class="text-lg font-semibold">Curator</h2>
				<p class="mt-1 text-sm text-foreground/65">Build content for your cohort.</p>
				{@render priceTag('$0', 'forever')}
				<div class="mt-6 flex-1">{@render featureList(curatorFeatures)}</div>
				<Button href={resolve('/contact')} variant="ghost" tone="neutral" class="mt-8 border-border"
					>Ask about curating</Button
				>
			</div>

			<div class="panel-graph pro-plan flex flex-col p-6">
				<div class="flex items-center justify-between gap-2">
					<h2 class="text-lg font-semibold">Curator Pro</h2>
					<Badge tone="primary" variant="solid" size="sm">For curators</Badge>
				</div>
				<p class="mt-1 text-sm text-foreground/65">Generate questions from your course sources.</p>
				{#if productsQuery.isLoading}
					<Skeleton class="mt-5 h-12 w-28 rounded-lg" />
				{:else}
					{@render priceTag(semesterPrice, 'per 6 months')}
				{/if}
				{#if proAnnual}
					<p class="mt-1 text-xs text-foreground/55">
						or {formatPrice(proAnnual.prices?.[0]?.priceAmount)} per year
					</p>
				{/if}
				<div class="mt-6 flex-1">{@render featureList(proFeatures)}</div>
				<Button href={resolve('/sign-up')} class="mt-8">
					Get started
					<ArrowRight size={16} />
				</Button>
			</div>
		</section>

		<section class="mt-20" aria-labelledby="how-title">
			<h2 id="how-title" class="text-2xl font-bold sm:text-3xl">How LearnTerms works</h2>
			<ol class="mt-6 grid gap-8 md:grid-cols-3">
				{#each steps as step (step.title)}
					<li class="border-t border-foreground/15 pt-5">
						<h3 class="text-lg font-semibold">{step.title}</h3>
						<p class="mt-2 text-sm leading-relaxed text-foreground/70">{step.detail}</p>
					</li>
				{/each}
			</ol>
		</section>

		{@render faqSection()}

		<PublicCta />
	</PublicPage>
{:else if !isCuratorOrAdmin}
	<PublicPage
		title="You’re all set"
		lede="LearnTerms is completely free for students. You have full access to your cohort’s study materials, practice questions, and progress tracking."
		width="narrow"
	>
		{#snippet actions()}
			<Button href={resolve('/classes')} class="px-6">
				<BookOpen size={18} />
				Continue studying
			</Button>
		{/snippet}

		<div class="panel-graph p-6">
			<h2 class="font-semibold">What you get as a student</h2>
			<div class="mt-4">{@render featureList(studentFeatures)}</div>
		</div>
		<p class="mt-6 text-sm leading-relaxed text-foreground/65">
			Pro subscriptions are for <span class="font-medium text-foreground">question curators</span>
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
			<Button href={resolve('/admin/question-studio')} class="px-6">
				Open Question Studio
				<ArrowRight size={16} />
			</Button>
			<Button
				variant="ghost"
				tone="neutral"
				class="border-border"
				onclick={handleManageSubscription}
			>
				Manage subscription
			</Button>
		{/snippet}

		<div class="panel-graph p-6">
			<h2 class="font-semibold">Your Pro benefits</h2>
			<dl class="mt-5 grid gap-5 sm:grid-cols-2">
				<div>
					<dt class="font-medium">AI generations</dt>
					<dd class="text-sm text-foreground/60">Curator beta; usage limits apply</dd>
				</div>
				<div>
					<dt class="font-medium">RAG indexing</dt>
					<dd class="text-sm text-foreground/60">Document ingestion</dd>
				</div>
				<div>
					<dt class="font-medium">Export questions</dt>
					<dd class="text-sm text-foreground/60">TXT, CSV, JSON</dd>
				</div>
				<div>
					<dt class="font-medium">Source review</dt>
					<dd class="text-sm text-foreground/60">Inspect evidence before publishing</dd>
				</div>
			</dl>
		</div>
	</PublicPage>
{:else}
	<PublicPage title="Curator plans" lede="Scale your content creation with Pro.">
		{#if proSemester && proAnnual}
			<div class="mb-8 inline-flex rounded-full border border-border bg-background p-1">
				<button
					class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors {selectedInterval ===
					'semester'
						? 'bg-foreground text-background'
						: 'text-foreground/70 hover:text-foreground'}"
					aria-pressed={selectedInterval === 'semester'}
					onclick={() => (selectedInterval = 'semester')}
				>
					Semester
				</button>
				<button
					class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors {selectedInterval ===
					'annual'
						? 'bg-foreground text-background'
						: 'text-foreground/70 hover:text-foreground'}"
					aria-pressed={selectedInterval === 'annual'}
					onclick={() => (selectedInterval = 'annual')}
				>
					Annual <span class="ml-1 text-xs font-semibold text-success-ink">Best value</span>
				</button>
			</div>
		{/if}

		<div class="grid max-w-4xl gap-4 md:grid-cols-2">
			<div class="panel-graph flex flex-col p-6">
				<div class="flex items-center justify-between gap-2">
					<h2 class="text-lg font-semibold">Curator</h2>
					<Badge variant="outline" tone="neutral" size="sm">Current</Badge>
				</div>
				<p class="mt-1 text-sm text-foreground/65">Get started creating content for your cohort.</p>
				{@render priceTag('$0', 'forever')}
				<div class="mt-6 flex-1">{@render featureList(curatorFeatures)}</div>
				<p class="mt-6 flex items-center gap-2 text-sm text-foreground/50">
					<Minus size={14} /> No question exports
				</p>
			</div>

			<div class="panel-graph pro-plan flex flex-col p-6">
				<div class="flex items-center justify-between gap-2">
					<h2 class="text-lg font-semibold">Curator Pro</h2>
					<Badge tone="primary" variant="solid" size="sm">Pro</Badge>
				</div>
				<p class="mt-1 text-sm text-foreground/65">
					Create and organize your cohort’s study material.
				</p>
				{#if productsQuery.isLoading}
					<Skeleton class="mt-5 h-12 w-28 rounded-lg" />
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
					<Button class="mt-8" loading aria-label="Loading plan" />
				{:else}
					<Button
						class="mt-8"
						onclick={handleUpgrade}
						loading={isCheckoutLoading}
						disabled={!currentProduct}
					>
						{isCheckoutLoading ? 'Redirecting...' : 'Upgrade to Pro'}
					</Button>
				{/if}
			</div>
		</div>

		{@render faqSection()}
	</PublicPage>
{/if}

<style>
	.pro-plan {
		border-color: color-mix(in oklab, var(--primary) 55%, transparent);
		box-shadow:
			0 0 0 1px color-mix(in oklab, var(--primary) 25%, transparent),
			0 18px 40px -24px color-mix(in oklab, var(--primary) 45%, transparent);
	}
</style>

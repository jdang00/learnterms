<script lang="ts">
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import { Check, Loader2, Sparkles, X, BookOpen, GraduationCap, Users, Zap } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const client = useConvexClient();

	// Get available products from Polar (always fetch for display)
	const productsQuery = useQuery(api.polar.listAllProducts, {});

	// Get current subscription if authenticated curator/admin
	const subscriptionQuery = useQuery(
		api.polar.getCurrentUserWithSubscription,
		() => (data.isCuratorOrAdmin ? {} : 'skip')
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

<!-- Not logged in - Informational view -->
{#if !data.isAuthenticated}
	<div class="mx-auto max-w-6xl px-4 py-12">
		<div class="text-center mb-12">
			<h1 class="text-4xl font-bold">How LearnTerms Works</h1>
			<p class="text-base-content/70 mt-3 text-lg max-w-2xl mx-auto">
				LearnTerms is a study platform where students access curated question banks created by their program's content curators.
			</p>
		</div>

		<div class="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto mb-16">
			<!-- Students -->
			<div class="card bg-base-100 border border-base-300">
				<div class="card-body text-center">
					<div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
						<GraduationCap size={32} class="text-primary" />
					</div>
					<h2 class="card-title justify-center text-xl">Students</h2>
					<p class="text-base-content/70 text-sm mb-4">Always free</p>
					<ul class="text-sm text-left space-y-2">
						<li class="flex items-center gap-2">
							<Check size={16} class="text-success" />
							Join cohort study sets
						</li>
						<li class="flex items-center gap-2">
							<Check size={16} class="text-success" />
							Practice unlimited questions
						</li>
						<li class="flex items-center gap-2">
							<Check size={16} class="text-success" />
							Track your progress
						</li>
						<li class="flex items-center gap-2">
							<Check size={16} class="text-success" />
							View explanations
						</li>
					</ul>
				</div>
			</div>

			<!-- Curators -->
			<div class="card bg-base-100 border border-base-300">
				<div class="card-body text-center">
					<div class="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
						<Users size={32} class="text-secondary" />
					</div>
					<h2 class="card-title justify-center text-xl">Curators</h2>
					<p class="text-base-content/70 text-sm mb-4">Create content for cohorts</p>
					<ul class="text-sm text-left space-y-2">
						<li class="flex items-center gap-2">
							<Check size={16} class="text-success" />
							Create & edit questions
						</li>
						<li class="flex items-center gap-2">
							<Check size={16} class="text-success" />
							Organize modules
						</li>
						<li class="flex items-center gap-2">
							<Check size={16} class="text-success" />
							AI question generation
						</li>
						<li class="flex items-center gap-2">
							<Check size={16} class="text-success" />
							Upload study materials
						</li>
					</ul>
				</div>
			</div>

			<!-- Pro -->
			<div class="card bg-base-100 border border-primary/40">
				<div class="card-body text-center">
					<div class="w-16 h-16 bg-gradient-to-br from-primary/20 to-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
						<Zap size={32} class="text-primary" />
					</div>
					<h2 class="card-title justify-center text-xl">Curator Pro</h2>
					<p class="text-base-content/70 text-sm mb-4">Scale content creation</p>
					<ul class="text-sm text-left space-y-2">
						<li class="flex items-center gap-2">
							<Sparkles size={16} class="text-primary" />
							300 AI generations/day
						</li>
						<li class="flex items-center gap-2">
							<Sparkles size={16} class="text-primary" />
							Unlimited PDF uploads
						</li>
						<li class="flex items-center gap-2">
							<Sparkles size={16} class="text-primary" />
							Export questions
						</li>
						<li class="flex items-center gap-2">
							<Sparkles size={16} class="text-primary" />
							Advanced analytics
						</li>
					</ul>
				</div>
			</div>
		</div>

		<div class="text-center">
			<p class="text-base-content/60 mb-4">Ready to get started?</p>
			<a href="/sign-up" class="btn btn-primary">Create an account</a>
		</div>
	</div>

<!-- Student View - Not a curator/admin -->
{:else if !data.isCuratorOrAdmin}
	<div class="min-h-[70vh] flex items-center justify-center px-4">
		<div class="max-w-lg text-center">
			<div class="mb-6">
				<div class="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
					<GraduationCap size={40} class="text-primary" />
				</div>
			</div>
			<h1 class="text-3xl font-bold mb-4">You're all set!</h1>
			<p class="text-base-content/70 text-lg mb-6">
				LearnTerms is <span class="font-semibold text-base-content">completely free</span> for students.
				You have full access to all study materials, practice questions, and progress tracking.
			</p>
			<div class="bg-base-200 rounded-xl p-6 mb-8 text-left">
				<h3 class="font-semibold mb-3">What you get as a student:</h3>
				<ul class="space-y-2 text-sm">
					<li class="flex items-center gap-2">
						<Check size={16} class="text-success" />
						Join cohort study sets
					</li>
					<li class="flex items-center gap-2">
						<Check size={16} class="text-success" />
						Answer unlimited practice questions
					</li>
					<li class="flex items-center gap-2">
						<Check size={16} class="text-success" />
						View detailed explanations
					</li>
					<li class="flex items-center gap-2">
						<Check size={16} class="text-success" />
						Track your progress across modules
					</li>
				</ul>
			</div>
			<p class="text-sm text-base-content/60 mb-6">
				Pro subscriptions are for <span class="font-medium">question curators</span> who create and manage
				content for their cohorts. If you're interested in becoming a curator, talk to your program admin.
			</p>
			<a href="/classes" class="btn btn-primary">
				<BookOpen size={18} />
				Continue studying
			</a>
		</div>
	</div>

<!-- Pro User View - Already subscribed -->
{:else if isPro}
	<div class="mx-auto max-w-4xl px-4 py-12">
		<div class="text-center mb-8">
			<div class="inline-flex items-center gap-2 px-4 py-2 bg-success/10 rounded-full mb-4">
				<Sparkles size={18} class="text-success" />
				<span class="font-semibold text-success">Pro Active</span>
			</div>
			<h1 class="text-3xl font-bold mb-2">You're on Curator Pro</h1>
			<p class="text-base-content/70">
				{#if subscriptionQuery.data?.subscription?.currentPeriodEnd}
					Your subscription renews on {new Date(subscriptionQuery.data.subscription.currentPeriodEnd).toLocaleDateString()}
				{:else}
					You have full access to all Pro features.
				{/if}
			</p>
		</div>

		<div class="card bg-base-100 border border-base-300 mb-8">
			<div class="card-body">
				<h3 class="font-semibold mb-4">Your Pro Benefits</h3>
				<div class="grid sm:grid-cols-2 gap-4">
					<div class="flex items-start gap-3">
						<div class="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center shrink-0">
							<span class="font-bold text-success">300</span>
						</div>
						<div>
							<p class="font-medium">AI Generations</p>
							<p class="text-sm text-base-content/60">Per day limit</p>
						</div>
					</div>
					<div class="flex items-start gap-3">
						<div class="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center shrink-0">
							<span class="font-bold text-success">∞</span>
						</div>
						<div>
							<p class="font-medium">PDF Uploads</p>
							<p class="text-sm text-base-content/60">Unlimited ingestion</p>
						</div>
					</div>
					<div class="flex items-start gap-3">
						<div class="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center shrink-0">
							<Check size={20} class="text-success" />
						</div>
						<div>
							<p class="font-medium">Export Questions</p>
							<p class="text-sm text-base-content/60">TXT, CSV, JSON</p>
						</div>
					</div>
					<div class="flex items-start gap-3">
						<div class="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center shrink-0">
							<Check size={20} class="text-success" />
						</div>
						<div>
							<p class="font-medium">Priority Processing</p>
							<p class="text-sm text-base-content/60">Faster AI & uploads</p>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="flex flex-col sm:flex-row gap-4 justify-center">
			<button class="btn btn-outline" onclick={handleManageSubscription}>
				Manage Subscription
			</button>
			<a href="/admin/question-studio" class="btn btn-primary">
				Open Question Studio
			</a>
		</div>
	</div>

<!-- Curator/Admin Free View - Can upgrade -->
{:else}
	<div class="mx-auto max-w-6xl px-4 py-12">
		<div class="text-center mb-12">
			<h1 class="text-4xl font-bold">Curator Plans</h1>
			<p class="text-base-content/70 mt-3 text-lg">
				Scale your content creation with Pro
			</p>
		</div>

		<!-- Billing Toggle -->
		{#if proSemester && proAnnual}
			<div class="flex justify-center mb-8">
				<div class="bg-base-200 p-1 rounded-lg inline-flex">
					<button
						class="px-4 py-2 rounded-md text-sm font-medium transition-colors {selectedInterval ===
						'semester'
							? 'bg-base-100 shadow-sm'
							: 'text-base-content/70 hover:text-base-content'}"
						onclick={() => (selectedInterval = 'semester')}
					>
						Semester
					</button>
					<button
						class="px-4 py-2 rounded-md text-sm font-medium transition-colors {selectedInterval ===
						'annual'
							? 'bg-base-100 shadow-sm'
							: 'text-base-content/70 hover:text-base-content'}"
						onclick={() => (selectedInterval = 'annual')}
					>
						Annual
						<span class="ml-1 text-xs text-success font-semibold">Best Value</span>
					</button>
				</div>
			</div>
		{/if}

		<div class="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
			<!-- Free Curator Plan -->
			<div class="card bg-base-100 border border-base-300">
				<div class="card-body">
					<div class="flex items-center justify-between mb-2">
						<h2 class="card-title text-xl">Curator</h2>
						<span class="badge badge-outline">Current</span>
					</div>
					<p class="text-base-content/70 text-sm">Get started creating content for your cohort.</p>

					<div class="mt-6">
						<span class="text-4xl font-extrabold">$0</span>
						<span class="text-base-content/70">/forever</span>
					</div>

					<ul class="mt-6 space-y-3 text-sm">
						<li class="flex items-start gap-2">
							<Check size={18} class="text-success shrink-0 mt-0.5" />
							<span>Manual question creation</span>
						</li>
						<li class="flex items-start gap-2">
							<Check size={18} class="text-success shrink-0 mt-0.5" />
							<span>Edit existing questions</span>
						</li>
						<li class="flex items-start gap-2">
							<Check size={18} class="text-success shrink-0 mt-0.5" />
							<span>Organize modules & content</span>
						</li>
						<li class="flex items-start gap-2">
							<Check size={18} class="text-success shrink-0 mt-0.5" />
							<span>Content Library access</span>
						</li>
						<li class="flex items-start gap-2">
							<Check size={18} class="text-success shrink-0 mt-0.5" />
							<span>Question Studio</span>
						</li>
					</ul>

					<div class="mt-4 p-3 bg-base-200 rounded-lg text-sm">
						<p class="font-medium mb-1">Daily Limits</p>
						<p class="text-base-content/60">15 AI generations • 1 PDF upload</p>
					</div>

					<div class="mt-4 text-sm text-base-content/50 flex items-center gap-1">
						<X size={14} />
						No question exports
					</div>
				</div>
			</div>

			<!-- Pro Curator Plan -->
			<div class="card bg-base-100 border-2 border-primary relative">
				<div class="absolute -top-3 left-1/2 -translate-x-1/2">
					<span class="badge badge-primary gap-1">
						<Sparkles size={12} />
						Pro
					</span>
				</div>
				<div class="card-body">
					<h2 class="card-title text-xl">Curator Pro</h2>
					<p class="text-base-content/70 text-sm">Scale your content creation with expanded limits.</p>

					<div class="mt-6">
						{#if productsQuery.isLoading}
							<div class="h-10 w-24 bg-base-200 animate-pulse rounded"></div>
						{:else if currentProduct}
							<span class="text-4xl font-extrabold">
								{formatPrice(currentProduct.prices?.[0]?.priceAmount)}
							</span>
							<span class="text-base-content/70">/{selectedInterval === 'semester' ? '6 months' : 'year'}</span>
						{:else}
							<span class="text-4xl font-extrabold">$15</span>
							<span class="text-base-content/70">/6 months</span>
						{/if}
					</div>

					<ul class="mt-6 space-y-3 text-sm">
						<li class="flex items-start gap-2">
							<Check size={18} class="text-success shrink-0 mt-0.5" />
							<span>Everything in Curator</span>
						</li>
						<li class="flex items-start gap-2">
							<Check size={18} class="text-success shrink-0 mt-0.5" />
							<span><strong>300</strong> AI generations/day</span>
						</li>
						<li class="flex items-start gap-2">
							<Check size={18} class="text-success shrink-0 mt-0.5" />
							<span><strong>Unlimited</strong> PDF uploads</span>
						</li>
						<li class="flex items-start gap-2">
							<Check size={18} class="text-success shrink-0 mt-0.5" />
							<span>Export questions (TXT, CSV, JSON)</span>
						</li>
						<li class="flex items-start gap-2">
							<Check size={18} class="text-success shrink-0 mt-0.5" />
							<span>Advanced cohort analytics</span>
						</li>
						<li class="flex items-start gap-2">
							<Check size={18} class="text-success shrink-0 mt-0.5" />
							<span>Priority processing</span>
						</li>
					</ul>

					<div class="card-actions mt-8">
						{#if subscriptionQuery.isLoading}
							<button class="btn btn-primary w-full" disabled>
								<Loader2 size={18} class="animate-spin" />
							</button>
						{:else}
							<button
								class="btn btn-primary w-full"
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
			</div>
		</div>

		<!-- FAQ -->
		<div class="mt-16 max-w-2xl mx-auto">
			<h3 class="text-lg font-semibold mb-4 text-center">Questions?</h3>
			<div class="space-y-3">
				<details class="collapse collapse-arrow bg-base-200">
					<summary class="collapse-title font-medium text-sm">Can I cancel anytime?</summary>
					<div class="collapse-content text-sm text-base-content/70">
						<p>Yes, you can cancel your subscription at any time. You'll retain Pro access until the end of your billing period.</p>
					</div>
				</details>
				<details class="collapse collapse-arrow bg-base-200">
					<summary class="collapse-title font-medium text-sm">What happens when I hit my limits?</summary>
					<div class="collapse-content text-sm text-base-content/70">
						<p>On the free plan, you'll see a message when you've used your daily AI generations or PDF upload. Limits reset every 24 hours.</p>
					</div>
				</details>
			</div>
		</div>
	</div>
{/if}

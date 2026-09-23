<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		ArrowRight,
		ArrowUpRight,
		Calculator,
		Check,
		FileText,
		Flag,
		GraduationCap,
		Minus,
		Timer,
		TriangleAlert
	} from 'lucide-svelte';
	import PublicPage from '$lib/components/landing/PublicPage.svelte';
	import PublicCta from '$lib/components/landing/PublicCta.svelte';
	import {
		featureGroups,
		featureAvailability,
		reviewedOn,
		sources,
		type Competitor,
		type Availability
	} from '$lib/content/features';

	let category = $state('All features');
	let competitor = $state<Competitor>('anki');
	const visibleGroups = $derived(
		featureGroups.filter((group) => category === 'All features' || group.name === category)
	);
	const products = [
		{ id: 'learnterms', name: 'LearnTerms' },
		{ id: 'anki', name: 'Anki' },
		{ id: 'quizlet', name: 'Quizlet' },
		{ id: 'uworld', name: 'UWorld' }
	] as const;
	const featureCount = featureGroups.reduce((total, group) => total + group.rows.length, 0);
	const highlights = [
		{
			icon: FileText,
			title: 'Course-aligned questions',
			detail:
				'Curators write or generate questions from your course documents, with explanations and links to the source pages.'
		},
		{
			icon: Timer,
			title: 'Question formats and practice tests',
			detail:
				'Multiple choice, multiple select, fill-in-the-blank, matching, and free response, plus custom timed tests.'
		},
		{
			icon: Flag,
			title: 'Review tools',
			detail:
				'Flag questions, filter to what you missed, and keep notes and highlights on each question.'
		}
	];
	const labels: Record<Availability, string> = {
		yes: 'Available',
		partial: 'Limited or unverified',
		no: 'Not available'
	};
</script>

<PublicPage title="Features">
	{#snippet intro()}
		<div class="mt-5 max-w-3xl space-y-4 leading-relaxed text-base-content/75">
			<p>
				LearnTerms brings course-aligned questions, curator-reviewed content, explanations, and
				source references into a shared question bank for your cohort. Multiple question formats let
				you practice both recognizing an answer and explaining your reasoning, while personal notes,
				highlights, and missed-question filters help you work through gaps in your understanding.
			</p>
			<p>
				Built to supplement lectures, textbooks, labs, and dedicated board-prep resources,
				LearnTerms gives you a place to put that learning to work. Move from studying a concept to
				answering questions about it, revisit the material behind a mistake, and build a timed
				practice test from your course modules. That cycle helps bridge substantive studying and
				exam day, giving you opportunities to practice recall, application, and pacing alongside
				your deeper learning.
			</p>
		</div>
	{/snippet}
	{#snippet actions()}
		<a href={resolve('/sign-in')} class="btn btn-primary rounded-full px-6">
			Start studying
			<ArrowRight size={18} />
		</a>
		<a href="#compare" class="btn btn-ghost rounded-full px-5">See the comparison</a>
	{/snippet}

	<section class="grid gap-4 md:grid-cols-3" aria-label="Highlights">
		{#each highlights as item (item.title)}
			{@const Icon = item.icon}
			<div class="panel-graph p-5">
				<div class="w-fit rounded-xl border border-base-300/80 bg-base-100/70 p-2">
					<Icon size={18} />
				</div>
				<h2 class="mt-4 text-lg font-semibold">{item.title}</h2>
				<p class="mt-2 text-sm leading-relaxed text-base-content/70">{item.detail}</p>
			</div>
		{/each}
	</section>

	<section id="compare" class="mt-16 scroll-mt-8" aria-labelledby="compare-title">
		<h2 id="compare-title" class="text-2xl font-bold sm:text-3xl">
			LearnTerms compared with Anki, Quizlet, and UWorld
		</h2>
		<p class="mt-3 max-w-2xl text-base-content/70">
			{featureCount} study features across four tools. Hover or tap a symbol for details.
		</p>
		<div class="mt-6 flex flex-wrap items-center justify-between gap-4">
			<div class="flex flex-wrap gap-2" role="group" aria-label="Filter comparison by category">
				{#each ['All features', ...featureGroups.map((group) => group.name)] as name (name)}
					<button
						class="btn btn-sm rounded-full {category === name
							? 'btn-primary'
							: 'btn-ghost border-base-300 bg-base-100/60'}"
						aria-pressed={category === name}
						onclick={() => (category = name)}>{name}</button
					>
				{/each}
			</div>
			<div
				class="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-base-content/65"
				aria-label="Comparison legend"
			>
				<span class="inline-flex items-center gap-1.5"
					><Check size={16} class="text-success" /> Available</span
				>
				<span class="inline-flex items-center gap-1.5"
					><TriangleAlert size={15} class="text-warning" /> Limited or unverified</span
				>
				<span class="inline-flex items-center gap-1.5"><Minus size={16} /> Not available</span>
			</div>
		</div>
		<div class="mt-5 flex items-center justify-between gap-3 md:hidden">
			<label for="competitor" class="text-sm font-medium">Compare with</label>
			<select id="competitor" class="select select-bordered w-36" bind:value={competitor}>
				<option value="anki">Anki</option><option value="quizlet">Quizlet</option><option
					value="uworld">UWorld</option
				>
			</select>
		</div>
		<div class="comparison-frame mt-5">
			<table class="comparison-table w-full table-fixed border-collapse text-left">
				<caption class="sr-only"
					>LearnTerms, Anki, Quizlet, and UWorld USMLE feature comparison. Focus or tap a symbol for
					details.</caption
				>
				<thead
					><tr>
						<th scope="col" class="feature-heading">Feature</th>
						{#each products as product (product.id)}
							<th
								scope="col"
								class:lt-column={product.id === 'learnterms'}
								class={product.id !== 'learnterms' && product.id !== competitor
									? 'hidden md:table-cell'
									: ''}>{product.name}</th
							>
						{/each}
					</tr></thead
				>
				{#each visibleGroups as group (group.name)}
					<tbody>
						<tr class="group-heading"
							><th colspan="3" scope="rowgroup" class="md:hidden">{group.name}</th><th
								colspan="5"
								scope="rowgroup"
								class="hidden md:table-cell">{group.name}</th
							></tr
						>
						{#each group.rows as feature (feature.name)}
							<tr
								><th scope="row" class="font-medium">{feature.name}</th>
								{#each products as product (product.id)}
									{@const status = featureAvailability[feature.name][product.id]}
									<td
										class:lt-column={product.id === 'learnterms'}
										class={product.id !== 'learnterms' && product.id !== competitor
											? 'hidden md:table-cell'
											: ''}
									>
										<div class="tooltip tooltip-left" data-tip={feature[product.id].text}>
											<button
												type="button"
												class="status-symbol"
												aria-label={`${product.name}: ${feature.name}. ${labels[status]}. ${feature[product.id].text}`}
											>
												{#if status === 'yes'}<Check
														size={20}
														strokeWidth={2.4}
														class="text-success"
													/>
												{:else if status === 'partial'}<TriangleAlert
														size={18}
														class="text-warning"
													/>
												{:else}<Minus size={19} class="text-base-content/35" />{/if}
											</button>
										</div>
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				{/each}
			</table>
		</div>
		<p class="mt-4 text-xs leading-relaxed text-base-content/55">
			Availability varies by plan and course content. UWorld column reflects its USMLE products.
			Competitor details reviewed {reviewedOn}.
		</p>
		<details class="group mt-3 text-xs text-base-content/60">
			<summary class="cursor-pointer font-medium hover:text-base-content">
				Sources ({sources.length})
			</summary>
			<ul class="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
				{#each sources as source (source.id)}
					<li>
						<!-- eslint-disable svelte/no-navigation-without-resolve -- external source URL -->
						<a
							class="inline-flex items-start gap-1 hover:text-primary"
							href={source.url}
							target="_blank"
							rel="noopener noreferrer"
							>{source.title}<ArrowUpRight size={12} class="mt-0.5 shrink-0 opacity-50" /></a
						>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
					</li>
				{/each}
			</ul>
		</details>
	</section>

	<section class="mt-16" aria-labelledby="study-tools-title">
		<h2 id="study-tools-title" class="text-2xl font-bold sm:text-3xl">Free study tools</h2>
		<p class="mt-3 max-w-2xl text-base-content/70">
			Use these on their own while planning coursework or working through practice problems.
		</p>
		<div class="mt-6 grid gap-4 sm:grid-cols-2">
			<a
				class="panel-graph group flex items-start gap-4 p-5 transition-colors hover:border-primary/50"
				href={resolve('/tools/grade-calculator')}
			>
				<span class="rounded-xl border border-base-300/80 bg-base-100/70 p-2"
					><GraduationCap size={18} /></span
				>
				<span class="min-w-0 flex-1">
					<span class="flex items-center justify-between font-semibold"
						>Grade calculator <ArrowRight
							size={16}
							class="opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-100"
						/></span
					>
					<span class="mt-1 block text-sm text-base-content/70"
						>Calculate your current grade and plan the scores you need on remaining coursework.</span
					>
				</span>
			</a>
			<a
				class="panel-graph group flex items-start gap-4 p-5 transition-colors hover:border-primary/50"
				href={resolve('/tools/calculator')}
			>
				<span class="rounded-xl border border-base-300/80 bg-base-100/70 p-2"
					><Calculator size={18} /></span
				>
				<span class="min-w-0 flex-1">
					<span class="flex items-center justify-between font-semibold"
						>Scientific calculator <ArrowRight
							size={16}
							class="opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-100"
						/></span
					>
					<span class="mt-1 block text-sm text-base-content/70"
						>Keyboard entry, calculation history, and click-to-copy results.</span
					>
				</span>
			</a>
		</div>
	</section>

	<PublicCta />
</PublicPage>

<style>
	.comparison-frame {
		border-radius: 1.1rem;
		border: 1px solid color-mix(in oklab, var(--color-base-content) 14%, transparent);
		background: var(--color-base-100);
	}
	.comparison-table th,
	.comparison-table td {
		padding: 0.65rem 1rem;
		border-bottom: 1px solid var(--color-base-300);
		vertical-align: middle;
		font-size: 0.85rem;
	}
	.comparison-table thead th {
		padding-block: 1.1rem;
		font-weight: 600;
	}
	.comparison-table th:not(:first-child),
	.comparison-table td {
		text-align: center;
	}
	.comparison-table .feature-heading {
		width: 36%;
	}
	.comparison-table .lt-column {
		background: color-mix(in oklab, var(--color-primary) 5%, var(--color-base-100));
	}
	.comparison-table thead .lt-column {
		box-shadow: inset 0 3px 0 var(--color-primary);
	}
	.comparison-table .group-heading th {
		padding-block: 0.6rem;
		background: var(--color-base-200);
		text-align: left;
		font-size: 0.75rem;
		font-weight: 600;
	}
	.comparison-table tbody:last-child tr:last-child > * {
		border-bottom: 0;
	}
	.tooltip::before {
		max-width: min(13rem, 42vw);
		white-space: normal;
	}
	.status-symbol {
		display: inline-grid;
		width: 2rem;
		height: 2rem;
		place-items: center;
		cursor: help;
		border-radius: 0.4rem;
	}
	.status-symbol:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	@media (max-width: 767px) {
		.comparison-table th,
		.comparison-table td {
			padding: 0.55rem 0.65rem;
			font-size: 0.75rem;
		}
		.comparison-table .feature-heading {
			width: 44%;
		}
	}
</style>

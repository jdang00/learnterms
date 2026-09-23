<script lang="ts">
	import { resolve } from '$app/paths';
	import { Check, TriangleAlert, Minus } from 'lucide-svelte';
	import {
		featureGroups,
		featureAvailability,
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
	const labels: Record<Availability, string> = {
		yes: 'Available',
		partial: 'Limited or unverified',
		no: 'Not available'
	};
</script>

<div id="main-content" class="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
	<h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">Features</h1>
	<div class="mt-5 max-w-3xl space-y-4 leading-relaxed text-base-content/75">
		<p>
			LearnTerms brings course-aligned questions, curator-reviewed content, explanations, and source
			references into a shared question bank for your cohort. Multiple question formats let you
			practice both recognizing an answer and explaining your reasoning, while personal notes,
			highlights, and missed-question filters help you work through gaps in your understanding.
		</p>
		<p>
			Built to supplement lectures, textbooks, labs, and dedicated board-prep resources, LearnTerms
			gives you a place to put that learning to work. Move from studying a concept to answering
			questions about it, revisit the material behind a mistake, and build a timed practice test
			from your course modules. That cycle helps bridge substantive studying and exam day, giving
			you opportunities to practice recall, application, and pacing alongside your deeper learning.
		</p>
	</div>
	<div
		class="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-base-content/65"
		aria-label="Comparison legend"
	>
		<span class="inline-flex items-center gap-2"
			><Check size={17} class="text-success" /> Available</span
		>
		<span class="inline-flex items-center gap-2"
			><TriangleAlert size={16} class="text-warning" /> Limited or unverified</span
		>
		<span class="inline-flex items-center gap-2"><Minus size={17} /> Not available</span>
	</div>
	<div class="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter comparison by category">
		{#each ['All features', ...featureGroups.map((group) => group.name)] as name (name)}
			<button
				class="btn btn-sm rounded-full {category === name
					? 'btn-primary'
					: 'btn-ghost border-base-300'}"
				aria-pressed={category === name}
				onclick={() => (category = name)}>{name}</button
			>
		{/each}
	</div>
	<div class="mt-5 flex items-center justify-between gap-3 md:hidden">
		<label for="competitor" class="text-sm font-medium">Compare with</label>
		<select id="competitor" class="select select-bordered w-36" bind:value={competitor}>
			<option value="anki">Anki</option><option value="quizlet">Quizlet</option><option
				value="uworld">UWorld</option
			>
		</select>
	</div>
	<div class="mt-6 rounded-xl border border-base-300">
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
		Hover or tap a symbol for details. Availability varies by plan and course content. UWorld:
		USMLE.
	</p>
	<section class="mt-14 border-t border-base-300 pt-8" aria-labelledby="study-tools-title">
		<h2 id="study-tools-title" class="text-2xl font-semibold">Free study tools</h2>
		<p class="mt-2 max-w-2xl text-base-content/70">
			Use these tools on their own while planning coursework or working through practice problems.
		</p>
		<div class="mt-5 flex flex-wrap gap-3">
			<a class="btn btn-outline" href={resolve('/tools/grade-calculator')}>Grade calculator</a>
			<a class="btn btn-outline" href={resolve('/tools/calculator')}>Scientific calculator</a>
		</div>
	</section>
</div>

<style>
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

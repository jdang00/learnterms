<script lang="ts">
	import HeroGlow from '$lib/components/landing/HeroGlow.svelte';
	import { resolve } from '$app/paths';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { reveal } from '$lib/actions/reveal';
	import { changelog } from '$lib/content/changelog';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
</script>

<div class="relative isolate overflow-hidden pb-28">
	<HeroGlow variant="page" />

	<div class="mx-auto max-w-4xl px-4 sm:px-8 lg:px-12">
		<!-- Hero -->
		<section class="pt-16 pb-12 sm:pt-20 sm:pb-16" use:reveal={{ y: 20 }}>
			<div class="flex items-center gap-3 mb-5">
				<div
					class="w-10 h-10 rounded-full bg-primary/10 text-primary-ink flex items-center justify-center"
				>
					<Sparkles size={20} />
				</div>
				<Badge tone="primary" variant="soft">Changelog</Badge>
			</div>
			<h1 class="title-hero">What's new in LearnTerms</h1>
			<p class="mt-4 max-w-2xl text-lg text-foreground/65 leading-relaxed">
				A history of LearnTerms updates, with links to the GitHub releases and code behind them.
			</p>
		</section>

		<!-- Timeline -->
		<div class="changelog-timeline">
			{#each changelog as entry, entryIdx (entry.version)}
				<section class="changelog-entry" use:reveal={{ y: 22, delay: entryIdx * 60 }}>
					<!-- Timeline dot & connector -->
					<div class="timeline-track">
						<div
							class="timeline-dot {entryIdx === 0 ? 'timeline-dot-active' : 'timeline-dot-past'}"
						></div>
						{#if entryIdx < changelog.length - 1}
							<div class="timeline-line"></div>
						{/if}
					</div>

					<!-- Content -->
					<div class="timeline-content">
						<div class="flex flex-wrap items-center gap-2 mb-1">
							<span class="font-mono text-sm font-bold text-foreground/80">{entry.version}</span>
							<span class="text-xs text-foreground/35">&middot;</span>
							<span class="text-xs text-foreground/45">{entry.date}</span>
						</div>

						<h2 class="text-xl font-bold sm:text-2xl mb-4">{entry.title}</h2>

						<div
							class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
							use:reveal={{ y: 14, stagger: 80 }}
						>
							{#each entry.highlights as highlight (highlight.title)}
								{@const Icon = highlight.icon}
								<div class="highlight-card">
									<div class="surface-inset p-2 mb-3 w-fit">
										<Icon size={16} />
									</div>
									<h3 class="text-sm font-semibold">{highlight.title}</h3>
									<p class="mt-1 text-xs text-foreground/55 leading-relaxed">
										{highlight.description}
									</p>
									{#if highlight.href}
										<button
											type="button"
											class="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary-ink hover:text-primary-ink/80"
											onclick={() => window.open(highlight.href, '_blank', 'noreferrer')}
										>
											View source
											<ArrowRight size={12} />
										</button>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				</section>
			{/each}
		</div>

		<!-- Bottom CTA -->
		<section class="mt-16" use:reveal={{ y: 20 }}>
			<div class="cta-section text-center py-12 px-6">
				<h2 class="text-2xl font-bold sm:text-3xl">More on the way</h2>
				<p class="mx-auto mt-3 max-w-md text-foreground/55 text-sm leading-relaxed">
					LearnTerms is actively developed. Have a feature request or idea? We'd love to hear it.
				</p>
				<div class="mt-6 flex flex-wrap items-center justify-center gap-3">
					<Button href={resolve('/sign-in')} class="px-6">
						Start studying
						<ArrowRight size={16} />
					</Button>
					<Button href={resolve('/contact')} variant="ghost" tone="neutral" class="px-5"
						>Get in touch</Button
					>
				</div>
			</div>
		</section>
	</div>
</div>

<style>
	/* Timeline layout */
	.changelog-timeline {
		position: relative;
	}

	.changelog-entry {
		display: flex;
		gap: 1.25rem;
		padding-bottom: 2.5rem;
	}

	.changelog-entry:last-child {
		padding-bottom: 0;
	}

	.timeline-track {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex-shrink: 0;
		width: 1.25rem;
		padding-top: 0.25rem;
	}

	.timeline-dot {
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 999px;
		flex-shrink: 0;
	}

	.timeline-dot-active {
		background: var(--primary);
		box-shadow:
			0 0 0 4px color-mix(in oklab, var(--primary) 18%, transparent),
			0 0 12px color-mix(in oklab, var(--primary) 25%, transparent);
	}

	.timeline-dot-past {
		background: color-mix(in oklab, var(--foreground) 25%, transparent);
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--foreground) 8%, transparent);
	}

	.timeline-line {
		flex: 1;
		width: 1px;
		margin-top: 0.5rem;
		background: linear-gradient(
			to bottom,
			color-mix(in oklab, var(--foreground) 18%, transparent),
			color-mix(in oklab, var(--foreground) 6%, transparent)
		);
	}

	.timeline-content {
		flex: 1;
		min-width: 0;
	}

	/* Highlight cards — same aesthetic as landing feature-card */
	.highlight-card {
		position: relative;
		border-radius: 1rem;
		padding: 0.875rem;
		background:
			linear-gradient(
				to bottom,
				color-mix(in oklab, var(--muted) 70%, transparent),
				color-mix(in oklab, var(--background) 95%, transparent)
			),
			linear-gradient(
					to right,
					color-mix(in oklab, var(--foreground) 6%, transparent) 1px,
					transparent 1px
				)
				0 0 / 18px 18px,
			linear-gradient(
					to bottom,
					color-mix(in oklab, var(--foreground) 6%, transparent) 1px,
					transparent 1px
				)
				0 0 / 18px 18px;
		border: 1px solid color-mix(in oklab, var(--foreground) 12%, transparent);
		transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.highlight-card::before {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		border-radius: inherit;
		box-shadow: inset 0 0 0 1px color-mix(in oklab, white 14%, transparent);
		opacity: 0.4;
	}

	.highlight-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 20px color-mix(in oklab, var(--foreground) 6%, transparent);
		border-color: color-mix(in oklab, var(--primary) 25%, transparent);
	}

	.cta-section {
		border-top: 1px solid color-mix(in oklab, var(--foreground) 10%, transparent);
	}

	@media (prefers-reduced-motion: reduce) {
		* {
			animation: none !important;
			transition: none !important;
		}
	}
</style>

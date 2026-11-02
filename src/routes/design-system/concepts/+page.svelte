<script lang="ts">
	import { resolve } from '$app/paths';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { conceptAreas } from './registry';
</script>

<div class="space-y-8">
	<header class="max-w-3xl">
		<Badge tone="secondary" variant="soft">Concept drafts</Badge>
		<h1 class="mt-3 title-page">Concepts</h1>
		<p class="mt-2 text-muted-foreground">
			Ideas built from shadcn-svelte parts, each placed where it could live in LearnTerms. They run
			on fixture data and nothing here ships. When one is adopted, it moves into the product and
			onto the overview.
		</p>
	</header>
	<ul class="grid gap-4 sm:grid-cols-2">
		{#each conceptAreas as area (area.slug)}
			<li>
				<a
					href={resolve('/design-system/concepts/[area]', { area: area.slug })}
					class="group flex h-full items-start gap-3 surface p-5 transition-colors hover:border-primary/40"
				>
					<span class="min-w-0 flex-1">
						<span class="block font-semibold">{area.title}</span>
						<span class="mt-1 block text-sm text-muted-foreground">{area.summary}</span>
					</span>
					<ArrowRight
						size={16}
						class="mt-1 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
					/>
				</a>
			</li>
		{/each}
	</ul>
</div>

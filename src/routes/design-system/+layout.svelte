<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { conceptAreas } from './concepts/registry';
	import { categories } from './overview/categories';
	import { showcases } from './showcases';

	let { children } = $props();

	const onOverview = $derived(page.route.id === '/design-system');
	const onConcepts = $derived(page.route.id?.startsWith('/design-system/concepts') ?? false);
	const linkClass = (active: boolean) =>
		`block rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
			active
				? 'bg-muted font-medium text-foreground'
				: 'text-muted-foreground hover:bg-muted hover:text-foreground'
		}`;
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto flex max-w-7xl gap-10 px-5 py-10 sm:px-8 lg:py-12">
	<aside class="hidden w-52 shrink-0 lg:block">
		<nav
			class="sticky top-24 flex max-h-[calc(100dvh-7rem)] flex-col gap-6 overflow-y-auto pb-6"
			aria-label="Design system"
		>
			<div class="space-y-1">
				<a href={resolve('/design-system')} class="label-caps block px-2.5 pb-1">Overview</a>
				{#each categories as { id, title } (id)}
					<a href="{resolve('/design-system')}#{id}" class={linkClass(false)}>{title}</a>
				{/each}
			</div>
			<div class="space-y-1">
				<p class="label-caps px-2.5 pb-1">Showcases</p>
				{#each showcases as showcase (showcase.slug)}
					<a
						href={resolve('/design-system/[showcase]', { showcase: showcase.slug })}
						class={linkClass(page.params.showcase === showcase.slug)}
						aria-current={page.params.showcase === showcase.slug ? 'page' : undefined}
						>{showcase.title}</a
					>
				{/each}
			</div>
			<div class="space-y-1">
				<a
					href={resolve('/design-system/concepts')}
					class="label-caps block px-2.5 pb-1"
					aria-current={page.route.id === '/design-system/concepts' ? 'page' : undefined}
					>Concepts</a
				>
				{#each conceptAreas as area (area.slug)}
					<a
						href={resolve('/design-system/concepts/[area]', { area: area.slug })}
						class={linkClass(page.params.area === area.slug)}
						aria-current={page.params.area === area.slug ? 'page' : undefined}>{area.title}</a
					>
				{/each}
			</div>
		</nav>
	</aside>

	<div class="min-w-0 flex-1 space-y-8">
		<nav class="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:hidden" aria-label="Design system">
			<a
				href={resolve('/design-system')}
				class="shrink-0 rounded-full px-3 py-1.5 text-sm {onOverview
					? 'bg-foreground text-background'
					: 'bg-muted text-muted-foreground'}">Overview</a
			>
			{#each showcases as showcase (showcase.slug)}
				{@const active = page.params.showcase === showcase.slug}
				<a
					href={resolve('/design-system/[showcase]', { showcase: showcase.slug })}
					class="shrink-0 rounded-full px-3 py-1.5 text-sm {active
						? 'bg-foreground text-background'
						: 'bg-muted text-muted-foreground'}">{showcase.title}</a
				>
			{/each}
			<a
				href={resolve('/design-system/concepts')}
				class="shrink-0 rounded-full px-3 py-1.5 text-sm {onConcepts
					? 'bg-foreground text-background'
					: 'bg-muted text-muted-foreground'}">Concepts</a
			>
		</nav>
		{@render children()}
	</div>
</div>

<script lang="ts">
	import BrandLogo from '#lib/components/BrandLogo.svelte';
	import ColorMark from '#lib/components/ColorMark.svelte';
	import { classColor } from '#lib/utils/classProgress.js';
	import Category from './Category.svelte';
	import Spec from './Spec.svelte';

	// Literal class strings so Tailwind sees every token.
	const roles = [
		[
			'primary',
			'Selected, primary actions',
			'bg-primary text-primary-foreground',
			'bg-primary/12 text-primary-ink'
		],
		[
			'secondary',
			'Highlights, notes',
			'bg-secondary text-secondary-foreground',
			'bg-secondary/12 text-secondary-ink'
		],
		[
			'accent',
			'Focus, study streaks',
			'bg-accent text-accent-foreground',
			'bg-accent/12 text-accent-ink'
		],
		[
			'neutral',
			'Brand default, dark fills',
			'bg-neutral text-neutral-foreground',
			'bg-neutral/8 text-neutral-ink'
		],
		['info', 'Explanations, sources', 'bg-info text-info-foreground', 'bg-info/12 text-info-ink'],
		[
			'success',
			'Correct answers',
			'bg-success text-success-foreground',
			'bg-success/12 text-success-ink'
		],
		[
			'warning',
			'Flags, skipped answers',
			'bg-warning text-warning-foreground',
			'bg-warning/15 text-warning-ink'
		],
		['error', 'Incorrect answers', 'bg-error text-error-foreground', 'bg-error/12 text-error-ink'],
		[
			'highlighter',
			'Stem highlights',
			'bg-highlighter text-highlighter-foreground',
			'bg-highlighter/25 text-highlighter-ink'
		],
		['ember', 'Streaks', 'bg-ember text-ember-foreground', 'bg-ember/12 text-ember-ink'],
		[
			'mastered',
			'Mastery, past correct',
			'bg-mastered text-mastered-foreground',
			'bg-mastered/12 text-mastered-ink'
		]
	] as const;
	const neutrals = [
		['background', 'bg-background'],
		['muted', 'bg-muted'],
		['muted-strong', 'bg-muted-strong'],
		['border', 'bg-border'],
		['muted-foreground', 'bg-muted-foreground'],
		['foreground', 'bg-foreground']
	] as const;
	const classColors = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => classColor({ _id: id }));
</script>

<Category
	id="foundations"
	summary="Brand tokens from src/app.css. Every role has a solid fill, text for that fill (-foreground) and text for the page (-ink)."
>
	<Spec title="Color roles" src="src/app.css" wide>
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
			{#each roles as [role, job, solid, soft] (role)}
				<div class="overflow-hidden rounded-3xl border border-border">
					<div class="flex h-24 flex-col justify-between p-3.5 {solid}">
						<span class="font-mono text-xs">{role}</span>
						<span class="text-sm font-medium leading-tight">{job}</span>
					</div>
					<div class="flex items-center justify-between px-3.5 py-2 text-xs font-semibold {soft}">
						<span>-ink on soft</span><span aria-hidden="true">Aa</span>
					</div>
				</div>
			{/each}
		</div>
	</Spec>

	<Spec title="Neutrals" src="src/app.css">
		<div class="grid grid-cols-3 gap-3">
			{#each neutrals as [name, cls] (name)}
				<div class="overflow-hidden surface-sm">
					<div class="h-12 {cls}"></div>
					<p class="px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground">{name}</p>
				</div>
			{/each}
		</div>
	</Spec>

	<Spec title="Brand mark and class colors" src={['BrandLogo', 'ColorMark', 'classColor()']}>
		<div class="flex flex-wrap items-center gap-5">
			<BrandLogo class="h-9" />
			<span class="h-8 w-px bg-border" aria-hidden="true"></span>
			<div class="flex flex-wrap gap-2.5">
				{#each classColors as color (color)}
					<ColorMark {color} class="size-8 text-foreground" />
				{/each}
			</div>
		</div>
		<p class="mt-4 text-sm text-muted-foreground">
			Hover the logo to flip it. A class without a card theme gets a stable color from its id.
		</p>
	</Spec>

	<Spec title="Type" src="src/app.css · @utility" wide>
		<div class="grid grid-cols-1 items-baseline gap-x-6 gap-y-5 sm:grid-cols-[11rem_1fr]">
			<span class="font-mono text-xs text-muted-foreground">title-hero · public heroes</span>
			<p class="title-hero">Study what’s on the exam</p>
			<span class="font-mono text-xs text-muted-foreground">title-page · app pages</span>
			<p class="title-page">Module 3 review</p>
			<span class="font-mono text-xs text-muted-foreground">heading · sans 600</span>
			<p class="text-xl font-semibold">Missed questions</p>
			<span class="font-mono text-xs text-muted-foreground">body · sans 400</span>
			<p class="max-w-prose leading-relaxed">
				Combining form meaning cornea. Appears in keratitis, keratoconus and keratometry.
			</p>
			<span class="font-mono text-xs text-muted-foreground">label-caps</span>
			<p class="flex gap-4">
				<span class="label-caps">Matching pairs</span><span class="label-caps text-primary-ink"
					>Tinted</span
				>
			</p>
			<span class="font-mono text-xs text-muted-foreground">data · mono</span>
			<p class="font-mono text-[13px] text-muted-foreground">
				Intro to Optometry · p. 14 · Q 4 / 40
			</p>
		</div>
	</Spec>

	<Spec
		title="Surfaces"
		src="surface · surface-sm · surface-muted · surface-inset · surface-dashed"
		wide
	>
		<div class="grid gap-4 sm:grid-cols-3">
			<div class="surface p-5">
				<p class="font-mono text-xs text-muted-foreground">surface</p>
				<p class="mt-2 font-semibold">Lids & Adnexa</p>
				<div class="mt-3 surface-inset p-3 text-xs text-muted-foreground">
					<span class="font-mono">surface-inset</span> · 24 questions · 3 flagged
				</div>
			</div>
			<div class="surface-muted p-5">
				<p class="font-mono text-xs text-muted-foreground">surface-muted</p>
				<p class="mt-2 font-semibold">Recessed panel</p>
				<div class="mt-3 surface-sm px-3 py-2.5 text-sm">
					<span class="font-mono text-xs text-muted-foreground">surface-sm</span> · Row or tile
				</div>
			</div>
			<div
				class="flex flex-col items-center justify-center gap-1 surface-dashed p-5 text-center text-sm text-muted-foreground"
			>
				<span class="font-mono text-xs">surface-dashed</span>
				Drop slides here
			</div>
		</div>
		<div class="mt-4 grid gap-4 sm:grid-cols-2">
			<div
				class="graph-stage grid h-24 place-items-center surface-muted text-sm text-muted-foreground"
			>
				<span class="font-mono text-xs">graph-stage</span>
			</div>
			<div class="panel-graph grid h-24 place-items-center text-sm text-muted-foreground">
				<span class="font-mono text-xs">panel-graph · public site</span>
			</div>
		</div>
	</Spec>
</Category>

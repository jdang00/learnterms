<script lang="ts" module>
	export const meta = {
		title: 'Public site',
		summary:
			'Pages people see before signing in: navigation, pricing, answers, what changed, and uptime.',
		order: 9
	};
</script>

<script lang="ts">
	import { resolve } from '$app/paths';
	import Check from '@lucide/svelte/icons/check';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Wrench from '@lucide/svelte/icons/wrench';
	import * as Accordion from '#lib/components/ui/accordion/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import * as Breadcrumb from '#lib/components/ui/breadcrumb/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Carousel from '#lib/components/ui/carousel/index.js';
	import * as Marker from '#lib/components/ui/marker/index.js';
	import * as NavigationMenu from '#lib/components/ui/navigation-menu/index.js';
	import { ScrollArea } from '#lib/components/ui/scroll-area/index.js';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import { Tip } from '#lib/components/ui/tooltip/index.js';
	import Concept from '../Concept.svelte';
	import Grid from '../Grid.svelte';

	const features = [
		['Question banks', 'Class-aligned questions with cited sources'],
		['Practice tests', 'Timed, exam-style sessions with review'],
		['Question Studio', 'Draft questions from your lecture PDFs'],
		['Class progress', 'See what your cohort struggles with']
	] as const;

	let billing = $state('year');
	const plans = $derived([
		{
			name: 'Student',
			price: 'Free',
			note: 'Always',
			perks: ['Every class you join', 'Practice tests', 'Progress and badges']
		},
		{
			name: 'Curator Pro',
			price: billing === 'year' ? '$8' : '$10',
			note: billing === 'year' ? 'per month, billed yearly' : 'per month',
			perks: ['Question Studio', 'Content library search', 'Cohort analytics'],
			featured: true
		}
	]);

	const faqs = [
		[
			'Is LearnTerms free for students?',
			'Yes. Students never pay. Curators can upgrade for generation and analytics.'
		],
		[
			'Who writes the questions?',
			'Curators in each cohort, often starting from Question Studio drafts they review and edit.'
		],
		[
			'Where do answers come from?',
			'Each question cites the lecture slides or textbook pages it was written from.'
		]
	] as const;

	const days = Array.from({ length: 60 }, (_, i) =>
		i === 17 ? 'partial' : i === 41 ? 'down' : 'up'
	);
	const dayClass = { up: 'bg-success', partial: 'bg-warning', down: 'bg-error' } as const;

	const toc = [
		'Getting started',
		'Joining a class',
		'Studying a module',
		'Flagging a question',
		'Practice tests',
		'Badges',
		'For curators',
		'Question Studio',
		'Content library',
		'Analytics'
	];

	const quotes = [
		[
			'“The rationales cite the exact slide. I stopped second-guessing the answer key.”',
			'Second-year optometry student'
		],
		[
			'“Our class wrote 900 questions in a semester and actually used them.”',
			'Class representative'
		],
		[
			'“Practice tests feel like the real exam, so the real exam felt familiar.”',
			'Third-year pharmacy student'
		]
	] as const;
</script>

<Grid>
	<Concept
		title="Site navigation"
		uses={['NavigationMenu']}
		where="The public header: a Features panel instead of a long scroll to find what the product does."
		wide
	>
		<NavigationMenu.Root>
			<NavigationMenu.List>
				<NavigationMenu.Item>
					<NavigationMenu.Trigger>Features</NavigationMenu.Trigger>
					<NavigationMenu.Content>
						<ul
							class="grid w-[calc(100vw-6.5rem)] grid-cols-1 gap-2 p-2 sm:w-[30rem] sm:grid-cols-2"
						>
							{#each features as [title, description] (title)}
								<li>
									<NavigationMenu.Link
										href={resolve('/features')}
										class="block rounded-2xl p-3 hover:bg-muted"
									>
										<p class="text-sm font-semibold">{title}</p>
										<p class="text-xs text-muted-foreground">{description}</p>
									</NavigationMenu.Link>
								</li>
							{/each}
						</ul>
					</NavigationMenu.Content>
				</NavigationMenu.Item>
				<NavigationMenu.Item
					><NavigationMenu.Link href={resolve('/pricing')}>Pricing</NavigationMenu.Link
					></NavigationMenu.Item
				>
				<NavigationMenu.Item
					><NavigationMenu.Link href={resolve('/changelog')}>Changelog</NavigationMenu.Link
					></NavigationMenu.Item
				>
			</NavigationMenu.List>
		</NavigationMenu.Root>
	</Concept>

	<Concept
		title="Pricing with a billing switch"
		uses={['ToggleGroup', 'Card', 'Badge']}
		where="The pricing page."
		wide
	>
		<div class="mb-4 flex justify-center">
			<ToggleGroup.Root type="single" bind:value={billing} variant="outline" size="sm">
				<ToggleGroup.Item value="month">Monthly</ToggleGroup.Item>
				<ToggleGroup.Item value="year"
					>Yearly <Badge size="xs" tone="success">−20%</Badge></ToggleGroup.Item
				>
			</ToggleGroup.Root>
		</div>
		<div class="grid gap-4 sm:grid-cols-2">
			{#each plans as plan (plan.name)}
				<Card.Root class={plan.featured ? 'border-primary/40 ring-3 ring-primary/10' : ''}>
					<Card.Header>
						<Card.Title class="flex items-center gap-2"
							>{plan.name}{#if plan.featured}<Badge tone="primary"><Sparkles />For curators</Badge
								>{/if}</Card.Title
						>
						<Card.Description
							><span class="font-display text-3xl font-bold text-foreground">{plan.price}</span>
							{plan.note}</Card.Description
						>
					</Card.Header>
					<Card.Content>
						<ul class="space-y-2 text-sm">
							{#each plan.perks as perk (perk)}<li class="flex items-center gap-2">
									<Check size={16} class="text-success-ink" />{perk}
								</li>{/each}
						</ul>
					</Card.Content>
					<Card.Footer>
						<Button
							class="w-full"
							variant={plan.featured ? 'solid' : 'outline'}
							tone={plan.featured ? 'primary' : 'neutral'}
						>
							{plan.featured ? 'Start a trial' : 'Get started'}
						</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	</Concept>

	<Concept
		title="FAQ"
		uses={['Accordion']}
		where="Pricing and features pages: short answers, one open at a time."
	>
		<Accordion.Root type="single" value="0">
			{#each faqs as [question, answer], i (question)}
				<Accordion.Item value={String(i)}>
					<Accordion.Trigger>{question}</Accordion.Trigger>
					<Accordion.Content class="text-foreground/75">{answer}</Accordion.Content>
				</Accordion.Item>
			{/each}
		</Accordion.Root>
	</Concept>

	<Concept
		title="Changelog"
		uses={['Marker', 'Badge']}
		where="The changelog page: dated separators, a tag per change, plain sentences."
	>
		<div class="space-y-3">
			<Marker.Root variant="separator"><Marker.Content>October 2026</Marker.Content></Marker.Root>
			<div class="space-y-1">
				<p class="flex items-center gap-2 font-semibold">
					<Badge tone="primary">New</Badge>Matching questions, redesigned
				</p>
				<p class="text-sm text-foreground/70">
					Long answers no longer squeeze the prompts, and phones get a full-screen picker.
				</p>
			</div>
			<div class="space-y-1">
				<p class="flex items-center gap-2 font-semibold">
					<Badge tone="info"><Wrench />Fixed</Badge>Reveal no longer jumps the page
				</p>
			</div>
			<Marker.Root variant="separator"><Marker.Content>September 2026</Marker.Content></Marker.Root>
			<p class="flex items-center gap-2 font-semibold">
				<Badge tone="primary">New</Badge>Quiz dock you can rearrange
			</p>
		</div>
	</Concept>

	<Concept
		title="Status history"
		uses={['Tooltip']}
		where="The status page: 60 days at a glance, details on hover."
	>
		<div class="space-y-2">
			<div class="flex items-center justify-between text-sm">
				<span class="font-medium">Study app</span><span class="text-success-ink">99.96% uptime</span
				>
			</div>
			<div class="flex h-8 gap-[3px]">
				{#each days as day, i (i)}
					<Tip
						label={day === 'up'
							? `${60 - i} days ago · no issues`
							: day === 'partial'
								? `${60 - i} days ago · slow sign-in for 14 min`
								: `${60 - i} days ago · down for 6 min`}
					>
						{#snippet child({ props })}
							<span
								{...props}
								class="flex-1 rounded-sm {dayClass[day]} {day === 'up'
									? 'opacity-70 hover:opacity-100'
									: ''}"
							></span>
						{/snippet}
					</Tip>
				{/each}
			</div>
			<div class="flex justify-between text-xs text-muted-foreground">
				<span>60 days ago</span><span>Today</span>
			</div>
		</div>
	</Concept>

	<Concept
		title="Docs page frame"
		uses={['Breadcrumb', 'ScrollArea']}
		where="The docs: a contents rail that scrolls on its own, and where you are at the top."
	>
		<div class="grid grid-cols-[9rem_1fr] items-start gap-4">
			<ScrollArea class="h-64 surface-muted">
				<nav class="space-y-0.5 p-2 text-sm">
					{#each toc as entry, i (entry)}
						<a
							href="#top"
							class="block rounded-lg px-2 py-1 {i === 3
								? 'bg-background font-medium text-foreground'
								: 'text-muted-foreground hover:text-foreground'}">{entry}</a
						>
					{/each}
				</nav>
			</ScrollArea>
			<div class="min-w-0 space-y-3">
				<Breadcrumb.Root>
					<Breadcrumb.List>
						<Breadcrumb.Item><Breadcrumb.Link href="#top">Docs</Breadcrumb.Link></Breadcrumb.Item>
						<Breadcrumb.Separator />
						<Breadcrumb.Item><Breadcrumb.Page>Flagging a question</Breadcrumb.Page></Breadcrumb.Item
						>
					</Breadcrumb.List>
				</Breadcrumb.Root>
				<h4 class="font-display text-2xl font-bold">Flagging a question</h4>
				<p class="text-sm leading-relaxed text-foreground/75">
					Press F or the flag in the dock. Choose what’s wrong and add a sentence if it helps. Your
					class’s curators see it in their inbox, and you’re told when it’s fixed.
				</p>
			</div>
		</div>
	</Concept>

	<Concept
		title="What students say"
		uses={['Carousel', 'Card']}
		where="The landing page, replacing the static review grid on phones."
	>
		<div class="px-10">
			<Carousel.Root opts={{ loop: true }}>
				<Carousel.Content>
					{#each quotes as [quote, who] (who)}
						<Carousel.Item>
							<figure class="flex h-full flex-col justify-between gap-4 surface-sm p-5">
								<blockquote class="text-[15px] leading-relaxed">{quote}</blockquote>
								<figcaption class="text-sm text-muted-foreground">{who}</figcaption>
							</figure>
						</Carousel.Item>
					{/each}
				</Carousel.Content>
				<Carousel.Previous />
				<Carousel.Next />
			</Carousel.Root>
		</div>
	</Concept>
</Grid>

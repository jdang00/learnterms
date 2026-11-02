<script lang="ts" module>
	export const meta = {
		title: 'Studying',
		summary:
			'The quiz page: reading a stem, checking an answer, understanding why, and keeping momentum.',
		order: 1
	};
</script>

<script lang="ts">
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Check from '@lucide/svelte/icons/check';
	import Copy from '@lucide/svelte/icons/copy';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import FileText from '@lucide/svelte/icons/file-text';
	import Flag from '@lucide/svelte/icons/flag';
	import Highlighter from '@lucide/svelte/icons/highlighter';
	import ListOrdered from '@lucide/svelte/icons/list-ordered';
	import MessageCircleQuestion from '@lucide/svelte/icons/message-circle-question';
	import Search from '@lucide/svelte/icons/search';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Strikethrough from '@lucide/svelte/icons/strikethrough';
	import Timer from '@lucide/svelte/icons/timer';
	import X from '@lucide/svelte/icons/x';
	import * as Accordion from '#lib/components/ui/accordion/index.js';
	import { AspectRatio } from '#lib/components/ui/aspect-ratio/index.js';
	import * as Attachment from '#lib/components/ui/attachment/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import * as Bubble from '#lib/components/ui/bubble/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Carousel from '#lib/components/ui/carousel/index.js';
	import type { CarouselAPI } from '#lib/components/ui/carousel/context.js';
	import * as Command from '#lib/components/ui/command/index.js';
	import * as ContextMenu from '#lib/components/ui/context-menu/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import * as Drawer from '#lib/components/ui/drawer/index.js';
	import * as HoverCard from '#lib/components/ui/hover-card/index.js';
	import * as Item from '#lib/components/ui/item/index.js';
	import { Kbd } from '#lib/components/ui/kbd/index.js';
	import * as Marker from '#lib/components/ui/marker/index.js';
	import * as Message from '#lib/components/ui/message/index.js';
	import { Progress } from '#lib/components/ui/progress/index.js';
	import { RadialProgress } from '#lib/components/ui/radial-progress/index.js';
	import { Slider } from '#lib/components/ui/slider/index.js';
	import { Toggle } from '#lib/components/ui/toggle/index.js';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import Concept from '../Concept.svelte';
	import Grid from '../Grid.svelte';

	const terms: Record<string, { meaning: string; parts: string[]; seen: number }> = {
		keratoconus: {
			meaning: 'Progressive thinning and conical steepening of the cornea.',
			parts: ['kerat/o · cornea', '-conus · cone'],
			seen: 14
		},
		'Munson sign': {
			meaning: 'V-shaped bulge of the lower lid on downgaze, from a steep cornea.',
			parts: ['Eponym · Edward Munson'],
			seen: 3
		}
	};

	const rationales = [
		[
			'A',
			'Fleischer ring',
			true,
			'Iron deposits at the base of the cone. Classic for keratoconus.'
		],
		['B', 'Kayser–Fleischer ring', false, 'Copper in Descemet membrane, from Wilson disease.'],
		['C', 'Arcus senilis', false, 'Lipid at the limbus. Age-related, not ectatic.'],
		['D', 'Hudson–Stähli line', false, 'Normal iron line in the lower third of an aging cornea.']
	] as const;

	const figures = [
		['Scheimpflug map', 'Inferior steepening, 52.4 D', 'var(--primary)'],
		['Slit lamp', 'Vogt striae in the posterior stroma', 'var(--info)'],
		['Retinoscopy', 'Scissors reflex', 'var(--accent)']
	] as const;

	const questions = [
		[1, 'Which sign appears on downgaze in advanced keratoconus?', 'missed'],
		[2, 'Iron deposited at the base of the cone forms a…', 'correct'],
		[3, 'First-line treatment to halt progression is…', 'flagged'],
		[4, 'Topography pattern typical of pellucid marginal degeneration', 'new'],
		[5, 'Which contact lens design vaults the cone apex?', 'missed']
	] as const;
	const statusTone = {
		missed: 'error',
		correct: 'success',
		flagged: 'warning',
		new: 'neutral'
	} as const;

	let confidence = $state('unsure');
	let carouselApi = $state<CarouselAPI>();
	let slide = $state(0);
	let jumpOpen = $state(false);
	let focusMinutes = $state(25);
	let hideTimer = $state(false);
	const elapsed = 9;

	$effect(() => {
		const api = carouselApi;
		if (!api) return;
		const update = () => (slide = api.selectedScrollSnap());
		api.on('select', update);
		return () => void api.off('select', update);
	});
</script>

{#snippet term(word: string)}
	<HoverCard.Root openDelay={120}>
		<HoverCard.Trigger
			class="cursor-help underline decoration-primary/40 decoration-dotted underline-offset-4"
			>{word}</HoverCard.Trigger
		>
		<HoverCard.Content class="w-72 space-y-2">
			<p class="font-semibold">{word}</p>
			<p class="text-sm text-foreground/75">{terms[word].meaning}</p>
			<div class="flex flex-wrap gap-1.5">
				{#each terms[word].parts as part (part)}<Badge size="xs" tone="primary">{part}</Badge
					>{/each}
			</div>
			<p class="text-xs text-muted-foreground">In {terms[word].seen} questions in this class</p>
		</HoverCard.Content>
	</HoverCard.Root>
{/snippet}

<Grid>
	<Concept
		title="Glossary on hover"
		uses={['HoverCard', 'Badge']}
		where="Question stems. Terms from the class glossary get a dotted underline; hover for meaning and word parts."
	>
		<p class="text-[17px] leading-relaxed">
			A 24-year-old with {@render term('keratoconus')} looks down, and the lower lid bulges into a V.
			What is this {@render term('Munson sign')} caused by?
		</p>
	</Concept>

	<Concept
		title="Stem context menu"
		uses={['ContextMenu', 'Kbd']}
		where="Right-click (or long-press) anywhere in a stem for the tools that are in the dock today."
	>
		<ContextMenu.Root>
			<ContextMenu.Trigger class="block surface-muted p-4 text-[15px] leading-relaxed select-none"
				>Right-click this stem. A contact lens wearer presents with Vogt striae and a Fleischer
				ring. Which test best tracks progression?</ContextMenu.Trigger
			>
			<ContextMenu.Content class="w-60">
				<ContextMenu.Item
					><Highlighter />Highlight<ContextMenu.Shortcut>H</ContextMenu.Shortcut></ContextMenu.Item
				>
				<ContextMenu.Item
					><Strikethrough />Strike out<ContextMenu.Shortcut>X</ContextMenu.Shortcut
					></ContextMenu.Item
				>
				<ContextMenu.Item><BookOpen />Look up “Vogt striae”</ContextMenu.Item>
				<ContextMenu.Separator />
				<ContextMenu.Item
					><Flag />Flag question<ContextMenu.Shortcut>F</ContextMenu.Shortcut></ContextMenu.Item
				>
				<ContextMenu.Item><MessageCircleQuestion />Ask about this</ContextMenu.Item>
				<ContextMenu.Item><Copy />Copy text</ContextMenu.Item>
			</ContextMenu.Content>
		</ContextMenu.Root>
	</Concept>

	<Concept
		title="Confidence check"
		uses={['ToggleGroup', 'Marker']}
		where="Under the result after Check. A correct guess shouldn’t count toward mastery like a sure answer."
	>
		<div class="space-y-3">
			<Marker.Root>
				<Marker.Icon><Check class="text-success-ink" /></Marker.Icon>
				<Marker.Content>Correct. How sure were you?</Marker.Content>
			</Marker.Root>
			<ToggleGroup.Root type="single" bind:value={confidence} variant="outline" class="w-full">
				<ToggleGroup.Item value="guess" class="flex-1">Guessed</ToggleGroup.Item>
				<ToggleGroup.Item value="unsure" class="flex-1">Unsure</ToggleGroup.Item>
				<ToggleGroup.Item value="sure" class="flex-1">Knew it</ToggleGroup.Item>
			</ToggleGroup.Root>
			<p class="text-sm text-muted-foreground">
				{confidence === 'sure'
					? 'Counts toward mastery. It comes back in a few days.'
					: confidence === 'guess'
						? 'Treated like a miss for scheduling. It comes back this session.'
						: 'It comes back tomorrow to make sure it sticks.'}
			</p>
		</div>
	</Concept>

	<Concept
		title="Why each option"
		uses={['Accordion', 'Badge']}
		where="The rationale panel. Today it is one block; per-option reasons answer “why not B?” directly."
	>
		<Accordion.Root type="single" value="A">
			{#each rationales as [letter, text, correct, why] (letter)}
				<Accordion.Item value={letter}>
					<Accordion.Trigger class="gap-3">
						<span class="flex items-center gap-2.5">
							<span
								class="grid size-6 place-items-center rounded-full text-xs font-semibold {correct
									? 'bg-success text-success-foreground'
									: 'bg-muted text-muted-foreground'}">{letter}</span
							>
							{text}
						</span>
					</Accordion.Trigger>
					<Accordion.Content class="ps-8.5 text-foreground/75">{why}</Accordion.Content>
				</Accordion.Item>
			{/each}
		</Accordion.Root>
	</Concept>

	<Concept
		title="Figure carousel"
		uses={['Carousel', 'AspectRatio']}
		where="Questions with several images (topography, slit lamp, fundus). Swipe on phones, arrows on desktop."
	>
		<div class="px-10">
			<Carousel.Root setApi={(api) => (carouselApi = api)}>
				<Carousel.Content>
					{#each figures as [title, note, hue] (title)}
						<Carousel.Item>
							<AspectRatio ratio={4 / 3} class="overflow-hidden surface-sm">
								<div
									class="graph-stage flex size-full flex-col justify-end p-4"
									style="background: radial-gradient(circle at 60% 40%, color-mix(in oklab, {hue} 35%, transparent), color-mix(in oklab, {hue} 6%, var(--muted)) 70%)"
								>
									<p class="font-semibold">{title}</p>
									<p class="text-sm text-foreground/70">{note}</p>
								</div>
							</AspectRatio>
						</Carousel.Item>
					{/each}
				</Carousel.Content>
				<Carousel.Previous />
				<Carousel.Next />
			</Carousel.Root>
		</div>
		<p class="mt-3 text-center font-mono text-xs text-muted-foreground">
			Figure {slide + 1} of {figures.length}
		</p>
	</Concept>

	<Concept
		title="Ask about this question"
		uses={['Message', 'Bubble', 'Attachment', 'Marker']}
		where="A tab in the side panel. Answers stay grounded in the class sources the question cites."
	>
		<div class="flex flex-col gap-4">
			<Message.Root align="end">
				<Message.Content>
					<Bubble.Root variant="tinted" align="end">
						<Bubble.Content>Why isn’t it a Kayser–Fleischer ring?</Bubble.Content>
					</Bubble.Root>
				</Message.Content>
			</Message.Root>
			<Marker.Root role="status">
				<Marker.Icon><Search /></Marker.Icon>
				<Marker.Content class="text-muted-foreground"
					>Read 2 pages of Cornea & Contact Lenses</Marker.Content
				>
			</Marker.Root>
			<Message.Root>
				<Message.Content>
					<Bubble.Root variant="muted">
						<Bubble.Content
							>Both are rings in the cornea, but the metal differs. A Fleischer ring is iron at the
							cone’s base; Kayser–Fleischer is copper in Descemet membrane, seen in Wilson disease.</Bubble.Content
						>
					</Bubble.Root>
					<Message.Footer>
						<Attachment.Root size="xs">
							<Attachment.Media><FileText /></Attachment.Media>
							<Attachment.Content>
								<Attachment.Title>Cornea & Contact Lenses</Attachment.Title>
								<Attachment.Description>pp. 112–113</Attachment.Description>
							</Attachment.Content>
						</Attachment.Root>
					</Message.Footer>
				</Message.Content>
			</Message.Root>
		</div>
	</Concept>

	<Concept
		title="Jump to a question"
		uses={['Command', 'Dialog', 'Badge']}
		where="⌘J on the quiz page. Search the module by text or filter to missed and flagged."
	>
		<Button variant="outline" tone="neutral" onclick={() => (jumpOpen = true)}>
			<ListOrdered />Jump to question <Kbd>⌘J</Kbd>
		</Button>
		<Dialog.Root bind:open={jumpOpen}>
			<Dialog.Content class="overflow-hidden p-0" showCloseButton={false}>
				<Dialog.Title class="sr-only">Jump to question</Dialog.Title>
				<Command.Root>
					<Command.Input placeholder="Search 48 questions…" />
					<Command.List>
						<Command.Empty>No question matches.</Command.Empty>
						<Command.Group heading="Needs review">
							{#each questions.filter(([, , s]) => s !== 'correct') as [n, text, status] (n)}
								<Command.Item value={text} onSelect={() => (jumpOpen = false)}>
									<span class="w-6 font-mono text-xs text-muted-foreground">{n}</span>
									<span class="min-w-0 flex-1 truncate">{text}</span>
									<Badge size="xs" tone={statusTone[status]}>{status}</Badge>
								</Command.Item>
							{/each}
						</Command.Group>
						<Command.Group heading="Answered">
							{#each questions.filter(([, , s]) => s === 'correct') as [n, text] (n)}
								<Command.Item value={text} onSelect={() => (jumpOpen = false)}>
									<span class="w-6 font-mono text-xs text-muted-foreground">{n}</span>
									<span class="min-w-0 flex-1 truncate">{text}</span>
								</Command.Item>
							{/each}
						</Command.Group>
					</Command.List>
				</Command.Root>
			</Dialog.Content>
		</Dialog.Root>
	</Concept>

	<Concept
		title="Focus session"
		uses={['Slider', 'RadialProgress', 'Toggle']}
		where="A dock tool. A gentle time box for studying, not an exam timer, and easy to hide."
	>
		<div class="flex items-center gap-5">
			{#if hideTimer}
				<div class="grid size-20 place-items-center rounded-full bg-muted text-muted-foreground">
					<EyeOff size={20} />
				</div>
			{:else}
				<RadialProgress value={(elapsed / focusMinutes) * 100} thickness={6} class="size-20 text-sm"
					>{focusMinutes - elapsed}m</RadialProgress
				>
			{/if}
			<div class="min-w-0 flex-1 space-y-3">
				<p class="flex items-center gap-2 text-sm font-medium">
					<Timer size={16} />{focusMinutes} minute session
				</p>
				<Slider
					type="single"
					bind:value={focusMinutes}
					min={10}
					max={60}
					step={5}
					aria-label="Session length"
				/>
				<Toggle bind:pressed={hideTimer} variant="outline" size="sm"
					><EyeOff />Hide countdown</Toggle
				>
			</div>
		</div>
	</Concept>

	<Concept
		title="Session recap"
		uses={['Item', 'Marker', 'Progress']}
		where="When a session ends or the module completes: what changed and the one next step."
	>
		<div class="space-y-3">
			<Marker.Root variant="separator"
				><Marker.Content>Today · 32 minutes</Marker.Content></Marker.Root
			>
			<div class="space-y-1.5">
				<div class="flex justify-between text-sm">
					<span>Keratoconus</span><span class="tabular-nums text-muted-foreground">31 of 48</span>
				</div>
				<Progress value={64} tone="success" />
			</div>
			<Item.Group class="gap-2">
				<Item.Root variant="outline" size="sm">
					<Item.Media variant="icon"><X class="text-error-ink" /></Item.Media>
					<Item.Content>
						<Item.Title>Review 5 missed questions</Item.Title>
						<Item.Description>Mostly corneal topography patterns</Item.Description>
					</Item.Content>
					<Item.Actions><Button size="sm">Review</Button></Item.Actions>
				</Item.Root>
				<Item.Root variant="muted" size="sm">
					<Item.Media variant="icon"><Sparkles class="text-mastered-ink" /></Item.Media>
					<Item.Content>
						<Item.Title>6 newly mastered</Item.Title>
						<Item.Description>They won’t come back for a week</Item.Description>
					</Item.Content>
				</Item.Root>
			</Item.Group>
		</div>
	</Concept>

	<Concept
		title="Phone question navigator"
		uses={['Drawer']}
		where="Replaces the navigator sheet on phones with a drag-to-dismiss drawer that snaps."
	>
		<Drawer.Root>
			<Drawer.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline" tone="neutral"><ListOrdered />Questions</Button>
				{/snippet}
			</Drawer.Trigger>
			<Drawer.Content>
				<Drawer.Header>
					<Drawer.Title>Keratoconus · 48 questions</Drawer.Title>
					<Drawer.Description>31 answered · 5 to review · 2 flagged</Drawer.Description>
				</Drawer.Header>
				<div class="grid grid-cols-8 gap-1.5 px-4 pb-6">
					{#each Array.from({ length: 48 }, (_, i) => i) as i (i)}
						<span
							class="grid aspect-square place-items-center rounded-lg text-xs tabular-nums {i < 20
								? 'bg-success/60'
								: i < 25
									? 'bg-error/50'
									: i < 31
										? 'bg-mastered text-mastered-foreground'
										: 'bg-muted text-muted-foreground'}">{i + 1}</span
						>
					{/each}
				</div>
			</Drawer.Content>
		</Drawer.Root>
	</Concept>
</Grid>

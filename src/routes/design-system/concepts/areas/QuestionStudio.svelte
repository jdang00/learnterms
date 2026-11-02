<script lang="ts" module>
	export const meta = {
		title: 'Question Studio and AI',
		summary:
			'Drafting questions from class material with an agent: what it is doing, what it made, and why it kept it.',
		order: 5
	};
</script>

<script lang="ts">
	import { PieChart, Text } from 'layerchart';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import Check from '@lucide/svelte/icons/check';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import FileText from '@lucide/svelte/icons/file-text';
	import Gavel from '@lucide/svelte/icons/gavel';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import Paperclip from '@lucide/svelte/icons/paperclip';
	import PenLine from '@lucide/svelte/icons/pen-line';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import X from '@lucide/svelte/icons/x';
	import * as Attachment from '#lib/components/ui/attachment/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import * as Bubble from '#lib/components/ui/bubble/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Carousel from '#lib/components/ui/carousel/index.js';
	import * as Chart from '#lib/components/ui/chart/index.js';
	import * as CodeBlock from '#lib/components/ui/code-block/index.js';
	import * as InputGroup from '#lib/components/ui/input-group/index.js';
	import { Kbd } from '#lib/components/ui/kbd/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import * as Marker from '#lib/components/ui/marker/index.js';
	import * as Message from '#lib/components/ui/message/index.js';
	import * as MessageScroller from '#lib/components/ui/message-scroller/index.js';
	import { Progress } from '#lib/components/ui/progress/index.js';
	import { ScrollArea } from '#lib/components/ui/scroll-area/index.js';
	import { Slider } from '#lib/components/ui/slider/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import { Toggle } from '#lib/components/ui/toggle/index.js';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import * as Trace from '#lib/components/ui/trace/index.js';
	import Concept from '../Concept.svelte';
	import Grid from '../Grid.svelte';

	const drafts = [
		{
			stem: 'Which finding on slit lamp is pathognomonic for keratoconus?',
			answer: 'Fleischer ring',
			score: 92
		},
		{
			stem: 'Scissors reflex on retinoscopy suggests…',
			answer: 'Irregular astigmatism',
			score: 86
		},
		{
			stem: 'Corneal cross-linking requires a minimum stromal thickness of…',
			answer: '400 µm',
			score: 71
		}
	];
	let decisions = $state<Record<number, 'kept' | 'dropped'>>({});

	let types = $state(['mc', 'fitb']);
	let mix = $state([30, 70]);
	let citeAll = $state(true);
	const share = $derived({ recall: mix[0], application: mix[1] - mix[0], analysis: 100 - mix[1] });

	const pages = Array.from({ length: 14 }, (_, i) => i + 112);
	let picked = $state<number[]>([112, 113, 116]);

	const criteria = [
		['Grounded in source', 96],
		['One defensible answer', 90],
		['Plausible distractors', 78],
		['Board relevance', 84]
	] as const;
	const quality = 87;
	const qualityConfig = {
		score: { label: 'Quality', color: 'var(--success)' }
	} satisfies Chart.ChartConfig;

	const output = `{
  "stem": "Which finding on slit lamp is pathognomonic for keratoconus?",
  "options": ["Fleischer ring", "Kayser–Fleischer ring", "Arcus", "Krukenberg spindle"],
  "answer": 0,
  "source": { "document": "Cornea & Contact Lenses", "pages": [112] },
  "difficulty": "recall"
}`;
</script>

<Grid>
	<Concept
		title="Agent run trace"
		uses={['Trace', 'Collapsible', 'Spinner']}
		where="The run panel. The plan → draft → gate → judge → select loop, live, with the reasoning a click away."
		wide
	>
		<Trace.Root>
			<Trace.Collapsible>
				<Trace.CollapsibleTrigger>
					<Trace.Line>
						<Trace.Icon><ListChecks /></Trace.Icon>
						<Trace.Title>Planned 12 questions across 4 topics</Trace.Title>
						<Trace.Description>3.1s</Trace.Description>
					</Trace.Line>
				</Trace.CollapsibleTrigger>
				<Trace.CollapsibleContent>
					<ul class="list-disc space-y-1 ps-5 text-sm text-foreground/75">
						<li>Clinical signs (4) · pp. 112–114</li>
						<li>Topography patterns (3) · pp. 116–118</li>
						<li>Management (3) · pp. 120–121</li>
						<li>Contact lens fitting (2) · p. 124</li>
					</ul>
				</Trace.CollapsibleContent>
			</Trace.Collapsible>
			<Trace.Line>
				<Trace.Icon><PenLine /></Trace.Icon>
				<Trace.Title>Drafted 12 candidates</Trace.Title>
				<Trace.Description>18.4s</Trace.Description>
			</Trace.Line>
			<Trace.Collapsible>
				<Trace.CollapsibleTrigger>
					<Trace.Line status="error">
						<Trace.Icon><ShieldCheck /></Trace.Icon>
						<Trace.Title>Gate rejected 2: answer not in the cited pages</Trace.Title>
						<Trace.Description>failed check</Trace.Description>
					</Trace.Line>
				</Trace.CollapsibleTrigger>
				<Trace.CollapsibleContent class="text-sm text-foreground/75">
					“Minimum thickness for cross-linking” cites p. 120, which never states a number.
				</Trace.CollapsibleContent>
			</Trace.Collapsible>
			<Trace.Line status="running">
				<Trace.Icon><Gavel /></Trace.Icon>
				<Trace.Title>Judging 10 candidates for quality</Trace.Title>
				<Trace.Icon><Spinner class="size-3.5" /></Trace.Icon>
			</Trace.Line>
			<Trace.Line status="pending">
				<Trace.Icon><Check /></Trace.Icon>
				<Trace.Title>Select the best 8</Trace.Title>
			</Trace.Line>
		</Trace.Root>
	</Concept>

	<Concept
		title="Studio conversation"
		uses={['MessageScroller', 'Message', 'Bubble', 'Attachment', 'Marker']}
		where="Question Studio’s main column: ask for questions in plain words, attach pages, steer the next batch."
	>
		<div class="flex h-[26rem] flex-col overflow-hidden surface-muted">
			<MessageScroller.Provider defaultScrollPosition="end">
				<MessageScroller.Root class="flex-1">
					<MessageScroller.Viewport class="px-4">
						<MessageScroller.Content class="gap-5 py-4">
							<MessageScroller.Item>
								<Message.Root align="end">
									<Message.Content>
										<Attachment.Root size="sm" class="self-end">
											<Attachment.Media><FileText /></Attachment.Media>
											<Attachment.Content>
												<Attachment.Title>Cornea & Contact Lenses.pdf</Attachment.Title>
												<Attachment.Description>pp. 112–124</Attachment.Description>
											</Attachment.Content>
										</Attachment.Root>
										<Bubble.Root variant="tinted" align="end">
											<Bubble.Content
												>12 board-style questions on keratoconus, mostly application.</Bubble.Content
											>
										</Bubble.Root>
									</Message.Content>
								</Message.Root>
							</MessageScroller.Item>
							<MessageScroller.Item>
								<Marker.Root role="status">
									<Marker.Icon><Sparkles /></Marker.Icon>
									<Marker.Content class="text-muted-foreground"
										>Drafted 12, kept 8 after review</Marker.Content
									>
								</Marker.Root>
							</MessageScroller.Item>
							<MessageScroller.Item scrollAnchor>
								<Message.Root>
									<Message.Content>
										<Bubble.Root variant="muted">
											<Bubble.Content
												>8 are ready in the review tray. Two were dropped because the cited pages
												didn’t support the answer. Want more on contact lens fitting? That section
												only produced one.</Bubble.Content
											>
										</Bubble.Root>
									</Message.Content>
								</Message.Root>
							</MessageScroller.Item>
							<MessageScroller.Item>
								<Message.Root align="end">
									<Message.Content>
										<Bubble.Root variant="tinted" align="end">
											<Bubble.Content>Yes, 4 more on scleral lens fitting.</Bubble.Content>
										</Bubble.Root>
									</Message.Content>
								</Message.Root>
							</MessageScroller.Item>
							<MessageScroller.Item>
								<Marker.Root role="status">
									<Marker.Icon><Spinner /></Marker.Icon>
									<Marker.Content class="text-muted-foreground">Reading p. 124…</Marker.Content>
								</Marker.Root>
							</MessageScroller.Item>
						</MessageScroller.Content>
					</MessageScroller.Viewport>
					<MessageScroller.Button />
				</MessageScroller.Root>
			</MessageScroller.Provider>
			<div class="border-t border-border p-3">
				<InputGroup.Root>
					<InputGroup.Addon>
						<InputGroup.Button size="icon-xs" aria-label="Attach pages"
							><Paperclip /></InputGroup.Button
						>
					</InputGroup.Addon>
					<InputGroup.Input placeholder="Ask for questions…" aria-label="Message" />
					<InputGroup.Addon align="inline-end">
						<InputGroup.Button size="icon-xs" variant="solid" tone="primary" aria-label="Send"
							><ArrowUp /></InputGroup.Button
						>
					</InputGroup.Addon>
				</InputGroup.Root>
			</div>
		</div>
	</Concept>

	<Concept
		title="Generation settings"
		uses={['ToggleGroup', 'Slider', 'Switch']}
		where="The settings popover before a run: types, a difficulty mix with two handles, and citation strictness."
	>
		<div class="space-y-5">
			<div class="space-y-2">
				<Label>Question types</Label>
				<ToggleGroup.Root
					type="multiple"
					bind:value={types}
					variant="outline"
					size="sm"
					class="flex-wrap"
				>
					<ToggleGroup.Item value="mc">Multiple choice</ToggleGroup.Item>
					<ToggleGroup.Item value="fitb">Fill in</ToggleGroup.Item>
					<ToggleGroup.Item value="matching">Matching</ToggleGroup.Item>
					<ToggleGroup.Item value="free">Free response</ToggleGroup.Item>
				</ToggleGroup.Root>
			</div>
			<div class="space-y-3">
				<Label>Difficulty mix</Label>
				<Slider
					type="multiple"
					bind:value={mix}
					min={0}
					max={100}
					step={5}
					aria-label="Difficulty mix"
				/>
				<div class="flex justify-between text-xs tabular-nums text-muted-foreground">
					<span>Recall {share.recall}%</span><span>Application {share.application}%</span><span
						>Analysis {share.analysis}%</span
					>
				</div>
			</div>
			<label class="flex items-center justify-between gap-3 text-sm">
				<span
					>Every question must cite a page<span class="block text-xs text-muted-foreground"
						>Drafts without a citation are dropped</span
					></span
				>
				<Switch bind:checked={citeAll} />
			</label>
		</div>
	</Concept>

	<Concept
		title="Choose source pages"
		uses={['ScrollArea', 'Toggle']}
		where="Before a run: pick exactly which slides or pages the agent may use."
	>
		<ScrollArea orientation="horizontal" class="pb-3">
			<div class="flex gap-2">
				{#each pages as page (page)}
					<Toggle
						variant="outline"
						pressed={picked.includes(page)}
						onPressedChange={(on) =>
							(picked = on ? [...picked, page] : picked.filter((p) => p !== page))}
						class="h-24 w-18 shrink-0 flex-col justify-end rounded-2xl p-2 aria-pressed:border-primary aria-pressed:bg-primary/8"
						aria-label="Page {page}"
					>
						<span class="graph-stage mb-1 w-full flex-1 rounded-lg bg-muted"></span>
						<span class="font-mono text-[11px]">{page}</span>
					</Toggle>
				{/each}
			</div>
		</ScrollArea>
		<p class="mt-1 text-sm text-muted-foreground">{picked.length} pages selected</p>
	</Concept>

	<Concept
		title="Review tray"
		uses={['Carousel', 'Badge', 'Kbd']}
		where="After a run: one draft at a time, keep or drop with a key, the judge’s score in the corner."
	>
		<div class="px-10">
			<Carousel.Root>
				<Carousel.Content>
					{#each drafts as draft, i (draft.stem)}
						<Carousel.Item>
							<div
								class="flex h-full flex-col gap-3 surface-sm p-4 {decisions[i] === 'dropped'
									? 'opacity-50'
									: ''}"
							>
								<div class="flex items-center justify-between">
									<Badge tone={draft.score >= 85 ? 'success' : 'warning'}>Score {draft.score}</Badge
									>
									{#if decisions[i]}<Badge
											variant="outline"
											tone={decisions[i] === 'kept' ? 'success' : 'error'}>{decisions[i]}</Badge
										>{/if}
								</div>
								<p class="font-medium leading-snug">{draft.stem}</p>
								<p class="text-sm text-success-ink">✓ {draft.answer}</p>
								<div class="mt-auto flex gap-2">
									<Button
										size="sm"
										variant="soft"
										tone="error"
										class="flex-1"
										onclick={() => (decisions[i] = 'dropped')}><X />Drop <Kbd>X</Kbd></Button
									>
									<Button size="sm" class="flex-1" onclick={() => (decisions[i] = 'kept')}
										><Check />Keep <Kbd>K</Kbd></Button
									>
								</div>
							</div>
						</Carousel.Item>
					{/each}
				</Carousel.Content>
				<Carousel.Previous />
				<Carousel.Next />
			</Carousel.Root>
		</div>
	</Concept>

	<Concept
		title="Judge scorecard"
		uses={['Chart', 'PieChart', 'Progress']}
		where="Expanding a draft: why the judge scored it, criterion by criterion."
	>
		<div class="flex flex-col items-center gap-5 sm:flex-row">
			<Chart.Container config={qualityConfig} class="aspect-square w-36 shrink-0">
				<PieChart
					data={[
						{ key: 'score', value: quality, color: 'var(--success)' },
						{
							key: 'rest',
							value: 100 - quality,
							color: 'color-mix(in oklab, var(--foreground) 10%, transparent)'
						}
					]}
					key="key"
					value="value"
					c="color"
					innerRadius={-12}
					cornerRadius={8}
					range={[-120, 120]}
					props={{ pie: { sort: null } }}
				>
					{#snippet aboveMarks()}
						<Text
							value={String(quality)}
							textAnchor="middle"
							verticalAnchor="middle"
							class="fill-foreground text-3xl! font-bold"
							dy={4}
						/>
					{/snippet}
				</PieChart>
			</Chart.Container>
			<div class="w-full space-y-3">
				{#each criteria as [label, value] (label)}
					<div class="space-y-1">
						<div class="flex justify-between text-sm">
							<span>{label}</span><span class="tabular-nums text-muted-foreground">{value}</span>
						</div>
						<Progress {value} tone={value >= 85 ? 'success' : 'warning'} class="h-1.5" />
					</div>
				{/each}
			</div>
		</div>
	</Concept>

	<Concept
		title="Raw draft"
		uses={['CodeBlock']}
		where="A “View JSON” toggle for curators debugging a run or reporting a bad draft."
	>
		<CodeBlock.Root size="sm">
			<CodeBlock.Header>
				<CodeBlock.Title><ClipboardList size={14} />draft-03.json</CodeBlock.Title>
				<CodeBlock.Actions><CodeBlock.CopyButton value={output} /></CodeBlock.Actions>
			</CodeBlock.Header>
			<CodeBlock.Content code={output} lineNumbers wrap />
		</CodeBlock.Root>
	</Concept>
</Grid>

<script lang="ts">
	import { onDestroy } from 'svelte';
	import Check from '@lucide/svelte/icons/check';
	import Gavel from '@lucide/svelte/icons/gavel';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import PenLine from '@lucide/svelte/icons/pen-line';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import * as Marker from '#lib/components/ui/marker/index.js';
	import { Slider } from '#lib/components/ui/slider/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import * as Tabs from '#lib/components/ui/tabs/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import * as Trace from '#lib/components/ui/trace/index.js';
	import PracticeQuestions from './PracticeQuestions.svelte';

	let { tab = $bindable(), selectedCount }: { tab: string; selectedCount: number } = $props();

	const NOTES_KEY = 'lt:study-space:quick-notes';
	let notes = $state(
		'Frank–Starling: more stretch → stronger beat.\n\nPreload ↑ → stroke volume ↑ (up to a point).\n\nReview PV loops before the exam.'
	);
	let notesLoaded = false;
	$effect(() => {
		if (notesLoaded) {
			localStorage.setItem(NOTES_KEY, notes);
			return;
		}
		notes = localStorage.getItem(NOTES_KEY) ?? notes;
		notesLoaded = true;
	});

	let types = $state(['mc', 'fitb']);
	let count = $state(10);
	// Index of the step running; -1 before a run, steps.length once done.
	let step = $state(-1);
	let timer: ReturnType<typeof setInterval> | undefined;
	const steps = $derived([
		{
			icon: ListChecks,
			done: `Planned ${count} questions across 3 topics`,
			running: 'Planning topics'
		},
		{ icon: PenLine, done: `Drafted ${count + 2} candidates`, running: 'Drafting candidates' },
		{
			icon: ShieldCheck,
			done: 'Checked every answer against its page',
			running: 'Checking citations'
		},
		{ icon: Gavel, done: `Kept the best ${count}`, running: 'Judging quality' }
	]);

	function generate() {
		clearInterval(timer);
		step = 0;
		timer = setInterval(() => {
			step += 1;
			if (step >= steps.length) clearInterval(timer);
		}, 900);
	}
	onDestroy(() => clearInterval(timer));
</script>

<Tabs.Root bind:value={tab} class="flex h-full min-h-0 flex-col gap-0">
	<div class="px-4 pt-4">
		<Tabs.List class="w-full">
			<Tabs.Trigger value="practice" class="flex-1">Practice</Tabs.Trigger>
			<Tabs.Trigger value="generate" class="flex-1">Generate</Tabs.Trigger>
			<Tabs.Trigger value="notes" class="flex-1">Notes</Tabs.Trigger>
		</Tabs.List>
	</div>

	<Tabs.Content value="practice" class="min-h-0 flex-1">
		<PracticeQuestions />
	</Tabs.Content>

	<Tabs.Content value="generate" class="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
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
			</ToggleGroup.Root>
		</div>
		<div class="space-y-3">
			<Label>How many · {count}</Label>
			<Slider
				type="single"
				bind:value={count}
				min={5}
				max={25}
				step={5}
				aria-label="Question count"
			/>
		</div>
		<Button
			class="w-full"
			disabled={!types.length || (step >= 0 && step < steps.length)}
			onclick={generate}><Sparkles />Make {count} questions from {selectedCount} sources</Button
		>
		{#if step >= 0}
			<Trace.Root>
				{#each steps as s, i (i)}
					{@const Icon = s.icon}
					<Trace.Line status={i === step ? 'running' : i > step ? 'pending' : undefined}>
						<Trace.Icon><Icon /></Trace.Icon>
						<Trace.Title>{i < step ? s.done : s.running}</Trace.Title>
						{#if i === step}<Trace.Icon><Spinner class="size-3.5" /></Trace.Icon>{/if}
					</Trace.Line>
				{/each}
			</Trace.Root>
			{#if step >= steps.length}
				<Marker.Root role="status" class="text-success-ink">
					<Marker.Icon><Check /></Marker.Icon>
					<Marker.Content>Added to Practice</Marker.Content>
				</Marker.Root>
				<Button size="sm" variant="soft" tone="primary" onclick={() => (tab = 'practice')}
					>Start practicing</Button
				>
			{/if}
		{/if}
	</Tabs.Content>

	<Tabs.Content value="notes" class="flex min-h-0 flex-1 flex-col gap-2 p-4">
		<Textarea
			bind:value={notes}
			aria-label="Notes"
			placeholder="Notes for this topic"
			class="min-h-0 flex-1 resize-none leading-relaxed"
		/>
		<Marker.Root class="text-xs text-muted-foreground">
			<Marker.Content>Saved on this device</Marker.Content>
		</Marker.Root>
	</Tabs.Content>
</Tabs.Root>

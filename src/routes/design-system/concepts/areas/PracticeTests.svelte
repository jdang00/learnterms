<script lang="ts" module>
	export const meta = {
		title: 'Practice tests',
		summary:
			'Setting up a timed test, planning toward the exam, and reading the results afterward.',
		order: 2
	};
</script>

<script lang="ts">
	import { getLocalTimeZone, today, type DateValue } from '@internationalized/date';
	import { scaleBand, scaleUtc } from 'd3-scale';
	import { curveMonotoneX } from 'd3-shape';
	import { Area, AreaChart, BarChart, LinearGradient } from 'layerchart';
	import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import Check from '@lucide/svelte/icons/check';
	import Flag from '@lucide/svelte/icons/flag';
	import ListFilter from '@lucide/svelte/icons/list-filter';
	import X from '@lucide/svelte/icons/x';
	import type { DateRange } from 'bits-ui';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Calendar } from '#lib/components/ui/calendar/index.js';
	import * as Chart from '#lib/components/ui/chart/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import * as Pagination from '#lib/components/ui/pagination/index.js';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import * as Questionnaire from '#lib/components/ui/questionnaire/index.js';
	import { RangeCalendar } from '#lib/components/ui/range-calendar/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import { Tip } from '#lib/components/ui/tooltip/index.js';
	import Concept from '../Concept.svelte';
	import Grid from '../Grid.svelte';

	const now = today(getLocalTimeZone());
	let examDate = $state<DateValue | undefined>(now.add({ days: 12 }));
	let examOpen = $state(false);
	let plan = $state<DateRange>({ start: now, end: now.add({ days: 11 }) });
	const daysLeft = $derived(examDate ? examDate.compare(now) : 0);
	const planDays = $derived(plan.start && plan.end ? plan.end.compare(plan.start) + 1 : 0);

	let submitted = $state<string | null>(null);
	function submitTest(event: SubmitEvent) {
		event.preventDefault();
		const data = new FormData(event.currentTarget as HTMLFormElement);
		submitted = `${data.getAll('modules').length} modules · ${data.get('length')} questions · ${data.get('timing')}`;
	}

	const scores = [
		['2026-09-02', 58],
		['2026-09-09', 63],
		['2026-09-16', 61],
		['2026-09-23', 70],
		['2026-09-30', 74],
		['2026-10-07', 72],
		['2026-10-14', 81]
	].map(([date, score]) => ({
		date: new Date(date as string),
		score: score as number,
		target: 75
	}));
	const scoreConfig = {
		score: { label: 'Score', color: 'var(--primary)' }
	} satisfies Chart.ChartConfig;

	const modules = [
		{ module: 'Keratoconus', accuracy: 88 },
		{ module: 'Uveitis', accuracy: 74 },
		{ module: 'Glaucoma', accuracy: 69 },
		{ module: 'Lids', accuracy: 92 },
		{ module: 'Retina', accuracy: 57 }
	];
	const moduleConfig = {
		accuracy: { label: 'Accuracy', color: 'var(--success)' }
	} satisfies Chart.ChartConfig;

	type Row = {
		n: number;
		stem: string;
		module: string;
		result: 'correct' | 'incorrect' | 'skipped';
		seconds: number;
	};
	const rows: Row[] = [
		{
			n: 1,
			stem: 'Fleischer ring is composed of…',
			module: 'Keratoconus',
			result: 'correct',
			seconds: 41
		},
		{
			n: 2,
			stem: 'Hypopyon with fibrin suggests…',
			module: 'Uveitis',
			result: 'incorrect',
			seconds: 96
		},
		{
			n: 3,
			stem: 'Best initial test for angle closure',
			module: 'Glaucoma',
			result: 'correct',
			seconds: 58
		},
		{ n: 4, stem: 'Cotton-wool spots indicate…', module: 'Retina', result: 'skipped', seconds: 12 },
		{
			n: 5,
			stem: 'Treatment for chalazion over 4 weeks',
			module: 'Lids',
			result: 'correct',
			seconds: 33
		},
		{
			n: 6,
			stem: 'Flare and cells grading uses…',
			module: 'Uveitis',
			result: 'incorrect',
			seconds: 120
		}
	];
	let sortBySlowest = $state(false);
	let shownResults = $state({ correct: true, incorrect: true, skipped: true });
	const visibleRows = $derived(
		rows
			.filter((row) => shownResults[row.result])
			.toSorted((a, b) => (sortBySlowest ? b.seconds - a.seconds : a.n - b.n))
	);

	let reviewFilter = $state('all');
	const grid = Array.from({ length: 40 }, (_, i) => ({
		n: i + 1,
		answered: i % 7 !== 3,
		flagged: i % 11 === 4
	}));
	const shownGrid = $derived(
		grid.filter((q) =>
			reviewFilter === 'flagged' ? q.flagged : reviewFilter === 'unanswered' ? !q.answered : true
		)
	);
</script>

<Grid>
	<Concept
		title="Test builder"
		uses={['Questionnaire']}
		where="“New practice test”. One decision per step, number keys to answer, Enter to move on."
	>
		{#if submitted}
			<div class="space-y-3 text-center">
				<p class="font-semibold">Ready: {submitted}</p>
				<Button size="sm" variant="soft" tone="neutral" onclick={() => (submitted = null)}
					>Start over</Button
				>
			</div>
		{:else}
			<Questionnaire.Root shortcuts="numbers" onSubmit={submitTest}>
				<Questionnaire.Progress />
				<Questionnaire.Item name="modules" multiple required>
					<Questionnaire.Title>Which modules?</Questionnaire.Title>
					<Questionnaire.Description>Questions are drawn from each one.</Questionnaire.Description>
					<Questionnaire.Choices>
						{#each ['Keratoconus', 'Uveitis', 'Glaucoma', 'Retina'] as m (m)}
							<Questionnaire.Choice value={m}>{m}</Questionnaire.Choice>
						{/each}
					</Questionnaire.Choices>
					<Questionnaire.Error />
				</Questionnaire.Item>
				<Questionnaire.Item name="length" required>
					<Questionnaire.Title>How many questions?</Questionnaire.Title>
					<Questionnaire.Choices>
						<Questionnaire.Choice value="25"
							>25 <Questionnaire.ChoiceDescription>About 30 minutes</Questionnaire.ChoiceDescription
							></Questionnaire.Choice
						>
						<Questionnaire.Choice value="50"
							>50 <Questionnaire.ChoiceDescription>About an hour</Questionnaire.ChoiceDescription
							></Questionnaire.Choice
						>
						<Questionnaire.Choice value="100"
							>100 <Questionnaire.ChoiceDescription
								>Full exam length</Questionnaire.ChoiceDescription
							></Questionnaire.Choice
						>
					</Questionnaire.Choices>
				</Questionnaire.Item>
				<Questionnaire.Item name="timing" required>
					<Questionnaire.Title>Timing</Questionnaire.Title>
					<Questionnaire.Choices>
						<Questionnaire.Choice value="timed">Timed, like the exam</Questionnaire.Choice>
						<Questionnaire.Choice value="untimed">Untimed</Questionnaire.Choice>
					</Questionnaire.Choices>
				</Questionnaire.Item>
				<Questionnaire.Actions>
					<Questionnaire.Previous>Back</Questionnaire.Previous>
					<Questionnaire.Next>Next</Questionnaire.Next>
					<Questionnaire.Submit>Build test</Questionnaire.Submit>
				</Questionnaire.Actions>
			</Questionnaire.Root>
		{/if}
	</Concept>

	<Concept
		title="Exam date"
		uses={['Popover', 'Calendar']}
		where="Tests page header. Setting the exam date turns the page into a countdown and paces suggestions."
	>
		<div class="flex flex-wrap items-center gap-4">
			<Popover.Root bind:open={examOpen}>
				<Popover.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="outline" tone="neutral">
							<CalendarDays />{examDate
								? examDate
										.toDate(getLocalTimeZone())
										.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
								: 'Set exam date'}
						</Button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="w-auto p-0" align="start">
					<Calendar
						type="single"
						bind:value={examDate}
						minValue={now}
						onValueChange={() => (examOpen = false)}
					/>
				</Popover.Content>
			</Popover.Root>
			{#if examDate}
				<p class="text-sm">
					<span class="font-display text-3xl font-bold tabular-nums">{daysLeft}</span>
					<span class="text-muted-foreground">days to the boards</span>
				</p>
			{/if}
		</div>
	</Concept>

	<Concept
		title="Study plan window"
		uses={['RangeCalendar']}
		where="Plan a stretch of study days; the plan spreads unmastered questions across them."
	>
		<div class="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
			<RangeCalendar bind:value={plan} class="surface-sm" />
			<div class="space-y-2 text-sm">
				<p class="font-semibold">{planDays} days</p>
				<p class="text-muted-foreground">
					212 questions left · about {Math.ceil(212 / Math.max(planDays, 1))} a day
				</p>
			</div>
		</div>
	</Concept>

	<Concept
		title="Score trend"
		uses={['Chart', 'AreaChart']}
		where="Test results history. One line, one target, so progress reads at a glance."
	>
		<Chart.Container config={scoreConfig} class="aspect-[2/1] w-full">
			<AreaChart
				data={scores}
				x="date"
				xScale={scaleUtc()}
				yDomain={[0, 100]}
				series={[{ key: 'score', label: 'Score', color: scoreConfig.score.color }]}
				props={{
					xAxis: {
						format: (v: Date) => v.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
					},
					yAxis: { format: (v: number) => `${v}%` }
				}}
			>
				{#snippet tooltip()}
					<Chart.Tooltip
						indicator="line"
						labelFormatter={(v: Date) =>
							v.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
					/>
				{/snippet}
				{#snippet marks({ context })}
					{#each context.series.visibleSeries as s (s.key)}
						<LinearGradient
							stops={[s.color ?? '', 'color-mix(in oklab, ' + s.color + ' 5%, transparent)']}
							vertical
						>
							{#snippet children({ gradient })}
								<Area
									seriesKey={s.key}
									curve={curveMonotoneX}
									fillOpacity={0.35}
									line={{ class: 'stroke-2' }}
									motion="tween"
									{...s.props}
									fill={gradient}
								/>
							{/snippet}
						</LinearGradient>
					{/each}
				{/snippet}
			</AreaChart>
		</Chart.Container>
		<p class="mt-2 text-sm text-muted-foreground">
			Up 23 points in six weeks · above the 75% pass line twice
		</p>
	</Concept>

	<Concept
		title="Accuracy by module"
		uses={['Chart', 'BarChart']}
		where="Test results. The weakest module is the first thing to study next."
	>
		<Chart.Container config={moduleConfig} class="aspect-[2/1] w-full">
			<BarChart
				data={modules.toSorted((a, b) => a.accuracy - b.accuracy)}
				orientation="horizontal"
				y="module"
				yScale={scaleBand().padding(0.3)}
				xDomain={[0, 100]}
				series={[{ key: 'accuracy', label: 'Accuracy', color: moduleConfig.accuracy.color }]}
				grid={false}
				rule={false}
				axis="y"
				padding={{ left: 84 }}
				props={{
					bars: { radius: 6, rounded: 'all', stroke: 'none' },
					highlight: { area: { fill: 'none' } }
				}}
			>
				{#snippet tooltip()}
					<Chart.Tooltip hideLabel />
				{/snippet}
			</BarChart>
		</Chart.Container>
	</Concept>

	<Concept
		title="Review table"
		uses={['Table', 'DropdownMenu', 'Pagination']}
		where="After a test: every question with result and time, sortable and filterable."
		wide
	>
		<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
			<p class="text-sm text-muted-foreground">{visibleRows.length} of {rows.length} questions</p>
			<div class="flex gap-2">
				<Button
					size="sm"
					variant="ghost"
					tone="neutral"
					onclick={() => (sortBySlowest = !sortBySlowest)}
				>
					<ArrowUpDown />{sortBySlowest ? 'Slowest first' : 'In order'}
				</Button>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button {...props} size="sm" variant="outline" tone="neutral"
								><ListFilter />Results</Button
							>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end">
						<DropdownMenu.CheckboxItem bind:checked={shownResults.correct}
							>Correct</DropdownMenu.CheckboxItem
						>
						<DropdownMenu.CheckboxItem bind:checked={shownResults.incorrect}
							>Incorrect</DropdownMenu.CheckboxItem
						>
						<DropdownMenu.CheckboxItem bind:checked={shownResults.skipped}
							>Skipped</DropdownMenu.CheckboxItem
						>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		</div>
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-10">#</Table.Head>
					<Table.Head>Question</Table.Head>
					<Table.Head>Module</Table.Head>
					<Table.Head>Result</Table.Head>
					<Table.Head class="text-right">Time</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each visibleRows as row (row.n)}
					<Table.Row>
						<Table.Cell class="font-mono text-xs text-muted-foreground">{row.n}</Table.Cell>
						<Table.Cell class="max-w-72 truncate">{row.stem}</Table.Cell>
						<Table.Cell class="text-muted-foreground">{row.module}</Table.Cell>
						<Table.Cell>
							<Badge
								tone={row.result === 'correct'
									? 'success'
									: row.result === 'incorrect'
										? 'error'
										: 'warning'}
							>
								{#if row.result === 'correct'}<Check />{:else if row.result === 'incorrect'}<X
									/>{/if}{row.result}
							</Badge>
						</Table.Cell>
						<Table.Cell class="text-right tabular-nums {row.seconds > 90 ? 'text-warning-ink' : ''}"
							>{row.seconds}s</Table.Cell
						>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
		<Pagination.Root count={50} perPage={6} class="mt-4">
			{#snippet children({ pages, currentPage })}
				<Pagination.Content>
					<Pagination.Item><Pagination.Previous /></Pagination.Item>
					{#each pages as page (page.key)}
						{#if page.type === 'ellipsis'}
							<Pagination.Item><Pagination.Ellipsis /></Pagination.Item>
						{:else}
							<Pagination.Item
								><Pagination.Link {page} isActive={currentPage === page.value}
									>{page.value}</Pagination.Link
								></Pagination.Item
							>
						{/if}
					{/each}
					<Pagination.Item><Pagination.Next /></Pagination.Item>
				</Pagination.Content>
			{/snippet}
		</Pagination.Root>
	</Concept>

	<Concept
		title="Review before submit"
		uses={['ToggleGroup', 'Tooltip']}
		where="The end-of-test screen, Examplify style: see what’s unanswered or flagged before you submit."
		wide
	>
		<ToggleGroup.Root
			type="single"
			bind:value={reviewFilter}
			variant="outline"
			size="sm"
			class="mb-4"
		>
			<ToggleGroup.Item value="all">All 40</ToggleGroup.Item>
			<ToggleGroup.Item value="unanswered"
				>Unanswered {grid.filter((q) => !q.answered).length}</ToggleGroup.Item
			>
			<ToggleGroup.Item value="flagged"
				><Flag />Flagged {grid.filter((q) => q.flagged).length}</ToggleGroup.Item
			>
		</ToggleGroup.Root>
		<div class="grid grid-cols-8 gap-2 sm:grid-cols-10">
			{#each shownGrid as q (q.n)}
				<Tip label={q.answered ? (q.flagged ? 'Answered, flagged' : 'Answered') : 'Not answered'}>
					{#snippet child({ props })}
						<button
							{...props}
							type="button"
							class="relative grid aspect-square place-items-center rounded-xl border text-sm tabular-nums transition-colors hover:border-primary/50 {q.answered
								? 'border-border bg-background'
								: 'border-dashed border-warning bg-warning/10 text-warning-ink'}"
						>
							{q.n}
							{#if q.flagged}<Flag size={10} class="absolute top-1 right-1 text-warning-ink" />{/if}
						</button>
					{/snippet}
				</Tip>
			{/each}
		</div>
	</Concept>
</Grid>

<script lang="ts" module>
	export const meta = {
		title: 'Progress and analytics',
		summary:
			'What curators and faculty see about a cohort: activity, weak spots, and who needs help.',
		order: 7
	};
</script>

<script lang="ts">
	import { scaleBand, scaleUtc } from 'd3-scale';
	import { curveMonotoneX } from 'd3-shape';
	import { AreaChart, BarChart, LineChart, PieChart, Text } from 'layerchart';
	import Mail from '@lucide/svelte/icons/mail';
	import MoreHorizontal from '@lucide/svelte/icons/more-horizontal';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import * as Avatar from '#lib/components/ui/avatar/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Chart from '#lib/components/ui/chart/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import { Progress } from '#lib/components/ui/progress/index.js';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { Tip } from '#lib/components/ui/tooltip/index.js';
	import Concept from '../Concept.svelte';
	import Grid from '../Grid.svelte';

	const activity = Array.from({ length: 28 }, (_, i) => {
		const date = new Date(2026, 8, 22 + i);
		const weekend = date.getDay() === 0 || date.getDay() === 6;
		const base = weekend ? 60 : 140 + ((i * 37) % 60) + (i > 20 ? 80 : 0);
		return { date, correct: Math.round(base * 0.72), incorrect: Math.round(base * 0.28) };
	});
	const activityConfig = {
		correct: { label: 'Correct', color: 'var(--success)' },
		incorrect: { label: 'Incorrect', color: 'color-mix(in oklab, var(--error) 75%, transparent)' }
	} satisfies Chart.ChartConfig;

	const hardest = [
		{ q: 'Q31', topic: 'Pellucid vs keratoconus map', pct: 28 },
		{ q: 'Q12', topic: 'Fleischer ring composition', pct: 37 },
		{ q: 'Q8', topic: 'CXL thickness threshold', pct: 41 },
		{ q: 'Q19', topic: 'Munson vs Rizzuti sign', pct: 46 },
		{ q: 'Q4', topic: 'Scleral lens vault', pct: 52 }
	];
	const hardestConfig = {
		pct: { label: '% correct', color: 'var(--error)' }
	} satisfies Chart.ChartConfig;

	const mastery = [
		{ state: 'mastered', count: 412, color: 'var(--mastered)' },
		{ state: 'correct', count: 586, color: 'color-mix(in oklab, var(--success) 60%, transparent)' },
		{ state: 'review', count: 231, color: 'color-mix(in oklab, var(--error) 60%, transparent)' },
		{
			state: 'unseen',
			count: 371,
			color: 'color-mix(in oklab, var(--foreground) 12%, transparent)'
		}
	];
	const masteryConfig = {
		count: { label: 'Questions' },
		mastered: { label: 'Mastered', color: 'var(--mastered)' },
		correct: { label: 'Correct', color: 'var(--success)' },
		review: { label: 'To review', color: 'var(--error)' },
		unseen: { label: 'Unseen', color: 'var(--muted-foreground)' }
	} satisfies Chart.ChartConfig;
	const masteryTotal = mastery.reduce((sum, m) => sum + m.count, 0);

	const weekly = [62, 64, 63, 68, 71, 70, 74, 77].map((accuracy, i) => ({
		week: new Date(2026, 7, 31 + i * 7),
		accuracy,
		target: 75
	}));
	const weeklyConfig = {
		accuracy: { label: 'Class accuracy', color: 'var(--primary)' },
		target: { label: 'Pass line', color: 'var(--muted-foreground)' }
	} satisfies Chart.ChartConfig;

	type Student = { name: string; answered: number; accuracy: number; trend: number; last: string };
	const students: Student[] = [
		{ name: 'Avery Chen', answered: 412, accuracy: 91, trend: 4, last: 'Today' },
		{ name: 'Jordan Patel', answered: 280, accuracy: 84, trend: 2, last: 'Today' },
		{ name: 'Maya Kim', answered: 198, accuracy: 76, trend: -3, last: '2 days ago' },
		{ name: 'Sam Rivera', answered: 61, accuracy: 58, trend: -9, last: '9 days ago' }
	];
	let openStudent = $state<Student | null>(null);
	const initials = (name: string) =>
		name
			.split(' ')
			.map((p) => p[0])
			.join('');

	const heatModules = ['Lids', 'Cornea', 'Uveitis', 'Glaucoma', 'Retina'];
	const heat = students.map((s, si) =>
		heatModules.map((_, mi) =>
			Math.min(100, Math.max(15, s.accuracy - 18 + ((si * 13 + mi * 29) % 36)))
		)
	);
	// The weakest module by class average, and how many students are below 75% in it.
	const weakest = $derived.by(() => {
		const averages = heatModules.map(
			(_, mi) => heat.reduce((sum, row) => sum + row[mi], 0) / heat.length
		);
		const index = averages.indexOf(Math.min(...averages));
		return { module: heatModules[index], below: heat.filter((row) => row[index] < 75).length };
	});
	const heatCell = (v: number) =>
		v >= 90
			? 'bg-mastered text-mastered-foreground'
			: v >= 75
				? 'bg-success/50'
				: v >= 60
					? 'bg-warning/40'
					: 'bg-error/45';
</script>

<Grid>
	<Concept
		title="Cohort activity"
		uses={['Chart', 'AreaChart']}
		where="Admin progress, top of the page: questions answered per day, split by outcome."
		wide
	>
		<Chart.Container config={activityConfig} class="aspect-[3/1] w-full">
			<AreaChart
				data={activity}
				x="date"
				xScale={scaleUtc()}
				seriesLayout="stack"
				series={[
					{ key: 'correct', label: 'Correct', color: activityConfig.correct.color },
					{ key: 'incorrect', label: 'Incorrect', color: activityConfig.incorrect.color }
				]}
				props={{
					area: {
						curve: curveMonotoneX,
						fillOpacity: 0.5,
						line: { class: 'stroke-1' },
						motion: 'tween'
					},
					xAxis: {
						format: (v: Date) => v.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
					}
				}}
				legend
			>
				{#snippet tooltip()}
					<Chart.Tooltip
						indicator="dot"
						labelFormatter={(v: Date) =>
							v.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
					/>
				{/snippet}
			</AreaChart>
		</Chart.Container>
		<p class="mt-2 flex items-center gap-1.5 text-sm">
			<TrendingUp size={16} class="text-success-ink" />Up 41% the week before the midterm
		</p>
	</Concept>

	<Concept
		title="Hardest questions"
		uses={['Chart', 'BarChart']}
		where="Module analytics: the questions most students miss, which may be miskeyed or miswritten."
	>
		<Chart.Container config={hardestConfig} class="aspect-[3/2] w-full">
			<BarChart
				data={hardest}
				orientation="horizontal"
				y="q"
				yScale={scaleBand().padding(0.35)}
				xDomain={[0, 100]}
				series={[{ key: 'pct', label: '% correct', color: hardestConfig.pct.color }]}
				grid={false}
				rule={false}
				axis="y"
				padding={{ left: 36 }}
				props={{
					bars: { radius: 6, rounded: 'all', stroke: 'none', fillOpacity: 0.8 },
					highlight: { area: { fill: 'none' } }
				}}
			>
				{#snippet tooltip()}
					<Chart.Tooltip hideLabel={false} />
				{/snippet}
			</BarChart>
		</Chart.Container>
		<ul class="mt-2 space-y-1 text-xs text-muted-foreground">
			{#each hardest as h (h.q)}<li class="flex justify-between gap-3">
					<span><span class="font-mono">{h.q}</span> · {h.topic}</span><span class="tabular-nums"
						>{h.pct}% correct</span
					>
				</li>{/each}
		</ul>
	</Concept>

	<Concept
		title="Mastery across the class"
		uses={['Chart', 'PieChart']}
		where="Class overview: where every question stands for the cohort as a whole."
	>
		<Chart.Container config={masteryConfig} class="mx-auto aspect-square max-h-60">
			<PieChart
				data={mastery}
				key="state"
				value="count"
				c="color"
				innerRadius={64}
				padding={24}
				cornerRadius={4}
				padAngle={0.02}
				props={{ pie: { motion: 'tween' } }}
			>
				{#snippet aboveMarks()}
					<Text
						value={`${Math.round((mastery[0].count / masteryTotal) * 100)}%`}
						textAnchor="middle"
						verticalAnchor="middle"
						class="fill-foreground text-3xl! font-bold"
						dy={-4}
					/>
					<Text
						value="mastered"
						textAnchor="middle"
						verticalAnchor="middle"
						class="fill-muted-foreground! text-sm"
						dy={20}
					/>
				{/snippet}
				{#snippet tooltip()}
					<Chart.Tooltip hideLabel />
				{/snippet}
			</PieChart>
		</Chart.Container>
		<div class="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
			{#each mastery as m (m.state)}
				<span class="flex items-center gap-1.5"
					><span class="size-2.5 rounded-sm" style="background: {m.color}"></span>{masteryConfig[
						m.state as keyof typeof masteryConfig
					].label}
					{m.count}</span
				>
			{/each}
		</div>
	</Concept>

	<Concept
		title="Accuracy against the pass line"
		uses={['Chart', 'LineChart']}
		where="Weekly report for faculty: is the class trending toward the exam threshold?"
	>
		<Chart.Container config={weeklyConfig} class="aspect-[2/1] w-full">
			<LineChart
				data={weekly}
				x="week"
				xScale={scaleUtc()}
				yDomain={[50, 90]}
				series={[
					{ key: 'accuracy', label: 'Class accuracy', color: weeklyConfig.accuracy.color },
					{ key: 'target', label: 'Pass line', color: weeklyConfig.target.color }
				]}
				props={{
					spline: { curve: curveMonotoneX, strokeWidth: 2, motion: 'tween' },
					xAxis: {
						format: (v: Date) => v.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
					},
					yAxis: { format: (v: number) => `${v}%` },
					highlight: { points: { r: 4 } }
				}}
			>
				{#snippet tooltip()}
					<Chart.Tooltip />
				{/snippet}
			</LineChart>
		</Chart.Container>
	</Concept>

	<Concept
		title="Student roster"
		uses={['Table', 'Avatar', 'Progress', 'DropdownMenu', 'Sheet']}
		where="Admin progress: sort by who’s slipping; open a student for detail without leaving the list."
		wide
	>
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Student</Table.Head>
					<Table.Head>Answered</Table.Head>
					<Table.Head class="w-48">Accuracy</Table.Head>
					<Table.Head>Trend</Table.Head>
					<Table.Head>Last active</Table.Head>
					<Table.Head class="w-10"></Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each students as s (s.name)}
					<Table.Row class="cursor-pointer" onclick={() => (openStudent = s)}>
						<Table.Cell>
							<div class="flex items-center gap-2.5">
								<Avatar.Root class="size-7"
									><Avatar.Fallback class="text-[10px] font-semibold"
										>{initials(s.name)}</Avatar.Fallback
									></Avatar.Root
								>
								<span class="font-medium">{s.name}</span>
							</div>
						</Table.Cell>
						<Table.Cell class="tabular-nums">{s.answered}</Table.Cell>
						<Table.Cell>
							<div class="flex items-center gap-2">
								<Progress
									value={s.accuracy}
									tone={s.accuracy >= 80 ? 'success' : s.accuracy >= 65 ? 'warning' : 'error'}
									class="h-1.5"
								/>
								<span class="w-9 text-right text-xs tabular-nums">{s.accuracy}%</span>
							</div>
						</Table.Cell>
						<Table.Cell>
							<span
								class="flex items-center gap-1 text-xs tabular-nums {s.trend >= 0
									? 'text-success-ink'
									: 'text-error-ink'}"
							>
								{#if s.trend >= 0}<TrendingUp size={14} />{:else}<TrendingDown
										size={14}
									/>{/if}{s.trend > 0 ? '+' : ''}{s.trend}
							</span>
						</Table.Cell>
						<Table.Cell
							class="text-muted-foreground {s.last.startsWith('9') ? 'text-warning-ink' : ''}"
							>{s.last}</Table.Cell
						>
						<Table.Cell onclick={(e: MouseEvent) => e.stopPropagation()}>
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<Button
											{...props}
											size="xs"
											shape="circle"
											variant="ghost"
											tone="neutral"
											aria-label="Actions for {s.name}"><MoreHorizontal /></Button
										>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end">
									<DropdownMenu.Item onSelect={() => (openStudent = s)}
										>View progress</DropdownMenu.Item
									>
									<DropdownMenu.Item><Mail />Send a nudge</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
		<Sheet.Root open={openStudent !== null} onOpenChange={(open) => !open && (openStudent = null)}>
			<Sheet.Content side="right" class="w-full sm:max-w-md">
				{#if openStudent}
					<Sheet.Header>
						<Sheet.Title>{openStudent.name}</Sheet.Title>
						<Sheet.Description
							>{openStudent.answered} answered · last active {openStudent.last.toLowerCase()}</Sheet.Description
						>
					</Sheet.Header>
					<div class="space-y-3 px-4">
						{#each heatModules as m, i (m)}
							{@const v = heat[students.indexOf(openStudent)][i]}
							<div class="space-y-1">
								<div class="flex justify-between text-sm">
									<span>{m}</span><span class="tabular-nums text-muted-foreground">{v}%</span>
								</div>
								<Progress
									value={v}
									tone={v >= 75 ? 'success' : v >= 60 ? 'warning' : 'error'}
									class="h-1.5"
								/>
							</div>
						{/each}
					</div>
				{/if}
			</Sheet.Content>
		</Sheet.Root>
	</Concept>

	<Concept
		title="Student × module heatmap"
		uses={['Table', 'Tooltip', 'Badge']}
		where="Faculty view: one glance shows whether a weak spot is one student or the whole class."
		wide
	>
		<div class="overflow-x-auto">
			<table class="w-full table-fixed border-separate border-spacing-1 text-xs">
				<thead>
					<tr>
						<th class="w-32 text-left font-medium text-muted-foreground"></th>
						{#each heatModules as m (m)}<th class="px-1 pb-1 font-medium text-muted-foreground"
								>{m}</th
							>{/each}
					</tr>
				</thead>
				<tbody>
					{#each students as s, si (s.name)}
						<tr>
							<td class="pe-3 text-sm whitespace-nowrap">{s.name}</td>
							{#each heat[si] as v, mi (mi)}
								<td>
									<Tip label="{s.name} · {heatModules[mi]}: {v}%">
										{#snippet child({ props })}
											<div
												{...props}
												class="grid h-9 place-items-center rounded-lg tabular-nums {heatCell(v)}"
											>
												{v}
											</div>
										{/snippet}
									</Tip>
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
			<Badge tone="error">{weakest.module}</Badge> is the weakest module: {weakest.below} of {students.length}
			students are under 75%.
		</p>
	</Concept>
</Grid>

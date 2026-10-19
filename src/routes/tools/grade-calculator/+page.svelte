<script lang="ts">
	import { SelectField } from '$lib/components/ui/select';
	import { browser } from '$app/environment';
	import { onMount, tick } from 'svelte';
	import { useQuery } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api';
	import { RotateCcw, Trash2, Eraser, ChevronsUp, X, Target, CircleAlert } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Progress } from '$lib/components/ui/progress';
	import * as Table from '$lib/components/ui/table';
	import * as InputGroup from '$lib/components/ui/input-group';
	import {
		calculateCourseSummary,
		expandCourseEntries,
		getLetterGrade,
		type CalculatorCourse,
		type ItemInputMap,
		type TrackableItem
	} from '$lib/grade-calculator/runtime';

	type WorkspaceData = {
		stats: {
			rulesetCount: number;
			courseCount: number;
			entryCount: number;
			trackedItemCount: number;
		};
		rulesets: Array<{
			_id: string;
			name: string;
			slug: string;
			status: 'draft' | 'active' | 'archived';
			calculationMode: 'points' | 'weighted' | 'percentage' | 'hybrid';
			roundingStrategy: 'none' | 'nearest_hundredth' | 'nearest_tenth' | 'nearest_whole';
			gradeBandCount: number;
			passingPercentage: number | null;
		}>;
		courses: CalculatorCourse[];
	};

	const workspaceQuery = useQuery(api.gradeCalculator.getScaffoldOverview, {});

	const fallbackWorkspace: WorkspaceData = {
		stats: { rulesetCount: 0, courseCount: 0, entryCount: 0, trackedItemCount: 0 },
		rulesets: [],
		courses: []
	};

	const workspace = $derived((workspaceQuery.data ?? fallbackWorkspace) as WorkspaceData);

	const storageKey = 'lt_grade_calculator_db_v2';
	let selectedCourseId = $state('');
	let inputsByCourse = $state<Record<string, ItemInputMap>>({});
	let hydrated = $state(false);
	let entriesRoot: HTMLDivElement | null = $state(null);

	const selectedCourse = $derived.by(
		() =>
			workspace.courses.find((course) => course._id === selectedCourseId) ??
			workspace.courses[0] ??
			null
	);
	const selectedCourseInputs = $derived(
		selectedCourse ? (inputsByCourse[selectedCourse._id] ?? {}) : {}
	);
	const expandedEntries = $derived(expandCourseEntries(selectedCourse));
	const flatItems = $derived(
		expandedEntries.flatMap((group) => group.items.map((item) => ({ entry: group.entry, item })))
	);
	const summary = $derived(calculateCourseSummary(selectedCourse, selectedCourseInputs));
	const currentLetter = $derived(
		selectedCourse?.ruleset
			? getLetterGrade(summary.currentPercentage, selectedCourse.ruleset)
			: null
	);
	const percentDone = $derived(
		summary.totalItemCount > 0
			? Math.round((summary.enteredItemCount / summary.totalItemCount) * 100)
			: 0
	);

	function letterColor(letter: string | null) {
		if (!letter) return 'text-foreground/60';
		const first = letter[0]?.toUpperCase();
		switch (first) {
			case 'A':
				return 'text-green-700';
			case 'B':
				return 'text-green-500';
			case 'C':
				return 'text-amber-500';
			case 'D':
				return 'text-orange-500';
			default:
				return 'text-red-500';
		}
	}

	function progressTone(value: number | null) {
		if (value === null) return 'primary';
		if (value >= 90) return 'success';
		if (value >= 80) return 'success';
		if (value >= 70) return 'warning';
		return 'error';
	}

	const currentColor = $derived(letterColor(currentLetter));

	type BandRequirement = {
		label: string;
		minPercentage: number;
		neededPercent: number;
		status: 'achieved' | 'possible' | 'impossible';
	};

	const bandRequirements = $derived.by((): BandRequirement[] => {
		const course = selectedCourse;
		if (!course?.ruleset) return [];
		if (summary.enteredItemCount === 0) return [];

		const bands = [...course.ruleset.gradeBands]
			.filter((b) => b.label[0]?.toUpperCase() !== 'F')
			.sort((a, b) => b.minPercentage - a.minPercentage);

		let totalBase: number;
		let earnedBase: number;
		let remainingBase: number;

		if (course.ruleset.calculationMode === 'weighted') {
			const totalWeight = summary.totalWeight ?? 0;
			const enteredWeight = summary.enteredWeight ?? 0;
			const projected = summary.projectedPercentage ?? 0;
			if (totalWeight <= 0) return [];
			totalBase = totalWeight;
			earnedBase = (projected / 100) * totalWeight;
			remainingBase = totalWeight - enteredWeight;
		} else {
			const total = summary.totalKnownPossible ?? 0;
			const entered = summary.enteredPossible ?? 0;
			const earned = (summary.earnedPoints ?? 0) + (summary.bonusPoints ?? 0);
			if (total <= 0) return [];
			totalBase = total;
			earnedBase = earned;
			remainingBase = total - entered;
		}

		if (remainingBase <= 0) return [];

		return bands.map((band) => {
			const target = (band.minPercentage / 100) * totalBase;
			const needed = target - earnedBase;
			const neededPercent = (needed / remainingBase) * 100;
			let status: BandRequirement['status'];
			if (neededPercent <= 0) status = 'achieved';
			else if (neededPercent > 100) status = 'impossible';
			else status = 'possible';
			return {
				label: band.label,
				minPercentage: band.minPercentage,
				neededPercent,
				status
			};
		});
	});

	function requirementTone(neededPercent: number) {
		if (neededPercent <= 70) return 'text-green-500';
		if (neededPercent <= 85) return 'text-amber-500';
		if (neededPercent <= 100) return 'text-orange-500';
		return 'text-red-500';
	}

	onMount(() => {
		if (!browser) return;
		try {
			const raw = localStorage.getItem(storageKey);
			if (raw) {
				const parsed = JSON.parse(raw) as {
					selectedCourseId?: string;
					inputsByCourse?: Record<string, ItemInputMap>;
				};
				if (parsed.selectedCourseId) selectedCourseId = parsed.selectedCourseId;
				if (parsed.inputsByCourse) inputsByCourse = parsed.inputsByCourse;
			}
		} catch {
			/* ignore */
		}
		hydrated = true;
	});

	$effect(() => {
		if (workspace.courses.length === 0) return;
		if (!selectedCourseId) {
			selectedCourseId = workspace.courses[0]._id;
			return;
		}
		const exists = workspace.courses.some((course) => course._id === selectedCourseId);
		if (!exists) selectedCourseId = workspace.courses[0]._id;
	});

	$effect(() => {
		if (!browser || !hydrated) return;
		try {
			localStorage.setItem(storageKey, JSON.stringify({ selectedCourseId, inputsByCourse }));
		} catch {
			/* ignore */
		}
	});

	function updateInput(itemKey: string, value: string) {
		if (!selectedCourse) return;
		const courseInputs = inputsByCourse[selectedCourse._id] ?? {};
		inputsByCourse = {
			...inputsByCourse,
			[selectedCourse._id]: { ...courseInputs, [itemKey]: value }
		};
	}

	function clearCurrentCourse() {
		if (!selectedCourse) return;
		const next = { ...inputsByCourse };
		delete next[selectedCourse._id];
		inputsByCourse = next;
	}

	function clearAllCourses() {
		inputsByCourse = {};
	}

	function wipeEverything() {
		if (!browser) return;
		inputsByCourse = {};
		try {
			localStorage.removeItem(storageKey);
		} catch {
			/* ignore */
		}
	}

	async function advanceToIndex(index: number) {
		await tick();
		if (!entriesRoot) return;
		const nodes = entriesRoot.querySelectorAll<HTMLInputElement>('input[data-gc-input]');
		const next = nodes[index];
		if (next) {
			next.focus();
			next.select();
		}
	}

	function handleKey(event: KeyboardEvent, index: number) {
		if (event.key === 'Enter') {
			event.preventDefault();
			void advanceToIndex(index + 1);
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			void advanceToIndex(index + 1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			void advanceToIndex(index - 1);
		}
	}

	function parseValue(raw: string | undefined) {
		if (!raw || raw.trim() === '') return null;
		const numeric = Number(raw);
		return Number.isFinite(numeric) ? numeric : null;
	}

	function formatPercentage(value: number | null) {
		return value === null ? '—' : `${value.toFixed(2)}%`;
	}

	function formatValue(value: number | null | undefined) {
		if (value === null || value === undefined) return '—';
		return Number.isInteger(value) ? `${value}` : value.toFixed(2);
	}

	function getItemValue(itemKey: string) {
		return selectedCourseInputs[itemKey] ?? '';
	}

	function itemSuffix(item: TrackableItem) {
		if (item.inputType === 'percentage') return '%';
		if (item.pointsPossible !== null && item.pointsPossible !== undefined) {
			return `/ ${formatValue(item.pointsPossible)}`;
		}
		return '';
	}

	function entryChips(entry: CalculatorCourse['entries'][number]) {
		const chips: string[] = [];
		if (entry.weight !== undefined && entry.weight !== null) {
			chips.push(`${formatValue(entry.weight)}% of grade`);
		}
		if (entry.pointsPossible !== undefined && entry.pointsPossible !== null) {
			chips.push(`${formatValue(entry.pointsPossible)} pts each`);
		}
		if (entry.dropLowestCount) {
			chips.push(`drop lowest ${entry.dropLowestCount}`);
		}
		return chips;
	}

	function groupCompletion(items: TrackableItem[]) {
		return items.filter((it) => parseValue(selectedCourseInputs[it.key]) !== null).length;
	}

	function defaultMaxValue(item: TrackableItem) {
		if (item.inputType === 'percentage') return '100';
		if (
			(item.inputType === 'points' || item.inputType === 'attendance') &&
			item.pointsPossible !== null &&
			item.pointsPossible !== undefined
		) {
			return formatValue(item.pointsPossible);
		}
		if (item.inputType === 'pass_fail') return '1';
		return '';
	}

	function fillGroupWithMaximum(items: TrackableItem[]) {
		if (!selectedCourse) return;
		const courseInputs = inputsByCourse[selectedCourse._id] ?? {};
		const nextInputs = { ...courseInputs };

		for (const item of items) {
			const value = defaultMaxValue(item);
			if (value === '') continue;
			nextInputs[item.key] = value;
		}

		inputsByCourse = {
			...inputsByCourse,
			[selectedCourse._id]: nextInputs
		};
	}

	function clearGroup(items: TrackableItem[]) {
		if (!selectedCourse) return;
		const courseInputs = inputsByCourse[selectedCourse._id] ?? {};
		const nextInputs = { ...courseInputs };

		for (const item of items) {
			delete nextInputs[item.key];
		}

		inputsByCourse = {
			...inputsByCourse,
			[selectedCourse._id]: nextInputs
		};
	}

	function currentGradeNote(course: CalculatorCourse | null) {
		if (!course) return '';

		switch (course.code) {
			case 'OPT.5203':
				return 'Estimation only, within about 0.10 percentage points.';
			case 'OPT.5223':
				return 'Matches the counted Blackboard total from the items included here.';
			case 'OPT.6023':
				return 'Matches the current Blackboard total for posted items; future projections use the estimated remaining point values.';
			case 'OPT.5253':
				return 'Exact based on the Blackboard-style point entries entered here.';
			default:
				return 'Calculated directly from the values entered here.';
		}
	}
</script>

<div class="min-h-screen bg-background">
	<div class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
		<header class="mb-6">
			<h1 class="font-display text-2xl font-bold sm:text-3xl">Grade calculator</h1>
			<p class="mt-2 max-w-2xl text-sm text-foreground/70">
				LearnTerms doesn't store your grades on any server. Everything you type stays in this
				browser, on your device — no one else can see it unless they're sitting at your screen.
			</p>
		</header>

		<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
			<aside class="space-y-6 lg:sticky lg:top-6 lg:self-start">
				<Card.Root class="py-0">
					<Card.Content class="gap-4 p-5 sm:p-6">
						{#if workspaceQuery.error}
							<Alert.Root tone="error">
								<CircleAlert />
								<Alert.Title>Couldn't load the course catalog.</Alert.Title>
							</Alert.Root>
						{:else if workspaceQuery.isLoading}
							<Skeleton class="h-12 w-full" />
						{:else if workspace.courses.length === 0}
							<div
								class="rounded-xl border border-dashed border-border bg-muted/50 p-4 text-sm text-foreground/70"
							>
								No courses available yet.
							</div>
						{:else}
							<SelectField
								value={selectedCourseId ?? ''}
								onValueChange={(v) => (selectedCourseId = v as typeof selectedCourseId)}
								aria-label="Select a course"
								placeholder="Select a course"
								options={workspace.courses.map((course) => ({
									value: course._id,
									label: `${course.code ?? course.name} — ${course.name}`
								}))}
							/>

							{#if selectedCourse}
								<div class="rounded-2xl bg-muted/60 p-4">
									{#if selectedCourse.code}
										<div class="text-xs font-semibold uppercase tracking-wider text-primary-ink">
											{selectedCourse.code}
										</div>
									{/if}
									<h2 class="mt-1 text-lg font-semibold">{selectedCourse.name}</h2>
									{#if selectedCourse.description}
										<p class="mt-2 text-sm leading-6 text-foreground/70">
											{#if selectedCourse.ruleset}
												<strong class="font-semibold text-foreground">
													{selectedCourse.ruleset.calculationMode === 'points'
														? 'Points-based.'
														: selectedCourse.ruleset.calculationMode === 'weighted'
															? 'Weighted.'
															: selectedCourse.ruleset.calculationMode === 'percentage'
																? 'Percentage-based.'
																: 'Hybrid.'}
												</strong>
												<span aria-hidden="true"> </span>
											{/if}
											{selectedCourse.description}
										</p>
									{/if}
									<div
										class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground/60"
									>
										{#if selectedCourse.termLabel}
											<span>{selectedCourse.termLabel}</span>
										{/if}
										{#if selectedCourse.ruleset}
											<span>·</span>
											<span>{selectedCourse.ruleset.name}</span>
										{/if}
										<span>·</span>
										<span>{selectedCourse.trackedItemCount} items</span>
									</div>
								</div>
							{/if}
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Live summary -->
				<Card.Root class="py-0">
					<Card.Content class="gap-4 p-5 sm:p-6">
						{#if !selectedCourse}
							<p class="text-sm text-foreground/70">Select a course to begin.</p>
						{:else}
							<div>
								<div class="text-xs text-foreground/60">Current grade</div>
								<div class="mt-1 flex items-baseline gap-3">
									<span class="text-5xl font-bold tracking-tight transition-colors {currentColor}">
										{formatPercentage(summary.currentPercentage)}
									</span>
									<span class="text-3xl font-bold transition-colors {currentColor}">
										{currentLetter ?? '—'}
									</span>
								</div>
								<p class="mt-1 text-xs text-foreground/60">
									{currentGradeNote(selectedCourse)}
								</p>
							</div>

							<div>
								<div class="mb-1 flex items-center justify-between text-xs text-foreground/60">
									<span>Progress</span>
									<span>{summary.enteredItemCount}/{summary.totalItemCount} entered</span>
								</div>
								<Progress
									class="w-full"
									value={percentDone}
									tone={progressTone(summary.currentPercentage)}
								/>
							</div>

							{#if bandRequirements.length > 0}
								<div class="border-t border-muted pt-4">
									<div
										class="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground/60"
									>
										<Target size={13} />
										What you need to finish at
									</div>
									<div class="overflow-hidden rounded-2xl border border-border">
										<Table.Root>
											<Table.Header>
												<Table.Row
													class="bg-muted/60 text-xs uppercase tracking-wider text-foreground/60"
												>
													<Table.Head class="font-semibold">Grade</Table.Head>
													<Table.Head class="text-right font-semibold"
														>Needed on remaining</Table.Head
													>
												</Table.Row>
											</Table.Header>
											<Table.Body>
												{#each bandRequirements as row (row.label)}
													<Table.Row>
														<Table.Cell class="text-lg font-bold {letterColor(row.label)}">
															{row.label}
														</Table.Cell>
														<Table.Cell class="text-right font-mono">
															{#if row.status === 'achieved'}
																<span class="text-green-500 font-sans text-sm font-medium">
																	already secured
																</span>
															{:else if row.status === 'impossible'}
																<span class="text-foreground/50 font-sans text-sm">
																	out of reach
																</span>
															{:else}
																<span class={requirementTone(row.neededPercent)}>
																	{row.neededPercent.toFixed(1)}%
																</span>
															{/if}
														</Table.Cell>
													</Table.Row>
												{/each}
											</Table.Body>
										</Table.Root>
									</div>
									<p class="mt-2 text-[11px] leading-4 text-foreground/50">
										Score you'd need, on average, on every item still blank to land each grade.
									</p>
								</div>
							{/if}

							<div class="flex flex-wrap gap-2 pt-1">
								<Button variant="ghost" tone="neutral" size="sm" onclick={clearCurrentCourse}>
									<RotateCcw size={14} />
									Clear this course
								</Button>
								<Button variant="ghost" tone="neutral" size="sm" onclick={clearAllCourses}>
									<Trash2 size={14} />
									Clear all
								</Button>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Grade scale -->
				{#if selectedCourse?.ruleset}
					<Card.Root class="py-0">
						<Card.Content class="gap-3 p-5 sm:p-6">
							<div class="text-xs font-semibold uppercase tracking-wider text-foreground/60">
								Grade scale
							</div>
							<dl class="divide-y divide-muted">
								{#each [...selectedCourse.ruleset.gradeBands].sort((a, b) => b.minPercentage - a.minPercentage) as band (band.id)}
									<div class="flex items-baseline justify-between py-2">
										<dt class="w-10 text-lg font-bold {letterColor(band.label)}">
											{band.label}
										</dt>
										<dd class="text-sm font-mono text-foreground/70">
											{formatValue(
												band.minPercentage
											)}%{#if band.maxPercentage !== null && band.maxPercentage !== undefined}
												–{formatValue(band.maxPercentage)}%
											{/if}
										</dd>
									</div>
								{/each}
							</dl>
						</Card.Content>
					</Card.Root>
				{/if}
			</aside>

			<section class="space-y-6">
				<Card.Root class="py-0">
					<Card.Content class="gap-4 p-5 sm:p-6">
						<div class="flex flex-wrap items-center justify-between gap-3">
							<h2 class="text-lg font-semibold text-foreground">Assignments</h2>
							<div class="flex items-center gap-3 text-xs text-foreground/60">
								<span class="inline-flex items-center gap-1">
									<ChevronsUp size={13} />
									fill max
								</span>
								<span class="inline-flex items-center gap-1">
									<X size={13} />
									clear group
								</span>
							</div>
						</div>

						<div bind:this={entriesRoot} class="space-y-4">
							{#if workspaceQuery.isLoading}
								{#each [0, 1, 2, 3] as i (i)}
									<Skeleton class="h-24 w-full" />
								{/each}
							{:else if workspaceQuery.error}
								<Alert.Root tone="error">
									<CircleAlert />
									<Alert.Title>Course entry data is unavailable.</Alert.Title>
								</Alert.Root>
							{:else if !selectedCourse}
								<div
									class="rounded-2xl border border-dashed border-border bg-muted/50 p-6 text-center text-sm text-foreground/70"
								>
									Pick a course to open its entry fields.
								</div>
							{:else}
								{#each expandedEntries as group (group.entry.id)}
									{@const isBonus = (group.entry.contributionType ?? 'standard') === 'bonus'}
									<article class="rounded-2xl border border-border bg-muted/40 overflow-hidden">
										<header
											class="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3"
										>
											<div class="min-w-0 flex-1">
												<div class="flex flex-wrap items-center gap-2">
													<h3 class="font-semibold text-foreground">
														{group.entry.name}
													</h3>
													{#if isBonus}
														<span class="text-xs font-medium text-amber-500">bonus</span>
													{/if}
													<span class="text-xs font-mono text-foreground/60">
														{groupCompletion(group.items)}/{group.items.length}
													</span>
												</div>
												{#if entryChips(group.entry).length > 0}
													<div
														class="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/60"
													>
														{#each entryChips(group.entry) as chip, chipIndex (chip)}
															{#if chipIndex > 0}<span aria-hidden="true">·</span>{/if}
															<span>{chip}</span>
														{/each}
													</div>
												{/if}
											</div>
											<div class="flex items-center gap-1 shrink-0">
												<Button
													variant="ghost"
													tone="neutral"
													size="xs"
													shape="circle"
													aria-label="Fill this group with full-credit values"
													title="Fill this group with full-credit values"
													onclick={() => fillGroupWithMaximum(group.items)}
												>
													<ChevronsUp size={14} />
												</Button>
												<Button
													variant="ghost"
													tone="neutral"
													size="xs"
													shape="circle"
													aria-label="Clear this group"
													title="Clear this group"
													onclick={() => clearGroup(group.items)}
												>
													<X size={14} />
												</Button>
											</div>
										</header>

										<ul class="divide-y divide-border/60">
											{#each group.items as item (item.key)}
												{@const flatIndex = flatItems.findIndex((fi) => fi.item.key === item.key)}
												{@const raw = getItemValue(item.key)}
												{@const filled = raw.trim() !== ''}
												<li class="flex items-center gap-3 px-4 py-2.5">
													<div class="min-w-0 flex-1">
														<label
															for="gc-{item.key}"
															class="block text-sm font-medium text-foreground"
														>
															{item.label}
														</label>
													</div>
													<InputGroup.Root
														class="h-8 w-24 sm:w-28 {filled ? 'border-primary' : ''}"
													>
														<InputGroup.Input
															id="gc-{item.key}"
															type="text"
															inputmode="decimal"
															class="text-right font-mono"
															data-gc-input
															value={raw}
															onkeydown={(e) => handleKey(e, flatIndex)}
															oninput={(event) =>
																updateInput(
																	item.key,
																	(event.currentTarget as HTMLInputElement).value
																)}
														/>
														<InputGroup.Addon class="text-xs text-foreground/60 font-mono">
															{itemSuffix(item) || 'score'}
														</InputGroup.Addon>
													</InputGroup.Root>
												</li>
											{/each}
										</ul>
									</article>
								{/each}
							{/if}
						</div>
					</Card.Content>
				</Card.Root>

				<div
					class="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-3"
				>
					<Button variant="ghost" tone="neutral" size="sm" onclick={wipeEverything}>
						<Eraser size={14} />
						Erase local data
					</Button>
				</div>
			</section>
		</div>
	</div>
</div>

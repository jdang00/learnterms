<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import Activity from '@lucide/svelte/icons/activity';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Flag from '@lucide/svelte/icons/flag';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import Users from '@lucide/svelte/icons/users';
	import { resolve } from '$app/paths';
	import { api } from '../../../convex/_generated/api';
	import type { Id } from '../../../convex/_generated/dataModel';
	import StudentAvatar from './StudentAvatar.svelte';
	import { plainText, relativeTime } from './utils';
	import * as Alert from '$lib/components/ui/alert';
	import * as ButtonGroup from '$lib/components/ui/button-group';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';

	let {
		cohortId,
		moduleId,
		now,
		onStudent
	}: {
		cohortId: Id<'cohort'>;
		moduleId: Id<'module'>;
		now: number;
		onStudent: (id: Id<'users'>) => void;
	} = $props();
	let offset = $state(0);
	let detailTab = $state<'questions' | 'people' | 'activity' | 'flags'>('questions');
	const overview = useQuery(api.curatorAnalytics.getModuleOverviewAnalytics, () => ({
		cohortId,
		moduleId,
		participantsLimit: 30,
		recentLimit: 20,
		flagLimit: 20
	}));
	const questions = useQuery(api.curatorAnalytics.getModuleQuestionAnalyticsPage, () =>
		detailTab === 'questions' ? { cohortId, moduleId, pageSize: 10, pageOffset: offset } : 'skip'
	);
	const totals = $derived(overview.data?.totals);
	$effect(() => {
		if (questions.data && offset > 0 && offset >= questions.data.total)
			offset = Math.max(0, Math.floor((questions.data.total - 1) / 10) * 10);
	});
</script>

{#if overview.error}
	<Alert.Root tone="error" role="alert">
		<Alert.Description>
			Module details could not load. {overview.error.message}
		</Alert.Description>
	</Alert.Root>
{:else if !overview.data || !totals}
	<div class="space-y-4" aria-label="Loading module details">
		<Skeleton class="h-24" />
		<Skeleton class="h-72" />
	</div>
{:else}
	{@const module = overview.data.module}
	{@const untried = totals.questionsWithNoInteractions}
	<div class="space-y-4">
		<Card.Root class="gap-0 p-5">
			<div class="flex flex-wrap items-start justify-between gap-3">
				<div class="flex min-w-0 items-center gap-3">
					<span
						class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl"
						>{module.emoji ?? '📚'}</span
					>
					<div class="min-w-0">
						<h2 class="truncate text-lg font-semibold">{module.title}</h2>
						<p class="text-xs text-foreground/55">
							{module.className} · {module.semesterName} · {totals.totalQuestions} questions
						</p>
					</div>
				</div>
				<Button
					href={resolve('/admin/[classId]/module/[moduleId]', {
						classId: String(module.classId),
						moduleId: String(moduleId)
					})}
					variant="outline"
					tone="neutral"
					size="sm"
				>
					Manage module <ArrowUpRight size={14} />
				</Button>
			</div>
			<dl class="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
				{#each [{ label: 'Students studying', value: String(totals.participants), note: `of ${totals.studentsInCohort} in the cohort`, tone: 'text-primary-ink' }, { label: 'Answers', value: String(totals.totalInteractions), note: 'Questions tried, all students', tone: '' }, { label: 'Never tried', value: String(untried), note: `of ${totals.totalQuestions} questions`, tone: '' }, { label: 'Flagged questions', value: String(totals.questionsWithFlags), note: `${totals.totalFlags} student flags`, tone: totals.totalFlags ? 'text-warning-ink' : '' }] as metric (metric.label)}
					<div class="rounded-xl bg-muted/60 px-3 py-2.5">
						<dt class="text-[11px] text-foreground/55">{metric.label}</dt>
						<dd class="text-xl font-semibold tabular-nums {metric.tone}">{metric.value}</dd>
						<p class="text-[11px] text-foreground/50">{metric.note}</p>
					</div>
				{/each}
			</dl>
		</Card.Root>

		<Card.Root class="gap-0 scroll-mt-20 overflow-hidden py-0">
			<nav
				class="m-3 flex w-fit max-w-[calc(100%-1.5rem)] flex-nowrap gap-1 overflow-x-auto rounded-full bg-muted p-1"
				aria-label="Module detail views"
			>
				{#each [{ id: 'questions', label: 'Questions', icon: ListChecks }, { id: 'people', label: 'Participants', icon: Users }, { id: 'flags', label: 'Flags', icon: Flag }, { id: 'activity', label: 'Activity', icon: Activity }] as const as tab (tab.id)}
					<Button
						variant="ghost"
						tone="neutral"
						size="sm"
						class="shrink-0 gap-1.5 aria-pressed:bg-background aria-pressed:shadow-xs"
						aria-pressed={detailTab === tab.id}
						onclick={() => (detailTab = tab.id)}><tab.icon size={14} />{tab.label}</Button
					>
				{/each}
			</nav>
			{#if detailTab === 'questions'}
				<div class="flex flex-wrap justify-between gap-2 px-5 pb-3">
					<h3 class="text-sm font-semibold">
						Question explorer <span class="ml-1 text-foreground/50">/ {totals.totalQuestions}</span>
					</h3>
				</div>
				{#if questions.error}<Alert.Root tone="error" role="alert" class="m-4">
						<Alert.Description>
							Questions could not load. {questions.error.message}
						</Alert.Description>
					</Alert.Root>
				{:else if !questions.data}<div class="space-y-3 p-5">
						{#each [1, 2, 3] as row (row)}<Skeleton class="h-14" />{/each}
					</div>
				{:else if !questions.data.items.length}<p class="p-8 text-foreground/60">
						No questions in this module yet.
					</p>
				{:else}
					<div class="divide-y divide-muted">
						{#each questions.data.items as question (question.questionId)}
							<details class="group">
								<summary
									class="flex cursor-pointer list-none items-center gap-3 px-5 py-3 hover:bg-muted/60"
								>
									<span class="w-10 shrink-0 font-mono text-sm text-foreground/50"
										>{String(question.order + 1).padStart(2, '0')}</span
									>
									<span class="min-w-0 flex-1"
										><span class="line-clamp-2 text-sm font-medium group-open:line-clamp-none"
											>{plainText(question.stem)}</span
										><span class="mt-1 block text-xs capitalize text-foreground/55"
											>{question.type.replaceAll('_', ' ')} · {question.interactionCount} tried{question.flaggedCount
												? ` · ${question.flaggedCount} flagged`
												: ''}</span
										></span
									>
									<span class="hidden shrink-0 text-right text-xs sm:block"
										><span class="block font-semibold tabular-nums"
											>{question.interactionCount} students</span
										><span class="text-foreground/50"
											>{relativeTime(question.lastInteractionAt, now)}</span
										></span
									>
									<ChevronRight
										size={18}
										class="shrink-0 text-foreground/40 transition-transform group-open:rotate-90"
									/>
								</summary>
								<div class="border-t border-muted bg-muted/40 px-5 py-5 sm:pl-18">
									<p class="mb-4 text-sm leading-relaxed">{plainText(question.stem)}</p>
									<dl class="grid grid-cols-2 gap-4 sm:grid-cols-4">
										<div>
											<dt class="text-xs text-foreground/60">Students who tried</dt>
											<dd class="mt-1 text-xl font-semibold">
												{question.interactionCount}
												<span class="text-sm font-normal">/ {totals.studentsInCohort}</span>
											</dd>
										</div>
										<div>
											<dt class="text-xs text-foreground/60">Not tried</dt>
											<dd class="mt-1 text-xl font-semibold">
												{Math.max(0, totals.studentsInCohort - question.interactionCount)}
											</dd>
										</div>
										<div>
											<dt class="text-xs text-foreground/60">Student flags</dt>
											<dd class="mt-1 text-xl font-semibold">{question.flaggedCount}</dd>
										</div>
										<div>
											<dt class="text-xs text-foreground/60">Last interaction</dt>
											<dd class="mt-1 text-sm">{relativeTime(question.lastInteractionAt, now)}</dd>
										</div>
									</dl>
								</div>
							</details>
						{/each}
					</div>
					<div class="flex items-center justify-between border-t border-muted p-4">
						<span class="text-sm text-foreground/60"
							>{offset + 1}–{Math.min(offset + 10, questions.data.total)} of {questions.data
								.total}</span
						>
						<ButtonGroup.Root>
							<Button
								variant="soft"
								tone="neutral"
								size="sm"
								shape="circle"
								aria-label="Previous questions"
								disabled={offset === 0}
								onclick={() => (offset = Math.max(0, offset - 10))}
							>
								<ChevronLeft size={18} />
							</Button>
							<Button
								variant="soft"
								tone="neutral"
								size="sm"
								shape="circle"
								aria-label="Next questions"
								disabled={!questions.data.hasMore}
								onclick={() => (offset += 10)}
							>
								<ChevronRight size={18} />
							</Button>
						</ButtonGroup.Root>
					</div>
				{/if}
			{:else if detailTab === 'people'}
				<p class="px-5 pb-3 text-xs text-foreground/55">
					{overview.data.participants.length} most recently active of {totals.participants} participants.
				</p>
				{#each overview.data.participants as person (person._id)}
					<button
						class="flex w-full items-center gap-4 border-t border-muted px-5 py-3 text-left hover:bg-muted/60"
						onclick={() => onStudent(person._id)}
					>
						<StudentAvatar name={person.name} imageUrl={person.imageUrl} size="sm" />
						<span class="min-w-0 flex-1"
							><strong class="block truncate text-sm">{person.name}</strong><span
								class="text-xs text-foreground/55">{relativeTime(person.lastAttemptAt, now)}</span
							></span
						><span class="text-right text-sm"
							><strong class="block">{person.questionsAttempted} tried</strong><span
								class="text-foreground/60">{person.flagged} flagged</span
							></span
						><ChevronRight size={18} /></button
					>
				{:else}<p class="p-8 text-foreground/60">
						No participants yet. Activity will appear here as students start.
					</p>{/each}
			{:else if detailTab === 'flags'}
				<p class="px-5 pb-3 text-xs text-foreground/55">
					Up to 20 questions with the most student flags. Flags may indicate uncertainty or a
					question that needs review.
				</p>
				{#each overview.data.mostFlaggedQuestions as question (question.questionId)}<details
						class="group border-t border-muted"
					>
						<summary class="flex cursor-pointer items-center gap-3 px-5 py-3 text-sm"
							><Badge variant="soft" tone="warning" size="sm" class="shrink-0"
								>{question.flaggedCount} flags</Badge
							><span class="line-clamp-2 flex-1 group-open:line-clamp-none"
								>Q{question.order + 1}. {plainText(question.stem)}</span
							></summary
						>
						<p class="bg-muted/50 px-5 py-4 text-sm">
							{question.interactionCount} students tried this question ({question.interactionRate}%
							of the cohort).
						</p>
					</details>{:else}<div class="p-10 text-center">
						<Flag size={28} class="mx-auto mb-3 text-success" />
						<h3 class="font-semibold">No flags to review</h3>
						<p class="mt-1 text-sm text-foreground/60">
							New student flags appear here automatically.
						</p>
					</div>{/each}
			{:else}
				<p class="px-5 pb-3 text-xs text-foreground/55">
					Latest attempt per student and question · Up to 20 interactions
				</p>
				{#each overview.data.recentActivity as item (`${item.userId}-${item.questionId}`)}<div
						class="flex items-start gap-3 border-t border-muted px-5 py-3"
					>
						<StudentAvatar name={item.userName} imageUrl={item.userImageUrl} size="sm" />
						<div class="min-w-0 flex-1">
							<button class="font-semibold hover:underline" onclick={() => onStudent(item.userId)}
								>{item.userName}</button
							>
							<p class="mt-1 line-clamp-2 text-sm text-foreground/65">
								Q{item.questionOrder + 1}. {plainText(item.questionStem)}
							</p>
							<span class="mt-2 inline-block text-xs text-foreground/60"
								>Attempted{item.isFlagged ? ' · Flagged' : ''}</span
							>
						</div>
						<time
							class="shrink-0 text-xs text-foreground/55"
							datetime={new Date(item.timestamp).toISOString()}
							>{relativeTime(item.timestamp, now)}</time
						>
					</div>{:else}<p class="p-8 text-foreground/60">
						No recent attempts recorded for this module.
					</p>{/each}
			{/if}
		</Card.Root>
	</div>
{/if}

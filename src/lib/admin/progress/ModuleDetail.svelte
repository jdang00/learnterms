<script lang="ts">
	import StudentAvatar from './StudentAvatar.svelte';
	import { useQuery } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api';
	import type { Id } from '../../../convex/_generated/dataModel';
	import { resolve } from '$app/paths';
	import {
		Activity,
		ArrowUpRight,
		ChevronLeft,
		ChevronRight,
		Flag,
		ListChecks,
		Users
	} from 'lucide-svelte';
	import { plainText, relativeTime } from './utils';

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
	<div class="alert alert-error" role="alert">
		Module details could not load. {overview.error.message}
	</div>
{:else if !overview.data || !totals}
	<div class="space-y-4" aria-label="Loading module details">
		<div class="skeleton h-24"></div>
		<div class="skeleton h-72"></div>
	</div>
{:else}
	{@const module = overview.data.module}
	{@const untried = totals.questionsWithNoInteractions}
	<div class="space-y-4">
		<section class="card card-border bg-base-100 p-5">
			<div class="flex flex-wrap items-start justify-between gap-3">
				<div class="flex min-w-0 items-center gap-3">
					<span
						class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-base-200 text-2xl"
						>{module.emoji ?? '📚'}</span
					>
					<div class="min-w-0">
						<h2 class="truncate text-lg font-semibold">{module.title}</h2>
						<p class="text-xs text-base-content/55">
							{module.className} · {module.semesterName} · {totals.totalQuestions} questions
						</p>
					</div>
				</div>
				<a
					class="btn btn-outline btn-sm rounded-full"
					href={resolve('/admin/[classId]/module/[moduleId]', {
						classId: String(module.classId),
						moduleId: String(moduleId)
					})}>Manage module <ArrowUpRight size={14} /></a
				>
			</div>
			<dl class="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
				{#each [{ label: 'Students studying', value: String(totals.participants), note: `of ${totals.studentsInCohort} in the cohort`, tone: 'text-primary' }, { label: 'Answers', value: String(totals.totalInteractions), note: 'Questions tried, all students', tone: '' }, { label: 'Never tried', value: String(untried), note: `of ${totals.totalQuestions} questions`, tone: '' }, { label: 'Flagged questions', value: String(totals.questionsWithFlags), note: `${totals.totalFlags} student flags`, tone: totals.totalFlags ? 'text-warning' : '' }] as metric (metric.label)}
					<div class="rounded-xl bg-base-200/60 px-3 py-2.5">
						<dt class="text-[11px] text-base-content/55">{metric.label}</dt>
						<dd class="text-xl font-semibold tabular-nums {metric.tone}">{metric.value}</dd>
						<p class="text-[11px] text-base-content/50">{metric.note}</p>
					</div>
				{/each}
			</dl>
		</section>

		<div class="card card-border scroll-mt-20 overflow-hidden bg-base-100">
			<nav
				class="tabs tabs-box m-3 w-fit max-w-[calc(100%-1.5rem)] flex-nowrap overflow-x-auto rounded-full"
				aria-label="Module detail views"
			>
				{#each [{ id: 'questions', label: 'Questions', icon: ListChecks }, { id: 'people', label: 'Participants', icon: Users }, { id: 'flags', label: 'Flags', icon: Flag }, { id: 'activity', label: 'Activity', icon: Activity }] as const as tab (tab.id)}
					<button
						class="tab shrink-0 gap-1.5 rounded-full {detailTab === tab.id ? 'tab-active' : ''}"
						aria-pressed={detailTab === tab.id}
						onclick={() => (detailTab = tab.id)}><tab.icon size={14} />{tab.label}</button
					>
				{/each}
			</nav>
			{#if detailTab === 'questions'}
				<div class="flex flex-wrap justify-between gap-2 px-5 pb-3">
					<h3 class="text-sm font-semibold">
						Question explorer <span class="ml-1 text-base-content/50"
							>/ {totals.totalQuestions}</span
						>
					</h3>
				</div>
				{#if questions.error}<div class="alert alert-error m-4" role="alert">
						Questions could not load. {questions.error.message}
					</div>
				{:else if !questions.data}<div class="space-y-3 p-5">
						{#each [1, 2, 3] as row (row)}<div class="skeleton h-14"></div>{/each}
					</div>
				{:else if !questions.data.items.length}<p class="p-8 text-base-content/60">
						No questions in this module yet.
					</p>
				{:else}
					<div class="divide-y divide-base-200">
						{#each questions.data.items as question (question.questionId)}
							<details class="group">
								<summary
									class="flex cursor-pointer list-none items-center gap-3 px-5 py-3 hover:bg-base-200/60"
								>
									<span class="w-10 shrink-0 font-mono text-sm text-base-content/50"
										>{String(question.order + 1).padStart(2, '0')}</span
									>
									<span class="min-w-0 flex-1"
										><span class="line-clamp-2 text-sm font-medium group-open:line-clamp-none"
											>{plainText(question.stem)}</span
										><span class="mt-1 block text-xs capitalize text-base-content/55"
											>{question.type.replaceAll('_', ' ')} · {question.interactionCount} tried{question.flaggedCount
												? ` · ${question.flaggedCount} flagged`
												: ''}</span
										></span
									>
									<span class="hidden shrink-0 text-right text-xs sm:block"
										><span class="block font-semibold tabular-nums"
											>{question.interactionCount} students</span
										><span class="text-base-content/50"
											>{relativeTime(question.lastInteractionAt, now)}</span
										></span
									>
									<ChevronRight
										size={18}
										class="shrink-0 text-base-content/40 transition-transform group-open:rotate-90"
									/>
								</summary>
								<div class="border-t border-base-200 bg-base-200/40 px-5 py-5 sm:pl-18">
									<p class="mb-4 text-sm leading-relaxed">{plainText(question.stem)}</p>
									<dl class="grid grid-cols-2 gap-4 sm:grid-cols-4">
										<div>
											<dt class="text-xs text-base-content/60">Students who tried</dt>
											<dd class="mt-1 text-xl font-semibold">
												{question.interactionCount}
												<span class="text-sm font-normal">/ {totals.studentsInCohort}</span>
											</dd>
										</div>
										<div>
											<dt class="text-xs text-base-content/60">Not tried</dt>
											<dd class="mt-1 text-xl font-semibold">
												{Math.max(0, totals.studentsInCohort - question.interactionCount)}
											</dd>
										</div>
										<div>
											<dt class="text-xs text-base-content/60">Student flags</dt>
											<dd class="mt-1 text-xl font-semibold">{question.flaggedCount}</dd>
										</div>
										<div>
											<dt class="text-xs text-base-content/60">Last interaction</dt>
											<dd class="mt-1 text-sm">{relativeTime(question.lastInteractionAt, now)}</dd>
										</div>
									</dl>
								</div>
							</details>
						{/each}
					</div>
					<div class="flex items-center justify-between border-t border-base-200 p-4">
						<span class="text-sm text-base-content/60"
							>{offset + 1}–{Math.min(offset + 10, questions.data.total)} of {questions.data
								.total}</span
						>
						<div class="join">
							<button
								class="btn btn-sm join-item"
								aria-label="Previous questions"
								disabled={offset === 0}
								onclick={() => (offset = Math.max(0, offset - 10))}
								><ChevronLeft size={18} /></button
							><button
								class="btn btn-sm join-item"
								aria-label="Next questions"
								disabled={!questions.data.hasMore}
								onclick={() => (offset += 10)}><ChevronRight size={18} /></button
							>
						</div>
					</div>
				{/if}
			{:else if detailTab === 'people'}
				<p class="px-5 pb-3 text-xs text-base-content/55">
					{overview.data.participants.length} most recently active of {totals.participants} participants.
				</p>
				{#each overview.data.participants as person (person._id)}
					<button
						class="flex w-full items-center gap-4 border-t border-base-200 px-5 py-3 text-left hover:bg-base-200/60"
						onclick={() => onStudent(person._id)}
					>
						<StudentAvatar name={person.name} imageUrl={person.imageUrl} size="sm" />
						<span class="min-w-0 flex-1"
							><strong class="block truncate text-sm">{person.name}</strong><span
								class="text-xs text-base-content/55">{relativeTime(person.lastAttemptAt, now)}</span
							></span
						><span class="text-right text-sm"
							><strong class="block">{person.questionsAttempted} tried</strong><span
								class="text-base-content/60">{person.flagged} flagged</span
							></span
						><ChevronRight size={18} /></button
					>
				{:else}<p class="p-8 text-base-content/60">
						No participants yet. Activity will appear here as students start.
					</p>{/each}
			{:else if detailTab === 'flags'}
				<p class="px-5 pb-3 text-xs text-base-content/55">
					Up to 20 questions with the most student flags. Flags may indicate uncertainty or a
					question that needs review.
				</p>
				{#each overview.data.mostFlaggedQuestions as question (question.questionId)}<details
						class="group border-t border-base-200"
					>
						<summary class="flex cursor-pointer items-center gap-3 px-5 py-3 text-sm"
							><span class="badge badge-soft badge-warning badge-sm shrink-0"
								>{question.flaggedCount} flags</span
							><span class="line-clamp-2 flex-1 group-open:line-clamp-none"
								>Q{question.order + 1}. {plainText(question.stem)}</span
							></summary
						>
						<p class="bg-base-200/50 px-5 py-4 text-sm">
							{question.interactionCount} students tried this question ({question.interactionRate}%
							of the cohort).
						</p>
					</details>{:else}<div class="p-10 text-center">
						<Flag size={28} class="mx-auto mb-3 text-success" />
						<h3 class="font-semibold">No flags to review</h3>
						<p class="mt-1 text-sm text-base-content/60">
							New student flags appear here automatically.
						</p>
					</div>{/each}
			{:else}
				<p class="px-5 pb-3 text-xs text-base-content/55">
					Latest attempt per student and question · Up to 20 interactions
				</p>
				{#each overview.data.recentActivity as item (`${item.userId}-${item.questionId}`)}<div
						class="flex items-start gap-3 border-t border-base-200 px-5 py-3"
					>
						<StudentAvatar name={item.userName} imageUrl={item.userImageUrl} size="sm" />
						<div class="min-w-0 flex-1">
							<button class="font-semibold hover:underline" onclick={() => onStudent(item.userId)}
								>{item.userName}</button
							>
							<p class="mt-1 line-clamp-2 text-sm text-base-content/65">
								Q{item.questionOrder + 1}. {plainText(item.questionStem)}
							</p>
							<span class="mt-2 inline-block text-xs text-base-content/60"
								>Attempted{item.isFlagged ? ' · Flagged' : ''}</span
							>
						</div>
						<time
							class="shrink-0 text-xs text-base-content/55"
							datetime={new Date(item.timestamp).toISOString()}
							>{relativeTime(item.timestamp, now)}</time
						>
					</div>{:else}<p class="p-8 text-base-content/60">
						No recent attempts recorded for this module.
					</p>{/each}
			{/if}
		</div>
	</div>
{/if}

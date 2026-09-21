<script lang="ts">
	import { tick } from 'svelte';
	import StudentAvatar from './StudentAvatar.svelte';
	import { useQuery } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api';
	import type { Id } from '../../../convex/_generated/dataModel';
	import { resolve } from '$app/paths';
	import { ArrowUpRight, ChevronLeft, ChevronRight, Flag, Users, Activity } from 'lucide-svelte';
	import { percent, plainText, relativeTime } from './utils';

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
	let detailSection = $state<HTMLDivElement>();
	async function showActivity() {
		detailTab = 'activity';
		await tick();
		detailSection?.scrollIntoView({ block: 'start' });
		detailSection?.focus({ preventScroll: true });
	}
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
	<div class="space-y-5">
		<header class="flex flex-col items-start justify-between gap-3 sm:flex-row">
			<div class="min-w-0 flex-1">
				<h2 class="text-2xl font-bold tracking-tight">{module.emoji} {module.title}</h2>
				<p class="mt-1 text-base-content/60">{module.className} · {module.semesterName}</p>
			</div>
			<a
				class="btn rounded-full btn-outline"
				href={resolve('/admin/[classId]/module/[moduleId]', {
					classId: String(module.classId),
					moduleId: String(moduleId)
				})}>Manage module <ArrowUpRight size={16} /></a
			>
		</header>
		<div
			class="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-base-300 bg-base-300"
		>
			{#each [{ label: 'Participation', value: `${totals.participationRate}%`, note: `${totals.participants} of ${totals.studentsInCohort} students`, tone: 'text-primary' }, { label: 'Question coverage', value: `${percent(totals.totalInteractions, totals.possibleInteractions)}%`, note: `${totals.totalInteractions} student–question pairs tried`, tone: 'text-base-content' }, { label: 'Flagged questions', value: String(totals.questionsWithFlags), note: `${totals.totalFlags} student flags in total`, tone: totals.totalFlags ? 'text-warning' : 'text-base-content' }] as metric}
				<div class="bg-base-100 p-3 sm:p-5">
					<p class="text-sm text-base-content/65">{metric.label}</p>
					<p
						class="my-2 text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums {metric.tone}"
					>
						{metric.value}
					</p>
					<p class="text-xs text-base-content/60">{metric.note}</p>
				</div>
			{/each}
		</div>
		<div class="flex flex-wrap items-center gap-2 rounded-xl bg-base-200 px-4 py-3 text-sm">
			<Activity size={17} class="text-primary" /><strong
				>{totals.questionsWithNoInteractions} of {totals.totalQuestions} questions</strong
			> have not been tried by anyone in the cohort.
		</div>
		<section
			class="rounded-2xl border border-base-300 bg-base-100 p-5"
			aria-label="Recent module activity"
		>
			<div class="mb-4 flex items-center justify-between gap-3">
				<h3 class="text-lg font-semibold">Recent activity</h3>
				<button class="btn btn-ghost btn-sm rounded-full" onclick={showActivity}
					>View all <ChevronRight size={16} /></button
				>
			</div>
			<div class="grid gap-3 lg:grid-cols-3">
				{#each overview.data.recentActivity.slice(0, 3) as item (`${item.userId}-${item.questionId}`)}
					<button
						class="flex min-w-0 items-start gap-3 rounded-xl bg-base-200/60 p-4 text-left hover:bg-base-200"
						onclick={() => onStudent(item.userId)}
						aria-label={`View ${item.userName}'s progress after question ${item.questionOrder + 1}`}
					>
						<StudentAvatar name={item.userName} imageUrl={item.userImageUrl} />
						<span class="min-w-0 flex-1"
							><span class="flex flex-wrap items-baseline justify-between gap-x-2"
								><strong class="text-sm">{item.userName}</strong><time
									class="text-xs text-base-content/55"
									datetime={new Date(item.timestamp).toISOString()}
									>{relativeTime(item.timestamp, now)}</time
								></span
							><span class="mt-1 line-clamp-2 text-sm text-base-content/65"
								>Q{item.questionOrder + 1}. {plainText(item.questionStem)}</span
							>{#if item.isFlagged}<span class="mt-1 block text-xs text-warning">Flagged</span
								>{/if}</span
						>
					</button>
				{:else}<p class="col-span-full text-sm text-base-content/60">
						No attempts recorded yet.
					</p>{/each}
			</div>
		</section>

		<div
			bind:this={detailSection}
			tabindex="-1"
			class="scroll-mt-20 overflow-hidden rounded-2xl border border-base-300 bg-base-100"
		>
			<nav
				class="flex gap-1 overflow-x-auto border-b border-base-300 p-2"
				aria-label="Module detail views"
			>
				{#each [{ id: 'questions', label: 'Questions', icon: ChevronRight }, { id: 'people', label: 'Participants', icon: Users }, { id: 'flags', label: 'Flags', icon: Flag }, { id: 'activity', label: 'Activity', icon: Activity }] as const as tab}
					<button
						class="btn btn-sm shrink-0 rounded-full border-0 {detailTab === tab.id
							? 'btn-primary'
							: 'btn-ghost'}"
						aria-pressed={detailTab === tab.id}
						onclick={() => (detailTab = tab.id)}><tab.icon size={16} />{tab.label}</button
					>
				{/each}
			</nav>
			{#if detailTab === 'questions'}
				<div class="flex flex-wrap justify-between gap-2 px-5 py-4">
					<h3 class="font-semibold">
						Question explorer <span class="ml-1 text-base-content/50"
							>/ {totals.totalQuestions}</span
						>
					</h3>
				</div>
				{#if questions.error}<div class="alert alert-error m-4" role="alert">
						Questions could not load. {questions.error.message}
					</div>
				{:else if !questions.data}<div class="space-y-3 p-5">
						{#each [1, 2, 3] as row}<div class="skeleton h-20"></div>{/each}
					</div>
				{:else if !questions.data.items.length}<p class="p-8 text-base-content/60">
						No questions in this module yet.
					</p>
				{:else}
					<div class="divide-y divide-base-300">
						{#each questions.data.items as question (question.questionId)}
							<details class="group">
								<summary
									class="flex cursor-pointer list-none items-center gap-3 px-5 py-4 hover:bg-base-200/60"
								>
									<span class="w-10 shrink-0 font-mono text-sm text-base-content/50"
										>{String(question.order + 1).padStart(2, '0')}</span
									>
									<span class="min-w-0 flex-1"
										><span class="line-clamp-2 font-medium group-open:line-clamp-none"
											>{plainText(question.stem)}</span
										><span class="mt-1 block text-xs capitalize text-base-content/55"
											>{question.type.replaceAll('_', ' ')} · {question.interactionCount} tried{question.flaggedCount
												? ` · ${question.flaggedCount} flagged`
												: ''}</span
										></span
									>
									<span class="hidden w-24 shrink-0 sm:block"
										><span class="mb-1 block text-right text-sm tabular-nums"
											>{question.interactionRate}%
											<span class="text-xs text-base-content/50">tried</span></span
										><progress
											class="progress progress-primary h-1.5 w-full"
											value={question.interactionRate}
											max="100"
											aria-label="Question coverage"
										></progress></span
									>
									<ChevronRight
										size={18}
										class="shrink-0 text-base-content/40 transition-transform group-open:rotate-90"
									/>
								</summary>
								<div class="border-t border-base-300 bg-base-200/40 px-5 py-5 sm:pl-18">
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
					<div class="flex items-center justify-between border-t border-base-300 p-4">
						<span class="text-sm text-base-content/60"
							>{offset + 1}–{Math.min(offset + 10, questions.data.total)} of {questions.data
								.total}</span
						>
						<div class="join">
							<button
								class="btn rounded-full join-item"
								aria-label="Previous questions"
								disabled={offset === 0}
								onclick={() => (offset = Math.max(0, offset - 10))}
								><ChevronLeft size={18} /></button
							><button
								class="btn rounded-full join-item"
								aria-label="Next questions"
								disabled={!questions.data.hasMore}
								onclick={() => (offset += 10)}><ChevronRight size={18} /></button
							>
						</div>
					</div>
				{/if}
			{:else if detailTab === 'people'}
				<p class="px-5 py-4 text-sm text-base-content/60">
					{overview.data.participants.length} most recently active of {totals.participants} participants.
				</p>
				{#each overview.data.participants as person (person._id)}
					<button
						class="flex w-full items-center gap-4 border-t border-base-300 px-5 py-4 text-left hover:bg-base-200"
						onclick={() => onStudent(person._id)}
					>
						<StudentAvatar name={person.name} imageUrl={person.imageUrl} />
						<span class="min-w-0 flex-1"
							><strong class="block truncate">{person.name}</strong><span
								class="text-sm text-base-content/60">{relativeTime(person.lastAttemptAt, now)}</span
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
				<p class="px-5 py-4 text-sm text-base-content/60">
					Up to 20 questions with the most student flags. Flags may indicate uncertainty or a
					question that needs review.
				</p>
				{#each overview.data.mostFlaggedQuestions as question (question.questionId)}<details
						class="group border-t border-base-300"
					>
						<summary class="flex cursor-pointer items-center gap-4 p-5"
							><span class="badge badge-warning shrink-0">{question.flaggedCount} flags</span><span
								class="line-clamp-2 flex-1 group-open:line-clamp-none"
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
				<p class="px-5 py-4 text-sm text-base-content/60">
					Latest attempt per student and question · Up to 20 interactions
				</p>
				{#each overview.data.recentActivity as item (`${item.userId}-${item.questionId}`)}<div
						class="flex items-start gap-4 border-t border-base-300 p-5"
					>
						<StudentAvatar name={item.userName} imageUrl={item.userImageUrl} />
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

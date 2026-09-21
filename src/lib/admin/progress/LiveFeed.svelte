<script lang="ts">
	import type { Id } from '../../../convex/_generated/dataModel';
	import { ClipboardCheck, Timer } from 'lucide-svelte';
	import { fly } from 'svelte/transition';
	import StudentAvatar from './StudentAvatar.svelte';
	import { relativeTime } from './utils';

	type Session = {
		kind: 'practice' | 'quiz_started' | 'quiz_submitted';
		userId: Id<'users'>;
		startedAt: number;
		at: number;
		count: number;
		className: string;
		moduleTitle: string | null;
		moduleEmoji: string | null;
		scorePct: number | null;
	};

	let {
		sessions,
		studentsById,
		now,
		onStudent
	}: {
		sessions: Session[];
		studentsById: Map<string, { name: string; imageUrl?: string }>;
		now: number;
		onStudent: (id: Id<'users'>) => void;
	} = $props();

	function scoreTone(score: number) {
		return score >= 80 ? 'badge-success' : score >= 60 ? 'badge-warning' : 'badge-error';
	}
</script>

<ul class="divide-y divide-base-200">
	{#each sessions as session (`${session.kind}:${session.userId}:${session.moduleTitle}:${session.startedAt}`)}
		{@const student = studentsById.get(session.userId)}
		{@const fresh = now - session.at < 15 * 60_000}
		<li in:fly={{ y: -8, duration: 300 }}>
			<button
				class="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-base-200/60 sm:px-5"
				onclick={() => onStudent(session.userId)}
			>
				<span class="relative">
					<StudentAvatar name={student?.name ?? 'Student'} imageUrl={student?.imageUrl} size="sm" />
					{#if fresh}<span
							class="status status-success absolute -right-0.5 -bottom-0.5 ring-2 ring-base-100"
							aria-label="Active now"
						></span>{/if}
				</span>
				<span class="min-w-0 flex-1 text-sm leading-snug">
					<span class="font-semibold">{student?.name ?? 'A student'}</span>
					{#if session.kind === 'practice'}
						<span class="text-base-content/70">
							tried {session.count}
							{session.count === 1 ? 'question' : 'questions'} in</span
						>
						<span class="font-medium"
							>{session.moduleEmoji ?? ''} {session.moduleTitle ?? session.className}</span
						>
					{:else if session.kind === 'quiz_submitted'}
						<span class="text-base-content/70"
							>finished a {session.count}-question practice test in</span
						>
						<span class="font-medium">{session.className}</span>
					{:else}
						<span class="text-base-content/70"
							>started a {session.count}-question practice test in</span
						>
						<span class="font-medium">{session.className}</span>
					{/if}
					<span class="mt-1 flex items-center gap-2 text-xs text-base-content/50">
						{#if session.kind === 'practice'}
							{session.moduleTitle ? session.className : 'Practice'}
						{:else}
							{#if session.kind === 'quiz_submitted'}<ClipboardCheck size={12} />{:else}<Timer
									size={12}
								/>{/if}Practice test
						{/if}
						<span aria-hidden="true">·</span>
						<time datetime={new Date(session.at).toISOString()}
							>{relativeTime(session.at, now)}</time
						>
					</span>
				</span>
				{#if session.scorePct !== null}
					<span class="badge badge-soft badge-sm tabular-nums {scoreTone(session.scorePct)}"
						>{session.scorePct}%</span
					>
				{/if}
			</button>
		</li>
	{:else}
		<li class="px-5 py-12 text-center text-sm text-base-content/55">
			Nothing yet. Study sessions will appear here as they happen.
		</li>
	{/each}
</ul>

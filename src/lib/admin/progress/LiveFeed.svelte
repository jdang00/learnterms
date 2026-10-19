<script lang="ts">
	import type { Id } from '../../../convex/_generated/dataModel';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import Timer from '@lucide/svelte/icons/timer';
	import { fly } from 'svelte/transition';
	import { Badge } from '#lib/components/ui/badge/index.js';
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
		return score >= 80 ? 'success' : score >= 60 ? 'warning' : 'error';
	}
</script>

<ul class="divide-y divide-muted">
	{#each sessions as session (`${session.kind}:${session.userId}:${session.moduleTitle}:${session.startedAt}`)}
		{@const student = studentsById.get(session.userId)}
		{@const fresh = now - session.at < 15 * 60_000}
		<li in:fly={{ y: -8, duration: 300 }}>
			<button
				class="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-muted/60 sm:px-5"
				onclick={() => onStudent(session.userId)}
			>
				<span class="relative">
					<StudentAvatar name={student?.name ?? 'Student'} imageUrl={student?.imageUrl} size="sm" />
					{#if fresh}<span
							class="absolute -right-0.5 -bottom-0.5 inline-block size-2 rounded-full bg-success ring-2 ring-background"
							aria-label="Active now"
						></span>{/if}
				</span>
				<span class="min-w-0 flex-1 text-sm leading-snug">
					<span class="font-semibold">{student?.name ?? 'A student'}</span>
					{#if session.kind === 'practice'}
						<span class="text-foreground/70">
							tried {session.count}
							{session.count === 1 ? 'question' : 'questions'} in</span
						>
						<span class="font-medium"
							>{session.moduleEmoji ?? ''} {session.moduleTitle ?? session.className}</span
						>
					{:else if session.kind === 'quiz_submitted'}
						<span class="text-foreground/70"
							>finished a {session.count}-question practice test in</span
						>
						<span class="font-medium">{session.className}</span>
					{:else}
						<span class="text-foreground/70"
							>started a {session.count}-question practice test in</span
						>
						<span class="font-medium">{session.className}</span>
					{/if}
					<span class="mt-1 flex items-center gap-2 text-xs text-foreground/50">
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
					<Badge tone={scoreTone(session.scorePct)} size="sm" class="tabular-nums"
						>{session.scorePct}%</Badge
					>
				{/if}
			</button>
		</li>
	{:else}
		<li class="px-5 py-12 text-center text-sm text-foreground/55">
			Nothing yet. Study sessions will appear here as they happen.
		</li>
	{/each}
</ul>

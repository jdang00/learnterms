<script lang="ts">
	import type { Id } from '../../../convex/_generated/dataModel';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import Timer from '@lucide/svelte/icons/timer';
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import StudentAvatar from './StudentAvatar.svelte';
	import { relativeTime } from './utils';
	import { LIVE_MS } from './viz';

	type Session = {
		kind: 'practice' | 'quiz_started' | 'quiz_submitted';
		userId: Id<'users'>;
		startedAt: number;
		at: number;
		count: number;
		className: string;
		moduleId: Id<'module'> | null;
		moduleTitle: string | null;
		moduleEmoji: string | null;
		scorePct: number | null;
	};

	let {
		sessions,
		studentsById,
		now,
		onStudent,
		onModule
	}: {
		sessions: Session[];
		studentsById: Map<string, { name: string; imageUrl?: string }>;
		now: number;
		onStudent: (id: Id<'users'>) => void;
		onModule: (id: Id<'module'>) => void;
	} = $props();

	const scoreTone = (score: number) =>
		score >= 80 ? 'success' : score >= 60 ? 'warning' : 'error';
	const key = (s: Session) => `${s.kind}:${s.userId}:${s.moduleId ?? s.className}:${s.startedAt}`;
</script>

<ul class="divide-y divide-muted">
	{#each sessions as session (key(session))}
		{@const student = studentsById.get(session.userId)}
		{@const fresh = now - session.at < LIVE_MS}
		<li
			class="relative flex items-start gap-3 px-4 py-3 sm:px-5"
			in:fly={{ y: -10, duration: 350 }}
			animate:flip={{ duration: 300 }}
		>
			{#if fresh}<span class="absolute inset-y-2 left-0 w-0.5 rounded-full bg-success"></span>{/if}
			<button
				type="button"
				class="relative shrink-0 rounded-full {fresh ? 'motion-safe:animate-live-breathe' : ''}"
				aria-label="Open {student?.name ?? 'student'}"
				onclick={() => onStudent(session.userId)}
			>
				<StudentAvatar name={student?.name ?? 'Student'} imageUrl={student?.imageUrl} size="sm" />
			</button>
			<span class="min-w-0 flex-1 text-sm leading-snug">
				<button
					type="button"
					class="font-semibold hover:underline"
					onclick={() => onStudent(session.userId)}>{student?.name ?? 'A student'}</button
				>
				{#if session.kind === 'practice'}
					<span class="text-muted-foreground">
						tried {session.count}
						{session.count === 1 ? 'question' : 'questions'} in</span
					>
					{#if session.moduleId}
						{@const moduleId = session.moduleId}
						<button
							type="button"
							class="font-medium hover:text-primary-ink hover:underline"
							onclick={() => onModule(moduleId)}
							>{session.moduleEmoji ?? ''} {session.moduleTitle ?? session.className}</button
						>
					{:else}
						<span class="font-medium">{session.className}</span>
					{/if}
				{:else}
					<span class="text-muted-foreground"
						>{session.kind === 'quiz_submitted' ? 'finished' : 'started'} a {session.count}-question
						practice test in</span
					>
					<span class="font-medium">{session.className}</span>
				{/if}
				<span class="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
					{#if session.kind === 'practice'}
						{session.moduleTitle ? session.className : 'Practice'}
					{:else}
						{#if session.kind === 'quiz_submitted'}<ClipboardCheck size={12} />{:else}<Timer
								size={12}
							/>{/if}Practice test
					{/if}
					<span aria-hidden="true">·</span>
					<time
						class={fresh ? 'font-medium text-success-ink' : ''}
						datetime={new Date(session.at).toISOString()}>{relativeTime(session.at, now)}</time
					>
				</span>
			</span>
			{#if session.scorePct !== null}
				<Badge tone={scoreTone(session.scorePct)} size="sm" class="tabular-nums"
					>{session.scorePct}%</Badge
				>
			{/if}
		</li>
	{:else}
		<li class="px-5 py-12 text-center text-sm text-muted-foreground">No study sessions yet.</li>
	{/each}
</ul>

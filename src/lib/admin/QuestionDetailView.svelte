<script lang="ts">
	import { Pencil, Trash2, Copy, CopyPlus, ArrowRightLeft, Paperclip, Check, MoreVertical } from 'lucide-svelte';
	import { convertToDisplayFormat } from '$lib/utils/questionType.js';
	import type { Doc } from '../../convex/_generated/dataModel';

	type QuestionItem = Doc<'question'>;
	type MediaItem = {
		_id: string;
		url: string;
		altText: string;
		caption?: string;
	};
	type Option = { id: string; text: string };

	interface Props {
		question: QuestionItem;
		questionIndex: number;
		media?: MediaItem[];
		canEdit: boolean;
		variant?: 'desktop' | 'mobile';
		onEdit: () => void;
		onMove: () => void;
		onDuplicate: () => void;
		onDuplicateMany?: () => void;
		onDelete: () => void;
		onAttachmentClick?: (attachment: MediaItem) => void;
		isModuleFull?: boolean;
	}

	let {
		question,
		questionIndex,
		media = [],
		canEdit,
		variant = 'desktop',
		onEdit,
		onMove,
		onDuplicate,
		onDuplicateMany,
		onDelete,
		onAttachmentClick,
		isModuleFull = false
	}: Props = $props();

	const isMobile = $derived(variant === 'mobile');
	const isFillInTheBlank = $derived(question.type === 'fill_in_the_blank');
	const isMatching = $derived(question.type === 'matching');
	const isMultipleChoice = $derived(!isFillInTheBlank && !isMatching);

	// FITB helpers
	function decodeFitbAnswer(text: string): string {
		const [before] = String(text || '').split(' | flags=');
		const firstColon = before.indexOf(':');
		if (firstColon > -1) {
			const maybe = before.slice(0, firstColon);
			if (['exact', 'exact_cs', 'contains', 'regex'].includes(maybe)) {
				return before.slice(firstColon + 1);
			}
		}
		return before;
	}

	const fitbAnswers = $derived.by(() => {
		if (!isFillInTheBlank) return [];
		const answers = (question.correctAnswers || []) as string[];
		const opts = (question.options || []) as Option[];
		return answers.map((a) => {
			const fromOption = opts.find((o) => o.id === a)?.text;
			return decodeFitbAnswer(String(fromOption ?? a ?? ''));
		}).filter((t) => t.length > 0);
	});

	// Matching helpers
	const matchingPrompts = $derived.by(() => {
		if (!isMatching) return [];
		const opts = (question.options || []) as Option[];
		return opts.filter((o) => o.text.startsWith('prompt:'));
	});

	const matchingAnswers = $derived.by(() => {
		if (!isMatching) return [];
		const opts = (question.options || []) as Option[];
		return opts.filter((o) => o.text.startsWith('answer:'));
	});

	function getPromptLabel(text: string): string {
		return text.startsWith('prompt:') ? text.slice('prompt:'.length).trim() : text;
	}

	function getAnswerLabel(text: string): string {
		return text.startsWith('answer:') ? text.slice('answer:'.length).trim() : text;
	}

	function getCorrectAnswerForPrompt(promptId: string): string | undefined {
		const pair = (question.correctAnswers || []).find((cid: string) => String(cid).startsWith(`${promptId}::`));
		if (!pair) return undefined;
		const answerId = String(pair).split('::')[1];
		const answerOpt = matchingAnswers.find((a) => a.id === answerId);
		return answerOpt ? getAnswerLabel(answerOpt.text) : undefined;
	}
</script>

<div class="h-full flex flex-col overflow-hidden">
	<!-- Header -->
	<div class="flex items-center justify-between p-4 border-b border-base-300 {isMobile ? 'sticky top-0 z-10 bg-base-100' : ''}">
		<div class="flex items-center {isMobile ? 'gap-2' : 'gap-3'}">
			{#if questionIndex >= 0}
				<span class="text-sm font-medium whitespace-nowrap">Question #{questionIndex + 1}</span>
			{:else}
				<span class="text-sm font-medium whitespace-nowrap">Question #—</span>
			{/if}
			<div class="flex flex-wrap items-center gap-1">
				<span class="badge badge-xs badge-ghost text-xs">{convertToDisplayFormat(question.type)}</span>
				<span class="badge badge-xs {question.status === 'published' ? 'badge-success' : question.status === 'draft' ? 'badge-warning' : 'badge-neutral'}">{question.status}</span>
			</div>
		</div>
		{#if canEdit}
			<div class="flex items-center gap-1">
				<button class="btn btn-sm btn-ghost rounded-full gap-1" onclick={onEdit}>
					<Pencil size={14} />
					{#if !isMobile}Edit{/if}
				</button>
				<button class="btn btn-sm btn-ghost rounded-full gap-1" onclick={onMove}>
					<ArrowRightLeft size={14} />
					{#if !isMobile}Move{/if}
				</button>

				<div class="flex items-center">
					<button
						class="btn btn-sm btn-ghost rounded-full gap-1"
						onclick={onDuplicate}
						title={isModuleFull ? 'Module limit reached' : 'Duplicate question'}
					>
						<Copy size={14} />
						{#if !isMobile}Duplicate{/if}
					</button>
					{#if onDuplicateMany}
						<div class="dropdown dropdown-end">
							<button tabindex="0" class="btn btn-sm btn-ghost btn-circle">
								<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
								</svg>
							</button>
							<ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-2xl z-20 w-44 p-1 shadow-lg border border-base-300">
								<li>
									<button class="text-sm gap-2 rounded-xl" onclick={onDuplicateMany}>
										<CopyPlus size={14} />
										Duplicate many...
									</button>
								</li>
							</ul>
						</div>
					{/if}
				</div>

				<button class="btn btn-sm btn-ghost rounded-full text-error gap-1" onclick={onDelete}>
					<Trash2 size={14} />
					{#if !isMobile}Delete{/if}
				</button>
			</div>
		{/if}
	</div>

	<!-- Content -->
	<div class="flex-1 overflow-y-auto {isMobile ? 'p-4' : 'p-6 pb-12'} min-h-0">
		<!-- Question Stem -->
		<div class={isMobile ? 'mb-6' : 'mb-8'}>
			<div class="{isMobile ? 'text-base' : 'text-lg'} font-medium text-base-content leading-relaxed tiptap-content">{@html question.stem}</div>
		</div>

		<!-- Fill in the Blank -->
		{#if isFillInTheBlank}
			<div class={isMobile ? 'mb-4' : 'mb-6'}>
				<div class="text-xs font-semibold uppercase tracking-wide text-base-content/60 {isMobile ? 'mb-2' : 'mb-3'}">Accepted Answers</div>
				<div class="card bg-base-100 border border-base-300 shadow-sm rounded-3xl">
					<div class="card-body {isMobile ? 'p-3' : 'p-4'}">
						{#if fitbAnswers.length > 0}
							<div class="flex items-center gap-2 mb-2">
								<div class="badge badge-success gap-1">
									<Check size={12} />
									Primary
								</div>
								<span class="{isMobile ? 'text-base' : 'text-lg'} font-semibold">{fitbAnswers[0]}</span>
							</div>
							{#if fitbAnswers.length > 1}
								<div class="mt-3 pt-3 border-t border-base-200">
									<p class="text-xs text-base-content/60 mb-2">Alternate answers:</p>
									<ul class="space-y-1">
										{#each fitbAnswers.slice(1) as alt, i (i)}
											<li class="flex items-center gap-2 text-sm text-base-content/80">
												<span class="w-1.5 h-1.5 rounded-full bg-base-content/30"></span>
												{alt}
											</li>
										{/each}
									</ul>
								</div>
							{/if}
						{:else}
							<p class="text-sm text-base-content/60">No answers defined</p>
						{/if}
					</div>
				</div>
			</div>

		<!-- Matching -->
		{:else if isMatching}
			<div class={isMobile ? 'mb-4' : 'mb-6'}>
				<div class="text-xs font-semibold uppercase tracking-wide text-base-content/60 {isMobile ? 'mb-2' : 'mb-3'}">Matching Pairs</div>
				<div class={isMobile ? 'space-y-2' : 'space-y-3'}>
					{#each matchingPrompts as prompt (prompt.id)}
						{@const correctAnswer = getCorrectAnswerForPrompt(prompt.id)}
						<div class="flex items-center {isMobile ? 'gap-2' : 'gap-3'}">
							<!-- Prompt -->
							<div class="flex-1">
								<div class="rounded-3xl border-2 border-base-300 bg-base-200 {isMobile ? 'px-4 py-2' : 'px-5 py-3'}">
									<span class="font-semibold {isMobile ? 'text-xs' : 'text-sm'} tiptap-content">{@html getPromptLabel(prompt.text)}</span>
								</div>
							</div>
							<!-- Arrow -->
							<div class="text-base-content/40 flex-shrink-0">
								<svg class={isMobile ? 'w-4 h-4' : 'w-5 h-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
								</svg>
							</div>
							<!-- Answer -->
							<div class="flex-1">
								{#if correctAnswer}
									<div class="rounded-3xl border-2 border-success bg-success/10 {isMobile ? 'px-4 py-2' : 'px-5 py-3'} flex items-center gap-2">
										<Check size={isMobile ? 14 : 16} class="text-success flex-shrink-0" />
										<span class="{isMobile ? 'text-xs' : 'text-sm'} tiptap-content">{@html correctAnswer}</span>
									</div>
								{:else}
									<div class="rounded-3xl border-2 border-dashed border-base-300 bg-base-100 {isMobile ? 'px-4 py-2' : 'px-5 py-3'}">
										<span class="{isMobile ? 'text-xs' : 'text-sm'} text-base-content/40 italic">No match defined</span>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>

				{#if matchingAnswers.length > matchingPrompts.length}
					<div class="mt-4 pt-4 border-t border-base-200">
						<p class="text-xs text-base-content/50 mb-2">Available answers ({matchingAnswers.length}):</p>
						<div class="flex flex-wrap gap-2">
							{#each matchingAnswers as answer (answer.id)}
								<span class="badge badge-outline badge-sm">{getAnswerLabel(answer.text)}</span>
							{/each}
						</div>
					</div>
				{/if}
			</div>

		<!-- Multiple Choice / Multiple Select -->
		{:else if isMultipleChoice && question.options?.length}
			<div class={isMobile ? 'mb-4' : 'mb-6'}>
				<div class="text-xs font-semibold uppercase tracking-wide text-base-content/60 {isMobile ? 'mb-2' : 'mb-3'}">Options</div>
				<div class={isMobile ? 'space-y-2' : 'space-y-3'}>
					{#each question.options as option, optIndex (option.id)}
						<label class="label cursor-pointer rounded-full flex items-center {isMobile ? 'border p-1.5' : 'border-2 p-2'} transition-colors {question.correctAnswers.includes(option.id) ? 'border-success bg-success/5' : 'border-base-300 bg-base-200'}">
							<input
								type="checkbox"
								class="checkbox checkbox-primary {isMobile ? 'checkbox-xs ms-2' : 'checkbox-sm ms-3'}"
								checked={question.correctAnswers.includes(option.id)}
								disabled
							/>
							<span class="flex-grow text-wrap break-words {isMobile ? 'ml-2 text-xs' : 'ml-4 text-sm'} my-2">
								<span class="font-semibold mr-2 select-none">{String.fromCharCode(65 + optIndex)}.</span>
								<span class="tiptap-content">{@html option.text}</span>
							</span>
							{#if question.correctAnswers.includes(option.id)}
								<span class="text-success text-xs font-medium {isMobile ? 'mr-3' : 'mr-4'} flex-shrink-0">{isMobile ? '✓' : '✓ Correct'}</span>
							{/if}
						</label>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Explanation -->
			{#if question.explanation}
				<div class={isMobile ? 'mb-4' : 'mb-6'}>
					<div class="text-xs font-semibold uppercase tracking-wide text-base-content/60" class:mb-2={isMobile} class:mb-3={!isMobile}>Explanation</div>
					<div class="rounded-2xl border border-base-300 bg-base-200/30" class:p-3={isMobile} class:p-4={!isMobile}>
						<div class="text-sm text-base-content/80 tiptap-content">{@html question.explanation}</div>
					</div>
				</div>
		{/if}

		<!-- Attachments (desktop only) -->
		{#if !isMobile && media && media.length > 0}
			<div class="mb-6">
				<div class="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-3 flex items-center gap-2">
					<Paperclip size={14} />
					Attachments ({media.length})
				</div>
				<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
					{#each media as attachment (attachment._id)}
						<button
							class="group border-2 border-base-300 rounded-2xl overflow-hidden cursor-pointer hover:border-primary hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
							onclick={() => onAttachmentClick?.(attachment)}
							aria-label={`View attachment: ${attachment.altText}`}
						>
							<div class="relative overflow-hidden">
								<img
									src={attachment.url}
									alt={attachment.altText}
									class="w-full h-28 object-cover group-hover:brightness-110 group-hover:scale-105 transition-all duration-200"
								/>
								<div class="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors duration-200"></div>
								{#if attachment.caption}
									<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
										<p class="text-white text-xs truncate">{attachment.caption}</p>
									</div>
								{/if}
							</div>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Attribution & timestamps -->
		<div class="{isMobile ? 'mt-6' : 'mt-8'} pt-4 border-t border-base-200">
			<div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/40">
				{#if question.createdBy}
					<span class="flex items-center gap-1.5">
						<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
						</svg>
						{question.createdBy.firstName} {question.createdBy.lastName}
					</span>
				{:else if question.aiGenerated}
					<span>AI generated</span>
				{/if}
				{#if question._creationTime}
					<span class="flex items-center gap-1">
						{#if question.createdBy || question.aiGenerated}<span class="text-base-content/25">&middot;</span>{/if}
						Created {new Date(question._creationTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
					</span>
				{/if}
				{#if question.updatedAt && question._creationTime && question.updatedAt - question._creationTime > 60_000}
					<span class="flex items-center gap-1">
						<span class="text-base-content/25">&middot;</span>
						Updated {new Date(question.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
					</span>
				{/if}
			</div>
		</div>
	</div>
</div>

<script lang="ts">
	import { Pencil, Trash2, Copy, ArrowRightLeft, Paperclip, Check } from 'lucide-svelte';
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
		<div class="flex items-center gap-{isMobile ? '2' : '3'}">
			{#if questionIndex >= 0}
				<span class="text-sm font-medium">Question #{questionIndex + 1}</span>
			{:else}
				<span class="text-sm font-medium">Question #—</span>
			{/if}
			<div class="flex items-center gap-1">
				{#if question.aiGenerated}
					<span class="badge badge-xs badge-info">AI</span>
				{:else}
					<span class="badge badge-xs badge-success">User</span>
				{/if}
				<span class="badge badge-xs badge-ghost">{convertToDisplayFormat(question.type)}</span>
				<span class="badge badge-xs {question.status === 'published' ? 'badge-success' : question.status === 'draft' ? 'badge-warning' : 'badge-neutral'}">{question.status}</span>
			</div>
		</div>
		{#if canEdit}
			<div class="flex items-center gap-1">
				<button class="btn btn-sm btn-ghost gap-1" onclick={onEdit}>
					<Pencil size={14} />
					{#if !isMobile}Edit{/if}
				</button>
				<button class="btn btn-sm btn-ghost gap-1" onclick={onMove}>
					<ArrowRightLeft size={14} />
					{#if !isMobile}Move{/if}
				</button>
				<div class="tooltip tooltip-bottom" data-tip={isModuleFull ? 'Module limit reached' : 'Duplicate question'}>
					<button class="btn btn-sm btn-ghost gap-1" onclick={onDuplicate}>
						<Copy size={14} />
						{#if !isMobile}Duplicate{/if}
					</button>
				</div>
				<button class="btn btn-sm btn-ghost {isMobile ? 'btn-error' : 'text-error'} gap-1" onclick={onDelete}>
					<Trash2 size={14} />
				</button>
			</div>
		{/if}
	</div>

	<!-- Content -->
	<div class="flex-1 overflow-y-auto p-{isMobile ? '4' : '6'} {isMobile ? '' : 'pb-12'} min-h-0">
		<!-- Question Stem -->
		<div class="mb-{isMobile ? '6' : '8'}">
			<div class="text-{isMobile ? 'base' : 'lg'} font-medium text-base-content leading-relaxed tiptap-content">{@html question.stem}</div>
		</div>

		<!-- Fill in the Blank -->
		{#if isFillInTheBlank}
			<div class="mb-{isMobile ? '4' : '6'}">
				<div class="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-{isMobile ? '2' : '3'}">Accepted Answers</div>
				<div class="card bg-base-100 border border-base-300 shadow-sm">
					<div class="card-body p-{isMobile ? '3' : '4'}">
						{#if fitbAnswers.length > 0}
							<div class="flex items-center gap-2 mb-2">
								<div class="badge badge-success gap-1">
									<Check size={12} />
									Primary
								</div>
								<span class="text-{isMobile ? 'base' : 'lg'} font-semibold">{fitbAnswers[0]}</span>
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
			<div class="mb-{isMobile ? '4' : '6'}">
				<div class="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-{isMobile ? '2' : '3'}">Matching Pairs</div>
				<div class="space-y-{isMobile ? '2' : '3'}">
					{#each matchingPrompts as prompt (prompt.id)}
						{@const correctAnswer = getCorrectAnswerForPrompt(prompt.id)}
						<div class="flex items-center gap-{isMobile ? '2' : '3'}">
							<!-- Prompt -->
							<div class="flex-1">
								<div class="rounded-full border-2 border-base-300 bg-base-200 px-{isMobile ? '3' : '4'} py-{isMobile ? '2' : '3'}">
									<span class="font-semibold text-{isMobile ? 'xs' : 'sm'} tiptap-content">{@html getPromptLabel(prompt.text)}</span>
								</div>
							</div>
							<!-- Arrow -->
							<div class="text-base-content/40 flex-shrink-0">
								<svg class="w-{isMobile ? '4' : '5'} h-{isMobile ? '4' : '5'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
								</svg>
							</div>
							<!-- Answer -->
							<div class="flex-1">
								{#if correctAnswer}
									<div class="rounded-full border-2 border-success bg-success/10 px-{isMobile ? '3' : '4'} py-{isMobile ? '2' : '3'} flex items-center gap-2">
										<Check size={isMobile ? 14 : 16} class="text-success flex-shrink-0" />
										<span class="text-{isMobile ? 'xs' : 'sm'} tiptap-content">{@html correctAnswer}</span>
									</div>
								{:else}
									<div class="rounded-full border-2 border-dashed border-base-300 bg-base-100 px-{isMobile ? '3' : '4'} py-{isMobile ? '2' : '3'}">
										<span class="text-{isMobile ? 'xs' : 'sm'} text-base-content/40 italic">No match defined</span>
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
			<div class="mb-{isMobile ? '4' : '6'}">
				<div class="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-{isMobile ? '2' : '3'}">Options</div>
				<div class="space-y-{isMobile ? '2' : '3'}">
					{#each question.options as option, optIndex (option.id)}
						<label class="label cursor-pointer rounded-full flex items-center border{isMobile ? '' : '-2'} transition-colors p-{isMobile ? '2' : '2.5'} {question.correctAnswers.includes(option.id) ? 'border-success bg-success/5' : 'border-base-300 bg-base-200'}">
							<input
								type="checkbox"
								class="checkbox checkbox-primary checkbox-xs ms-{isMobile ? '2' : '3'}"
								checked={question.correctAnswers.includes(option.id)}
								disabled
							/>
							<span class="flex-grow text-wrap break-words ml-{isMobile ? '2' : '3'} my-2 text-{isMobile ? 'xs' : 'sm'}">
								<span class="font-semibold mr-2 select-none">{String.fromCharCode(65 + optIndex)}.</span>
								<span class="tiptap-content">{@html option.text}</span>
							</span>
							{#if question.correctAnswers.includes(option.id)}
								<span class="text-success text-xs font-medium mr-{isMobile ? '2' : '3'} flex-shrink-0">{isMobile ? '✓' : '✓ Correct'}</span>
							{/if}
						</label>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Explanation -->
		{#if question.explanation}
			<div class="mb-{isMobile ? '4' : '6'}">
				<div class="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-{isMobile ? '2' : '3'}">Explanation</div>
				<div class="p-{isMobile ? '3' : '4'} rounded-lg border border-base-300 bg-base-200/30">
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
							class="group border-2 border-base-300 rounded-lg overflow-hidden cursor-pointer hover:border-primary hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
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

		<!-- Created by -->
		{#if question.createdBy}
			<div class="mt-{isMobile ? '6' : '8'} pt-4 border-t border-base-200">
				<div class="flex items-center gap-1.5 text-xs text-base-content/40">
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
					</svg>
					<span>Created by {question.createdBy.firstName} {question.createdBy.lastName}</span>
				</div>
			</div>
		{/if}
	</div>
</div>

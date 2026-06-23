<script lang="ts">
	import { Hash } from 'lucide-svelte';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';
	import type { CandidateQuestion } from './questionStudioTypes';

	interface Props {
		candidate: CandidateQuestion;
		index: number;
		isActive: boolean;
		isIncluded: boolean;
		onSelect: () => void;
		onToggleInclude: () => void;
	}

	let { candidate, index, isActive, isIncluded, onSelect, onToggleInclude }: Props = $props();

	const riskDot = $derived(
		candidate.duplicateRisk === 'high'
			? 'bg-error'
			: candidate.duplicateRisk === 'medium'
				? 'bg-warning'
				: 'bg-success'
	);
</script>

<div
	role="button"
	tabindex="0"
	class="cursor-pointer rounded-2xl px-3 py-2.5 transition-all
		{isActive
		? 'border border-primary/30 bg-primary/8 hover:bg-primary/12'
		: 'border border-base-300/60 bg-base-100 hover:border-base-300 hover:bg-base-200/40'}"
	onclick={onSelect}
	onkeydown={(e) => e.key === 'Enter' && onSelect()}
>
	<div class="flex items-start gap-3">
		<input
			type="checkbox"
			class="checkbox checkbox-sm checkbox-primary mt-0.5 shrink-0"
			aria-label="Include candidate in save"
			checked={isIncluded}
			onclick={(e) => {
				e.stopPropagation();
				onToggleInclude();
			}}
		/>
		<div class="min-w-0 flex-1">
			<div class="mb-1 flex flex-wrap items-center gap-2">
				<span class="text-xs font-medium text-base-content/50">#{index + 1}</span>
				<span
					class="rounded-sm bg-base-200 px-1.5 py-0.5 text-[10px] font-medium uppercase text-base-content/60"
				>
					MC
				</span>
				<span
					class="rounded-sm border border-base-300 px-1.5 py-0.5 text-[10px] font-medium capitalize text-base-content/55"
				>
					{candidate.reasoningOrder} order
				</span>
				<span
					class="h-2 w-2 shrink-0 rounded-full {riskDot}"
					title="{candidate.duplicateRisk} duplicate risk"
				></span>
			</div>
			<p class="line-clamp-2 text-sm leading-snug text-base-content tiptap-content-inline">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html sanitizeHtml(candidate.stem)}
			</p>
			<div class="mt-1.5 flex items-center gap-1 text-[11px] text-base-content/40">
				<Hash size={11} />
				<span class="truncate"
					>{candidate.topicTitle} · pages {candidate.sourcePageNumbers.join(', ')}</span
				>
			</div>
		</div>
	</div>
</div>

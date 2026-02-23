<script lang="ts">
	import { Paperclip, GripVertical } from 'lucide-svelte';
	import { abbreviateType } from '$lib/utils/questionType.js';
	import type { Doc } from '../../convex/_generated/dataModel';

	type QuestionItem = Doc<'question'>;

	interface Props {
		question: QuestionItem;
		index: number;
		isSelected: boolean;
		isHighlighted: boolean;
		hasAttachment: boolean;
		isRecentlyAdded: boolean;
		variant?: 'mobile' | 'desktop';
		reorderMode?: boolean;
		onSelect: () => void;
		onToggleSelection: () => void;
	}

	let {
		question,
		index,
		isSelected,
		isHighlighted,
		hasAttachment,
		isRecentlyAdded,
		variant = 'desktop',
		reorderMode = false,
		onSelect,
		onToggleSelection
	}: Props = $props();

	const isMobile = $derived(variant === 'mobile');
	const checkboxSize = $derived(isMobile ? 'checkbox-xs' : 'checkbox-sm');
	const textSize = $derived(isMobile ? 'text-xs' : 'text-sm');
	const typeSize = $derived(isMobile ? 'text-[9px]' : 'text-[10px]');
	const dotSize = $derived(isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2');
	const iconSize = $derived(isMobile ? 10 : 12);
</script>

{#if reorderMode}
	<!-- Reorder mode: simplified view with grip handle -->
	<div
		class="px-3 py-2.5 rounded-2xl transition-all cursor-grab active:cursor-grabbing hover:bg-base-200/40 hover:border-base-300
			{isRecentlyAdded ? 'bg-success/5' : ''} border border-base-300/60 bg-base-100"
	>
		<div class="flex items-center {isMobile ? 'gap-2' : 'gap-3'}">
			<GripVertical size={16} class="text-base-content/30 flex-shrink-0" />
			<span class="text-xs font-medium text-base-content/50 {isMobile ? '' : 'w-6'}">#{index + 1}</span>
			<p class="flex-1 {textSize} text-base-content {isMobile ? 'line-clamp-2' : 'truncate'} tiptap-content-inline">{@html question.stem}</p>
		</div>
	</div>
{:else}
	<!-- Normal view: full question item with selection -->
	<div
		role="button"
		tabindex="0"
		class="px-3 py-2.5 rounded-2xl transition-all cursor-pointer
			{isHighlighted
				? 'bg-primary/8 border border-primary/30 hover:bg-primary/12'
				: 'border border-base-300/60 bg-base-100 hover:bg-base-200/40 hover:border-base-300'}
			{isRecentlyAdded ? 'bg-success/5' : ''}"
		onclick={onSelect}
		onkeydown={(e) => e.key === 'Enter' && onSelect()}
	>
		<div class="flex items-start {isMobile ? 'gap-2' : 'gap-3'}">
			<input
				type="checkbox"
				class="checkbox {checkboxSize} checkbox-primary mt-0.5 flex-shrink-0"
				aria-label="Select question"
				checked={isSelected}
				onclick={(e) => {
					e.stopPropagation();
					onToggleSelection();
				}}
			/>
			<div class="flex-1 min-w-0">
				<div class="flex items-center {isMobile ? 'gap-1.5' : 'gap-2'} mb-1">
					<span class="text-xs font-medium text-base-content/50">#{index + 1}</span>
					<span class="{typeSize} {isMobile ? 'px-1' : 'px-1.5'} py-0.5 rounded bg-base-200 text-base-content/60 uppercase font-medium whitespace-nowrap">
						{abbreviateType(question.type)}
					</span>
					<span class="{dotSize} rounded-full flex-shrink-0
						{question.status === 'published' ? 'bg-success' : question.status === 'draft' ? 'bg-warning' : 'bg-base-300'}"
						title={question.status}></span>
					{#if hasAttachment}
						<Paperclip size={iconSize} class="text-base-content/40" />
					{/if}
				</div>
				<p class="{textSize} text-base-content leading-snug line-clamp-2 tiptap-content-inline">{@html question.stem}</p>
			</div>
		</div>
	</div>
{/if}

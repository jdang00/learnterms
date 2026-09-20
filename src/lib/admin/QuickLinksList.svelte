<script lang="ts">
	import { Eye, EyeOff, GripVertical, Plus, TriangleAlert } from 'lucide-svelte';
	import type { QuickLinkItem } from '$lib/components/power-bar/types';
	type LinkCategory = 'visible' | 'hidden';
	let {
		draftLinks = $bindable(),
		selectedIndex = $bindable(),
		linkError,
		setLinkHidden,
		addLink
	}: {
		draftLinks: QuickLinkItem[];
		selectedIndex: number;
		linkError: (link: QuickLinkItem) => string;
		setLinkHidden: (index: number, hidden: boolean) => void;
		addLink: () => void;
	} = $props();
	let dragIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);
	let dragOverCategory = $state<LinkCategory | null>(null);
	const visibleLinks = $derived.by(() =>
		draftLinks.map((link, index) => ({ link, index })).filter((item) => !item.link.hidden)
	);
	const hiddenLinks = $derived.by(() =>
		draftLinks.map((link, index) => ({ link, index })).filter((item) => item.link.hidden)
	);
	function dropLink(targetCategory: LinkCategory, targetIndex?: number) {
		if (dragIndex === null) return;

		const moved = { ...draftLinks[dragIndex], hidden: targetCategory === 'hidden' };
		const next = draftLinks.filter((_, index) => index !== dragIndex);
		const destinationIndexes = next
			.map((link, index) => ({ link, index }))
			.filter((item) => (targetCategory === 'hidden' ? item.link.hidden : !item.link.hidden))
			.map((item) => item.index);
		const insertionIndex =
			targetIndex == null
				? (destinationIndexes.at(-1) ?? next.length - 1) + 1
				: Math.max(0, targetIndex > dragIndex ? targetIndex - 1 : targetIndex);

		next.splice(Math.min(insertionIndex, next.length), 0, moved);
		draftLinks = next;
		selectedIndex = next.findIndex((link) => link === moved);
	}

	function handleDrop(targetCategory: LinkCategory, targetIndex?: number) {
		dropLink(targetCategory, targetIndex);
		dragIndex = null;
		dragOverIndex = null;
		dragOverCategory = null;
	}
</script>

<!-- Master: list rail -->
<div class="flex min-h-0 flex-col border-b border-base-300 md:border-b-0 md:border-r">
	<div class="px-4 pt-4 pb-2">
		<span class="text-[11px] font-semibold uppercase tracking-wider text-base-content/45">
			{draftLinks.length} of 12
		</span>
	</div>

	<div class="min-h-[7rem] flex-1 overflow-y-auto px-2 pb-2 md:max-h-none">
		<div
			role="list"
			aria-label="Shown quick links"
			class="rounded-2xl border border-transparent p-1 transition
								{dragOverCategory === 'visible' ? 'border-primary/50 bg-primary/5' : ''}"
			ondragover={(event) => {
				event.preventDefault();
				dragOverCategory = 'visible';
			}}
			ondragleave={(event) => {
				if (event.currentTarget === event.target) dragOverCategory = null;
			}}
			ondrop={(event) => {
				event.preventDefault();
				handleDrop('visible');
			}}
		>
			<div class="mb-1 flex items-center justify-between px-2">
				<span class="text-[11px] font-semibold uppercase tracking-wider text-base-content/45">
					Shown
				</span>
				<span class="text-[10px] text-base-content/35">{visibleLinks.length}</span>
			</div>
			<div class="space-y-1">
				{#each visibleLinks as item (item.index)}
					{@const link = item.link}
					{@const index = item.index}
					{@const error = linkError(link)}
					<div
						role="button"
						tabindex="0"
						aria-current={index === selectedIndex}
						draggable="true"
						ondragstart={() => (dragIndex = index)}
						ondragover={(event) => {
							event.preventDefault();
							dragOverIndex = index;
							dragOverCategory = 'visible';
						}}
						ondragleave={() => {
							if (dragOverIndex === index) dragOverIndex = null;
						}}
						ondrop={(event) => {
							event.preventDefault();
							handleDrop('visible', index);
						}}
						ondragend={() => {
							dragIndex = null;
							dragOverIndex = null;
							dragOverCategory = null;
						}}
						onclick={() => (selectedIndex = index)}
						onkeydown={(event) => {
							if (event.key === 'Enter' || event.key === ' ') {
								event.preventDefault();
								selectedIndex = index;
							}
						}}
						class="group flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all duration-150
											{index === selectedIndex
							? 'border-primary/40 bg-primary/10 shadow-xs'
							: 'border-transparent hover:bg-base-200/70'}
											{dragOverIndex === index && dragIndex !== index ? 'border-primary/60 border-dashed' : ''}
											{dragIndex === index ? 'opacity-40' : ''}"
					>
						<GripVertical
							size={15}
							class="shrink-0 cursor-grab text-base-content/25 transition group-hover:text-base-content/45"
						/>
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-base-200 text-base"
						>
							{link.icon || '🔗'}
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm font-semibold">
								{link.title || 'Untitled link'}
							</span>
						</span>
						{#if error}
							<span class="shrink-0 text-warning" title={error}>
								<TriangleAlert size={14} />
							</span>
						{/if}
						<button
							class="btn btn-ghost btn-xs btn-circle shrink-0 opacity-0 transition group-hover:opacity-100"
							onclick={(event) => {
								event.stopPropagation();
								setLinkHidden(index, true);
							}}
							aria-label="Hide link"
						>
							<EyeOff size={14} />
						</button>
					</div>
				{/each}
			</div>
		</div>

		<div
			role="list"
			aria-label="Hidden quick links"
			class="mt-3 rounded-2xl border border-base-300/60 bg-base-200/35 p-1 transition
								{dragOverCategory === 'hidden' ? 'border-primary/50 bg-primary/5' : ''}"
			ondragover={(event) => {
				event.preventDefault();
				dragOverCategory = 'hidden';
			}}
			ondragleave={(event) => {
				if (event.currentTarget === event.target) dragOverCategory = null;
			}}
			ondrop={(event) => {
				event.preventDefault();
				handleDrop('hidden');
			}}
		>
			<div class="mb-1 flex items-center justify-between px-2">
				<span class="text-[11px] font-semibold uppercase tracking-wider text-base-content/45">
					Hidden
				</span>
				<span class="text-[10px] text-base-content/35">{hiddenLinks.length}</span>
			</div>
			{#if hiddenLinks.length === 0}
				<div
					class="rounded-xl border border-dashed border-base-300 px-3 py-4 text-center text-xs text-base-content/40"
				>
					Drag links here to hide them.
				</div>
			{:else}
				<div class="space-y-1">
					{#each hiddenLinks as item (item.index)}
						{@const link = item.link}
						{@const index = item.index}
						{@const error = linkError(link)}
						<div
							role="button"
							tabindex="0"
							aria-current={index === selectedIndex}
							draggable="true"
							ondragstart={() => (dragIndex = index)}
							ondragover={(event) => {
								event.preventDefault();
								dragOverIndex = index;
								dragOverCategory = 'hidden';
							}}
							ondragleave={() => {
								if (dragOverIndex === index) dragOverIndex = null;
							}}
							ondrop={(event) => {
								event.preventDefault();
								handleDrop('hidden', index);
							}}
							ondragend={() => {
								dragIndex = null;
								dragOverIndex = null;
								dragOverCategory = null;
							}}
							onclick={() => (selectedIndex = index)}
							onkeydown={(event) => {
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault();
									selectedIndex = index;
								}
							}}
							class="group flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left opacity-80 transition-all duration-150
												{index === selectedIndex
								? 'border-primary/40 bg-primary/10 shadow-xs opacity-100'
								: 'border-transparent hover:bg-base-100/70 hover:opacity-100'}
												{dragOverIndex === index && dragIndex !== index ? 'border-primary/60 border-dashed' : ''}
												{dragIndex === index ? 'opacity-40' : ''}"
						>
							<GripVertical
								size={15}
								class="shrink-0 cursor-grab text-base-content/25 transition group-hover:text-base-content/45"
							/>
							<span
								class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-base-300 text-base grayscale"
							>
								{link.icon || '🔗'}
							</span>
							<span class="min-w-0 flex-1">
								<span class="block truncate text-sm font-semibold">
									{link.title || 'Untitled link'}
								</span>
							</span>
							{#if error}
								<span class="shrink-0 text-warning" title={error}>
									<TriangleAlert size={14} />
								</span>
							{/if}
							<button
								class="btn btn-ghost btn-xs btn-circle shrink-0 opacity-0 transition group-hover:opacity-100"
								onclick={(event) => {
									event.stopPropagation();
									setLinkHidden(index, false);
								}}
								aria-label="Show link"
							>
								<Eye size={14} />
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<div class="border-t border-base-300 p-2">
		<button
			class="btn btn-ghost btn-sm w-full justify-start gap-2 rounded-xl"
			onclick={addLink}
			disabled={draftLinks.length >= 12}
		>
			<Plus size={16} />
			<span>Add quick link</span>
		</button>
	</div>
</div>

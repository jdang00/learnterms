<script lang="ts" module>
	export type PickerAnswer = {
		id: string;
		label: string;
		letter: string;
		/** Another prompt already holds this answer; picking it moves it here. */
		used?: boolean;
	};
</script>

<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Check from '@lucide/svelte/icons/check';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import { Command } from 'bits-ui';
	import { MediaQuery } from 'svelte/reactivity';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import * as InputGroup from '#lib/components/ui/input-group/index.js';
	import * as Popover from '#lib/components/ui/popover/index.js';

	// The answer chip of one row. A popover on desktop, a bottom sheet on phones; answers wrap
	// instead of truncating, and a dimmed answer (used by another prompt) moves here when picked.
	let {
		prompt,
		answers,
		value,
		disabled = false,
		onSelect,
		onClear
	}: {
		prompt: string;
		answers: PickerAnswer[];
		value?: string;
		disabled?: boolean;
		onSelect: (answerId: string) => void;
		onClear: () => void;
	} = $props();

	const SEARCH_AT = 7;
	const wide = new MediaQuery('(min-width: 640px)');
	let open = $state(false);
	let search = $state('');
	let searchInput = $state<HTMLInputElement | null>(null);

	const selected = $derived(answers.find((answer) => answer.id === value));
	const showSearch = $derived(wide.current || answers.length >= SEARCH_AT);
	const visible = $derived.by(() => {
		const query = search.trim().toLowerCase();
		if (!query) return answers;
		return answers.filter(
			(answer) =>
				answer.label.toLowerCase().includes(query) || answer.letter.toLowerCase() === query
		);
	});

	function setOpen(next: boolean) {
		open = next && !disabled;
		if (open) search = '';
	}

	function choose(answerId: string) {
		if (answerId !== value) onSelect(answerId);
		open = false;
	}

	// Focusing before the popover is positioned scrolls the page to its starting corner.
	function focusSearch(event: Event) {
		event.preventDefault();
		requestAnimationFrame(() => searchInput?.focus({ preventScroll: true }));
	}

	function clearFromKeyboard(event: KeyboardEvent) {
		if (!value || disabled || (event.key !== 'Backspace' && event.key !== 'Delete')) return;
		event.preventDefault();
		onClear();
	}
</script>

{#snippet trigger(props: Record<string, unknown>)}
	<button
		{...props}
		type="button"
		{disabled}
		onkeydown={clearFromKeyboard}
		aria-label={`${prompt}: ${selected ? `${selected.letter}. ${selected.label}` : 'no match chosen'}`}
		class="group flex min-h-12 w-full min-w-0 items-start gap-2.5 rounded-3xl border-2 bg-background py-2.5 ps-4 text-left text-sm leading-snug outline-none transition-[border-color,box-shadow,background-color] duration-150 focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 data-[state=open]:border-primary/50 data-[state=open]:ring-3 data-[state=open]:ring-primary/15 {selected
			? 'border-border pe-11 text-foreground hover:border-foreground/20'
			: 'border-dashed border-border pe-4 text-muted-foreground hover:border-primary/40'}"
	>
		{#if selected}
			<span
				class="mt-px inline-grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-muted px-1 text-[0.6875rem] font-semibold tabular-nums text-muted-foreground"
				>{selected.letter}</span
			>
			<span class="min-w-0 flex-1 self-center wrap-break-word">{selected.label}</span>
		{:else}
			<span class="min-w-0 flex-1 self-center">Select a choice</span>
			<ChevronDown
				size={16}
				class="mt-0.5 shrink-0 transition-transform duration-150 group-data-[state=open]:rotate-180"
				aria-hidden="true"
			/>
		{/if}
	</button>
{/snippet}

{#snippet list()}
	<Command.Root
		shouldFilter={false}
		loop
		disableInitialScroll
		class="flex min-h-0 flex-1 flex-col gap-2"
	>
		{#if showSearch}
			<InputGroup.Root class="h-9 shrink-0 max-sm:mx-2 max-sm:h-11">
				<InputGroup.Addon><Search /></InputGroup.Addon>
				<Command.Input placeholder="Search {answers.length} answers" bind:value={search}>
					{#snippet child({ props })}
						<InputGroup.Input
							{...props}
							bind:ref={searchInput}
							bind:value={search}
							class="text-sm"
						/>
					{/snippet}
				</Command.Input>
			</InputGroup.Root>
		{/if}
		<Command.List class="min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-label="Answers">
			<Command.Viewport class="flex flex-col gap-0.5">
				{#each visible as answer (answer.id)}
					{@const isSelected = answer.id === value}
					<Command.Item
						value={answer.id}
						onSelect={() => choose(answer.id)}
						class="flex w-full cursor-pointer items-start gap-2.5 rounded-2xl px-2.5 py-2 text-left text-sm leading-snug outline-hidden data-selected:bg-foreground/6 max-sm:py-2.5 {isSelected
							? 'bg-primary/8 text-foreground'
							: answer.used
								? 'text-foreground/45'
								: 'text-foreground'}"
					>
						<span
							class="mt-px inline-grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1 text-[0.6875rem] font-semibold tabular-nums {isSelected
								? 'bg-primary text-primary-foreground'
								: 'bg-muted text-muted-foreground'}">{answer.letter}</span
						>
						<span class="min-w-0 flex-1 wrap-break-word"
							>{answer.label}{#if answer.used && !isSelected}<span class="sr-only">
									(used)</span
								>{/if}</span
						>
						{#if isSelected}
							<Check size={16} class="mt-0.5 shrink-0 text-primary-ink" aria-hidden="true" />
						{/if}
					</Command.Item>
				{:else}
					<p class="px-2.5 py-3 text-sm text-muted-foreground" role="status">
						No answers match “{search}”
					</p>
				{/each}
			</Command.Viewport>
		</Command.List>
	</Command.Root>
{/snippet}

<div class="relative">
	{#if wide.current}
		<Popover.Root bind:open={() => open, setOpen}>
			<Popover.Trigger {disabled}>
				{#snippet child({ props })}{@render trigger(props)}{/snippet}
			</Popover.Trigger>
			<Popover.Content
				align="start"
				sideOffset={6}
				collisionPadding={12}
				onOpenAutoFocus={focusSearch}
				class="max-h-[min(28rem,var(--bits-popover-content-available-height))] w-[min(max(var(--bits-popover-anchor-width),20rem),calc(100vw-24px))] gap-0 overflow-hidden p-2"
			>
				{@render list()}
			</Popover.Content>
		</Popover.Root>
	{:else}
		<Dialog.Root bind:open={() => open, setOpen}>
			<Dialog.Trigger {disabled}>
				{#snippet child({ props })}{@render trigger(props)}{/snippet}
			</Dialog.Trigger>
			<Dialog.Content
				sheet
				showCloseButton={false}
				class="flex max-h-[85dvh] flex-col gap-0 p-0"
				onOpenAutoFocus={(event) => event.preventDefault()}
			>
				<header class="flex items-center gap-3 px-5 pt-5 pb-3">
					<Dialog.Title class="min-w-0 flex-1 text-base font-semibold leading-snug wrap-break-word"
						>{prompt}</Dialog.Title
					>
					<Dialog.Close>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								tone="neutral"
								size="sm"
								shape="circle"
								class="shrink-0 bg-muted text-muted-foreground hover:bg-muted-strong"
								aria-label="Close"
							>
								<X size={16} />
							</Button>
						{/snippet}
					</Dialog.Close>
				</header>
				<Dialog.Description class="sr-only"
					>Choose the answer that matches {prompt}.</Dialog.Description
				>
				<div
					class="flex min-h-0 flex-1 flex-col px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
				>
					{@render list()}
				</div>
			</Dialog.Content>
		</Dialog.Root>
	{/if}
	{#if selected && !disabled}
		<button
			type="button"
			class="absolute end-2 top-2 grid size-8 place-items-center rounded-full text-foreground/40 transition-colors hover:bg-muted hover:text-foreground"
			aria-label={`Clear match for ${prompt}`}
			onclick={onClear}
		>
			<X size={16} />
		</button>
	{/if}
</div>

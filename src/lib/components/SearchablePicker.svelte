<script lang="ts">
	import { tick, type Snippet } from 'svelte';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';

	interface Option {
		value: string;
		label: string;
		detail?: string;
	}
	let {
		label,
		options,
		value = '',
		placeholder,
		disabled = false,
		size = 'sm',
		open = $bindable(false),
		search = $bindable(''),
		onSelect,
		icon,
		header
	}: {
		label: string;
		options: Option[];
		value?: string;
		placeholder: string;
		disabled?: boolean;
		size?: 'sm' | 'md';
		open?: boolean;
		search?: string;
		onSelect: (value: string) => void;
		icon?: Snippet;
		header?: Snippet;
	} = $props();
	const id = $props.id();
	let trigger = $state<HTMLElement | null>(null);
	let panel: HTMLDivElement;
	let input = $state<HTMLElement | null>(null);
	let left = $state(0);
	let top = $state(0);
	let height = $state(360);
	let active = $state(-1);

	function position() {
		if (!trigger) return;
		const rect = trigger.getBoundingClientRect();
		const width = Math.min(size === 'md' ? 384 : 352, window.innerWidth - 24);
		left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
		const below = window.innerHeight - rect.bottom - 20;
		const above = rect.top - 20;
		height = Math.min(360, Math.max(below, above));
		top = below >= Math.min(360, above) ? rect.bottom + 8 : Math.max(12, rect.top - height - 8);
	}
	function close(restore = false) {
		open = false;
		panel?.hidePopover();
		if (restore) trigger?.focus();
	}
	$effect(() => {
		if (open && !disabled) {
			search = '';
			active = -1;
			position();
			panel.showPopover();
			void tick().then(() => input?.focus());
		} else panel?.hidePopover();
	});
	function choose(option: Option) {
		onSelect(option.value);
		close(true);
	}
	function keydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			close(true);
		}
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			active = options.length
				? (active + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length
				: -1;
			void tick().then(() =>
				document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: 'nearest' })
			);
		}
		if (event.key === 'Enter' && options[active]) {
			event.preventDefault();
			choose(options[active]);
		}
	}
</script>

<svelte:window onresize={() => open && position()} onscroll={() => open && position()} />
<Button
	bind:ref={trigger}
	variant="soft"
	tone="neutral"
	size={size === 'md' ? 'md' : 'sm'}
	class="max-w-full min-w-0 gap-2 align-middle font-medium {size === 'md'
		? 'mx-1.5 text-base'
		: 'px-4 text-sm'}"
	{disabled}
	title={label}
	aria-label={`${placeholder}: ${label}`}
	aria-haspopup="dialog"
	aria-expanded={open}
	aria-controls={`${id}-panel`}
	onclick={() => (open = !open)}
>
	{#if icon}{@render icon()}{/if}<span class="min-w-0 max-w-64 truncate">{label}</span><ChevronDown
		size={14}
		class="shrink-0"
	/>
</Button>
<div
	bind:this={panel}
	id={`${id}-panel`}
	popover="auto"
	role="dialog"
	tabindex="-1"
	aria-label={placeholder}
	data-surface="popover"
	class="picker-panel surface p-3 text-sm font-normal leading-normal text-foreground shadow-lg"
	style:width={`min(${size === 'md' ? 384 : 352}px, calc(100vw - 24px))`}
	style:left={`${left}px`}
	style:top={`${top}px`}
	style:max-height={`${height}px`}
	ontoggle={(event) => {
		if (event.newState === 'closed') open = false;
	}}
	onkeydown={keydown}
>
	{#if header}<div class="shrink-0">{@render header()}</div>{/if}
	<Input
		bind:ref={input}
		bind:value={search}
		oninput={() => (active = -1)}
		role="combobox"
		aria-label={placeholder}
		aria-autocomplete="list"
		aria-expanded={open}
		aria-controls={`${id}-list`}
		aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
		{placeholder}
		class="h-8 shrink-0 px-3 text-sm text-foreground placeholder:text-foreground/70"
	/>
	<ul
		id={`${id}-list`}
		role="listbox"
		aria-label={placeholder}
		class="flex min-h-0 w-full flex-col flex-nowrap gap-1 overflow-y-auto p-0"
	>
		{#each options as option, index (option.value)}
			<li role="presentation">
				<button
					id={`${id}-${index}`}
					type="button"
					role="option"
					aria-selected={value === option.value}
					class="flex w-full gap-2 rounded-xl px-3 text-left leading-snug {size === 'md'
						? 'py-2.5 text-sm'
						: 'py-2 text-sm'} focus-visible:outline-2 focus-visible:outline-primary {value ===
					option.value
						? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
						: 'text-foreground hover:bg-muted'} {active === index
						? 'outline-2 -outline-offset-2 outline-primary'
						: ''}"
					onclick={() => choose(option)}
				>
					<span class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
						<span class="min-w-0 flex-1 basis-24 whitespace-normal wrap-anywhere"
							>{option.label}</span
						>
						{#if option.detail}<Badge size="xs" class="bg-muted text-foreground"
								>{option.detail}</Badge
							>{/if}
					</span>
					{#if value === option.value}<Check size={14} class="shrink-0" />{/if}
				</button>
			</li>
		{:else}<li role="presentation">
				<p class="px-3 py-2 text-xs text-foreground" role="status">No matches</p>
			</li>{/each}
	</ul>
</div>

<style>
	.picker-panel {
		position: fixed;
		margin: 0;
		width: min(20rem, calc(100vw - 24px));
		overflow: auto;
	}
	.picker-panel:popover-open {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
</style>

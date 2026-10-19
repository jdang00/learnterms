<script lang="ts">
	import type { Snippet } from 'svelte';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { Command } from 'bits-ui';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as InputGroup from '$lib/components/ui/input-group';
	import * as Popover from '$lib/components/ui/popover';

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

	$effect(() => {
		if (open) search = '';
	});

	function choose(option: Option) {
		onSelect(option.value);
		open = false;
	}
</script>

<Popover.Root bind:open={() => open && !disabled, (next) => (open = next)}>
	<Popover.Trigger {disabled}>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="soft"
				tone="neutral"
				size={size === 'md' ? 'md' : 'sm'}
				class="max-w-full min-w-0 gap-2 align-middle font-medium {size === 'md'
					? 'mx-1.5 text-base'
					: 'px-4 text-sm'}"
				title={label}
				aria-label={`${placeholder}: ${label}`}
			>
				{#if icon}{@render icon()}{/if}<span class="min-w-0 max-w-64 truncate">{label}</span
				><ChevronDown size={14} class="shrink-0" />
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content
		align="start"
		collisionPadding={12}
		class="flex max-h-[min(22.5rem,var(--bits-popover-content-available-height))] flex-col gap-3 overflow-hidden p-3 font-normal leading-normal {size ===
		'md'
			? 'w-[min(24rem,calc(100vw-24px))]'
			: 'w-[min(22rem,calc(100vw-24px))]'}"
	>
		{#if header}<div class="shrink-0">{@render header()}</div>{/if}
		<!-- Options arrive already filtered by `search`, so Command only handles keys and selection. -->
		<Command.Root shouldFilter={false} loop class="flex min-h-0 flex-col gap-3">
			<InputGroup.Root class="h-8 shrink-0">
				<Command.Input {placeholder} bind:value={search}>
					{#snippet child({ props })}
						<InputGroup.Input {...props} class="px-3 text-sm placeholder:text-foreground/70" />
					{/snippet}
				</Command.Input>
			</InputGroup.Root>
			<Command.List class="min-h-0 overflow-y-auto" aria-label={placeholder}>
				<Command.Viewport class="flex flex-col gap-1">
					{#each options as option (option.value)}
						{@const selected = value === option.value}
						<Command.Item
							value={option.value}
							onSelect={() => choose(option)}
							class="flex w-full cursor-pointer gap-2 rounded-xl px-3 text-left text-sm leading-snug outline-hidden {size ===
							'md'
								? 'py-2.5'
								: 'py-2'} {selected
								? 'bg-primary text-primary-foreground data-selected:ring-2 data-selected:ring-primary/40 data-selected:ring-offset-1 data-selected:ring-offset-menu'
								: 'text-foreground data-selected:bg-muted'}"
						>
							<span class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
								<span class="min-w-0 flex-1 basis-24 whitespace-normal wrap-anywhere"
									>{option.label}</span
								>
								{#if option.detail}<Badge size="xs" class="bg-muted text-foreground"
										>{option.detail}</Badge
									>{/if}
							</span>
							{#if selected}<Check size={14} class="shrink-0" />{/if}
						</Command.Item>
					{:else}
						<p class="px-3 py-2 text-xs text-foreground" role="status">No matches</p>
					{/each}
				</Command.Viewport>
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>

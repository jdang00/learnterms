<script lang="ts" module>
	export type SelectFieldOption = {
		value: string;
		label: string;
		disabled?: boolean;
		/** Options sharing a group render under one heading, in first-seen order. */
		group?: string;
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils.js';
	import Root from './select.svelte';
	import Trigger from './select-trigger.svelte';
	import Content from './select-content.svelte';
	import Item from './select-item.svelte';
	import Group from './select-group.svelte';
	import GroupHeading from './select-group-heading.svelte';

	// A single-choice select with a native-select-like API: bind:value and an options list.
	let {
		value = $bindable(''),
		options,
		placeholder = 'Select…',
		size = 'default',
		disabled = false,
		id,
		class: className,
		contentClass,
		'aria-label': ariaLabel,
		onValueChange,
		icon,
		...restProps
	}: {
		value?: string;
		options: SelectFieldOption[];
		placeholder?: string;
		size?: 'sm' | 'default';
		disabled?: boolean;
		id?: string;
		class?: string;
		contentClass?: string;
		'aria-label'?: string;
		onValueChange?: (value: string) => void;
		icon?: Snippet;
		/** Extra attributes (data-*, title, …) land on the trigger button. */
		[key: `data-${string}`]: unknown;
	} = $props();

	// bits-ui treats '' as "nothing selected", so an explicit empty option (e.g. "All") gets a stand-in.
	const EMPTY = '__empty__';
	const toInner = (v: string) => (v === '' ? EMPTY : v);
	const toOuter = (v: string) => (v === EMPTY ? '' : v);

	const hasEmptyOption = $derived(options.some((o) => o.value === ''));
	const inner = $derived(value === '' && !hasEmptyOption ? '' : toInner(value));
	const selected = $derived(options.find((o) => o.value === value));

	const groups = $derived.by(() => {
		const order: string[] = [];
		const byGroup: Record<string, SelectFieldOption[]> = {};
		for (const option of options) {
			const key = option.group ?? '';
			if (!(key in byGroup)) {
				byGroup[key] = [];
				order.push(key);
			}
			byGroup[key].push(option);
		}
		return order.map((key) => ({ key, items: byGroup[key] }));
	});

	function handleChange(next: string) {
		value = toOuter(next);
		onValueChange?.(value);
	}
</script>

<Root type="single" value={inner} onValueChange={handleChange} {disabled}>
	<Trigger {id} {size} aria-label={ariaLabel} class={cn('w-full', className)} {...restProps}>
		<span class="flex min-w-0 items-center gap-2" data-slot="select-value">
			{@render icon?.()}
			<span class={cn('truncate', !selected && 'text-muted-foreground')}>
				{selected?.label ?? placeholder}
			</span>
		</span>
	</Trigger>
	<Content class={contentClass}>
		{#each groups as group (group.key)}
			{#if group.key}
				<Group>
					<GroupHeading>{group.key}</GroupHeading>
					{#each group.items as option (option.value)}
						<Item value={toInner(option.value)} label={option.label} disabled={option.disabled}>
							{option.label}
						</Item>
					{/each}
				</Group>
			{:else}
				{#each group.items as option (option.value)}
					<Item value={toInner(option.value)} label={option.label} disabled={option.disabled}>
						{option.label}
					</Item>
				{/each}
			{/if}
		{/each}
	</Content>
</Root>

<script lang="ts">
	import type { CommandSource, QuizCommand } from './types';
	import type { DockDisplay } from './layouts';
	import { ariaShortcutFor, shortcutLabelFor } from './shortcuts';
	import { dockButtonClass, isPassive, READOUT_CLASS, type DockShape } from './dockStyles';
	import ReadoutContent from './ReadoutContent.svelte';
	import { cn } from '$lib/utils.js';
	import { mergeProps } from 'bits-ui';
	import { Tip } from '$lib/components/ui/tooltip';

	let {
		command,
		source,
		display = 'icon',
		shape = 'auto',
		iconSize = 19,
		touch = false,
		class: extraClass = ''
	}: {
		command: QuizCommand;
		source: CommandSource;
		display?: DockDisplay;
		shape?: DockShape;
		iconSize?: number;
		// 44px targets for the phone dock.
		touch?: boolean;
		class?: string;
	} = $props();

	const label = $derived(command.label());
	const active = $derived(command.active?.() ?? false);
	const enabled = $derived(command.enabled?.() ?? true);
	const shortcut = $derived(shortcutLabelFor(command.id));
	const tip = $derived(command.detail?.() ?? label);
	// Phones get no hover, so they keep the native title; desktop shows the ink tooltip with its key.
	const title = $derived(touch ? (shortcut ? `${tip} (${shortcut})` : tip) : undefined);
	const className = $derived(
		cn(
			dockButtonClass(command, { display, shape, active }),
			touch && (display === 'icon' && shape === 'auto' ? 'size-11' : 'h-11'),
			extraClass
		)
	);
	const Icon = $derived(active && command.activeIcon ? command.activeIcon : command.icon);
</script>

{#snippet content()}
	{#if display !== 'label'}<Icon size={iconSize} />{/if}
	{#if display !== 'icon'}{label}{/if}
{/snippet}

{#if isPassive(command)}
	<span
		class="{READOUT_CLASS} {touch ? 'h-11' : ''}"
		role="status"
		aria-label={`${command.name}: ${label}`}
		title={command.description}
	>
		<ReadoutContent {command} />
	</span>
{:else}
	{#snippet control(props: Record<string, unknown> = {})}
		{#if command.href}
			<!-- eslint-disable svelte/no-navigation-without-resolve -- command hrefs are resolved where the command is created -->
			<a
				{...props}
				class={className}
				href={command.href()}
				target="_blank"
				rel="noopener noreferrer"
				aria-label={label}
				{title}
			>
				{@render content()}
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		{:else}
			<button
				{...mergeProps(props, { onclick: () => command.run(source) })}
				type="button"
				class={className}
				disabled={!enabled}
				aria-label={label}
				aria-pressed={command.active ? active : undefined}
				aria-keyshortcuts={ariaShortcutFor(command.id)}
				{title}
			>
				{@render content()}
			</button>
		{/if}
	{/snippet}

	{#if touch}
		{@render control()}
	{:else}
		<Tip label={tip} kbd={shortcut}>
			{#snippet child({ props })}{@render control(props)}{/snippet}
		</Tip>
	{/if}
{/if}

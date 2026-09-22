<script lang="ts">
	import type { CommandSource, QuizCommand } from './types';
	import type { DockDisplay } from './layouts';
	import { ariaShortcutFor, shortcutLabelFor } from './shortcuts';
	import {
		dockButtonClass,
		isPassive,
		READOUT_CLASS,
		segmentStyle,
		type DockShape
	} from './dockStyles';
	import ReadoutContent from './ReadoutContent.svelte';

	let {
		command,
		source,
		display = 'icon',
		shape = 'auto',
		iconSize = 18,
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
	const title = $derived.by(() => {
		const text = command.detail?.() ?? label;
		return shortcut ? `${text} (${shortcut})` : text;
	});
	const className = $derived(
		`${dockButtonClass(command, { display, shape, active })} ${touch ? '[--size:2.75rem]' : ''} ${extraClass}`
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
{:else if command.href}
	<!-- eslint-disable svelte/no-navigation-without-resolve -- command hrefs are resolved where the command is created -->
	<a
		class={className}
		style={segmentStyle(shape)}
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
		type="button"
		class={className}
		style={segmentStyle(shape)}
		disabled={!enabled}
		aria-label={label}
		aria-pressed={command.active ? active : undefined}
		aria-keyshortcuts={ariaShortcutFor(command.id)}
		{title}
		onclick={() => command.run(source)}
	>
		{@render content()}
	</button>
{/if}

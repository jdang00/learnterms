<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import Monitor from '@lucide/svelte/icons/monitor';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import { getQuizCommands } from './commands.svelte';
	import { getDockPreferences } from './dockPreferences.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Tabs from '#lib/components/ui/tabs/index.js';
	import { Dialog } from 'bits-ui';
	import { DockCustomizerState } from './customizer/dockCustomizer.svelte';
	import { CAPTION, MOTION } from './customizer/constants';
	import StageMock from './customizer/StageMock.svelte';
	import ToolsZone from './customizer/ToolsZone.svelte';
	import DockZone from './customizer/DockZone.svelte';
	import OverflowZone from './customizer/OverflowZone.svelte';
	import SelectionInspector from './customizer/SelectionInspector.svelte';
	import PresetPanel from './customizer/PresetPanel.svelte';
	import PalettePanel from './customizer/PalettePanel.svelte';
	import DragGhost from './customizer/DragGhost.svelte';

	const registry = getQuizCommands();
	const preferences = getDockPreferences();
	const customizer = new DockCustomizerState(registry, preferences);

	let doneButton = $state<HTMLButtonElement | null>(null);

	$effect(() => {
		if (!customizer.open) return;
		customizer.opened();
	});

	$effect(() => {
		if (!customizer.confirmingReset) return;
		const timer = setTimeout(() => (customizer.confirmingReset = false), 3000);
		return () => clearTimeout(timer);
	});
</script>

<!-- forceMount keeps the customizer's own fade and spring instead of the default dialog motion. -->
<Dialog.Root
	open={customizer.open && Boolean(preferences)}
	onOpenChange={(next) => {
		if (!next) customizer.close();
	}}
>
	<Dialog.Portal>
		<Dialog.Overlay forceMount>
			{#snippet child({ props, open: overlayOpen })}
				{#if overlayOpen}
					<div
						{...props}
						class="fixed inset-0 z-[90] bg-black/35 backdrop-blur-[3px]"
						transition:fade={{ duration: 200 * MOTION }}
					></div>
				{/if}
			{/snippet}
		</Dialog.Overlay>
		<Dialog.Content
			forceMount
			onEscapeKeydown={(event) => customizer.handleEscape(event)}
			onOpenAutoFocus={(event) => {
				event.preventDefault();
				doneButton?.focus();
			}}
		>
			{#snippet child({ props, open: contentOpen })}
				{#if contentOpen && preferences}
					<div
						{...props}
						class="fixed inset-x-0 bottom-0 z-[90] mx-auto flex max-h-[92dvh] w-full max-w-4xl flex-col rounded-t-[2rem] border border-b-0 border-border bg-background shadow-2xl outline-none"
						transition:fly={{ y: 120, opacity: 0, duration: 420 * MOTION, easing: backOut }}
					>
						<div class="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-muted-strong"></div>

						<header class="flex flex-wrap items-start justify-between gap-3 px-5 pt-3 sm:px-7">
							<div>
								<Dialog.Title class="text-lg font-semibold tracking-tight"
									>Dock and tools</Dialog.Title
								>
								<Dialog.Description class="text-sm text-foreground/60">
									One layout, synced to your account on every device.
								</Dialog.Description>
							</div>
							<Tabs.Root
								value={customizer.preview}
								onValueChange={(v) => (customizer.preview = v as typeof customizer.preview)}
							>
								<Tabs.List aria-label="Preview on">
									<Tabs.Trigger value="desktop"><Monitor size={14} /> Desktop</Tabs.Trigger>
									<Tabs.Trigger value="mobile"><Smartphone size={14} /> Phone</Tabs.Trigger>
								</Tabs.List>
							</Tabs.Root>
						</header>

						<!-- Phones scroll the stage and the palette together; wider screens pin the stage. -->
						<div
							class="min-h-0 flex-1 overflow-y-auto overscroll-contain sm:flex sm:flex-col sm:overflow-hidden"
						>
							<!-- Stage: each zone framed by the part of the module page it lives in. -->
							<div
								class="dock-stage mx-5 mt-4 flex shrink-0 flex-col items-center gap-3 rounded-3xl border border-border/70 bg-muted/50 px-3 py-4 sm:mx-7 sm:max-h-[48dvh] sm:overflow-y-auto"
							>
								<!-- Mock cards sit on top; the editable zones break out below them, side by side. -->
								<div class="grid w-full gap-x-3 sm:grid-cols-[minmax(11rem,14rem)_1fr]">
									<span
										class="{CAPTION} mb-1.5 sm:col-start-1 sm:row-start-1 {customizer.preview ===
										'mobile'
											? 'text-center'
											: ''}"
										>{customizer.preview === 'desktop'
											? 'Sidebar'
											: 'Tools sheet, from the top bar'}</span
									>
									<StageMock kind="sidebar" preview={customizer.preview} />
									<div class="relative z-10 -mt-9 px-2 sm:col-start-1 sm:row-start-3">
										<ToolsZone {customizer} />
									</div>

									<span
										class="{CAPTION} mb-1.5 mt-4 sm:col-start-2 sm:row-start-1 sm:mt-0 {customizer.preview ===
										'mobile'
											? 'text-center'
											: ''}">Question</span
									>
									<StageMock kind="question" preview={customizer.preview} />
									<div
										class="relative z-10 -mt-9 flex items-start justify-center px-2 sm:col-start-2 sm:row-start-3"
									>
										<DockZone {customizer} />
									</div>
								</div>

								<div class="grid w-full gap-3 sm:grid-cols-[minmax(11rem,14rem)_1fr]">
									<span class="hidden sm:block"></span>
									<div class="flex justify-center">
										<OverflowZone {customizer} />
									</div>
								</div>

								<SelectionInspector {customizer} syncError={Boolean(preferences.syncError)} />
							</div>

							<div
								class="px-5 pb-4 pt-5 sm:min-h-0 sm:flex-1 sm:overflow-y-auto sm:overscroll-contain sm:px-7"
							>
								{#if !customizer.advanced}
									<PresetPanel {customizer} onAdvanced={() => preferences.setAdvanced(true)} />
								{:else}
									<PalettePanel {customizer} onBack={() => preferences.setAdvanced(false)} />
								{/if}
							</div>
						</div>

						<footer
							class="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-3 sm:px-7"
							style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom));"
						>
							<Button
								size="sm"
								variant={customizer.confirmingReset ? 'soft' : 'ghost'}
								tone={customizer.confirmingReset ? 'error' : 'neutral'}
								class="h-11 sm:h-8"
								onclick={() => customizer.resetDock()}
							>
								<RotateCcw size={14} />
								{customizer.confirmingReset ? 'Tap again to reset' : 'Reset to default'}
							</Button>
							<Button
								bind:ref={doneButton}
								size="sm"
								class="h-11 px-5 sm:h-8"
								onclick={() => customizer.close()}
							>
								Done
							</Button>
						</footer>

						<DragGhost {customizer} />
					</div>
				{/if}
			{/snippet}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	/* Graph-paper grid, the same motif as the landing page and Question Studio. */
	.dock-stage {
		position: relative;
		isolation: isolate;
	}

	.dock-stage::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		border-radius: inherit;
		pointer-events: none;
		background:
			linear-gradient(
					to right,
					color-mix(in oklab, var(--foreground) 9%, transparent) 1px,
					transparent 1px
				)
				0 0 / 24px 24px,
			linear-gradient(
					to bottom,
					color-mix(in oklab, var(--foreground) 9%, transparent) 1px,
					transparent 1px
				)
				0 0 / 24px 24px;
		mask-image: radial-gradient(ellipse 90% 85% at 50% 45%, black 30%, transparent 100%);
		-webkit-mask-image: radial-gradient(ellipse 90% 85% at 50% 45%, black 30%, transparent 100%);
	}
</style>

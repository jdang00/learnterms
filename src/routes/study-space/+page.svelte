<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import { resolve } from '$app/paths';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import FileText from '@lucide/svelte/icons/file-text';
	import Library from '@lucide/svelte/icons/library';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Timer from '@lucide/svelte/icons/timer';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import { RadialProgress } from '#lib/components/ui/radial-progress/index.js';
	import * as Resizable from '#lib/components/ui/resizable/index.js';
	import { ScrollArea } from '#lib/components/ui/scroll-area/index.js';
	import { SegmentedControl } from '#lib/components/ui/segmented-control/index.js';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import { Slider } from '#lib/components/ui/slider/index.js';
	import { citations, sources, type Source } from './fixtures';
	import ChatPanel from './ChatPanel.svelte';
	import SourcesPanel from './SourcesPanel.svelte';
	import StudioPanel from './StudioPanel.svelte';

	// A dev-only mock of a notebook-style study space, assembled from the design-system concepts.
	const wide = new MediaQuery('(min-width: 1024px)');
	let pane = $state('chat');
	let studioTab = $state('practice');
	let selected = $state(sources.filter((s) => !s.processing).map((s) => s.id));
	let reading = $state<Source | null>(null);

	let focusMinutes = $state(25);
	const elapsed = 9;

	function quizFromChat() {
		studioTab = 'practice';
		pane = 'studio';
	}
</script>

{#snippet sourcesPane()}
	<SourcesPanel bind:selected onOpen={(source) => (reading = source)} />
{/snippet}
{#snippet chatPane()}
	<ChatPanel selectedCount={selected.length} onQuiz={quizFromChat} />
{/snippet}
{#snippet studioPane()}
	<StudioPanel bind:tab={studioTab} selectedCount={selected.length} />
{/snippet}

<div class="flex h-dvh flex-col overflow-hidden bg-muted lg:h-[calc(100dvh-4rem)]">
	<header class="flex items-center gap-3 border-b border-border bg-background px-3 py-2.5 sm:px-4">
		<Button
			href={resolve('/classes')}
			variant="ghost"
			tone="neutral"
			size="sm"
			shape="circle"
			aria-label="Back to classes"><ArrowLeft /></Button
		>
		<span class="grid size-9 place-items-center rounded-2xl bg-error/10 text-lg" aria-hidden="true"
			>❤️</span
		>
		<div class="min-w-0 flex-1">
			<h1 class="truncate font-display text-base font-semibold leading-tight">
				Cardiovascular system
			</h1>
			<p class="truncate text-xs text-muted-foreground">BIO 301 · {sources.length} sources</p>
		</div>
		<Badge tone="secondary" variant="soft" class="hidden sm:inline-flex">Mock</Badge>
		<Popover.Root>
			<Popover.Trigger>
				{#snippet child({ props })}
					<Button {...props} size="sm" variant="ghost" tone="neutral">
						<Timer />{focusMinutes - elapsed}m
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content align="end" class="w-64 space-y-3">
				<div class="flex items-center gap-3">
					<RadialProgress value={(elapsed / focusMinutes) * 100} class="size-14 text-xs"
						>{focusMinutes - elapsed}m</RadialProgress
					>
					<div>
						<p class="text-sm font-semibold">Focus session</p>
						<p class="text-xs text-muted-foreground">{focusMinutes} minutes · {elapsed} in</p>
					</div>
				</div>
				<Slider
					type="single"
					bind:value={focusMinutes}
					min={15}
					max={60}
					step={5}
					aria-label="Session length"
				/>
			</Popover.Content>
		</Popover.Root>
	</header>

	{#if wide.current}
		<Resizable.PaneGroup direction="horizontal" class="min-h-0 flex-1">
			<Resizable.Pane defaultSize={22} minSize={16} class="bg-background">
				{@render sourcesPane()}
			</Resizable.Pane>
			<Resizable.Handle />
			<Resizable.Pane defaultSize={48} minSize={32}>
				{@render chatPane()}
			</Resizable.Pane>
			<Resizable.Handle />
			<Resizable.Pane defaultSize={30} minSize={22} class="bg-background">
				{@render studioPane()}
			</Resizable.Pane>
		</Resizable.PaneGroup>
	{:else}
		<div class="border-b border-border bg-background px-3 py-2">
			<SegmentedControl
				bind:value={pane}
				aria-label="Panel"
				size="xs"
				track="muted"
				activeVariant="raised"
				class="w-full"
				itemClass="flex-1"
				options={[
					{ value: 'sources', label: 'Sources', icon: Library },
					{ value: 'chat', label: 'Chat', icon: MessageCircle },
					{ value: 'studio', label: 'Studio', icon: Sparkles }
				]}
			/>
		</div>
		<div class="min-h-0 flex-1 {pane === 'chat' ? '' : 'bg-background'}">
			{#if pane === 'sources'}
				{@render sourcesPane()}
			{:else if pane === 'chat'}
				{@render chatPane()}
			{:else}
				{@render studioPane()}
			{/if}
		</div>
	{/if}
</div>

<Sheet.Root open={reading !== null} onOpenChange={(open) => !open && (reading = null)}>
	<Sheet.Content side="right" class="w-full sm:max-w-lg">
		{#if reading}
			{@const cited = citations.find((c) => c.sourceId === reading?.id)}
			<Sheet.Header>
				<Sheet.Title class="flex items-center gap-2"
					><FileText size={18} />{reading.title}</Sheet.Title
				>
				<Sheet.Description
					>{reading.pages} pages · added {reading.added.toLowerCase()}</Sheet.Description
				>
			</Sheet.Header>
			<ScrollArea class="min-h-0 flex-1">
				<article class="space-y-3 px-4 pb-6 text-sm leading-relaxed">
					<p class="font-mono text-xs text-muted-foreground">Page {cited?.page ?? 1}</p>
					<p>
						Cardiac output is the product of heart rate and stroke volume. Stroke volume depends on
						preload, afterload and contractility.
					</p>
					{#if cited}
						<p><mark class="rounded bg-highlighter/40 px-0.5">{cited.quote}</mark></p>
					{/if}
					<p>
						This intrinsic relationship lets the two ventricles keep their outputs matched beat to
						beat without input from the nervous system.
					</p>
				</article>
			</ScrollArea>
		{/if}
	</Sheet.Content>
</Sheet.Root>

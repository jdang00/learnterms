<script lang="ts">
	import { SelectField } from '#lib/components/ui/select/index.js';
	import { toast } from 'svelte-sonner';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Flag from '@lucide/svelte/icons/flag';
	import Shuffle from '@lucide/svelte/icons/shuffle';
	import Check from '@lucide/svelte/icons/check';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Plus from '@lucide/svelte/icons/plus';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Info from '@lucide/svelte/icons/info';
	import Settings from '@lucide/svelte/icons/settings';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import { theme } from '#lib/theme.svelte.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Tip } from '#lib/components/ui/tooltip/index.js';
	import { Kbd } from '#lib/components/ui/kbd/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import * as Select from '#lib/components/ui/select/index.js';
	import * as Tabs from '#lib/components/ui/tabs/index.js';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import * as RadioGroup from '#lib/components/ui/radio-group/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import * as Avatar from '#lib/components/ui/avatar/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import { Slider } from '#lib/components/ui/slider/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Progress } from '#lib/components/ui/progress/index.js';
	import { RadialProgress } from '#lib/components/ui/radial-progress/index.js';
	import { SegmentedControl } from '#lib/components/ui/segmented-control/index.js';
	import { LoadingState } from '#lib/components/ui/spinner/index.js';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import CheckCircle from '@lucide/svelte/icons/check-circle';
	import FileText from '@lucide/svelte/icons/file-text';
	import Archive from '@lucide/svelte/icons/archive';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import List from '@lucide/svelte/icons/list';
	import Library from '@lucide/svelte/icons/library';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import { TONES } from '#lib/components/ui/tone.js';
	import Sheet from '#lib/components/Sheet.svelte';
	import Explorations from './Explorations.svelte';

	const variants = ['solid', 'soft', 'outline', 'dash', 'ghost', 'link'] as const;
	const roles: Record<string, string> = {
		primary: 'Selected, primary actions',
		secondary: 'Highlights, notes',
		accent: 'Study streaks, focus',
		neutral: 'Brand default, dark surfaces',
		info: 'Explanations, sources',
		success: 'Correct answers',
		warning: 'Flagged questions',
		error: 'Incorrect answers'
	};
	const surfaces = [
		['background', 'bg-background'],
		['muted', 'bg-muted'],
		['muted-strong', 'bg-muted-strong'],
		['border', 'bg-border'],
		['foreground', 'bg-foreground'],
		['muted-foreground', 'bg-muted-foreground']
	];
	const solid: Record<string, string> = {
		primary: 'bg-primary text-primary-foreground',
		secondary: 'bg-secondary text-secondary-foreground',
		accent: 'bg-accent text-accent-foreground',
		neutral: 'bg-neutral text-neutral-foreground',
		info: 'bg-info text-info-foreground',
		success: 'bg-success text-success-foreground',
		warning: 'bg-warning text-warning-foreground',
		error: 'bg-error text-error-foreground'
	};

	let dialogOpen = $state(false);
	let sheetOpen = $state(false);
	let selectValue = $state('recall');
	let toggleValue = $state('pages');
	let radioValue = $state('timed');
	let slider = $state(60);
	let flagged = $state(true);
	let dsStatus = $state('draft');
	let dsView = $state('grid');
	let dsPane = $state('preview');
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto max-w-6xl space-y-16 px-5 py-12 sm:px-8">
	<header class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="title-hero">LearnTerms design system</h1>
			<p class="mt-2 max-w-2xl text-muted-foreground">
				shadcn-svelte primitives tuned to the brand sheet. Components live in
				<code class="font-mono text-sm">#lib/components/ui</code>.
			</p>
		</div>
		<Button variant="outline" tone="neutral" onclick={() => theme.toggle()}>
			{#if theme.isDark}<Sun />{:else}<Moon />{/if}
			{theme.isDark ? 'Light' : 'Dark'} theme
		</Button>
	</header>

	<!-- Color -->
	<section class="space-y-6">
		<h2 class="text-3xl font-semibold">Color</h2>
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
			{#each Object.entries(roles) as [role, job] (role)}
				<div class="flex aspect-[0.82] flex-col justify-between rounded-3xl p-4 {solid[role]}">
					<span class="font-mono text-xs">{role}</span>
					<p class="text-sm font-medium">{job}</p>
				</div>
			{/each}
		</div>
		<div class="grid grid-cols-3 gap-3 sm:grid-cols-6">
			{#each surfaces as [name, cls] (name)}
				<div class="overflow-hidden surface">
					<div class="h-14 {cls}"></div>
					<div class="px-3 py-2 font-mono text-xs text-muted-foreground">{name}</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Type -->
	<section class="space-y-6">
		<h2 class="text-3xl font-semibold">Type</h2>
		<Card.Root>
			<Card.Content
				class="grid grid-cols-1 items-baseline gap-x-6 gap-y-5 sm:grid-cols-[10rem_1fr]"
			>
				<span class="font-mono text-xs text-muted-foreground">Display · Space Grotesk</span>
				<span class="font-display text-7xl leading-none font-bold">kerat/o</span>
				<span class="font-mono text-xs text-muted-foreground">Page title · font-display</span>
				<h1 class="title-hero">Module 3 review</h1>
				<span class="font-mono text-xs text-muted-foreground">Heading · sans 600</span>
				<h2 class="text-3xl font-semibold">Missed questions</h2>
				<span class="font-mono text-xs text-muted-foreground">Body · sans 400</span>
				<p class="text-[17px] leading-relaxed">
					Combining form meaning cornea. Appears in keratitis, keratoconus, and keratometry.
				</p>
				<span class="font-mono text-xs text-muted-foreground">Label 14 · 600</span>
				<span class="text-sm font-semibold">Start studying</span>
				<span class="font-mono text-xs text-muted-foreground">Data · Geist Mono 13</span>
				<span class="font-mono text-[13px] text-muted-foreground"
					>Source · Intro to Optometry, p. 14</span
				>
			</Card.Content>
		</Card.Root>
	</section>

	<!-- Button -->
	<section class="space-y-6">
		<div>
			<h2 class="text-3xl font-semibold">Button</h2>
			<p class="mt-1 text-muted-foreground">
				solid = primary action · soft = secondary action · outline = state toggle · dash =
				preference · ghost = quiet utility.
			</p>
		</div>
		<Card.Root>
			<Card.Content class="overflow-x-auto">
				<table class="w-full border-separate border-spacing-y-2">
					<thead>
						<tr class="text-left font-mono text-xs text-muted-foreground">
							<th class="pe-4 font-medium">tone</th>
							{#each variants as v (v)}<th class="pe-3 font-medium">{v}</th>{/each}
						</tr>
					</thead>
					<tbody>
						{#each TONES as tone (tone)}
							<tr>
								<td class="pe-4 font-mono text-xs text-muted-foreground">{tone}</td>
								{#each variants as variant (variant)}
									<td class="pe-3">
										<Button {variant} {tone} size="sm"
											>{tone === 'neutral' ? 'Clear' : 'Check'}</Button
										>
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</Card.Content>
		</Card.Root>
		<div class="flex flex-wrap items-center gap-3">
			<Button size="xs">Extra small</Button>
			<Button size="sm">Small</Button>
			<Button>Medium</Button>
			<Button size="lg">Large</Button>
			<Separator orientation="vertical" class="h-8" />
			<Button shape="rect" variant="soft">Rect</Button>
			<Button shape="circle" variant="ghost" tone="neutral" aria-label="Settings"
				><Settings /></Button
			>
			<Button shape="square" variant="outline" tone="neutral" aria-label="Add"><Plus /></Button>
			<Button loading>Saving</Button>
			<Button disabled>Disabled</Button>
			<Button
				variant="outline"
				tone="warning"
				aria-pressed={flagged}
				onclick={() => (flagged = !flagged)}
			>
				<Flag />Flag
			</Button>
		</div>
	</section>

	<!-- Badge -->
	<section class="space-y-6">
		<h2 class="text-3xl font-semibold">Badge</h2>
		<div class="space-y-3">
			{#each ['solid', 'soft', 'outline', 'dash'] as const as variant (variant)}
				<div class="flex flex-wrap items-center gap-2">
					<span class="w-16 font-mono text-xs text-muted-foreground">{variant}</span>
					{#each TONES as tone (tone)}<Badge {variant} {tone}>{tone}</Badge>{/each}
				</div>
			{/each}
			<div class="flex flex-wrap items-center gap-2">
				<span class="w-16 font-mono text-xs text-muted-foreground">sizes</span>
				<Badge size="xs" tone="primary">xs</Badge>
				<Badge size="sm" tone="primary">sm</Badge>
				<Badge size="md" tone="primary">md</Badge>
				<Badge size="md" tone="warning"><Flag />Flagged</Badge>
				<Badge size="md" class="font-mono font-medium">Module 3 · Q 4 / 40</Badge>
			</div>
		</div>
	</section>

	<!-- Surfaces -->
	<section class="space-y-6">
		<div>
			<h2 class="text-3xl font-semibold">Surfaces</h2>
			<p class="mt-1 text-muted-foreground">
				Every bordered panel uses Card or one of these utilities, so a restyle lands everywhere.
			</p>
		</div>
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<div class="surface p-5">
				<p class="font-mono text-xs text-muted-foreground">surface</p>
				<p class="mt-2 font-semibold">Lids & Adnexa</p>
				<div class="mt-3 surface-inset p-3 text-xs text-muted-foreground">
					<span class="font-mono">surface-inset</span> · 24 questions · 3 flagged
				</div>
			</div>
			<div class="surface-muted p-5">
				<p class="font-mono text-xs text-muted-foreground">surface-muted</p>
				<p class="mt-2 font-semibold">Recessed panel</p>
				<div class="mt-3 surface-sm px-3 py-2.5 text-sm">
					<span class="font-mono text-xs text-muted-foreground">surface-sm</span> · Row or tile
				</div>
			</div>
			<div
				class="flex flex-col items-center justify-center gap-1 surface-dashed p-5 text-center text-sm text-muted-foreground"
			>
				<span class="font-mono text-xs">surface-dashed</span>
				Drop slides here
			</div>
		</div>
		<div class="flex flex-wrap items-center gap-3">
			<div class="flex items-center">
				<Button variant="outline" tone="neutral" shape="segment-start" aria-label="Previous"
					><ArrowLeft /></Button
				>
				<Button variant="outline" tone="neutral" shape="segment-end" aria-label="Next"
					><ArrowRight /></Button
				>
			</div>
			<span class="font-mono text-xs text-muted-foreground"
				>shape="segment-start" / "segment-end"</span
			>
		</div>
	</section>

	<!-- Choices, loading and empty -->
	<section class="space-y-6">
		<div>
			<h2 class="text-3xl font-semibold">Choices, loading and empty</h2>
			<p class="mt-1 text-muted-foreground">
				SegmentedControl for one-of-a-few choices, LoadingState and Empty for the in-between
				moments.
			</p>
		</div>
		<div class="grid gap-4 lg:grid-cols-2">
			<div class="surface space-y-4 p-5">
				<p class="label-caps">Segmented control</p>
				<SegmentedControl
					bind:value={dsStatus}
					aria-label="Status"
					options={[
						{ value: 'published', label: 'Published', icon: CheckCircle, tone: 'success' },
						{ value: 'draft', label: 'Draft', icon: FileText, tone: 'info' },
						{ value: 'archived', label: 'Archived', icon: Archive, tone: 'error' }
					]}
				/>
				<div class="flex flex-wrap items-center gap-3">
					<SegmentedControl
						bind:value={dsPane}
						aria-label="Panel"
						size="xs"
						track="muted"
						activeVariant="raised"
						itemClass="px-4"
						options={[
							{ value: 'preview', label: 'Preview' },
							{ value: 'source', label: 'Source' },
							{ value: 'properties', label: 'Properties' }
						]}
					/>
					<SegmentedControl
						bind:value={dsView}
						aria-label="View"
						size="xs"
						track="muted"
						activeVariant="raised"
						itemClass="size-7 px-0"
						labelClass="sr-only"
						options={[
							{ value: 'grid', label: 'Grid view', icon: LayoutGrid },
							{ value: 'list', label: 'List view', icon: List }
						]}
					/>
					<Button
						variant="ghost"
						tone="neutral"
						shape="circle"
						tooltip="Settings"
						tooltipKbd="S"
						aria-label="Settings"><Settings /></Button
					>
				</div>
				<p class="font-mono text-xs text-muted-foreground">
					activeVariant solid | soft | raised · track surface | muted | none · Button tooltip=""
				</p>
			</div>
			<div class="surface space-y-4 p-5">
				<p class="label-caps">Loading</p>
				<LoadingState inline label="Loading tags…" />
				<LoadingState label="Building slide deck preview…" class="surface-muted py-6" />
				<div class="flex items-center gap-3">
					<Button loading>Saving</Button>
					<span class="flex items-center gap-2 text-sm"
						><span class="size-3 rounded-sm bg-mastered"></span><span class="text-mastered-ink"
							>Mastered</span
						></span
					>
				</div>
			</div>
		</div>
		<div class="grid gap-4 lg:grid-cols-2">
			<Empty.Root class="surface-dashed py-12">
				<Empty.Header>
					<Empty.Media variant="icon" class="size-16 bg-primary/10 text-primary-ink [&_svg]:size-7"
						><Library /></Empty.Media
					>
					<Empty.Title>Your library is empty</Empty.Title>
					<Empty.Description
						>Add your first PDF to make it searchable for your class.</Empty.Description
					>
				</Empty.Header>
				<Empty.Content><Button size="sm"><Plus />Add file</Button></Empty.Content>
			</Empty.Root>
			<Empty.Root class="surface py-12">
				<Empty.Header>
					<Empty.Media variant="emoji">📚</Empty.Media>
					<Empty.Title class="text-lg">No modules yet</Empty.Title>
					<Empty.Description
						>Modules will appear here once they are added to this class.</Empty.Description
					>
				</Empty.Header>
			</Empty.Root>
		</div>
		<div class="surface space-y-2 p-5">
			<p class="label-caps">Titles</p>
			<p class="title-hero">title-hero</p>
			<p class="title-page">title-page</p>
			<p class="label-caps text-primary-ink">label-caps, tinted</p>
		</div>
	</section>

	<!-- Overlays -->
	<section class="space-y-6">
		<h2 class="text-3xl font-semibold">Tooltip, toast and overlays</h2>
		<div class="flex flex-wrap items-center gap-3">
			<Tip label="Flag question" kbd="F">
				{#snippet child({ props })}
					<Button {...props} variant="outline" tone="warning" shape="circle" aria-label="Flag">
						<Flag />
					</Button>
				{/snippet}
			</Tip>
			<Tip label="Shuffle options" kbd={['⇧', 'S']} side="bottom">
				{#snippet child({ props })}
					<Button {...props} shape="circle" aria-label="Shuffle"><Shuffle /></Button>
				{/snippet}
			</Tip>
			<Tip label="Plain children get a span trigger">
				<Badge tone="info" size="md"><Info />Hover me</Badge>
			</Tip>
			<Separator orientation="vertical" class="h-8" />
			<Button variant="soft" tone="success" onclick={() => toast.success('Progress saved')}>
				Success toast
			</Button>
			<Button variant="soft" tone="error" onclick={() => toast.error('Could not reach the server')}>
				Error toast
			</Button>
			<Button
				variant="soft"
				tone="neutral"
				onclick={() =>
					toast('Question deleted', {
						description: 'Module 3 · Q 12',
						action: { label: 'Undo', onClick: () => toast.success('Restored') }
					})}
			>
				Toast with action
			</Button>
		</div>
		<div class="flex flex-wrap items-center gap-3">
			<Dialog.Root bind:open={dialogOpen}>
				<Dialog.Trigger>
					{#snippet child({ props })}<Button {...props} variant="outline" tone="neutral"
							>Dialog</Button
						>{/snippet}
				</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Edit module</Dialog.Title>
						<Dialog.Description>Module titles show on the class page.</Dialog.Description>
					</Dialog.Header>
					<Field.Field>
						<Field.Label for="ds-title">Title</Field.Label>
						<Input id="ds-title" value="Lids & Adnexa" />
					</Field.Field>
					<Dialog.Footer>
						<Button variant="ghost" tone="neutral" onclick={() => (dialogOpen = false)}
							>Cancel</Button
						>
						<Button onclick={() => (dialogOpen = false)}>Save</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>

			<AlertDialog.Root>
				<AlertDialog.Trigger>
					{#snippet child({ props })}<Button {...props} variant="soft" tone="error"
							><Trash2 />Delete</Button
						>{/snippet}
				</AlertDialog.Trigger>
				<AlertDialog.Content>
					<AlertDialog.Header>
						<AlertDialog.Title>Delete 3 questions?</AlertDialog.Title>
						<AlertDialog.Description>Students lose their progress on them.</AlertDialog.Description>
					</AlertDialog.Header>
					<AlertDialog.Footer>
						<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
						<AlertDialog.Action tone="error">Delete</AlertDialog.Action>
					</AlertDialog.Footer>
				</AlertDialog.Content>
			</AlertDialog.Root>

			<Button variant="outline" tone="neutral" onclick={() => (sheetOpen = true)}>Sheet</Button>
			<Sheet bind:open={sheetOpen} title="Tools">
				<p class="text-muted-foreground">A bottom sheet on phones, a dialog from sm up.</p>
			</Sheet>

			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="outline" tone="neutral">Menu <ChevronDown /></Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="start">
					<DropdownMenu.Label>Question</DropdownMenu.Label>
					<DropdownMenu.Item
						><Flag />Flag <DropdownMenu.Shortcut>F</DropdownMenu.Shortcut></DropdownMenu.Item
					>
					<DropdownMenu.Item><Shuffle />Shuffle</DropdownMenu.Item>
					<DropdownMenu.Separator />
					<DropdownMenu.Item variant="destructive"><Trash2 />Delete</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<Popover.Root>
				<Popover.Trigger>
					{#snippet child({ props })}<Button {...props} variant="outline" tone="neutral"
							>Popover</Button
						>{/snippet}
				</Popover.Trigger>
				<Popover.Content>
					<p class="font-semibold">Source</p>
					<p class="font-mono text-[13px] text-info-ink">Intro to Optometry, p. 14</p>
				</Popover.Content>
			</Popover.Root>
		</div>
	</section>

	<!-- Forms -->
	<section class="space-y-6">
		<h2 class="text-3xl font-semibold">Form controls</h2>
		<div class="grid gap-6 md:grid-cols-2">
			<Card.Root>
				<Card.Content class="space-y-4">
					<Field.Field>
						<Field.Label for="ds-name">Class name</Field.Label>
						<Input id="ds-name" placeholder="OPT 341" />
					</Field.Field>
					<Field.Field data-invalid>
						<Field.Label for="ds-code">Join code</Field.Label>
						<Input id="ds-code" aria-invalid value="12" />
						<Field.Error>Join codes are 6 characters.</Field.Error>
					</Field.Field>
					<Field.Field>
						<Field.Label for="ds-notes">Focus notes</Field.Label>
						<Textarea id="ds-notes" placeholder="Emphasize lid anatomy" />
					</Field.Field>
					<div class="grid grid-cols-2 gap-3">
						<SelectField
							bind:value={selectValue}
							options={[
								{ value: 'recall', label: 'Recall' },
								{ value: 'application', label: 'Application' }
							]}
						/>
						<Select.Root type="single" bind:value={selectValue}>
							<Select.Trigger class="w-full"
								>{selectValue === 'recall' ? 'Recall' : 'Application'}</Select.Trigger
							>
							<Select.Content>
								<Select.Item value="recall">Recall</Select.Item>
								<Select.Item value="application">Application</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Content class="space-y-5">
					<div class="flex items-center gap-3">
						<Checkbox id="ds-c1" checked />
						<Label for="ds-c1">Show rationale after checking</Label>
					</div>
					<div class="flex items-center justify-between">
						<Label for="ds-s1">Auto next</Label>
						<Switch id="ds-s1" checked />
					</div>
					<RadioGroup.Root bind:value={radioValue} class="flex gap-5">
						<div class="flex items-center gap-2">
							<RadioGroup.Item value="timed" id="ds-r1" /><Label for="ds-r1">Timed</Label>
						</div>
						<div class="flex items-center gap-2">
							<RadioGroup.Item value="untimed" id="ds-r2" /><Label for="ds-r2">Untimed</Label>
						</div>
					</RadioGroup.Root>
					<div class="space-y-2">
						<Label>Questions · {slider}</Label>
						<Slider type="single" bind:value={slider} max={120} step={5} />
					</div>
					<Tabs.Root value="pages">
						<Tabs.List>
							<Tabs.Trigger value="pages">Pages</Tabs.Trigger>
							<Tabs.Trigger value="topics">Topics</Tabs.Trigger>
						</Tabs.List>
					</Tabs.Root>
					<ToggleGroup.Root type="single" bind:value={toggleValue} variant="outline">
						<ToggleGroup.Item value="pages">Pages</ToggleGroup.Item>
						<ToggleGroup.Item value="topics">Topics</ToggleGroup.Item>
						<ToggleGroup.Item value="both">Both</ToggleGroup.Item>
					</ToggleGroup.Root>
				</Card.Content>
			</Card.Root>
		</div>
	</section>

	<!-- Feedback -->
	<section class="space-y-6">
		<h2 class="text-3xl font-semibold">Feedback and data</h2>
		<div class="grid gap-3 md:grid-cols-2">
			<Alert.Root tone="error">
				<Info />
				<Alert.Title>Could not save the question</Alert.Title>
				<Alert.Description>Check your connection and try again.</Alert.Description>
			</Alert.Root>
			<Alert.Root tone="warning">
				<Flag />
				<Alert.Title>3 flagged questions</Alert.Title>
				<Alert.Description>Review them before the exam.</Alert.Description>
			</Alert.Root>
			<Alert.Root tone="success">
				<Check />
				<Alert.Title>Module complete</Alert.Title>
			</Alert.Root>
			<Alert.Root tone="info">
				<Info />
				<Alert.Title>Source · Intro to Optometry, p. 14</Alert.Title>
			</Alert.Root>
		</div>
		<div class="grid gap-6 md:grid-cols-3">
			<Card.Root>
				<Card.Header>
					<Card.Title>Module progress</Card.Title>
					<Card.Description>24 of 40 answered</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-3">
					<Progress value={60} />
					<Progress value={80} tone="success" />
					<Progress value={25} tone="warning" />
					<div class="flex items-center gap-3 pt-2">
						<RadialProgress value={60} class="text-xs">60%</RadialProgress>
						<RadialProgress value={88} tone="success" thickness={6} class="size-16 text-sm"
							>88%</RadialProgress
						>
						<RadialProgress value={42} tone="error" class="text-xs">42%</RadialProgress>
					</div>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header><Card.Title>Loading</Card.Title></Card.Header>
				<Card.Content class="space-y-3">
					<div class="flex items-center gap-3">
						<Spinner />
						<Spinner class="size-6 text-primary" />
					</div>
					<Skeleton class="h-4 w-3/4" />
					<Skeleton class="h-4 w-1/2" />
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header><Card.Title>Shortcuts</Card.Title></Card.Header>
				<Card.Content class="flex-row flex-wrap gap-2">
					<Kbd>F</Kbd><Kbd>⇧</Kbd><Kbd>Enter</Kbd><Kbd>←</Kbd><Kbd>→</Kbd>
				</Card.Content>
			</Card.Root>
		</div>
		<Card.Root>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Student</Table.Head>
							<Table.Head>Answered</Table.Head>
							<Table.Head class="text-right">Accuracy</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each [['Avery Chen', 212, 91], ['Jordan Patel', 180, 84], ['Sam Rivera', 96, 72]] as [name, answered, acc] (name)}
							<Table.Row>
								<Table.Cell>
									<div class="flex items-center gap-2">
										<Avatar.Root class="size-7">
											<Avatar.Fallback>{String(name).slice(0, 1)}</Avatar.Fallback>
										</Avatar.Root>
										{name}
									</div>
								</Table.Cell>
								<Table.Cell class="tabular-nums">{answered}</Table.Cell>
								<Table.Cell class="text-right">
									<Badge
										tone={Number(acc) >= 85 ? 'success' : Number(acc) >= 75 ? 'warning' : 'error'}
										>{acc}%</Badge
									>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>
	</section>

	<Explorations />
</div>

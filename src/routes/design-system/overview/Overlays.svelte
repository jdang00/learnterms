<script lang="ts">
	import { toast } from 'svelte-sonner';
	import Copy from '@lucide/svelte/icons/copy';
	import Flag from '@lucide/svelte/icons/flag';
	import FolderInput from '@lucide/svelte/icons/folder-input';
	import Info from '@lucide/svelte/icons/info';
	import MoreHorizontal from '@lucide/svelte/icons/more-horizontal';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Shuffle from '@lucide/svelte/icons/shuffle';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import type { Id } from '../../../convex/_generated/dataModel';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import { Tip } from '#lib/components/ui/tooltip/index.js';
	import DeleteConfirmationModal from '#lib/admin/DeleteConfirmationModal.svelte';
	import QuestionSources from '#lib/components/QuestionSources.svelte';
	import Sheet from '#lib/components/Sheet.svelte';
	import Category from './Category.svelte';
	import Spec from './Spec.svelte';

	let dialogOpen = $state(false);
	let sheetDialogOpen = $state(false);
	let sheetOpen = $state(false);
	let deleteOpen = $state(false);
	let showRationale = $state(true);
	let autoNext = $state(false);

	const source = {
		sourceTitle: 'Intro to Optometry.pdf',
		sourceDocumentId: 'fixture' as Id<'contentLib'>,
		sourceCitations: [
			{
				pageNumber: 14,
				noteFile: 'Intro to Optometry.pdf',
				quote:
					'When source and screen are effectively at infinity, the diffraction is termed Fraunhofer.'
			},
			{
				pageNumber: 15,
				noteFile: 'Intro to Optometry.pdf',
				quote: 'Plane waves enter and leave the aperture.'
			},
			{
				pageNumber: 22,
				noteFile: 'Intro to Optometry.pdf',
				quote: 'The Airy disc holds 84% of the light.'
			}
		]
	};
</script>

<Category
	id="overlays"
	summary="Floating layers come from the primitives. Never hand-roll an absolute panel or a fixed inset-0 modal."
>
	<Spec title="Tooltip and toast" src={['Tip', 'Button tooltip=""', 'svelte-sonner']}>
		<div class="flex flex-wrap items-center gap-3">
			<Tip label="Flag question" kbd="F">
				{#snippet child({ props })}
					<Button {...props} variant="outline" tone="warning" shape="circle" aria-label="Flag"
						><Flag /></Button
					>
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
		</div>
		<div class="mt-4 flex flex-wrap gap-2">
			<Button
				size="sm"
				variant="soft"
				tone="success"
				onclick={() => toast.success('Progress saved')}>Success</Button
			>
			<Button
				size="sm"
				variant="soft"
				tone="error"
				onclick={() => toast.error('Could not reach the server')}>Error</Button
			>
			<Button
				size="sm"
				variant="soft"
				tone="neutral"
				onclick={() =>
					toast('Question deleted', {
						description: 'Module 3 · Q 12',
						action: { label: 'Undo', onClick: () => toast.success('Restored') }
					})}>With action</Button
			>
		</div>
	</Spec>

	<Spec
		title="Dialogs"
		src={['ui/dialog', 'Dialog.Content sheet', 'DeleteConfirmationModal']}
		note="sheet docks to the bottom edge on phones. Destructive confirms go through AlertDialog."
	>
		<div class="flex flex-wrap gap-2">
			<Dialog.Root bind:open={dialogOpen}>
				<Dialog.Trigger>
					{#snippet child({ props })}<Button {...props} variant="outline" tone="neutral"
							>Dialog</Button
						>{/snippet}
				</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Rename module</Dialog.Title>
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

			<Dialog.Root bind:open={sheetDialogOpen}>
				<Dialog.Trigger>
					{#snippet child({ props })}<Button {...props} variant="outline" tone="neutral"
							>Sheet mode</Button
						>{/snippet}
				</Dialog.Trigger>
				<Dialog.Content sheet showCloseButton={false}>
					<Dialog.CornerClose onclick={() => (sheetDialogOpen = false)} />
					<Dialog.Header>
						<Dialog.Title>Study settings</Dialog.Title>
						<Dialog.Description>A bottom sheet below sm, centered above.</Dialog.Description>
					</Dialog.Header>
					<div class="space-y-3">
						<label class="flex items-center justify-between text-sm"
							>Show rationale <Switch bind:checked={showRationale} /></label
						>
						<label class="flex items-center justify-between text-sm"
							>Auto next <Switch bind:checked={autoNext} /></label
						>
					</div>
				</Dialog.Content>
			</Dialog.Root>

			<Button variant="soft" tone="error" onclick={() => (deleteOpen = true)}
				><Trash2 />Delete module</Button
			>
			<DeleteConfirmationModal
				isDeleteModalOpen={deleteOpen}
				itemType="module"
				itemName="Lids & Adnexa"
				questionCount={32}
				onCancel={() => (deleteOpen = false)}
				onConfirm={() => {
					deleteOpen = false;
					toast('Module deleted');
				}}
			/>
		</div>
	</Spec>

	<Spec
		title="Draggable sheet"
		src="#lib/components/Sheet.svelte"
		note="Phones drag the handle to dismiss (or expand); desktop gets a dialog. Quiz tools and the navigator use it."
	>
		<Button variant="outline" tone="neutral" onclick={() => (sheetOpen = true)}>Open sheet</Button>
		<Sheet
			bind:open={sheetOpen}
			title="Question tools"
			description="Module 3 · Q 4 of 40"
			expandable
		>
			<div class="space-y-2 text-sm">
				{#each ['Flag for review', 'Highlight stem', 'Shuffle options', 'Calculator'] as tool (tool)}
					<div class="surface-sm px-3 py-2.5">{tool}</div>
				{/each}
			</div>
			{#snippet footer()}
				<Button class="w-full" onclick={() => (sheetOpen = false)}>Done</Button>
			{/snippet}
		</Sheet>
	</Spec>

	<Spec
		title="Menus"
		src={['ui/dropdown-menu', 'ui/popover']}
		note="Row actions in the admin question list."
	>
		<div class="flex items-center justify-between gap-3 surface-sm p-3">
			<div class="min-w-0">
				<p class="truncate text-sm font-medium">#12 · Which structure does kerat/o refer to?</p>
				<p class="text-xs text-muted-foreground">Multiple choice · Published</p>
			</div>
			<div class="flex shrink-0 items-center gap-1">
				<Popover.Root>
					<Popover.Trigger>
						{#snippet child({ props })}
							<Button {...props} variant="ghost" tone="neutral" size="sm">Stats</Button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-60">
						<p class="text-sm font-semibold">Answered 212 times</p>
						<p class="text-sm text-muted-foreground">78% correct · 6 flags</p>
					</Popover.Content>
				</Popover.Root>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								tone="neutral"
								shape="circle"
								size="sm"
								aria-label="Question actions"><MoreHorizontal /></Button
							>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="w-56">
						<DropdownMenu.Label>Question 12</DropdownMenu.Label>
						<DropdownMenu.Item
							><Pencil />Edit<DropdownMenu.Shortcut>E</DropdownMenu.Shortcut></DropdownMenu.Item
						>
						<DropdownMenu.Item><Copy />Duplicate</DropdownMenu.Item>
						<DropdownMenu.Sub>
							<DropdownMenu.SubTrigger><FolderInput />Move to module</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent>
								<DropdownMenu.Item>Lids &amp; Adnexa</DropdownMenu.Item>
								<DropdownMenu.Item>Cornea</DropdownMenu.Item>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>
						<DropdownMenu.Separator />
						<DropdownMenu.CheckboxItem bind:checked={showRationale}
							>Show rationale</DropdownMenu.CheckboxItem
						>
						<DropdownMenu.Separator />
						<DropdownMenu.Item variant="destructive"><Trash2 />Delete</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		</div>
	</Spec>

	<Spec
		title="Hover card"
		src={['ui/hover-card', 'QuestionSources']}
		note="Source chips under a rationale. Hover a page for the cited passage."
	>
		<QuestionSources {source} />
	</Spec>
</Category>

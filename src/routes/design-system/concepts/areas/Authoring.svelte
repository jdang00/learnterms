<script lang="ts" module>
	export const meta = {
		title: 'Question authoring',
		summary:
			'Curators managing a bank: finding, editing, tagging, publishing and fixing questions.',
		order: 4
	};
</script>

<script lang="ts">
	import { getLocalTimeZone, today, type DateValue } from '@internationalized/date';
	import Archive from '@lucide/svelte/icons/archive';
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import Check from '@lucide/svelte/icons/check';
	import Columns3 from '@lucide/svelte/icons/columns-3';
	import FolderInput from '@lucide/svelte/icons/folder-input';
	import History from '@lucide/svelte/icons/history';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import PenLine from '@lucide/svelte/icons/pen-line';
	import Plus from '@lucide/svelte/icons/plus';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Tag from '@lucide/svelte/icons/tag';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Upload from '@lucide/svelte/icons/upload';
	import X from '@lucide/svelte/icons/x';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Calendar } from '#lib/components/ui/calendar/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import * as CodeBlock from '#lib/components/ui/code-block/index.js';
	import * as Command from '#lib/components/ui/command/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import * as Item from '#lib/components/ui/item/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import * as Menubar from '#lib/components/ui/menubar/index.js';
	import * as NativeSelect from '#lib/components/ui/native-select/index.js';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import * as Resizable from '#lib/components/ui/resizable/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import * as Tabs from '#lib/components/ui/tabs/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import * as Trace from '#lib/components/ui/trace/index.js';
	import Concept from '../Concept.svelte';
	import Grid from '../Grid.svelte';

	type Question = {
		id: string;
		stem: string;
		type: string;
		status: 'published' | 'draft' | 'flagged';
		accuracy: number | null;
	};
	const bank: Question[] = [
		{
			id: 'q1',
			stem: 'Which sign appears on downgaze in keratoconus?',
			type: 'Multiple choice',
			status: 'published',
			accuracy: 71
		},
		{
			id: 'q2',
			stem: 'Iron at the base of the cone forms a…',
			type: 'Fill in',
			status: 'published',
			accuracy: 64
		},
		{
			id: 'q3',
			stem: 'Match each topography pattern to its condition',
			type: 'Matching',
			status: 'draft',
			accuracy: null
		},
		{
			id: 'q4',
			stem: 'First-line treatment to halt progression',
			type: 'Multiple choice',
			status: 'flagged',
			accuracy: 38
		},
		{
			id: 'q5',
			stem: 'Explain why rigid lenses improve acuity',
			type: 'Free response',
			status: 'published',
			accuracy: 82
		}
	];
	let selected = $state<string[]>(['q2', 'q4']);
	let columns = $state({ type: true, accuracy: true });
	const allSelected = $derived(selected.length === bank.length);
	const statusTone = { published: 'success', draft: 'info', flagged: 'warning' } as const;
	function toggle(id: string, on: boolean) {
		selected = on ? [...selected, id] : selected.filter((s) => s !== id);
	}

	let stem = $state('Which sign appears on downgaze in advanced keratoconus?');
	const options = ['Munson sign', 'Rizzuti sign', 'Fleischer ring', 'Vogt striae'];

	const allTags = [
		'Cornea',
		'Ectasia',
		'Topography',
		'Contact lenses',
		'Boards high-yield',
		'Pediatrics'
	];
	let tags = $state(['Cornea', 'Ectasia']);
	let tagSearch = $state('');
	const tagMatches = $derived(
		allTags.filter((t) => t.toLowerCase().includes(tagSearch.trim().toLowerCase()))
	);
	function toggleTag(tag: string) {
		tags = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
	}

	const now = today(getLocalTimeZone());
	let publishDate = $state<DateValue | undefined>(now.add({ days: 3 }));
	let publishTime = $state('08:00');

	let inboxTab = $state('open');
	const flags = [
		['Answer key wrong', 'Q12 accepts only “Fleischer” but the stem asks for the full term', 6],
		['Image missing', 'Q31 references a figure that doesn’t load on iOS', 2],
		['Ambiguous wording', 'Q8: “most likely” has two defensible answers', 3]
	] as const;

	const importText = `prompt\tanswer\tmodule
Munson sign\tV-shaped lower lid on downgaze\tKeratoconus
Fleischer ring\t\tKeratoconus
Vogt striae\tFine vertical stress lines\tKeratoconsu`;
	let questionType = $state('mc');
</script>

<Grid>
	<Concept
		title="Question bank table"
		uses={['Table', 'Checkbox', 'DropdownMenu', 'Badge']}
		where="Admin module page. Select rows for bulk actions; choose which columns matter for this pass."
		wide
	>
		<div class="mb-3 flex min-h-9 flex-wrap items-center justify-between gap-2">
			{#if selected.length}
				<div
					class="flex flex-wrap items-center gap-2 rounded-full bg-primary/8 py-1 ps-4 pe-1 text-sm"
				>
					<span class="font-medium text-primary-ink">{selected.length} selected</span>
					<Button size="xs" variant="ghost" tone="neutral"><FolderInput />Move</Button>
					<Button size="xs" variant="ghost" tone="neutral"><Tag />Tag</Button>
					<Button size="xs" variant="ghost" tone="neutral"><Archive />Archive</Button>
					<Button size="xs" variant="ghost" tone="error"><Trash2 />Delete</Button>
					<Button
						size="xs"
						shape="circle"
						variant="ghost"
						tone="neutral"
						aria-label="Clear selection"
						onclick={() => (selected = [])}><X /></Button
					>
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">{bank.length} questions</p>
			{/if}
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} size="sm" variant="outline" tone="neutral"
							><Columns3 />Columns</Button
						>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end">
					<DropdownMenu.CheckboxItem bind:checked={columns.type}>Type</DropdownMenu.CheckboxItem>
					<DropdownMenu.CheckboxItem bind:checked={columns.accuracy}
						>Accuracy</DropdownMenu.CheckboxItem
					>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-10">
						<Checkbox
							checked={allSelected}
							indeterminate={selected.length > 0 && !allSelected}
							onCheckedChange={(on) => (selected = on ? bank.map((q) => q.id) : [])}
							aria-label="Select all"
						/>
					</Table.Head>
					<Table.Head>Question</Table.Head>
					{#if columns.type}<Table.Head>Type</Table.Head>{/if}
					<Table.Head>Status</Table.Head>
					{#if columns.accuracy}<Table.Head class="text-right">Accuracy</Table.Head>{/if}
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each bank as q (q.id)}
					<Table.Row data-state={selected.includes(q.id) ? 'selected' : undefined}>
						<Table.Cell>
							<Checkbox
								checked={selected.includes(q.id)}
								onCheckedChange={(on) => toggle(q.id, on)}
								aria-label="Select question"
							/>
						</Table.Cell>
						<Table.Cell class="max-w-80 truncate font-medium">{q.stem}</Table.Cell>
						{#if columns.type}<Table.Cell class="text-muted-foreground">{q.type}</Table.Cell>{/if}
						<Table.Cell><Badge tone={statusTone[q.status]}>{q.status}</Badge></Table.Cell>
						{#if columns.accuracy}
							<Table.Cell
								class="text-right tabular-nums {q.accuracy !== null && q.accuracy < 50
									? 'text-error-ink'
									: ''}"
							>
								{q.accuracy === null ? '—' : `${q.accuracy}%`}
							</Table.Cell>
						{/if}
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</Concept>

	<Concept
		title="Editor beside a live preview"
		uses={['Resizable', 'Textarea']}
		where="The question editor on wide screens: write on the left, see exactly what students get on the right."
		wide
	>
		<div class="h-80">
			<Resizable.PaneGroup direction="horizontal" class="overflow-hidden surface">
				<Resizable.Pane defaultSize={50} minSize={30} class="space-y-3 p-4">
					<p class="label-caps">Editor</p>
					<Textarea bind:value={stem} rows={3} aria-label="Stem" />
					{#each options as option, i (option)}
						<div class="flex items-center gap-2 text-sm">
							<span
								class="grid size-6 place-items-center rounded-full text-xs font-semibold {i === 0
									? 'bg-success text-success-foreground'
									: 'bg-muted'}">{String.fromCharCode(65 + i)}</span
							>
							{option}
						</div>
					{/each}
				</Resizable.Pane>
				<Resizable.Handle withHandle />
				<Resizable.Pane defaultSize={50} minSize={30} class="graph-stage p-4">
					<p class="label-caps">Student preview</p>
					<p class="mt-3 font-medium leading-relaxed">{stem}</p>
					<div class="mt-3 space-y-2">
						{#each options as option, i (option)}
							<div class="rounded-full border-2 border-border bg-background px-4 py-2 text-sm">
								{String.fromCharCode(65 + i)}. {option}
							</div>
						{/each}
					</div>
				</Resizable.Pane>
			</Resizable.PaneGroup>
		</div>
	</Concept>

	<Concept
		title="Editor menubar"
		uses={['Menubar']}
		where="Above the editor on desktop: every editor action in one discoverable place, with shortcuts."
	>
		<Menubar.Root>
			<Menubar.Menu>
				<Menubar.Trigger>Question</Menubar.Trigger>
				<Menubar.Content>
					<Menubar.Item>New question<Menubar.Shortcut>⌘N</Menubar.Shortcut></Menubar.Item>
					<Menubar.Item>Duplicate<Menubar.Shortcut>⌘D</Menubar.Shortcut></Menubar.Item>
					<Menubar.Separator />
					<Menubar.Item>Move to module…</Menubar.Item>
					<Menubar.Item>Archive</Menubar.Item>
				</Menubar.Content>
			</Menubar.Menu>
			<Menubar.Menu>
				<Menubar.Trigger>Insert</Menubar.Trigger>
				<Menubar.Content>
					<Menubar.Item>Image</Menubar.Item>
					<Menubar.Item>Exam finding box</Menubar.Item>
					<Menubar.Item>Source citation</Menubar.Item>
				</Menubar.Content>
			</Menubar.Menu>
			<Menubar.Menu>
				<Menubar.Trigger>AI</Menubar.Trigger>
				<Menubar.Content>
					<Menubar.Item><Sparkles />Draft rationale</Menubar.Item>
					<Menubar.Item><Sparkles />Suggest distractors</Menubar.Item>
					<Menubar.Item><Sparkles />Check against source</Menubar.Item>
				</Menubar.Content>
			</Menubar.Menu>
		</Menubar.Root>
	</Concept>

	<Concept
		title="Tag picker"
		uses={['Popover', 'Command', 'Badge']}
		where="Question properties. Pick several tags, search, or create one that doesn’t exist yet."
	>
		<div class="flex flex-wrap items-center gap-1.5">
			{#each tags as tag (tag)}
				<Badge size="md" tone="primary">
					{tag}
					<button
						type="button"
						class="-me-1 rounded-full hover:bg-primary/15"
						aria-label="Remove {tag}"
						onclick={() => toggleTag(tag)}><X class="size-3" /></button
					>
				</Badge>
			{/each}
			<Popover.Root>
				<Popover.Trigger>
					{#snippet child({ props })}
						<Button {...props} size="xs" variant="dash" tone="neutral"><Plus />Tag</Button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="w-64 p-0" align="start">
					<Command.Root shouldFilter={false}>
						<Command.Input placeholder="Find or create a tag" bind:value={tagSearch} />
						<Command.List>
							{#each tagMatches as tag (tag)}
								<Command.Item value={tag} onSelect={() => toggleTag(tag)}>
									<Check class={tags.includes(tag) ? '' : 'invisible'} />{tag}
								</Command.Item>
							{/each}
							{#if tagSearch.trim() && !allTags.some((t) => t.toLowerCase() === tagSearch
											.trim()
											.toLowerCase())}
								<Command.Item value="create" onSelect={() => toggleTag(tagSearch.trim())}>
									<Plus />Create “{tagSearch.trim()}”
								</Command.Item>
							{/if}
						</Command.List>
					</Command.Root>
				</Popover.Content>
			</Popover.Root>
		</div>
	</Concept>

	<Concept
		title="Scheduled publish"
		uses={['Popover', 'Calendar', 'Input']}
		where="The publish button’s split menu: release a module the morning of the lecture."
	>
		<Popover.Root>
			<Popover.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="soft" tone="primary"
						><CalendarClock />Publish {publishDate
							? publishDate
									.toDate(getLocalTimeZone())
									.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
							: ''} at {publishTime}</Button
					>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="w-auto space-y-3 p-3" align="start">
				<Calendar type="single" bind:value={publishDate} minValue={now} />
				<div class="flex items-center gap-2 px-1">
					<Label for="publish-time" class="text-sm">Time</Label>
					<Input id="publish-time" type="time" bind:value={publishTime} class="h-9" />
				</div>
			</Popover.Content>
		</Popover.Root>
	</Concept>

	<Concept
		title="Revision history"
		uses={['Trace', 'Collapsible']}
		where="A History tab on a question: who changed what, expandable to the diff."
	>
		<Trace.Root>
			<Trace.Collapsible>
				<Trace.CollapsibleTrigger>
					<Trace.Line>
						<Trace.Icon><KeyRound /></Trace.Icon>
						<Trace.Title>Answer key changed by Dr. Patel</Trace.Title>
						<Trace.Description>2h ago</Trace.Description>
					</Trace.Line>
				</Trace.CollapsibleTrigger>
				<Trace.CollapsibleContent>
					<p class="text-sm">
						<span class="text-error-ink line-through">Fleischer</span> →
						<span class="text-success-ink">Fleischer ring</span>
					</p>
				</Trace.CollapsibleContent>
			</Trace.Collapsible>
			<Trace.Line>
				<Trace.Icon><PenLine /></Trace.Icon>
				<Trace.Title>Stem reworded from a student flag</Trace.Title>
				<Trace.Description>Yesterday</Trace.Description>
			</Trace.Line>
			<Trace.Line>
				<Trace.Icon><Sparkles /></Trace.Icon>
				<Trace.Title>Drafted in Question Studio from Lecture 6</Trace.Title>
				<Trace.Description>Sep 30</Trace.Description>
			</Trace.Line>
			<Trace.Line status="pending">
				<Trace.Icon><History /></Trace.Icon>
				<Trace.Title>Scheduled to publish Thursday</Trace.Title>
			</Trace.Line>
		</Trace.Root>
	</Concept>

	<Concept
		title="Flag inbox"
		uses={['Tabs', 'Item', 'Badge']}
		where="One place for every student flag across a class, grouped by question."
	>
		<Tabs.Root bind:value={inboxTab}>
			<Tabs.List>
				<Tabs.Trigger value="open">Open <Badge size="xs" tone="warning">11</Badge></Tabs.Trigger>
				<Tabs.Trigger value="resolved">Resolved</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="open" class="mt-3">
				<Item.Group class="gap-2">
					{#each flags as [title, detail, count] (title)}
						<Item.Root variant="outline" size="sm">
							<Item.Content>
								<Item.Title>{title} <Badge size="xs">{count} students</Badge></Item.Title>
								<Item.Description>{detail}</Item.Description>
							</Item.Content>
							<Item.Actions
								><Button size="xs" variant="soft" tone="neutral">Open</Button></Item.Actions
							>
						</Item.Root>
					{/each}
				</Item.Group>
			</Tabs.Content>
			<Tabs.Content value="resolved" class="mt-3 text-sm text-muted-foreground"
				>42 flags resolved this semester.</Tabs.Content
			>
		</Tabs.Root>
	</Concept>

	<Concept
		title="Spreadsheet import check"
		uses={['CodeBlock', 'Alert']}
		where="Bulk import: show the pasted rows with line numbers and point at the ones that won’t import."
	>
		<CodeBlock.Root size="sm">
			<CodeBlock.Header>
				<CodeBlock.Title><Upload size={14} />matching-pairs.tsv</CodeBlock.Title>
				<CodeBlock.Actions><CodeBlock.CopyButton value={importText} /></CodeBlock.Actions>
			</CodeBlock.Header>
			<CodeBlock.Content code={importText} lineNumbers />
		</CodeBlock.Root>
		<Alert.Root tone="warning" class="mt-3">
			<Alert.Title>2 rows need attention</Alert.Title>
			<Alert.Description
				>Line 3 has no answer. Line 4’s module “Keratoconsu” doesn’t exist.</Alert.Description
			>
		</Alert.Root>
	</Concept>

	<Concept
		title="Native select on phones"
		uses={['NativeSelect']}
		where="Editor fields on touch screens, where the OS picker beats a custom popover."
	>
		<div class="space-y-2">
			<Label for="qtype">Question type</Label>
			<NativeSelect.Root id="qtype" bind:value={questionType} class="w-full">
				<NativeSelect.Option value="mc">Multiple choice</NativeSelect.Option>
				<NativeSelect.Option value="fitb">Fill in the blank</NativeSelect.Option>
				<NativeSelect.Option value="matching">Matching</NativeSelect.Option>
				<NativeSelect.Option value="free">Free response</NativeSelect.Option>
			</NativeSelect.Root>
		</div>
	</Concept>
</Grid>

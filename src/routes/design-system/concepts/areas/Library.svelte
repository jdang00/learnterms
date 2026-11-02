<script lang="ts" module>
	export const meta = {
		title: 'Content library',
		summary:
			'Class material curators upload: getting it in, reading it, asking it questions, and keeping it organized.',
		order: 6
	};
</script>

<script lang="ts">
	import BookMarked from '@lucide/svelte/icons/book-marked';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Copy from '@lucide/svelte/icons/copy';
	import FileImage from '@lucide/svelte/icons/file-image';
	import FileText from '@lucide/svelte/icons/file-text';
	import Folder from '@lucide/svelte/icons/folder';
	import FolderOpen from '@lucide/svelte/icons/folder-open';
	import Info from '@lucide/svelte/icons/info';
	import Pencil from '@lucide/svelte/icons/pencil';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import ScanText from '@lucide/svelte/icons/scan-text';
	import Search from '@lucide/svelte/icons/search';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';
	import * as Attachment from '#lib/components/ui/attachment/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import * as Bubble from '#lib/components/ui/bubble/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Collapsible from '#lib/components/ui/collapsible/index.js';
	import * as ContextMenu from '#lib/components/ui/context-menu/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import * as HoverCard from '#lib/components/ui/hover-card/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import * as Marker from '#lib/components/ui/marker/index.js';
	import * as Message from '#lib/components/ui/message/index.js';
	import { Progress } from '#lib/components/ui/progress/index.js';
	import * as Resizable from '#lib/components/ui/resizable/index.js';
	import { ScrollArea } from '#lib/components/ui/scroll-area/index.js';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import * as Trace from '#lib/components/ui/trace/index.js';
	import Concept from '../Concept.svelte';
	import Grid from '../Grid.svelte';

	const uploads = [
		{
			name: 'Lecture 6 · Keratoconus.pdf',
			detail: '4.2 MB · uploading 64%',
			state: 'uploading',
			progress: 64
		},
		{
			name: 'Cornea & Contact Lenses.pdf',
			detail: 'Reading 212 pages…',
			state: 'processing',
			progress: null
		},
		{
			name: 'Slit lamp photos.zip',
			detail: 'Only PDFs are supported',
			state: 'error',
			progress: null
		},
		{
			name: 'Topography handout.pdf',
			detail: '18 pages · searchable',
			state: 'done',
			progress: null
		}
	] as const;

	const pages = Array.from({ length: 12 }, (_, i) => 110 + i);
	let page = $state(112);

	const tree = [
		{
			name: 'Clinical Optics II',
			open: true,
			files: ['Lecture 5 · Aberrations.pdf', 'Lecture 6 · Keratoconus.pdf']
		},
		{
			name: 'Ocular Pharmacology',
			open: false,
			files: ['Antibiotics.pdf', 'Glaucoma drugs.pdf', 'Steroids.pdf']
		},
		{ name: 'Shared references', open: false, files: ['Cornea & Contact Lenses.pdf'] }
	];
	let detailsOpen = $state(false);
	let allowStudio = $state(true);
</script>

{#snippet cite(n: number, page: number, quote: string)}
	<HoverCard.Root openDelay={80}>
		<HoverCard.Trigger
			class="mx-0.5 inline-grid size-5 place-items-center rounded-full bg-info/15 align-[1px] font-mono text-[10px] font-semibold text-info-ink"
			>{n}</HoverCard.Trigger
		>
		<HoverCard.Content class="w-72 space-y-1.5">
			<p class="text-xs font-semibold">
				Cornea & Contact Lenses · <span class="font-mono">p. {page}</span>
			</p>
			<p class="text-sm text-foreground/75">“{quote}”</p>
		</HoverCard.Content>
	</HoverCard.Root>
{/snippet}

<Grid>
	<Concept
		title="Upload queue"
		uses={['Attachment', 'Progress', 'Spinner']}
		where="Adding documents: every file’s state in one list, with retry where it failed."
	>
		<Attachment.Group class="flex flex-col gap-2">
			{#each uploads as file (file.name)}
				<Attachment.Root state={file.state} class="w-full">
					<Attachment.Media>
						{#if file.state === 'processing'}<Spinner
							/>{:else if file.name.endsWith('.zip')}<FileImage />{:else}<FileText />{/if}
					</Attachment.Media>
					<Attachment.Content class="min-w-0 flex-1">
						<Attachment.Title>{file.name}</Attachment.Title>
						<Attachment.Description class={file.state === 'error' ? 'text-error-ink' : ''}
							>{file.detail}</Attachment.Description
						>
						{#if file.progress !== null}<Progress value={file.progress} class="mt-1 h-1" />{/if}
					</Attachment.Content>
					<Attachment.Actions>
						{#if file.state === 'error'}
							<Attachment.Action aria-label="Retry"><RotateCw /></Attachment.Action>
						{/if}
						<Attachment.Action aria-label="Remove"><X /></Attachment.Action>
					</Attachment.Actions>
				</Attachment.Root>
			{/each}
		</Attachment.Group>
	</Concept>

	<Concept
		title="Ask the library"
		uses={['Message', 'Bubble', 'Trace', 'HoverCard']}
		where="The RAG workbench. Tool calls fold into one line; numbered citations show the passage on hover."
	>
		<div class="flex flex-col gap-4">
			<Message.Root align="end">
				<Message.Content>
					<Bubble.Root variant="tinted" align="end"
						><Bubble.Content>What thickness do we require before cross-linking?</Bubble.Content
						></Bubble.Root
					>
				</Message.Content>
			</Message.Root>
			<Trace.Root>
				<Trace.Collapsible>
					<Trace.CollapsibleTrigger>
						<Trace.Line>
							<Trace.Icon><Search /></Trace.Icon>
							<Trace.Title>Searched 3 documents</Trace.Title>
							<Trace.Description>5 passages</Trace.Description>
						</Trace.Line>
					</Trace.CollapsibleTrigger>
					<Trace.CollapsibleContent class="text-sm text-foreground/75">
						“cross-linking minimum thickness”, “epithelium-off CXL”, “riboflavin protocol”
					</Trace.CollapsibleContent>
				</Trace.Collapsible>
			</Trace.Root>
			<Message.Root>
				<Message.Content>
					<Bubble.Root variant="ghost">
						<Bubble.Content class="text-sm leading-relaxed">
							The standard Dresden protocol needs at least 400 µm of stroma after the epithelium is
							removed{@render cite(
								1,
								120,
								'A minimum corneal thickness of 400 µm is required to protect the endothelium.'
							)}. Thinner corneas can use hypo-osmolar riboflavin to swell the stroma first{@render cite(
								2,
								121,
								'Hypo-osmolar riboflavin may be used to swell thin corneas above the threshold.'
							)}.
						</Bubble.Content>
					</Bubble.Root>
				</Message.Content>
			</Message.Root>
		</div>
	</Concept>

	<Concept
		title="Reader with page rail"
		uses={['Resizable', 'ScrollArea']}
		where="Opening a document: page thumbnails beside the extracted text, so OCR mistakes are easy to spot."
		wide
	>
		<div class="h-72">
			<Resizable.PaneGroup direction="horizontal" class="overflow-hidden surface">
				<Resizable.Pane defaultSize={22} minSize={15}>
					<ScrollArea class="h-full">
						<div class="space-y-2 p-3">
							{#each pages as p (p)}
								<button
									type="button"
									onclick={() => (page = p)}
									class="flex w-full items-center gap-2 rounded-xl p-1.5 text-left text-xs transition-colors {page ===
									p
										? 'bg-primary/10 text-primary-ink'
										: 'hover:bg-muted'}"
								>
									<span
										class="graph-stage h-10 w-8 shrink-0 rounded-md border border-border bg-background"
									></span>
									<span class="font-mono">p. {p}</span>
								</button>
							{/each}
						</div>
					</ScrollArea>
				</Resizable.Pane>
				<Resizable.Handle withHandle />
				<Resizable.Pane defaultSize={78}>
					<ScrollArea class="h-full">
						<article class="max-w-prose space-y-3 p-5 text-sm leading-relaxed">
							<p class="flex items-center gap-2 font-mono text-xs text-muted-foreground">
								<ScanText size={14} />Page {page} · OCR 98% confident
							</p>
							<h4 class="text-base font-semibold">Corneal collagen cross-linking</h4>
							<p>
								Cross-linking strengthens the stroma by forming new covalent bonds between collagen
								fibrils. Riboflavin is applied and activated by ultraviolet A light at 370 nm.
							</p>
							<p>
								<mark class="rounded bg-highlighter/40 px-0.5"
									>A minimum corneal thickness of 400 µm is required to protect the endothelium.</mark
								> Thinner corneas need a modified protocol.
							</p>
							<p>
								Progression is monitored with serial topography, comparing maximum keratometry over
								time.
							</p>
						</article>
					</ScrollArea>
				</Resizable.Pane>
			</Resizable.PaneGroup>
		</div>
	</Concept>

	<Concept
		title="Folder tree"
		uses={['Collapsible', 'ContextMenu']}
		where="The library sidebar. Folders fold; right-click a file to rename, copy a link or remove it."
	>
		<ul class="space-y-1 text-sm">
			{#each tree as folder (folder.name)}
				<li>
					<Collapsible.Root open={folder.open}>
						<Collapsible.Trigger
							class="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 font-medium hover:bg-muted"
						>
							<ChevronRight
								size={14}
								class="transition-transform group-data-[state=open]:rotate-90"
							/>
							<Folder size={16} class="text-muted-foreground group-data-[state=open]:hidden" />
							<FolderOpen size={16} class="hidden text-primary-ink group-data-[state=open]:block" />
							{folder.name}
							<Badge size="xs" class="ms-auto">{folder.files.length}</Badge>
						</Collapsible.Trigger>
						<Collapsible.Content>
							<ul class="ms-5 border-s border-border ps-2">
								{#each folder.files as file (file)}
									<li>
										<ContextMenu.Root>
											<ContextMenu.Trigger
												class="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted"
											>
												<FileText size={14} class="text-muted-foreground" />{file}
											</ContextMenu.Trigger>
											<ContextMenu.Content class="w-52">
												<ContextMenu.Item><Pencil />Rename</ContextMenu.Item>
												<ContextMenu.Item><Copy />Copy link</ContextMenu.Item>
												<ContextMenu.Item><Sparkles />Draft questions from this</ContextMenu.Item>
												<ContextMenu.Separator />
												<ContextMenu.Item variant="destructive"><Trash2 />Remove</ContextMenu.Item>
											</ContextMenu.Content>
										</ContextMenu.Root>
									</li>
								{/each}
							</ul>
						</Collapsible.Content>
					</Collapsible.Root>
				</li>
			{/each}
		</ul>
	</Concept>

	<Concept
		title="Processing steps"
		uses={['Marker', 'Spinner']}
		where="A document’s status line while it’s being made searchable, instead of one long spinner."
	>
		<div class="space-y-2">
			<Marker.Root variant="border"
				><Marker.Icon><FileText class="text-success-ink" /></Marker.Icon><Marker.Content
					>Uploaded · 212 pages</Marker.Content
				></Marker.Root
			>
			<Marker.Root variant="border"
				><Marker.Icon><ScanText class="text-success-ink" /></Marker.Icon><Marker.Content
					>Text extracted from scanned pages</Marker.Content
				></Marker.Root
			>
			<Marker.Root variant="border" role="status"
				><Marker.Icon><Spinner /></Marker.Icon><Marker.Content
					>Indexing for search · 140 of 212</Marker.Content
				></Marker.Root
			>
			<Marker.Root class="text-muted-foreground"
				><Marker.Icon><BookMarked /></Marker.Icon><Marker.Content
					>Ready for Question Studio</Marker.Content
				></Marker.Root
			>
		</div>
	</Concept>

	<Concept
		title="Document details"
		uses={['Sheet', 'Field', 'Switch']}
		where="Clicking a document’s info button: properties in a side sheet that keeps the list visible."
	>
		<Button variant="outline" tone="neutral" onclick={() => (detailsOpen = true)}
			><Info />Document details</Button
		>
		<Sheet.Root bind:open={detailsOpen}>
			<Sheet.Content side="right" class="w-full sm:max-w-md">
				<Sheet.Header>
					<Sheet.Title>Cornea & Contact Lenses</Sheet.Title>
					<Sheet.Description>212 pages · uploaded Sep 12 by Dr. Patel</Sheet.Description>
				</Sheet.Header>
				<div class="space-y-5 px-4">
					<Field.Field>
						<Field.Label for="doc-title">Title</Field.Label>
						<Input id="doc-title" value="Cornea & Contact Lenses" />
					</Field.Field>
					<Field.Field>
						<Field.Label for="doc-edition">Edition</Field.Label>
						<Input id="doc-edition" value="4th" />
					</Field.Field>
					<label class="flex items-center justify-between gap-3 text-sm">
						Available to Question Studio <Switch bind:checked={allowStudio} />
					</label>
				</div>
				<Sheet.Footer>
					<Button onclick={() => (detailsOpen = false)}>Save</Button>
				</Sheet.Footer>
			</Sheet.Content>
		</Sheet.Root>
	</Concept>
</Grid>

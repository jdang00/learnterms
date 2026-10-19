<script lang="ts">
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import { getLocalTimeZone, today, type DateValue } from '@internationalized/date';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Copy from '@lucide/svelte/icons/copy';
	import Eye from '@lucide/svelte/icons/eye';
	import FileText from '@lucide/svelte/icons/file-text';
	import Flag from '@lucide/svelte/icons/flag';
	import FolderInput from '@lucide/svelte/icons/folder-input';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import Highlighter from '@lucide/svelte/icons/highlighter';
	import Inbox from '@lucide/svelte/icons/inbox';
	import Library from '@lucide/svelte/icons/library';
	import MoreHorizontal from '@lucide/svelte/icons/more-horizontal';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Search from '@lucide/svelte/icons/search';
	import Shuffle from '@lucide/svelte/icons/shuffle';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Users from '@lucide/svelte/icons/users';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Kbd, KbdGroup } from '$lib/components/ui/kbd';
	import { Calendar } from '$lib/components/ui/calendar';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { AspectRatio } from '$lib/components/ui/aspect-ratio';
	import { Slider } from '$lib/components/ui/slider';
	import * as Accordion from '$lib/components/ui/accordion';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';
	import * as ButtonGroup from '$lib/components/ui/button-group';
	import * as Carousel from '$lib/components/ui/carousel';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import * as Command from '$lib/components/ui/command';
	import * as ContextMenu from '$lib/components/ui/context-menu';
	import * as Drawer from '$lib/components/ui/drawer';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Empty from '$lib/components/ui/empty';
	import * as HoverCard from '$lib/components/ui/hover-card';
	import * as InputGroup from '$lib/components/ui/input-group';
	import * as InputOTP from '$lib/components/ui/input-otp';
	import * as Item from '$lib/components/ui/item';
	import * as Menubar from '$lib/components/ui/menubar';
	import * as NavigationMenu from '$lib/components/ui/navigation-menu';
	import * as Pagination from '$lib/components/ui/pagination';
	import * as Popover from '$lib/components/ui/popover';
	import * as Resizable from '$lib/components/ui/resizable';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';

	let examDate = $state<DateValue | undefined>(today(getLocalTimeZone()).add({ days: 12 }));
	let joinCode = $state('');
	let showRationale = $state(true);
	let showSources = $state(false);
	let textScale = $state(100);
	let questionTypes = $state<string[]>(['mc']);

	const slides = [
		{ title: 'Fundus photo', note: 'Figure 4.2 · Optic disc cupping', hue: 'var(--primary)' },
		{ title: 'Slit lamp', note: 'Figure 4.3 · Corneal staining', hue: 'var(--info)' },
		{ title: 'OCT scan', note: 'Figure 4.4 · RNFL thinning', hue: 'var(--accent)' },
		{ title: 'Visual field', note: 'Figure 4.5 · Arcuate defect', hue: 'var(--secondary)' }
	];
	const members = ['AC', 'JP', 'SR', 'MK', 'TL'];
	const rationale = Array.from(
		{ length: 8 },
		(_, i) =>
			`Step ${i + 1}. Fraunhofer diffraction assumes both the source and the screen sit at optical infinity, so plane waves enter and leave the aperture.`
	);
</script>

{#snippet usecase(title: string, where: string)}
	<div class="mb-3">
		<h3 class="text-base font-semibold">{title}</h3>
		<p class="text-sm text-muted-foreground">{where}</p>
	</div>
{/snippet}

<section class="space-y-8">
	<div>
		<h2 class="text-3xl font-semibold">Explorations</h2>
		<p class="mt-1 max-w-2xl text-muted-foreground">
			Components we could adopt, each shown where it might live in LearnTerms. Nothing here is wired
			into the product yet.
		</p>
	</div>

	<div class="grid grid-cols-1 gap-6 *:min-w-0 lg:grid-cols-2">
		<!-- Command palette -->
		<div class="surface p-5">
			{@render usecase('Command palette', 'The Power Bar: jump to any class, module, or question.')}
			<Command.Root class="h-80 surface">
				<Command.Input placeholder="Search classes, modules, questions…" />
				<Command.List>
					<Command.Empty>No results.</Command.Empty>
					<Command.Group heading="Continue">
						<Command.Item>
							<BookOpen />Corneal Topography/Tomography
							<Command.Shortcut>48 Q</Command.Shortcut>
						</Command.Item>
						<Command.Item
							><BookOpen />Lids &amp; Adnexa<Command.Shortcut>32 Q</Command.Shortcut></Command.Item
						>
					</Command.Group>
					<Command.Separator />
					<Command.Group heading="Actions">
						<Command.Item><Flag />Review flagged questions</Command.Item>
						<Command.Item><Sparkles />Open Question Studio</Command.Item>
						<Command.Item><Library />Content Library</Command.Item>
					</Command.Group>
				</Command.List>
			</Command.Root>
		</div>

		<!-- Carousel -->
		<div class="surface p-5">
			{@render usecase('Carousel', 'Question figures and attachments, swipeable on phones.')}
			<div class="px-12">
				<Carousel.Root opts={{ align: 'start' }}>
					<Carousel.Content>
						{#each slides as slide (slide.title)}
							<Carousel.Item class="basis-2/3">
								<div
									class="graph-stage flex h-40 flex-col justify-end surface p-4"
									style="background: color-mix(in oklab, {slide.hue} 10%, var(--muted))"
								>
									<p class="font-semibold">{slide.title}</p>
									<p class="font-mono text-xs text-muted-foreground">{slide.note}</p>
								</div>
							</Carousel.Item>
						{/each}
					</Carousel.Content>
					<Carousel.Previous />
					<Carousel.Next />
				</Carousel.Root>
			</div>
		</div>

		<!-- Dropdown menu -->
		<div class="surface p-5">
			{@render usecase(
				'Dropdown menu',
				'Question row actions in the admin list, with submenus and toggles.'
			)}
			<div class="flex items-center justify-between surface p-3">
				<div class="min-w-0">
					<p class="truncate text-sm font-medium">#12 · Which structure does kerat/o refer to?</p>
					<p class="text-xs text-muted-foreground">Multiple choice · Published</p>
				</div>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								tone="neutral"
								shape="circle"
								size="sm"
								aria-label="Question actions"
							>
								<MoreHorizontal />
							</Button>
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
								<DropdownMenu.Item>Uveitis</DropdownMenu.Item>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>
						<DropdownMenu.Separator />
						<DropdownMenu.CheckboxItem bind:checked={showRationale}
							>Show rationale</DropdownMenu.CheckboxItem
						>
						<DropdownMenu.CheckboxItem bind:checked={showSources}
							>Show sources</DropdownMenu.CheckboxItem
						>
						<DropdownMenu.Separator />
						<DropdownMenu.Item variant="destructive"><Trash2 />Delete</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		</div>

		<!-- Menubar -->
		<div class="surface p-5">
			{@render usecase(
				'Menubar',
				'A desktop-style menu for the question editor and Question Studio.'
			)}
			<Menubar.Root>
				<Menubar.Menu>
					<Menubar.Trigger>Question</Menubar.Trigger>
					<Menubar.Content>
						<Menubar.Item>New question<Menubar.Shortcut>⌘N</Menubar.Shortcut></Menubar.Item>
						<Menubar.Item>Duplicate<Menubar.Shortcut>⌘D</Menubar.Shortcut></Menubar.Item>
						<Menubar.Separator />
						<Menubar.Item>Export module…</Menubar.Item>
					</Menubar.Content>
				</Menubar.Menu>
				<Menubar.Menu>
					<Menubar.Trigger>Edit</Menubar.Trigger>
					<Menubar.Content>
						<Menubar.Item>Undo<Menubar.Shortcut>⌘Z</Menubar.Shortcut></Menubar.Item>
						<Menubar.Item>Redo<Menubar.Shortcut>⇧⌘Z</Menubar.Shortcut></Menubar.Item>
						<Menubar.Separator />
						<Menubar.Item>Shuffle options</Menubar.Item>
					</Menubar.Content>
				</Menubar.Menu>
				<Menubar.Menu>
					<Menubar.Trigger>View</Menubar.Trigger>
					<Menubar.Content>
						<Menubar.CheckboxItem bind:checked={showRationale}>Rationale</Menubar.CheckboxItem>
						<Menubar.CheckboxItem bind:checked={showSources}>Sources</Menubar.CheckboxItem>
					</Menubar.Content>
				</Menubar.Menu>
			</Menubar.Root>
		</div>

		<!-- Popover + Hover card -->
		<div class="surface p-5">
			{@render usecase(
				'Popover & hover card',
				'Source citations that preview the page, and student mini-profiles.'
			)}
			<p class="text-sm leading-relaxed">
				Fraunhofer diffraction assumes optical infinity
				<Popover.Root>
					<Popover.Trigger>
						{#snippet child({ props })}
							<button
								{...props}
								class="rounded-md bg-info/12 px-1.5 font-mono text-xs text-info-ink"
							>
								p. 14
							</button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-72">
						<p class="text-xs text-muted-foreground">Intro to Optometry · p. 14</p>
						<p class="text-sm">
							“When source and screen are effectively at infinity, the diffraction is termed
							Fraunhofer.”
						</p>
						<Button size="sm" variant="soft" tone="info"><FileText />Open page</Button>
					</Popover.Content>
				</Popover.Root>
				, studied most recently by
				<HoverCard.Root>
					<HoverCard.Trigger class="font-semibold underline decoration-dotted underline-offset-4"
						>Avery Chen</HoverCard.Trigger
					>
					<HoverCard.Content class="w-64">
						<div class="flex gap-3">
							<Avatar.Root class="size-10"><Avatar.Fallback>AC</Avatar.Fallback></Avatar.Root>
							<div>
								<p class="font-semibold">Avery Chen</p>
								<p class="text-xs text-muted-foreground">Class of 2028 · 212 answered</p>
								<div class="mt-2 flex gap-1.5">
									<Badge tone="success">91% accuracy</Badge>
									<Badge tone="ember">7 day streak</Badge>
								</div>
							</div>
						</div>
					</HoverCard.Content>
				</HoverCard.Root>.
			</p>
		</div>

		<!-- Context menu -->
		<div class="surface p-5">
			{@render usecase('Context menu', 'Right-click a question or document for quick actions.')}
			<ContextMenu.Root>
				<ContextMenu.Trigger
					class="graph-stage flex h-32 items-center justify-center rounded-3xl border-2 border-dashed text-sm text-muted-foreground"
				>
					Right-click this question card
				</ContextMenu.Trigger>
				<ContextMenu.Content class="w-52">
					<ContextMenu.Item><Flag />Flag for review</ContextMenu.Item>
					<ContextMenu.Item><Highlighter />Highlight stem</ContextMenu.Item>
					<ContextMenu.Item><Shuffle />Shuffle options</ContextMenu.Item>
					<ContextMenu.Separator />
					<ContextMenu.Item
						><Eye />Reveal rationale<ContextMenu.Shortcut>Tab</ContextMenu.Shortcut
						></ContextMenu.Item
					>
				</ContextMenu.Content>
			</ContextMenu.Root>
		</div>

		<!-- Empty -->
		<div class="surface p-5">
			{@render usecase('Empty', 'Calm empty states: no flagged questions, an empty library.')}
			<Empty.Root class="surface-dashed">
				<Empty.Header>
					<Empty.Media variant="icon"><Inbox /></Empty.Media>
					<Empty.Title>No flagged questions</Empty.Title>
					<Empty.Description>Flag a question while studying and it shows up here.</Empty.Description
					>
				</Empty.Header>
				<Empty.Content><Button size="sm">Start studying</Button></Empty.Content>
			</Empty.Root>
		</div>

		<!-- Item -->
		<div class="surface p-5">
			{@render usecase('Item', 'Rich rows for settings, notifications, and badge awards.')}
			<Item.Group class="gap-2">
				<Item.Root variant="outline">
					<Item.Media variant="icon"><CircleCheck class="text-success-ink" /></Item.Media>
					<Item.Content>
						<Item.Title>Module complete</Item.Title>
						<Item.Description>Corneal Topography · 48 of 48 answered</Item.Description>
					</Item.Content>
					<Item.Actions
						><Button size="sm" variant="soft" tone="neutral">Review</Button></Item.Actions
					>
				</Item.Root>
				<Item.Root variant="outline">
					<Item.Media variant="icon"><GraduationCap class="text-primary-ink" /></Item.Media>
					<Item.Content>
						<Item.Title>New badge: Sharpshooter</Item.Title>
						<Item.Description>10 correct in a row</Item.Description>
					</Item.Content>
					<Item.Actions><Badge tone="primary">New</Badge></Item.Actions>
				</Item.Root>
			</Item.Group>
		</div>

		<!-- KBD -->
		<div class="surface p-5">
			{@render usecase('Keyboard shortcuts', 'A shortcut sheet for the quiz page.')}
			<ul class="divide-y text-sm">
				{#each [['Check answer', ['Enter']], ['Flag question', ['F']], ['Shuffle options', ['⇧', 'S']], ['Next question', ['→']], ['Reveal rationale', ['Tab']], ['Select option', ['1', '–', '5']]] as [label, keys] (label)}
					<li class="flex items-center justify-between py-2">
						<span>{label}</span>
						<KbdGroup
							>{#each keys as key (key)}<Kbd>{key}</Kbd>{/each}</KbdGroup
						>
					</li>
				{/each}
			</ul>
		</div>

		<!-- Input OTP -->
		<div class="surface p-5">
			{@render usecase('Input OTP', 'Class join codes: one slot per character, paste-friendly.')}
			<div class="flex flex-col items-center gap-3 py-2">
				<InputOTP.Root maxlength={6} bind:value={joinCode}>
					{#snippet children({ cells })}
						<InputOTP.Group>
							{#each cells.slice(0, 3) as cell (cell)}<InputOTP.Slot {cell} />{/each}
						</InputOTP.Group>
						<InputOTP.Separator />
						<InputOTP.Group>
							{#each cells.slice(3, 6) as cell (cell)}<InputOTP.Slot {cell} />{/each}
						</InputOTP.Group>
					{/snippet}
				</InputOTP.Root>
				<Button size="sm" disabled={joinCode.length < 6}>Join class</Button>
			</div>
		</div>

		<!-- Calendar -->
		<div class="surface p-5">
			{@render usecase('Calendar', 'Exam dates for practice tests and study plans.')}
			<div class="flex justify-center">
				<Calendar type="single" bind:value={examDate} class="surface" />
			</div>
		</div>

		<!-- Resizable -->
		<div class="surface p-5 lg:col-span-2">
			{@render usecase(
				'Resizable panes',
				'Question editor beside a live student preview, or a PDF beside its questions.'
			)}
			<div class="h-64">
				<Resizable.PaneGroup direction="horizontal" class="overflow-hidden surface">
					<Resizable.Pane defaultSize={55} class="p-4">
						<p class="text-xs text-muted-foreground">Editor</p>
						<p class="mt-2 font-medium">
							Which structure does the combining form kerat/o refer to?
						</p>
						<div class="mt-3 space-y-2">
							{#each ['Cornea', 'Eyelid', 'Lens'] as option, i (option)}
								<div
									class="rounded-full border px-3 py-1.5 text-sm {i === 0
										? 'border-success bg-success/5'
										: ''}"
								>
									{String.fromCharCode(65 + i)}. {option}
								</div>
							{/each}
						</div>
					</Resizable.Pane>
					<Resizable.Handle withHandle />
					<Resizable.Pane defaultSize={45} class="graph-stage p-4">
						<p class="text-xs text-muted-foreground">Student preview</p>
						<p class="mt-2 text-sm">Exactly what students see, updating as you type.</p>
					</Resizable.Pane>
				</Resizable.PaneGroup>
			</div>
		</div>

		<!-- Navigation menu -->
		<div class="surface p-5 lg:col-span-2">
			{@render usecase('Navigation menu', 'The public site header with a Features panel.')}
			<NavigationMenu.Root>
				<NavigationMenu.List>
					<NavigationMenu.Item>
						<NavigationMenu.Trigger>Features</NavigationMenu.Trigger>
						<NavigationMenu.Content>
							<ul
								class="grid w-[calc(100vw-6.5rem)] grid-cols-1 gap-2 p-2 sm:w-[28rem] sm:grid-cols-2"
							>
								{#each [['Question banks', 'Class-aligned questions with sources'], ['Practice tests', 'Timed, exam-style sessions'], ['Question Studio', 'Generate questions from your PDFs'], ['Class progress', 'See what your cohort struggles with']] as [title, desc] (title)}
									<li>
										<NavigationMenu.Link
											href={resolve('/features')}
											class="block rounded-2xl p-3 hover:bg-muted"
										>
											<p class="text-sm font-semibold">{title}</p>
											<p class="text-xs text-muted-foreground">{desc}</p>
										</NavigationMenu.Link>
									</li>
								{/each}
							</ul>
						</NavigationMenu.Content>
					</NavigationMenu.Item>
					<NavigationMenu.Item>
						<NavigationMenu.Link href={resolve('/pricing')}>Pricing</NavigationMenu.Link>
					</NavigationMenu.Item>
					<NavigationMenu.Item>
						<NavigationMenu.Link href={resolve('/blog')}>Blog</NavigationMenu.Link>
					</NavigationMenu.Item>
				</NavigationMenu.List>
			</NavigationMenu.Root>
		</div>

		<!-- Accordion + Collapsible -->
		<div class="surface p-5">
			{@render usecase(
				'Accordion & collapsible',
				'Docs and FAQs; a long rationale folded into steps.'
			)}
			<Accordion.Root type="single" value="free">
				<Accordion.Item value="free">
					<Accordion.Trigger>Is LearnTerms free for students?</Accordion.Trigger>
					<Accordion.Content
						>Yes. Curators can upgrade to Curator Pro for generation and exports.</Accordion.Content
					>
				</Accordion.Item>
				<Accordion.Item value="who">
					<Accordion.Trigger>Who writes the questions?</Accordion.Trigger>
					<Accordion.Content
						>Curators in each cohort, often with Question Studio drafts.</Accordion.Content
					>
				</Accordion.Item>
			</Accordion.Root>
			<Collapsible.Root class="mt-4 surface p-3">
				<Collapsible.Trigger class="flex w-full items-center justify-between text-sm font-semibold">
					Show the full derivation <ChevronDown class="size-4" />
				</Collapsible.Trigger>
				<Collapsible.Content class="pt-2 text-sm text-muted-foreground">
					Plane waves in, plane waves out: the far-field approximation holds when the Fresnel number
					is much less than one.
				</Collapsible.Content>
			</Collapsible.Root>
		</div>

		<!-- Breadcrumb + Pagination -->
		<div class="surface p-5">
			{@render usecase('Breadcrumb & pagination', 'Admin location and long question lists.')}
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item
						><Breadcrumb.Link href={resolve('/admin')}>Admin</Breadcrumb.Link></Breadcrumb.Item
					>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>OPT 4234</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>Corneal Topography</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item><Breadcrumb.Page>Question 12</Breadcrumb.Page></Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
			<Pagination.Root count={120} perPage={10} class="mt-6">
				{#snippet children({ pages, currentPage })}
					<Pagination.Content>
						<Pagination.Item><Pagination.Previous /></Pagination.Item>
						{#each pages as page (page.key)}
							{#if page.type === 'ellipsis'}
								<Pagination.Item><Pagination.Ellipsis /></Pagination.Item>
							{:else}
								<Pagination.Item>
									<Pagination.Link {page} isActive={currentPage === page.value}
										>{page.value}</Pagination.Link
									>
								</Pagination.Item>
							{/if}
						{/each}
						<Pagination.Item><Pagination.Next /></Pagination.Item>
					</Pagination.Content>
				{/snippet}
			</Pagination.Root>
		</div>

		<!-- Scroll area + aspect ratio -->
		<div class="surface p-5">
			{@render usecase(
				'Scroll area & aspect ratio',
				'Long rationales in a tidy pane; lecture slides at 16:9.'
			)}
			<div class="grid grid-cols-2 gap-3">
				<ScrollArea class="h-44 surface p-3 text-sm">
					{#each rationale as step (step)}<p class="mb-2">{step}</p>{/each}
				</ScrollArea>
				<AspectRatio ratio={16 / 9} class="overflow-hidden surface">
					<div
						class="graph-stage flex size-full items-center justify-center bg-primary/8 text-xs font-semibold"
					>
						Lecture 6 · Slide 14
					</div>
				</AspectRatio>
			</div>
		</div>

		<!-- Sheet + Drawer -->
		<div class="surface p-5">
			{@render usecase(
				'Sheet & drawer',
				'A side panel for question details; a swipeable drawer on phones.'
			)}
			<div class="flex flex-wrap gap-2">
				<Sheet.Root>
					<Sheet.Trigger>
						{#snippet child({ props })}<Button {...props} variant="outline" tone="neutral"
								>Question details</Button
							>{/snippet}
					</Sheet.Trigger>
					<Sheet.Content side="right">
						<Sheet.Header>
							<Sheet.Title>Question 12</Sheet.Title>
							<Sheet.Description>Multiple choice · 3 sources · Published</Sheet.Description>
						</Sheet.Header>
					</Sheet.Content>
				</Sheet.Root>
				<Drawer.Root>
					<Drawer.Trigger>
						{#snippet child({ props })}<Button {...props} variant="outline" tone="neutral"
								>Phone drawer</Button
							>{/snippet}
					</Drawer.Trigger>
					<Drawer.Content>
						<Drawer.Header>
							<Drawer.Title>Study tools</Drawer.Title>
							<Drawer.Description>Drag down to dismiss.</Drawer.Description>
						</Drawer.Header>
					</Drawer.Content>
				</Drawer.Root>
			</div>
		</div>

		<!-- Avatar group, toggle group, button group, slider, input group -->
		<div class="surface p-5">
			{@render usecase(
				'Small pieces',
				'Who is studying now, filters, split actions, text size, search.'
			)}
			<div class="space-y-4">
				<div class="flex items-center gap-3">
					<Avatar.Group>
						{#each members as m (m)}
							<Avatar.Root class="size-9 ring-2 ring-background">
								<Avatar.Fallback class="text-xs font-semibold">{m}</Avatar.Fallback>
							</Avatar.Root>
						{/each}
						<Avatar.GroupCount>+12</Avatar.GroupCount>
					</Avatar.Group>
					<span class="flex items-center gap-1.5 text-sm text-muted-foreground"
						><Users class="size-4" />studying now</span
					>
				</div>
				<ToggleGroup.Root type="multiple" bind:value={questionTypes} variant="outline">
					<ToggleGroup.Item value="mc">Multiple choice</ToggleGroup.Item>
					<ToggleGroup.Item value="fitb">Fill in</ToggleGroup.Item>
					<ToggleGroup.Item value="match">Matching</ToggleGroup.Item>
				</ToggleGroup.Root>
				<ButtonGroup.Root>
					<Button onclick={() => toast.success('Question saved')}>Save</Button>
					<ButtonGroup.Separator />
					<Button shape="circle" aria-label="More save options"><ChevronDown /></Button>
				</ButtonGroup.Root>
				<div class="space-y-2">
					<p class="text-sm">Text size · {textScale}%</p>
					<Slider type="single" bind:value={textScale} min={80} max={140} step={10} />
				</div>
				<InputGroup.Root>
					<InputGroup.Addon><Search /></InputGroup.Addon>
					<InputGroup.Input placeholder="Search questions" />
					<InputGroup.Addon align="inline-end"><Kbd>⌘K</Kbd></InputGroup.Addon>
				</InputGroup.Root>
			</div>
		</div>
	</div>
</section>

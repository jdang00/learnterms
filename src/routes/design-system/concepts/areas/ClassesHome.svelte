<script lang="ts" module>
	export const meta = {
		title: 'Classes and home',
		summary: 'Getting around: the class list, picking up where you left off, and keeping a streak.',
		order: 3
	};
</script>

<script lang="ts">
	import { getLocalTimeZone, today, type DateValue } from '@internationalized/date';
	import Award from '@lucide/svelte/icons/award';
	import Bell from '@lucide/svelte/icons/bell';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import Flag from '@lucide/svelte/icons/flag';
	import Flame from '@lucide/svelte/icons/flame';
	import House from '@lucide/svelte/icons/house';
	import Layers from '@lucide/svelte/icons/layers';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import Settings from '@lucide/svelte/icons/settings';
	import Users from '@lucide/svelte/icons/users';
	import * as Avatar from '#lib/components/ui/avatar/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import * as Breadcrumb from '#lib/components/ui/breadcrumb/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as CalendarParts from '#lib/components/ui/calendar/index.js';
	import * as Command from '#lib/components/ui/command/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import * as HoverCard from '#lib/components/ui/hover-card/index.js';
	import * as InputOTP from '#lib/components/ui/input-otp/index.js';
	import * as Item from '#lib/components/ui/item/index.js';
	import * as Marker from '#lib/components/ui/marker/index.js';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import { Progress } from '#lib/components/ui/progress/index.js';
	import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	import { Tip } from '#lib/components/ui/tooltip/index.js';
	import ColorMark from '#lib/components/ColorMark.svelte';
	import { classColor } from '#lib/utils/classProgress.js';
	import Concept from '../Concept.svelte';
	import Grid from '../Grid.svelte';

	const classes = [
		{ id: 'c-optics', code: 'OPT 4234', name: 'Clinical Optics II' },
		{ id: 'c-pharm', code: 'OPT 5110', name: 'Ocular Pharmacology' },
		{ id: 'c-bv', code: 'OPT 4410', name: 'Binocular Vision' },
		{ id: 'c-cl', code: 'OPT 5320', name: 'Contact Lenses' }
	];
	let activeClass = $state('c-optics');
	let switcherOpen = $state(false);
	const current = $derived(classes.find((c) => c.id === activeClass) ?? classes[0]);

	const nav = [
		['Home', House],
		['Modules', Layers],
		['Practice tests', ClipboardList],
		['Flagged', Flag],
		['Badges', Award]
	] as const;
	let activeNav = $state('Modules');
	let sidebarOpen = $state(true);

	// Questions answered per day for the streak calendar: a deterministic fixture.
	const now = today(getLocalTimeZone());
	const activity = (date: DateValue) => {
		const offset = now.compare(date);
		if (offset < 0 || offset > 40) return 0;
		const seed = (date.day * 37 + date.month * 11) % 9;
		return seed < 2 ? 0 : seed * 6;
	};
	const shade = (n: number) =>
		n === 0
			? ''
			: n < 20
				? 'bg-success/25'
				: n < 40
					? 'bg-success/55'
					: 'bg-mastered text-mastered-foreground';
	let streakDay = $state<DateValue | undefined>(undefined);

	const recent = [
		['🗺️', 'Corneal Topography', 'Clinical Optics II', 64, '17 left'],
		['🔥', 'Uveitis', 'Ocular Pharmacology', 22, '16 left'],
		['👀', 'Fusional Vergence', 'Binocular Vision', 90, '3 to review']
	] as const;

	let joinCode = $state('');
	const classmates = ['Avery Chen', 'Jordan Patel', 'Sam Rivera', 'Maya Kim', 'Theo Lund'];
	const initials = (name: string) =>
		name
			.split(' ')
			.map((p) => p[0])
			.join('');
</script>

<Grid>
	<Concept
		title="App shell with a collapsible sidebar"
		uses={['Sidebar', 'DropdownMenu', 'Tooltip']}
		where="Signed-in pages. A rail that collapses to icons (⌘B) replaces the top bar on wide screens; the class switcher lives at its head."
		wide
	>
		<div class="relative h-[26rem] overflow-hidden surface-muted">
			<Sidebar.Provider bind:open={sidebarOpen} class="h-full min-h-0">
				<Sidebar.Root collapsible="icon" class="absolute h-full">
					<Sidebar.Header>
						<Sidebar.Menu>
							<Sidebar.MenuItem>
								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										{#snippet child({ props })}
											<Sidebar.MenuButton {...props} size="lg">
												<ColorMark
													color={classColor({ _id: current.id })}
													class="size-7 shrink-0 text-foreground"
												/>
												<span class="grid min-w-0 flex-1 text-left leading-tight">
													<span class="truncate text-sm font-semibold">{current.name}</span>
													<span class="truncate font-mono text-xs text-muted-foreground"
														>{current.code}</span
													>
												</span>
												<ChevronsUpDown class="ms-auto" />
											</Sidebar.MenuButton>
										{/snippet}
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="start" class="w-60">
										<DropdownMenu.Label>Your classes</DropdownMenu.Label>
										{#each classes as c (c.id)}
											<DropdownMenu.Item onSelect={() => (activeClass = c.id)}>
												<ColorMark
													color={classColor({ _id: c.id })}
													class="size-5 text-foreground"
												/>{c.name}
												{#if c.id === activeClass}<Check class="ms-auto" />{/if}
											</DropdownMenu.Item>
										{/each}
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</Sidebar.MenuItem>
						</Sidebar.Menu>
					</Sidebar.Header>
					<Sidebar.Content>
						<Sidebar.Group>
							<Sidebar.GroupLabel>Study</Sidebar.GroupLabel>
							<Sidebar.Menu>
								{#each nav as [label, Icon] (label)}
									<Sidebar.MenuItem>
										<Sidebar.MenuButton
											isActive={activeNav === label}
											tooltipContent={label}
											onclick={() => (activeNav = label)}
										>
											<Icon />{label}
										</Sidebar.MenuButton>
										{#if label === 'Flagged'}<Sidebar.MenuBadge>4</Sidebar.MenuBadge>{/if}
									</Sidebar.MenuItem>
								{/each}
							</Sidebar.Menu>
						</Sidebar.Group>
					</Sidebar.Content>
					<Sidebar.Footer>
						<Sidebar.Menu>
							<Sidebar.MenuItem>
								<Sidebar.MenuButton tooltipContent="Settings"
									><Settings />Settings</Sidebar.MenuButton
								>
							</Sidebar.MenuItem>
						</Sidebar.Menu>
					</Sidebar.Footer>
					<Sidebar.Rail />
				</Sidebar.Root>
				<Sidebar.Inset class="min-h-0 bg-background">
					<header class="flex h-12 items-center gap-2 border-b border-border px-3">
						<Sidebar.Trigger />
						<span class="text-sm font-medium">{activeNav}</span>
					</header>
					<div class="grid gap-2 p-4 sm:grid-cols-2">
						{#each ['Lids & Adnexa', 'Corneal Topography', 'Uveitis', 'Binocular Vision'] as m (m)}
							<div class="surface-sm px-4 py-3 text-sm font-medium">{m}</div>
						{/each}
					</div>
				</Sidebar.Inset>
			</Sidebar.Provider>
		</div>
	</Concept>

	<Concept
		title="Study streak calendar"
		uses={['Calendar', 'Tooltip']}
		where="Home and the cohort page. Each day shaded by questions answered; mastery green on big days."
	>
		<div class="flex flex-col items-center gap-3">
			<CalendarParts.Calendar
				type="single"
				bind:value={streakDay}
				class="surface-sm"
				maxValue={now}
			>
				{#snippet day({ day, outsideMonth })}
					{@const n = activity(day)}
					<Tip label={n ? `${n} questions` : 'No study'}>
						{#snippet child({ props })}
							<CalendarParts.Day {...props} class={outsideMonth ? '' : shade(n)} />
						{/snippet}
					</Tip>
				{/snippet}
			</CalendarParts.Calendar>
			<p class="flex items-center gap-2 text-sm">
				<Flame size={16} class="text-ember-ink" /><span class="font-semibold">9 day streak</span>
				<span class="text-muted-foreground">· best 21</span>
			</p>
		</div>
	</Concept>

	<Concept
		title="Pick up where you left off"
		uses={['Item', 'Progress']}
		where="Top of the classes page, across classes: the three modules you touched last."
	>
		<Item.Group class="gap-2">
			{#each recent as [emoji, module, className, pct, left] (module)}
				<Item.Root variant="outline" size="sm">
					{#snippet child({ props })}
						<button
							{...props}
							type="button"
							class="{props.class} w-full text-left hover:bg-muted/50"
						>
							<Item.Media class="text-xl">{emoji}</Item.Media>
							<Item.Content class="gap-1.5">
								<Item.Title>{module}</Item.Title>
								<Item.Description class="text-xs">{className} · {left}</Item.Description>
								<Progress value={pct} tone="success" class="h-1.5" />
							</Item.Content>
						</button>
					{/snippet}
				</Item.Root>
			{/each}
		</Item.Group>
	</Concept>

	<Concept
		title="Class switcher"
		uses={['Popover', 'Command']}
		where="The page header on phones and narrow screens, where the sidebar collapses away."
	>
		<Popover.Root bind:open={switcherOpen}>
			<Popover.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline" tone="neutral" class="w-full justify-start">
						<ColorMark color={classColor({ _id: current.id })} class="size-5 text-foreground" />
						<span class="truncate">{current.name}</span><ChevronsUpDown class="ms-auto" />
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="w-72 p-0" align="start">
				<Command.Root>
					<Command.Input placeholder="Find a class…" />
					<Command.List>
						<Command.Empty>No class found.</Command.Empty>
						<Command.Group heading="Fall 2026">
							{#each classes as c (c.id)}
								<Command.Item
									value={`${c.code} ${c.name}`}
									onSelect={() => ((activeClass = c.id), (switcherOpen = false))}
								>
									<ColorMark color={classColor({ _id: c.id })} class="size-5 text-foreground" />
									<span class="min-w-0 flex-1 truncate">{c.name}</span>
									<span class="font-mono text-xs text-muted-foreground">{c.code}</span>
								</Command.Item>
							{/each}
						</Command.Group>
					</Command.List>
				</Command.Root>
			</Popover.Content>
		</Popover.Root>
	</Concept>

	<Concept
		title="Notifications"
		uses={['Popover', 'Marker', 'Item']}
		where="A bell in the header: new modules, flags resolved by a curator, badges earned."
	>
		<Popover.Root>
			<Popover.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="ghost"
						tone="neutral"
						shape="circle"
						aria-label="Notifications"
						class="relative"
					>
						<Bell /><span class="absolute top-1.5 right-1.5 size-2 rounded-full bg-error"></span>
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="w-80 gap-1 p-2" align="start">
				<Marker.Root variant="separator"><Marker.Content>Today</Marker.Content></Marker.Root>
				<Item.Root size="sm">
					<Item.Media variant="icon"><Megaphone class="text-primary-ink" /></Item.Media>
					<Item.Content>
						<Item.Title>New module: Scleral Lenses</Item.Title>
						<Item.Description>Contact Lenses · 36 questions</Item.Description>
					</Item.Content>
				</Item.Root>
				<Item.Root size="sm">
					<Item.Media variant="icon"><Check class="text-success-ink" /></Item.Media>
					<Item.Content>
						<Item.Title>Your flag on Q12 was fixed</Item.Title>
						<Item.Description>The answer key now accepts “Fleischer ring”</Item.Description>
					</Item.Content>
				</Item.Root>
				<Marker.Root variant="separator"><Marker.Content>This week</Marker.Content></Marker.Root>
				<Item.Root size="sm">
					<Item.Media variant="icon"><Award class="text-ember-ink" /></Item.Media>
					<Item.Content>
						<Item.Title>Badge earned: Study Streak</Item.Title>
					</Item.Content>
				</Item.Root>
			</Popover.Content>
		</Popover.Root>
	</Concept>

	<Concept
		title="Join a class"
		uses={['InputOTP']}
		where="The join-class page. One box per character, paste-friendly, joins as soon as the code is complete."
	>
		<div class="flex flex-col items-center gap-3 py-2">
			<InputOTP.Root maxlength={6} bind:value={joinCode} pattern="^[A-Za-z0-9]+$">
				{#snippet children({ cells })}
					<InputOTP.Group>
						{#each cells.slice(0, 3) as cell (cell)}<InputOTP.Slot
								{cell}
								class="uppercase"
							/>{/each}
					</InputOTP.Group>
					<InputOTP.Separator />
					<InputOTP.Group>
						{#each cells.slice(3) as cell (cell)}<InputOTP.Slot {cell} class="uppercase" />{/each}
					</InputOTP.Group>
				{/snippet}
			</InputOTP.Root>
			<p class="text-sm text-muted-foreground">
				{joinCode.length === 6 ? 'Joining Clinical Optics II…' : 'Ask your class rep for the code'}
			</p>
		</div>
	</Concept>

	<Concept
		title="Breadcrumb with siblings"
		uses={['Breadcrumb', 'DropdownMenu']}
		where="Module and test pages. The last crumb opens a menu to hop to a sibling module."
	>
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item><Breadcrumb.Link href="#top">Classes</Breadcrumb.Link></Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item
					><Breadcrumb.Link href="#top">Clinical Optics II</Breadcrumb.Link></Breadcrumb.Item
				>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger class="flex items-center gap-1 font-medium text-foreground">
							Corneal Topography <ChevronDown size={14} />
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="start">
							{#each ['Lids & Adnexa', 'Corneal Topography', 'Uveitis', 'Binocular Vision'] as m (m)}
								<DropdownMenu.Item><BookOpen />{m}</DropdownMenu.Item>
							{/each}
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
	</Concept>

	<Concept
		title="Studying now"
		uses={['Avatar', 'HoverCard', 'Badge']}
		where="Class cards and the cohort page: a quiet sign of who else is working through the same class."
	>
		<div class="flex items-center gap-3">
			<Avatar.Group>
				{#each classmates.slice(0, 4) as name (name)}
					<HoverCard.Root openDelay={100}>
						<HoverCard.Trigger>
							<Avatar.Root class="size-9 ring-2 ring-background">
								<Avatar.Fallback class="text-xs font-semibold">{initials(name)}</Avatar.Fallback>
							</Avatar.Root>
						</HoverCard.Trigger>
						<HoverCard.Content class="w-56">
							<p class="font-semibold">{name}</p>
							<p class="text-xs text-muted-foreground">Studying Corneal Topography</p>
							<Badge class="mt-2" tone="ember"><Flame />6 day streak</Badge>
						</HoverCard.Content>
					</HoverCard.Root>
				{/each}
				<Avatar.GroupCount>+{classmates.length - 4 + 9}</Avatar.GroupCount>
			</Avatar.Group>
			<span class="flex items-center gap-1.5 text-sm text-muted-foreground"
				><Users size={16} />studying now</span
			>
		</div>
	</Concept>
</Grid>

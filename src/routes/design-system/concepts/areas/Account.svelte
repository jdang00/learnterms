<script lang="ts" module>
	export const meta = {
		title: 'Onboarding and account',
		summary:
			'First-run setup and the settings people come back to: preferences, notifications, leaving.',
		order: 8
	};
</script>

<script lang="ts">
	import Bell from '@lucide/svelte/icons/bell';
	import Check from '@lucide/svelte/icons/check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Keyboard from '@lucide/svelte/icons/keyboard';
	import Monitor from '@lucide/svelte/icons/monitor';
	import Moon from '@lucide/svelte/icons/moon';
	import Palette from '@lucide/svelte/icons/palette';
	import Sun from '@lucide/svelte/icons/sun';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import User from '@lucide/svelte/icons/user';
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Command from '#lib/components/ui/command/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import * as InputGroup from '#lib/components/ui/input-group/index.js';
	import * as Item from '#lib/components/ui/item/index.js';
	import { Kbd, KbdGroup } from '#lib/components/ui/kbd/index.js';
	import * as Questionnaire from '#lib/components/ui/questionnaire/index.js';
	import { Slider } from '#lib/components/ui/slider/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import * as Tabs from '#lib/components/ui/tabs/index.js';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import Concept from '../Concept.svelte';
	import Grid from '../Grid.svelte';

	let onboarded = $state<string | null>(null);
	function finish(event: SubmitEvent) {
		event.preventDefault();
		const data = new FormData(event.currentTarget as HTMLFormElement);
		onboarded = `${data.get('program')} · ${data.get('year')} · ${data.getAll('goals').length} goals`;
	}

	let settingsTab = $state('profile');
	let displayName = $state('Avery C.');
	const nameTaken = $derived(displayName.trim().toLowerCase() === 'jordan p.');
	let theme = $state('system');
	let textSize = $state(100);

	let prefs = $state({ modules: true, flags: true, badges: false, digest: true });

	let deleteOpen = $state(false);
	let confirmText = $state('');

	let shortcutsOpen = $state(false);
	const shortcuts = [
		[
			'Answering',
			[
				['Check answer', ['Enter']],
				['Select option', ['1', '–', '9']],
				['Clear', ['Esc']]
			]
		],
		[
			'Moving',
			[
				['Next question', ['→']],
				['Previous', ['←']],
				['Jump to question', ['⌘', 'J']]
			]
		],
		[
			'Tools',
			[
				['Flag', ['F']],
				['Highlight', ['H']],
				['Shuffle options', ['⇧', 'S']]
			]
		]
	] as const;
</script>

<Grid>
	<Concept
		title="First-run setup"
		uses={['Questionnaire']}
		where="After sign-up, before the class list: three quick questions that pick defaults and suggest classes."
	>
		{#if onboarded}
			<div class="space-y-2 text-center">
				<p class="flex items-center justify-center gap-2 font-semibold">
					<Check size={18} class="text-success-ink" />All set
				</p>
				<p class="text-sm text-muted-foreground">{onboarded}</p>
				<Button size="sm" variant="soft" tone="neutral" onclick={() => (onboarded = null)}
					>Again</Button
				>
			</div>
		{:else}
			<Questionnaire.Root shortcuts="letters" onSubmit={finish}>
				<Questionnaire.Progress />
				<Questionnaire.Item name="program" required>
					<Questionnaire.Title>What are you studying?</Questionnaire.Title>
					<Questionnaire.Choices>
						<Questionnaire.Choice value="Optometry">Optometry</Questionnaire.Choice>
						<Questionnaire.Choice value="Pharmacy">Pharmacy</Questionnaire.Choice>
						<Questionnaire.Choice value="Physician assistant"
							>Physician assistant</Questionnaire.Choice
						>
					</Questionnaire.Choices>
					<Questionnaire.Input placeholder="Something else" />
				</Questionnaire.Item>
				<Questionnaire.Item name="year" required>
					<Questionnaire.Title>Which year?</Questionnaire.Title>
					<Questionnaire.Choices>
						{#each ['First', 'Second', 'Third', 'Fourth'] as y (y)}
							<Questionnaire.Choice value={y}>{y} year</Questionnaire.Choice>
						{/each}
					</Questionnaire.Choices>
				</Questionnaire.Item>
				<Questionnaire.Item name="goals" multiple>
					<Questionnaire.Title>What should LearnTerms help with?</Questionnaire.Title>
					<Questionnaire.Description>Pick any. You can skip this.</Questionnaire.Description>
					<Questionnaire.Choices>
						<Questionnaire.Choice value="exams">Class exams</Questionnaire.Choice>
						<Questionnaire.Choice value="boards">Board prep</Questionnaire.Choice>
						<Questionnaire.Choice value="clinic">Clinic readiness</Questionnaire.Choice>
					</Questionnaire.Choices>
				</Questionnaire.Item>
				<Questionnaire.Actions>
					<Questionnaire.Previous>Back</Questionnaire.Previous>
					<Questionnaire.Skip>Skip</Questionnaire.Skip>
					<Questionnaire.Next>Next</Questionnaire.Next>
					<Questionnaire.Submit>Finish</Questionnaire.Submit>
				</Questionnaire.Actions>
			</Questionnaire.Root>
		{/if}
	</Concept>

	<Concept
		title="Settings with side tabs"
		uses={['Tabs', 'Field', 'InputGroup', 'ToggleGroup', 'Slider']}
		where="A settings page that replaces the settings modal: sections on the left, one at a time."
	>
		<Tabs.Root bind:value={settingsTab} orientation="vertical" class="flex-col gap-4 sm:flex-row">
			<Tabs.List class="w-full sm:w-36">
				<Tabs.Trigger value="profile" class="justify-start"><User />Profile</Tabs.Trigger>
				<Tabs.Trigger value="appearance" class="justify-start"><Palette />Appearance</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="profile" class="min-w-0 flex-1 space-y-4">
				<Field.Field data-invalid={nameTaken || undefined}>
					<Field.Label for="display-name">Display name</Field.Label>
					<InputGroup.Root>
						<InputGroup.Input id="display-name" bind:value={displayName} aria-invalid={nameTaken} />
						<InputGroup.Addon align="inline-end">
							{#if nameTaken}<CircleAlert class="text-error-ink" />{:else}<Check
									class="text-success-ink"
								/>{/if}
						</InputGroup.Addon>
					</InputGroup.Root>
					{#if nameTaken}<Field.Error>Someone in your cohort already uses that name.</Field.Error
						>{/if}
				</Field.Field>
				<Field.Field>
					<Field.Label for="email">Email</Field.Label>
					<Input id="email" value="avery@school.edu" disabled />
				</Field.Field>
			</Tabs.Content>
			<Tabs.Content value="appearance" class="min-w-0 flex-1 space-y-5">
				<div class="space-y-2">
					<p class="text-sm font-medium">Theme</p>
					<ToggleGroup.Root type="single" bind:value={theme} variant="outline" size="sm">
						<ToggleGroup.Item value="light"><Sun />Light</ToggleGroup.Item>
						<ToggleGroup.Item value="dark"><Moon />Dark</ToggleGroup.Item>
						<ToggleGroup.Item value="system"><Monitor />System</ToggleGroup.Item>
					</ToggleGroup.Root>
				</div>
				<div class="space-y-2">
					<p class="text-sm font-medium">Question text size · {textSize}%</p>
					<Slider
						type="single"
						bind:value={textSize}
						min={85}
						max={130}
						step={5}
						aria-label="Question text size"
					/>
					<p class="surface-muted p-3 leading-relaxed" style="font-size: {(textSize / 100) * 15}px">
						Which sign appears on downgaze in advanced keratoconus?
					</p>
				</div>
			</Tabs.Content>
		</Tabs.Root>
	</Concept>

	<Concept
		title="Notification preferences"
		uses={['Item', 'Switch']}
		where="Settings: what LearnTerms may tell you about, each with one plain sentence."
	>
		<Item.Group class="divide-y divide-border">
			{#each [['modules', 'New modules', 'When a class you’re in gets new material'], ['flags', 'Flag updates', 'When a curator resolves something you flagged'], ['badges', 'Badges', 'When you earn one'], ['digest', 'Weekly summary', 'Sunday evening: what you studied and what’s next']] as const as [key, title, description] (key)}
				<Item.Root size="sm" class="rounded-none px-0">
					<Item.Content>
						<Item.Title>{title}</Item.Title>
						<Item.Description>{description}</Item.Description>
					</Item.Content>
					<Item.Actions><Switch bind:checked={prefs[key]} aria-label={title} /></Item.Actions>
				</Item.Root>
			{/each}
		</Item.Group>
	</Concept>

	<Concept
		title="Delete account, deliberately"
		uses={['AlertDialog', 'Input']}
		where="The bottom of settings. Typing the word makes the consequence sink in."
	>
		<Button variant="soft" tone="error" onclick={() => (deleteOpen = true)}
			><Trash2 />Delete account</Button
		>
		<AlertDialog.Root bind:open={deleteOpen} onOpenChange={(open) => !open && (confirmText = '')}>
			<AlertDialog.Content>
				<AlertDialog.Header>
					<AlertDialog.Title>Delete your account?</AlertDialog.Title>
					<AlertDialog.Description>
						Your progress in 4 classes, your notes and 2 badges are removed for good. Type <strong
							>delete</strong
						> to confirm.
					</AlertDialog.Description>
				</AlertDialog.Header>
				<Input bind:value={confirmText} placeholder="delete" aria-label="Type delete to confirm" />
				<AlertDialog.Footer>
					<AlertDialog.Cancel>Keep my account</AlertDialog.Cancel>
					<AlertDialog.Action tone="error" disabled={confirmText.trim().toLowerCase() !== 'delete'}
						>Delete account</AlertDialog.Action
					>
				</AlertDialog.Footer>
			</AlertDialog.Content>
		</AlertDialog.Root>
	</Concept>

	<Concept
		title="Keyboard shortcut sheet"
		uses={['Dialog', 'Command', 'Kbd']}
		where="Press ? anywhere in a quiz. Searchable, grouped by what you’re trying to do."
	>
		<Button variant="outline" tone="neutral" onclick={() => (shortcutsOpen = true)}
			><Keyboard />Shortcuts <Kbd>?</Kbd></Button
		>
		<Dialog.Root bind:open={shortcutsOpen}>
			<Dialog.Content class="overflow-hidden p-0" showCloseButton={false}>
				<Dialog.Title class="sr-only">Keyboard shortcuts</Dialog.Title>
				<Command.Root>
					<Command.Input placeholder="Search shortcuts…" />
					<Command.List class="max-h-96">
						<Command.Empty>No shortcut found.</Command.Empty>
						{#each shortcuts as [group, items] (group)}
							<Command.Group heading={group}>
								{#each items as [label, keys] (label)}
									<Command.Item value={label}>
										<span class="flex-1">{label}</span>
										<KbdGroup
											>{#each keys as key (key)}<Kbd>{key}</Kbd>{/each}</KbdGroup
										>
									</Command.Item>
								{/each}
							</Command.Group>
						{/each}
					</Command.List>
				</Command.Root>
			</Dialog.Content>
		</Dialog.Root>
	</Concept>

	<Concept
		title="Quiet hours"
		uses={['Item', 'Switch', 'Input']}
		where="Notification settings on phones: no reminders during lectures or at night."
	>
		<Item.Root variant="outline">
			<Item.Media variant="icon"><Bell /></Item.Media>
			<Item.Content>
				<Item.Title>Quiet hours</Item.Title>
				<Item.Description class="flex items-center gap-2">
					<Input type="time" value="22:00" class="h-8 w-28" aria-label="Start" /> to
					<Input type="time" value="07:00" class="h-8 w-28" aria-label="End" />
				</Item.Description>
			</Item.Content>
			<Item.Actions><Switch checked aria-label="Quiet hours" /></Item.Actions>
		</Item.Root>
	</Concept>
</Grid>

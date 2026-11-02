<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import * as Collapsible from '#lib/components/ui/collapsible/index.js';
	import { Kbd, KbdGroup } from '#lib/components/ui/kbd/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import ClampedText from '#lib/components/ClampedText.svelte';
	import StudentAvatar from '#lib/admin/progress/StudentAvatar.svelte';
	import Category from './Category.svelte';
	import Spec from './Spec.svelte';

	const students = [
		{ name: 'Avery Chen', answered: 212, accuracy: 91 },
		{ name: 'Jordan Patel', answered: 180, accuracy: 84 },
		{ name: 'Sam Rivera', answered: 96, accuracy: 72 }
	];
	const shortcuts = [
		['Check', ['Enter']],
		['Clear', ['Esc']],
		['Select option', ['0–9']],
		['Navigate', ['←', '→']],
		['Flag', ['F']],
		['Shuffle', ['⇧', 'S']]
	] as const;
	const description =
		'Clinical optics for second-year students: refraction, aberrations, lens design and the optics of the eye. Modules follow the lecture order, and each one cites the slide deck it came from so you can check a rationale against the source. Practice tests mix questions from every module you have studied.';
</script>

<Category
	id="data"
	summary="Tables for rows people compare, Kbd for shortcuts, Collapsible for detail most people skip."
>
	<Spec title="Table" src={['ui/table', 'StudentAvatar']} note="Class progress in admin." wide>
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Student</Table.Head>
					<Table.Head>Answered</Table.Head>
					<Table.Head class="text-right">Accuracy</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each students as student (student.name)}
					<Table.Row>
						<Table.Cell>
							<div class="flex items-center gap-2.5">
								<StudentAvatar name={student.name} size="xs" />
								{student.name}
							</div>
						</Table.Cell>
						<Table.Cell class="tabular-nums">{student.answered}</Table.Cell>
						<Table.Cell class="text-right">
							<Badge
								tone={student.accuracy >= 85
									? 'success'
									: student.accuracy >= 75
										? 'warning'
										: 'error'}>{student.accuracy}%</Badge
							>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</Spec>

	<Spec
		title="Shortcuts in a collapsible"
		src={['ui/kbd', 'ui/collapsible']}
		note="As in quiz settings: hidden on touch screens."
	>
		<Collapsible.Root open class="border-t border-border pt-3">
			<Collapsible.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						class="group flex w-full items-center justify-between rounded-lg py-1 text-left text-sm font-medium"
					>
						Keyboard shortcuts
						<ChevronDown
							size={16}
							class="transition-transform group-data-[state=open]:rotate-180"
						/>
					</button>
				{/snippet}
			</Collapsible.Trigger>
			<Collapsible.Content>
				<dl class="grid grid-cols-2 gap-x-6 gap-y-2 pt-3 text-sm">
					{#each shortcuts as [action, keys] (action)}
						<div class="flex items-center justify-between gap-2">
							<dt class="text-foreground/75">{action}</dt>
							<dd>
								<KbdGroup
									>{#each keys as key (key)}<Kbd>{key}</Kbd>{/each}</KbdGroup
								>
							</dd>
						</div>
					{/each}
				</dl>
			</Collapsible.Content>
		</Collapsible.Root>
	</Spec>

	<Spec
		title="Clamped text"
		src="ClampedText"
		note="Class descriptions: two lines, with Show more only when they overflow."
	>
		<ClampedText text={description} class="text-sm leading-relaxed text-foreground/70" />
	</Spec>
</Category>

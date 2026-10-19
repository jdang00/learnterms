<script lang="ts">
	import { SegmentedControl } from '$lib/components/ui/segmented-control';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import CheckCircle from '@lucide/svelte/icons/check-circle';
	import Archive from '@lucide/svelte/icons/archive';
	import CheckSquare from '@lucide/svelte/icons/check-square';
	import ToggleLeft from '@lucide/svelte/icons/toggle-left';
	import Edit3 from '@lucide/svelte/icons/edit-3';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import FileText from '@lucide/svelte/icons/file-text';
	import NotebookPen from '@lucide/svelte/icons/notebook-pen';
	import { QUESTION_TYPES } from '$lib/types';
	import type { QuestionEditorState } from './questionEditor.svelte';

	let { form, hidden }: { form: QuestionEditorState; hidden: boolean } = $props();

	const questionTypeOptions = [
		{
			value: QUESTION_TYPES.MULTIPLE_CHOICE,
			label: 'Multiple Choice',
			description: 'One or more correct options',
			icon: CheckSquare
		},
		{
			value: QUESTION_TYPES.TRUE_FALSE,
			label: 'True/False',
			description: 'A single true or false statement',
			icon: ToggleLeft
		},
		{
			value: QUESTION_TYPES.FILL_IN_THE_BLANK,
			label: 'Fill in Blank',
			description: 'Typed answer checked against accepted text',
			icon: Edit3
		},
		{
			value: QUESTION_TYPES.MATCHING,
			label: 'Matching',
			description: 'Pair each prompt with its answer',
			icon: ListChecks
		},
		{
			value: QUESTION_TYPES.FREE_RESPONSE,
			label: 'Free Response',
			description: 'Written answer graded against a ground truth',
			icon: NotebookPen
		}
	];

	const statusOptions = [
		{ value: 'published', label: 'Published', icon: CheckCircle, tone: 'success' as const },
		{ value: 'draft', label: 'Draft', icon: FileText, tone: 'info' as const },
		{ value: 'archived', label: 'Archived', icon: Archive, tone: 'error' as const }
	];

	let typeMenuOpen = $state(false);
	const currentTypeOption = $derived(
		questionTypeOptions.find((option) => option.value === form.questionType) ??
			questionTypeOptions[0]
	);

	function selectQuestionType(value: string) {
		typeMenuOpen = false;
		form.selectQuestionType(value);
	}
</script>

<!-- The question view is hidden, not unmounted, so its TipTap editors keep their state. -->
<div
	class="flex flex-wrap items-center gap-8 px-6 py-4 border-b border-border bg-muted/30 shrink-0"
	class:hidden
>
	<!-- Type Selector -->
	<div class="flex flex-col gap-2">
		<span id="question-type-label" class="label-caps ml-1">Type</span>
		<DropdownMenu.Root bind:open={typeMenuOpen}>
			<div class="flex shadow-xs bg-background rounded-full border border-border p-1">
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							variant="soft"
							tone="neutral"
							size="xs"
							class="gap-2 pr-2.5 font-medium sm:h-8 sm:px-3.5 sm:text-sm"
							aria-labelledby="question-type-label question-type-current"
						>
							<currentTypeOption.icon size={16} />
							<span id="question-type-current">{currentTypeOption.label}</span>
							<ChevronDown
								size={14}
								class="opacity-50 transition-transform duration-200 {typeMenuOpen
									? 'rotate-180'
									: ''}"
							/>
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
			</div>

			<DropdownMenu.Content align="start" class="w-72 p-1.5">
				<DropdownMenu.RadioGroup
					value={form.questionType}
					onValueChange={selectQuestionType}
					aria-labelledby="question-type-label"
				>
					{#each questionTypeOptions as option (option.value)}
						{@const selected = form.questionType === option.value}
						<DropdownMenu.RadioItem
							value={option.value}
							closeOnSelect
							class="gap-3 px-2.5 py-2 {selected ? 'bg-muted' : ''}"
						>
							<span
								class="grid size-8 shrink-0 place-items-center rounded-full transition-colors {selected
									? 'bg-primary/10 text-primary-ink'
									: 'bg-muted text-foreground/60'}"
							>
								<option.icon size={16} />
							</span>
							<span class="min-w-0 flex-1">
								<span class="block text-sm {selected ? 'font-semibold' : 'font-medium'}"
									>{option.label}</span
								>
								<span class="block text-xs font-normal text-foreground/50"
									>{option.description}</span
								>
							</span>
						</DropdownMenu.RadioItem>
					{/each}
				</DropdownMenu.RadioGroup>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>

	<div class="w-px h-10 bg-muted-strong hidden sm:block"></div>

	<!-- Status Selector -->
	<div class="flex flex-col gap-2">
		<span class="label-caps text-foreground/70 ml-1">Status</span>
		<SegmentedControl
			value={form.questionStatus}
			onValueChange={(value) => form.setStatus(value)}
			options={statusOptions}
			aria-label="Question status"
		/>
	</div>
</div>

<script lang="ts">
	import { toast } from 'svelte-sonner';
	import Archive from '@lucide/svelte/icons/archive';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import CheckCircle from '@lucide/svelte/icons/check-circle';
	import FileText from '@lucide/svelte/icons/file-text';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import List from '@lucide/svelte/icons/list';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Search from '@lucide/svelte/icons/search';
	import Stethoscope from '@lucide/svelte/icons/stethoscope';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import * as FileDropZone from '#lib/components/ui/file-drop-zone/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import * as InputGroup from '#lib/components/ui/input-group/index.js';
	import { Kbd } from '#lib/components/ui/kbd/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import * as RadioGroup from '#lib/components/ui/radio-group/index.js';
	import { SegmentedControl } from '#lib/components/ui/segmented-control/index.js';
	import { SelectField } from '#lib/components/ui/select/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import * as Tabs from '#lib/components/ui/tabs/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import SearchablePicker from '#lib/components/SearchablePicker.svelte';
	import SemesterSelect from '#lib/components/SemesterSelect.svelte';
	import Category from './Category.svelte';
	import Spec from './Spec.svelte';

	const semesters = [
		{ _id: 's1', name: 'Fall 2026' },
		{ _id: 's2', name: 'Spring 2027' },
		{ _id: 's3', name: 'Summer 2027' }
	];
	const modules = [
		{ value: 'm1', label: 'Lids & Adnexa', detail: '32 questions' },
		{ value: 'm2', label: 'Corneal Topography', detail: '48 questions' },
		{ value: 'm3', label: 'Uveitis', detail: '21 questions' },
		{ value: 'm4', label: 'Glaucoma Pharmacology', detail: '56 questions' },
		{ value: 'm5', label: 'Binocular Vision', detail: '19 questions' },
		{ value: 'm6', label: 'Retinal Vascular Disease', detail: '40 questions' }
	];

	let semester = $state('Fall 2026');
	let difficulty = $state('recall');
	let moduleId = $state('m2');
	let answer = $state('1');
	let status = $state('draft');
	let pane = $state('preview');
	let view = $state('grid');
	let editorView = $state('question');
	let pickerOpen = $state(false);
	let pickerSearch = $state('');
	const pickerOptions = $derived(
		modules.filter((m) => m.label.toLowerCase().includes(pickerSearch.trim().toLowerCase()))
	);
	const moduleLabel = $derived(modules.find((m) => m.value === moduleId)?.label);

	async function upload(files: File[]) {
		toast.success(`${files.length} ${files.length === 1 ? 'file' : 'files'} ready to upload`);
	}
</script>

<Category
	id="inputs"
	summary="Fields wrap in Field for labels and errors. Never a native select: use SelectField, SemesterSelect or SearchablePicker."
>
	<Spec title="Text fields" src={['ui/field', 'ui/input', 'ui/input-group', 'ui/textarea']}>
		<div class="space-y-4">
			<Field.Field>
				<Field.Label for="ds-name">Class name</Field.Label>
				<Input id="ds-name" placeholder="OPT 341" />
			</Field.Field>
			<Field.Field data-invalid>
				<Field.Label for="ds-code">Join code</Field.Label>
				<Input id="ds-code" aria-invalid value="12" />
				<Field.Error>Join codes are 6 characters.</Field.Error>
			</Field.Field>
			<InputGroup.Root>
				<InputGroup.Addon><Search /></InputGroup.Addon>
				<InputGroup.Input placeholder="Search questions" aria-label="Search questions" />
				<InputGroup.Addon align="inline-end"><Kbd>⌘K</Kbd></InputGroup.Addon>
			</InputGroup.Root>
			<Field.Field>
				<Field.Label for="ds-notes">Focus notes</Field.Label>
				<Textarea id="ds-notes" placeholder="Emphasize lid anatomy" />
			</Field.Field>
		</div>
	</Spec>

	<Spec
		title="Pickers"
		src={['SelectField', 'SemesterSelect', 'SearchablePicker']}
		note="SearchablePicker adds search once a list is long (module and tag pickers in admin)."
	>
		<div class="space-y-4">
			<div class="grid grid-cols-2 gap-3">
				<SelectField
					bind:value={difficulty}
					aria-label="Difficulty"
					options={[
						{ value: 'recall', label: 'Recall' },
						{ value: 'application', label: 'Application' },
						{ value: 'analysis', label: 'Analysis' }
					]}
				/>
				<SemesterSelect
					{semesters}
					bind:value={semester}
					allLabel="All semesters"
					size="default"
					class="w-full"
				/>
			</div>
			<p class="flex flex-wrap items-center text-base text-foreground/70">
				Save to
				<SearchablePicker
					size="md"
					label={moduleLabel ?? 'a module'}
					placeholder="Search modules…"
					options={pickerOptions}
					value={moduleId}
					bind:open={pickerOpen}
					bind:search={pickerSearch}
					onSelect={(value) => (moduleId = value)}
				>
					{#snippet icon()}<BookOpen size={16} class="shrink-0" />{/snippet}
				</SearchablePicker>
			</p>
		</div>
	</Spec>

	<Spec title="Toggles" src={['ui/checkbox', 'ui/switch', 'ui/radio-group']}>
		<div class="space-y-5">
			<div class="flex items-center gap-3">
				<Checkbox id="ds-c1" checked />
				<Label for="ds-c1">Show rationale after checking</Label>
			</div>
			<div class="flex items-center justify-between">
				<Label for="ds-s1">Auto next</Label>
				<Switch id="ds-s1" checked />
			</div>
			<RadioGroup.Root bind:value={answer} class="gap-2" aria-label="Correct answer">
				{#each ['Cornea', 'Eyelid', 'Lens'] as option, i (option)}
					<label class="flex items-center gap-3 surface-sm px-3 py-2 text-sm">
						<RadioGroup.Item value={String(i + 1)} aria-label="Mark {option} correct" />
						<span class="font-semibold text-muted-foreground">{String.fromCharCode(65 + i)}</span>
						{option}
					</label>
				{/each}
			</RadioGroup.Root>
		</div>
	</Spec>

	<Spec
		title="Segmented control and tabs"
		src={['ui/segmented-control', 'ui/tabs']}
		note="SegmentedControl switches state in place; Tabs switch a whole view (the question editor)."
	>
		<div class="space-y-4">
			<SegmentedControl
				bind:value={status}
				aria-label="Status"
				options={[
					{ value: 'published', label: 'Published', icon: CheckCircle, tone: 'success' },
					{ value: 'draft', label: 'Draft', icon: FileText, tone: 'info' },
					{ value: 'archived', label: 'Archived', icon: Archive, tone: 'error' }
				]}
			/>
			<div class="flex flex-wrap items-center gap-3">
				<SegmentedControl
					bind:value={pane}
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
					bind:value={view}
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
			</div>
			<Tabs.Root bind:value={editorView}>
				<Tabs.List aria-label="Editor view" class="h-8">
					<Tabs.Trigger value="question" class="px-3"
						><MessageSquare size={13} /> Question</Tabs.Trigger
					>
					<Tabs.Trigger value="findings" class="px-3"
						><Stethoscope size={13} /> Exam findings <Badge size="xs" tone="primary">2</Badge
						></Tabs.Trigger
					>
				</Tabs.List>
			</Tabs.Root>
		</div>
	</Spec>

	<Spec
		title="File drop zone"
		src="ui/file-drop-zone"
		note="Content library uploads. Drop a file or click."
	>
		<FileDropZone.Root
			accept=".pdf,application/pdf"
			onUpload={upload}
			maxFileSize={50 * FileDropZone.MEGABYTE}
		>
			<FileDropZone.Trigger />
		</FileDropZone.Root>
	</Spec>
</Category>

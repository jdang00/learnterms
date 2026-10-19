<script lang="ts">
	import { tick } from 'svelte';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import CircleDot from '@lucide/svelte/icons/circle-dot';
	import Clock from '@lucide/svelte/icons/clock';
	import Equal from '@lucide/svelte/icons/equal';
	import Columns2 from '@lucide/svelte/icons/columns-2';
	import Columns3 from '@lucide/svelte/icons/columns-3';
	import Copy from '@lucide/svelte/icons/copy';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import RectangleHorizontal from '@lucide/svelte/icons/rectangle-horizontal';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import StickyNote from '@lucide/svelte/icons/sticky-note';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';
	import {
		rowHasColumn,
		sectionValueKey,
		type ExamField,
		type ExamRow,
		type ExamTest
	} from '#lib/examFindings/catalog.js';
	import {
		applyNormalValues,
		countExamValues,
		MAX_NOTE_LENGTH,
		MAX_VALUE_LENGTH,
		mirrorOdToOs,
		mirrorPairs,
		normalExamValues,
		type ExamFinding,
		type ExamFindingSize
	} from '#lib/examFindings/findings.js';
	import {
		COVER_CORRECTION_CHOICES,
		combinePrism,
		combinePhoria,
		currentExamTime,
		combineCoverDeviation,
		coverCorrectionValues,
		coverDeviationParts,
		displayAffix,
		effectiveField,
		fieldChoices,
		fieldHint,
		formatExamValue,
		inputMode,
		phoriaParts,
		prismParts,
		toggleCoverCorrection
	} from '#lib/examFindings/input.js';
	import { EXAM_GROUP_STYLE } from '#lib/components/exam-findings/groups.js';
	import Worth4DotEditor from './Worth4DotEditor.svelte';
	import { DropdownMenu as DropdownMenuPrimitive, mergeProps } from 'bits-ui';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import * as InputGroup from '#lib/components/ui/input-group/index.js';
	import { Kbd } from '#lib/components/ui/kbd/index.js';
	import { SelectField } from '#lib/components/ui/select/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import { Tip } from '#lib/components/ui/tooltip/index.js';

	let {
		finding,
		test,
		index,
		total,
		canDuplicate = true,
		disabled = false,
		onChange,
		onMove,
		onDuplicate,
		onRemove,
		onHandlePointerDown
	}: {
		finding: ExamFinding;
		test: ExamTest;
		index: number;
		total: number;
		canDuplicate?: boolean;
		disabled?: boolean;
		onChange: () => void;
		onMove: (delta: number) => void;
		onDuplicate: () => void;
		onRemove: () => void;
		onHandlePointerDown: (event: PointerEvent) => void;
	} = $props();

	const SIZE_OPTIONS: Array<{
		value: ExamFindingSize | undefined;
		label: string;
		icon: typeof Sparkles;
	}> = [
		{ value: undefined, label: 'Auto', icon: Sparkles },
		{ value: 'small', label: 'Small', icon: Columns3 },
		{ value: 'half', label: 'Half', icon: Columns2 },
		{ value: 'full', label: 'Full', icon: RectangleHorizontal }
	];

	const uid = $props.id();
	const style = $derived(EXAM_GROUP_STYLE[test.group]);
	const normals = $derived(normalExamValues(test));
	const hasNormals = $derived(Object.keys(normals).length > 0);
	const canMirror = $derived(mirrorPairs(test).length > 0);
	const empty = $derived(countExamValues(finding) === 0);
	const isTag = (label: string) => ['OD', 'OS', 'OU'].includes(label);

	const note = $derived(finding.note?.trim() ?? '');
	const notePreview = $derived(
		note ? (note.length > 240 ? `${note.slice(0, 240)}…` : note) : 'Add note'
	);
	let notesOpen = $state(false);
	let cardElement = $state<HTMLElement | null>(null);
	let notesInput = $state<HTMLTextAreaElement | null>(null);
	let noteDraft = $state('');
	let flashed = $state<Set<string>>(new Set());
	let flashTimer: ReturnType<typeof setTimeout> | undefined;
	let customKeys = $state<string[]>([]);

	function flash(keys: string[]) {
		clearTimeout(flashTimer);
		flashed = new Set(keys);
		flashTimer = setTimeout(() => (flashed = new Set()), 900);
	}

	function fillNormal() {
		const before = new Set(
			Object.keys(finding.values).filter((key) => finding.values[key]?.trim())
		);
		if (!applyNormalValues(finding, test)) return;
		flash(Object.keys(normals).filter((key) => !before.has(key)));
		onChange();
	}

	function copyOdToOs() {
		mirrorOdToOs(finding, test);
		flash(mirrorPairs(test).map(([, to]) => to));
		onChange();
	}

	function openNotes() {
		noteDraft = finding.note ?? '';
		notesOpen = true;
	}

	function focusNotes() {
		notesInput?.focus();
		notesInput?.setSelectionRange(noteDraft.length, noteDraft.length);
	}

	function saveNote(text = noteDraft) {
		const next = text.trim() || undefined;
		if (next !== (finding.note?.trim() || undefined)) {
			finding.note = next;
			onChange();
		}
		notesOpen = false;
	}

	function setSize(size: ExamFindingSize | undefined) {
		finding.size = size;
		onChange();
	}

	function clearValues() {
		finding.values = {};
		finding.note = undefined;
		onChange();
	}

	function handleHandleKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') onMove(-1);
		else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') onMove(1);
		else return;
		event.preventDefault();
	}

	const hint = (row: ExamRow | null, column: ExamField) =>
		(row?.normal ?? column.normal ?? row?.sample ?? column.sample) || '';

	function finishValue(key: string, field: ExamField) {
		const current = finding.values[key] ?? '';
		const formatted = formatExamValue(current, field);
		if (current === formatted) return;
		finding.values[key] = formatted;
		onChange();
	}

	function advanceOnEnter(event: KeyboardEvent) {
		if (event.key !== 'Enter' || event.isComposing) return;
		event.preventDefault();
		const inputs = Array.from(
			cardElement?.querySelectorAll<HTMLElement>('[data-value-input]') ?? []
		);
		inputs[inputs.indexOf(event.currentTarget as HTMLElement) + 1]?.focus();
	}

	function isCustom(key: string, choices: string[]) {
		const value = finding.values[key]?.trim();
		return customKeys.includes(key) || Boolean(value && !choices.includes(value));
	}

	const deviationParts = (value: string, input: ExamField['input']) =>
		input === 'phoria' ? phoriaParts(value) : coverDeviationParts(value);
	const combineDeviation = (magnitude: string, direction: string, input: ExamField['input']) =>
		input === 'phoria'
			? combinePhoria(magnitude, direction)
			: combineCoverDeviation(magnitude, direction);

	function chooseValue(key: string, value: string) {
		customKeys =
			value === '__custom__'
				? [...customKeys.filter((item) => item !== key), key]
				: customKeys.filter((item) => item !== key);
		finding.values[key] = value === '__custom__' ? '' : value;
		onChange();
		if (value === '__custom__')
			void tick().then(() =>
				requestAnimationFrame(() => document.getElementById(`${uid}-${key}-custom`)?.focus())
			);
	}
</script>

{#snippet valueInput(
	key: string,
	column: ExamField,
	label: string,
	placeholder: string,
	choices: string[]
)}
	{#if column.input === 'coverCorrection'}
		<div class="flex min-h-8 flex-wrap items-center gap-x-4 gap-y-1">
			{#each COVER_CORRECTION_CHOICES as choice (choice)}
				<label class="flex cursor-pointer items-center gap-1.5 text-xs whitespace-nowrap">
					<Checkbox
						data-value-input
						class="size-3.5 rounded-sm"
						checked={coverCorrectionValues(finding.values[key] ?? '').includes(choice)}
						onCheckedChange={(checked) => {
							finding.values[key] = toggleCoverCorrection(
								finding.values[key] ?? '',
								choice,
								checked === true
							);
							onChange();
						}}
						{disabled}
					/>
					{choice}
				</label>
			{/each}
		</div>
		{#if finding.values[key] && !coverCorrectionValues(finding.values[key]).length}
			<Input
				class="mt-1 h-8 px-3 text-sm"
				aria-label="Other correction condition"
				maxlength={MAX_VALUE_LENGTH}
				bind:value={finding.values[key]}
				oninput={onChange}
				{disabled}
			/>
		{/if}
	{:else if column.input === 'coverDeviation' || column.input === 'phoria'}
		<div class="flex min-w-40 items-center gap-1">
			<Input
				id="{uid}-{key}"
				data-value-input
				type="text"
				class="h-8 min-w-0 flex-1 px-2.5 font-mono text-sm tabular-nums"
				aria-label={`${label} prism diopters`}
				placeholder="Δ"
				inputmode="decimal"
				maxlength={MAX_VALUE_LENGTH}
				value={deviationParts(finding.values[key] ?? '', column.input).magnitude}
				oninput={(event) => {
					const direction = deviationParts(finding.values[key] ?? '', column.input).direction;
					finding.values[key] = combineDeviation(
						event.currentTarget.value,
						direction === 'Ortho' ? '' : direction,
						column.input
					);
					onChange();
				}}
				onblur={() => finishValue(key, column)}
				onkeydown={advanceOnEnter}
				{disabled}
			/>
			<SelectField
				size="sm"
				class="w-24 shrink-0 text-xs"
				aria-label={`${label} direction`}
				value={deviationParts(finding.values[key] ?? '', column.input).direction}
				onValueChange={(next) => {
					finding.values[key] = combineDeviation(
						deviationParts(finding.values[key] ?? '', column.input).magnitude,
						next,
						column.input
					);
					onChange();
				}}
				{disabled}
				options={[
					{ value: '', label: 'Direction' },
					...choices.map((choice) => ({ value: choice, label: choice }))
				]}
			/>
		</div>
	{:else if column.input === 'check'}
		<label
			class="flex h-8 min-w-28 items-center gap-2 rounded-full border border-border bg-background px-3 text-xs"
		>
			<Checkbox
				id="{uid}-{key}"
				data-value-input
				class="size-3.5"
				checked={finding.values[key] === column.normal}
				onCheckedChange={(checked) => {
					finding.values[key] = checked === true ? (column.normal ?? choices[0]) : '';
					onChange();
				}}
				aria-label={`${label}: ${column.normal ?? choices[0]}`}
				{disabled}
			/>
			<span class="truncate">{column.normal ?? choices[0]}</span>
		</label>
		{#if finding.values[key] && finding.values[key] !== column.normal}
			<Input
				class="mt-1 h-8 px-3 text-sm"
				aria-label={`${label} other finding`}
				maxlength={MAX_VALUE_LENGTH}
				bind:value={finding.values[key]}
				oninput={onChange}
				{disabled}
			/>
		{/if}
	{:else if column.input === 'prism'}
		<div class="flex min-w-32 items-center gap-1">
			<Input
				id="{uid}-{key}"
				data-value-input
				type="text"
				class="h-8 min-w-0 flex-1 px-2.5 font-mono text-sm tabular-nums"
				aria-label={`${label} amount in prism diopters`}
				placeholder="Δ"
				inputmode="decimal"
				maxlength={MAX_VALUE_LENGTH}
				value={prismParts(finding.values[key] ?? '').magnitude}
				oninput={(event) => {
					finding.values[key] = combinePrism(
						event.currentTarget.value,
						prismParts(finding.values[key] ?? '').direction
					);
					onChange();
				}}
				onblur={() => finishValue(key, column)}
				onkeydown={advanceOnEnter}
				{disabled}
			/>
			<SelectField
				size="sm"
				class="w-16 shrink-0 text-xs"
				aria-label={`${label} direction`}
				value={prismParts(finding.values[key] ?? '').direction}
				onValueChange={(next) => {
					finding.values[key] = combinePrism(prismParts(finding.values[key] ?? '').magnitude, next);
					onChange();
				}}
				disabled={disabled ||
					!/^\d+(?:\.\d+)?$/.test(prismParts(finding.values[key] ?? '').magnitude)}
				options={[
					{ value: '', label: 'Dir.' },
					...(column.choices ?? []).map((direction) => ({ value: direction, label: direction }))
				]}
			/>
		</div>
	{:else if choices.length && (column.input === undefined || column.input === 'acuity')}
		<div class="min-w-28 {column.wide ? '' : 'max-w-40'}">
			<div class="flex items-center gap-1">
				{#if column.prefix && displayAffix(column, finding.values[key] ?? '')}<span
						class="font-mono text-xs text-foreground/40">{column.prefix}</span
					>{/if}
				<SelectField
					size="sm"
					class="w-full text-xs {flashed.has(key) ? 'bg-success/15' : ''}"
					id="{uid}-{key}"
					data-value-input
					aria-label={label}
					value={isCustom(key, choices) ? '__custom__' : (finding.values[key] ?? '')}
					onValueChange={(next) => chooseValue(key, next)}
					{disabled}
					options={[
						{ value: '', label: 'Select…' },
						...choices.map((choice) => ({ value: choice, label: choice })),
						{ value: '__custom__', label: 'Other / type…' }
					]}
				/>
			</div>
			{#if isCustom(key, choices)}
				<Input
					id="{uid}-{key}-custom"
					data-value-input
					type="text"
					class="mt-1 h-8 px-3 text-sm"
					aria-label={`${label} custom value`}
					placeholder="Type a finding"
					maxlength={MAX_VALUE_LENGTH}
					bind:value={finding.values[key]}
					oninput={onChange}
					onblur={() => finishValue(key, column)}
					onkeydown={advanceOnEnter}
					{disabled}
				/>
			{/if}
		</div>
	{:else}
		<InputGroup.Root
			class="h-8 gap-1 px-3 transition-colors duration-500 focus-within:border-primary {flashed.has(
				key
			)
				? 'bg-success/15'
				: 'bg-background'} {column.wide ? 'min-w-28' : 'min-w-[4.5rem] max-w-40'}"
		>
			{#if column.prefix && displayAffix(column, finding.values[key] ?? '')}
				<InputGroup.Addon class="px-0 font-mono text-xs text-foreground/40"
					>{column.prefix}</InputGroup.Addon
				>
			{/if}
			<InputGroup.Input
				id="{uid}-{key}"
				data-value-input
				type="text"
				class="h-full min-w-0 px-0 text-sm placeholder:text-foreground/25 {column.wide
					? ''
					: 'font-mono tabular-nums'}"
				aria-label={label}
				title={fieldHint(column)}
				{placeholder}
				maxlength={MAX_VALUE_LENGTH}
				inputmode={inputMode(column)}
				autocomplete="off"
				bind:value={finding.values[key]}
				oninput={onChange}
				onblur={() => finishValue(key, column)}
				onkeydown={advanceOnEnter}
				{disabled}
			/>
			{#if column.suffix && displayAffix(column, finding.values[key] ?? '')}
				<InputGroup.Addon align="inline-end" class="px-0 text-[0.68rem] text-foreground/45"
					>{column.suffix}</InputGroup.Addon
				>
			{/if}
			{#if column.input === 'time'}
				<InputGroup.Button
					size="icon-xs"
					class="-mr-2 text-foreground/55 hover:text-primary-ink"
					title="Record the current time"
					aria-label={`${label}: record the current time`}
					onclick={() => {
						finding.values[key] = currentExamTime();
						flash([key]);
						onChange();
					}}
					{disabled}><Clock size={13} /></InputGroup.Button
				>
			{/if}
		</InputGroup.Root>
	{/if}
{/snippet}

{#snippet tool(
	Icon: typeof StickyNote,
	label: string,
	onclick: () => void,
	{
		off = false,
		pressed,
		tone = 'neutral',
		dot = false
	}: {
		off?: boolean;
		pressed?: boolean;
		tone?: 'neutral' | 'success' | 'info' | 'warning';
		dot?: boolean;
	}
)}
	<Tip {label} side="bottom" class="max-w-64 text-left whitespace-pre-line">
		{#snippet child({ props })}
			<Button
				{...props}
				variant="ghost"
				{tone}
				shape="circle"
				size="xs"
				class="relative size-7 shrink-0"
				aria-label={label}
				aria-pressed={pressed}
				{onclick}
				disabled={disabled || off}
			>
				<Icon size={14} />
				{#if dot}<span
						class="absolute right-1.5 top-1 size-1.5 rounded-full bg-warning ring-2 ring-background"
					></span>{/if}
			</Button>
		{/snippet}
	</Tip>
{/snippet}

<article
	bind:this={cardElement}
	class="@container flex h-full flex-col rounded-2xl border bg-background shadow-xs transition-colors focus-within:border-primary/40 {empty
		? 'border-dashed border-foreground/25'
		: 'border-border'}"
>
	<header
		class="flex items-center gap-1 rounded-t-2xl border-b border-muted bg-muted/40 py-1 pl-1 pr-1.5"
	>
		<button
			type="button"
			class="grid size-7 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-foreground/35 transition-colors hover:bg-foreground/5 hover:text-foreground/70 focus-visible:outline-2 focus-visible:outline-primary active:cursor-grabbing"
			aria-label="Reorder {finding.title || test.title}: drag, or use the arrow keys"
			onpointerdown={onHandlePointerDown}
			onkeydown={handleHandleKeydown}
			{disabled}
		>
			<GripVertical size={14} />
		</button>
		<span class="grid size-6 shrink-0 place-items-center rounded-full {style.badge}">
			<style.icon size={13} />
		</span>
		<input
			type="text"
			class="min-w-0 flex-1 rounded-full bg-transparent px-2.5 py-1 text-sm font-semibold outline-none transition-colors placeholder:text-foreground hover:bg-background/70 focus:bg-background focus:ring-1 focus:ring-primary/40"
			placeholder={test.title}
			aria-label="Box title"
			maxlength="80"
			bind:value={finding.title}
			oninput={onChange}
			{disabled}
		/>
		{#if empty}
			<span
				class="hidden shrink-0 items-center gap-1 text-[0.68rem] text-foreground/45 @md:flex"
				title="Boxes without findings stay hidden from students"
			>
				<EyeOff size={11} /> Hidden
			</span>
		{/if}
		<!-- Same tools in the same order on every box, like an EHR chart, so the positions become habit. -->
		<div
			class="flex shrink-0 items-center gap-1"
			role="toolbar"
			aria-label="{finding.title || test.title} tools"
		>
			{@render tool(StickyNote, notePreview, openNotes, {
				tone: note ? 'warning' : 'neutral',
				dot: Boolean(note)
			})}
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props: menuProps })}
						<Tip label="More" side="bottom">
							{#snippet child({ props })}
								<Button
									{...mergeProps(menuProps, props)}
									variant="ghost"
									tone="neutral"
									shape="circle"
									size="xs"
									class="size-7 shrink-0"
									aria-label="More box options"
								>
									<Ellipsis size={14} />
								</Button>
							{/snippet}
						</Tip>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end" class="w-64 p-1.5">
					<DropdownMenu.Label class="px-2 pb-1 pt-1 label-caps">Width</DropdownMenu.Label>
					<!-- A segmented control instead of a list, so all four widths fit on one row. -->
					<DropdownMenuPrimitive.RadioGroup
						value={finding.size ?? ''}
						onValueChange={(value) =>
							setSize(SIZE_OPTIONS.find((option) => (option.value ?? '') === value)?.value)}
						class="mb-1 grid grid-cols-4 gap-1 rounded-full bg-muted/70 p-1"
						aria-label="Box width"
					>
						{#each SIZE_OPTIONS as option (option.label)}
							<DropdownMenuPrimitive.RadioItem
								value={option.value ?? ''}
								closeOnSelect={false}
								class="flex cursor-pointer items-center justify-center gap-1 rounded-full py-1 text-[0.7rem] font-medium text-foreground/55 outline-hidden transition-colors data-highlighted:text-foreground data-[state=checked]:bg-background data-[state=checked]:text-foreground data-[state=checked]:shadow-xs data-[state=checked]:ring-1 data-[state=checked]:ring-border"
							>
								<option.icon size={12} />
								{option.label}
							</DropdownMenuPrimitive.RadioItem>
						{/each}
					</DropdownMenuPrimitive.RadioGroup>
					<DropdownMenu.Item class="rounded-xl" disabled={index === 0} onSelect={() => onMove(-1)}>
						<ArrowUp size={14} /> Move earlier
					</DropdownMenu.Item>
					<DropdownMenu.Item
						class="rounded-xl"
						disabled={index === total - 1}
						onSelect={() => onMove(1)}
					>
						<ArrowDown size={14} /> Move later
					</DropdownMenu.Item>
					<DropdownMenu.Item class="rounded-xl" disabled={!canDuplicate} onSelect={onDuplicate}>
						<Copy size={14} /> Duplicate
					</DropdownMenu.Item>
					<DropdownMenu.Item class="rounded-xl" variant="destructive" onSelect={onRemove}>
						<Trash2 size={14} /> Remove box
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
			{@render tool(RotateCcw, 'Clear findings', clearValues, { off: empty })}
			{@render tool(
				CircleDot,
				hasNormals ? 'Normal' : 'No normal findings for this test',
				fillNormal,
				{
					off: !hasNormals,
					tone: 'success'
				}
			)}
			{@render tool(Equal, canMirror ? 'OS = OD' : 'No OD/OS rows to copy', copyOdToOs, {
				off: !canMirror,
				tone: 'info'
			})}
		</div>
	</header>

	<div class="flex-1 space-y-3 px-3 py-2.5">
		{#each test.layout as section, sectionIndex (sectionIndex)}
			{#if section.kind === 'grid' && section.display === 'worth4dot'}
				<Worth4DotEditor {finding} {section} {onChange} {disabled} />
			{:else if section.kind === 'grid'}
				<div class="-mx-1.5 overflow-x-auto">
					<table class="w-full border-separate border-spacing-x-1.5 border-spacing-y-1 text-left">
						<thead>
							<tr class="text-[0.7rem] text-foreground/50">
								<th class="w-px whitespace-nowrap"
									>{#if section.label}{section.label}{:else}<span class="sr-only">Row</span
										>{/if}</th
								>
								{#each section.columns as column (column.key)}
									<th class="px-0.5 font-medium whitespace-nowrap">{column.label}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each section.rows as row (row.key)}
								<tr>
									<th scope="row" class="pr-1 whitespace-nowrap">
										{#if isTag(row.label)}
											<span
												class="inline-block rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.68rem] font-semibold text-foreground/70"
												>{row.label}</span
											>
										{:else}
											<span class="text-xs font-medium text-foreground/70">{row.label}</span>
										{/if}
									</th>
									{#each section.columns as column (column.key)}
										<td>
											{#if rowHasColumn(row, column)}
												{@render valueInput(
													sectionValueKey(section, row.key, column.key),
													effectiveField(column, row),
													`${row.label} ${column.label}`,
													hint(row, column),
													fieldChoices(column, row)
												)}
											{/if}
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else if section.kind === 'fields'}
				<div
					class={test.id === 'coverTest'
						? 'grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-1.5 gap-y-1.5'
						: 'grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-x-2 gap-y-1.5'}
				>
					{#each section.fields as field (field.key)}
						<div class={test.id === 'coverTest' ? 'contents' : field.wide ? 'col-span-2' : ''}>
							<span
								class={test.id === 'coverTest'
									? field.key === 'correction'
										? 'invisible text-xs'
										: 'text-xs font-medium text-foreground/70'
									: 'mb-0.5 block truncate px-0.5 text-[0.7rem] text-foreground/50'}
								>{field.label}</span
							>
							{@render valueInput(
								sectionValueKey(section, field.key),
								field,
								field.label,
								hint(null, field),
								fieldChoices(field)
							)}
						</div>
					{/each}
				</div>
			{:else}
				<label class="block">
					<span class="mb-0.5 block px-0.5 text-[0.7rem] text-foreground/50">{section.label}</span>
					<Textarea
						class="min-h-0 px-3 py-2 text-sm transition-colors duration-500 focus:border-primary {flashed.has(
							section.key
						)
							? 'bg-success/15'
							: ''}"
						rows={2}
						maxlength={MAX_VALUE_LENGTH}
						placeholder={section.normal ?? section.sample}
						bind:value={finding.values[section.key]}
						oninput={onChange}
						{disabled}
					/>
				</label>
			{/if}
		{/each}
	</div>
</article>

<Dialog.Root bind:open={notesOpen}>
	<Dialog.Content
		sheet
		class="gap-0 border-border p-0 shadow-2xl sm:max-w-xl"
		showCloseButton={false}
		onOpenAutoFocus={(event) => {
			event.preventDefault();
			focusNotes();
		}}
	>
		<header class="flex items-center gap-3 border-b border-muted px-5 py-4">
			<span
				class="grid size-9 shrink-0 place-items-center rounded-full bg-warning/15 text-warning-ink"
			>
				<StickyNote size={16} />
			</span>
			<div class="min-w-0 flex-1">
				<Dialog.Title id="{uid}-note-title" class="leading-normal font-semibold tracking-tight">
					{note ? 'Edit note' : 'Add note'}
				</Dialog.Title>
				<p class="truncate text-xs text-foreground/55">
					{finding.title || test.title} · students open this note from the box header
				</p>
			</div>
			<Button
				variant="ghost"
				tone="neutral"
				shape="circle"
				size="sm"
				aria-label="Close"
				onclick={() => (notesOpen = false)}><X size={16} /></Button
			>
		</header>
		<div class="px-5 pb-2 pt-4">
			<Textarea
				bind:ref={notesInput}
				bind:value={noteDraft}
				class="h-40 resize-y px-4 py-3 text-sm leading-relaxed focus:border-primary"
				maxlength={MAX_NOTE_LENGTH}
				placeholder="e.g., Patient squinting during testing; recheck after dilation."
				aria-label="Note"
				onkeydown={(event) => {
					if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
						event.preventDefault();
						saveNote();
					}
				}}
			/>
			<div class="mt-1 flex items-center justify-between px-1 text-xs text-foreground/45">
				<span class="hidden sm:inline"><Kbd>⌘</Kbd> <Kbd>Enter</Kbd> to save</span>
				<span class="ml-auto tabular-nums"
					>{noteDraft.length.toLocaleString()} of {MAX_NOTE_LENGTH.toLocaleString()} characters</span
				>
			</div>
		</div>
		<footer class="flex items-center gap-2 border-t border-muted px-5 py-3">
			{#if note}
				<Button variant="ghost" tone="error" size="sm" class="gap-1.5" onclick={() => saveNote('')}
					><Trash2 size={14} /> Delete note</Button
				>
			{/if}
			<Button
				variant="ghost"
				tone="neutral"
				size="sm"
				class="ml-auto"
				onclick={() => (notesOpen = false)}>Cancel</Button
			>
			<Button size="sm" class="px-5" onclick={() => saveNote()}>Save</Button>
		</footer>
	</Dialog.Content>
</Dialog.Root>

<script lang="ts">
	import { tick } from 'svelte';
	import {
		ArrowDown,
		ArrowUp,
		CircleDot,
		Clock,
		Equal,
		Columns2,
		Columns3,
		Copy,
		Ellipsis,
		EyeOff,
		GripVertical,
		RectangleHorizontal,
		RotateCcw,
		Sparkles,
		StickyNote,
		Trash2,
		X
	} from 'lucide-svelte';
	import {
		rowHasColumn,
		sectionValueKey,
		type ExamField,
		type ExamRow,
		type ExamTest
	} from '$lib/examFindings/catalog';
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
	} from '$lib/examFindings/findings';
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
	} from '$lib/examFindings/input';
	import { EXAM_GROUP_STYLE } from '$lib/components/exam-findings/groups';
	import Worth4DotEditor from './Worth4DotEditor.svelte';
	import { followAnchor } from '$lib/utils/anchoredPopover';

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
	let notesDialog = $state<HTMLDialogElement | null>(null);
	let cardElement = $state<HTMLElement | null>(null);
	let notesInput = $state<HTMLTextAreaElement | null>(null);
	let noteDraft = $state('');
	let menuButton = $state<HTMLButtonElement | null>(null);
	let menuPopover = $state<HTMLDivElement | null>(null);
	let unfollowMenu: (() => void) | undefined;
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

	async function openNotes() {
		noteDraft = finding.note ?? '';
		notesDialog?.showModal();
		await tick();
		notesInput?.focus();
		notesInput?.setSelectionRange(noteDraft.length, noteDraft.length);
	}

	function saveNote(text = noteDraft) {
		const next = text.trim() || undefined;
		if (next !== (finding.note?.trim() || undefined)) {
			finding.note = next;
			onChange();
		}
		notesDialog?.close();
	}

	function handleMenuToggle(event: Event) {
		unfollowMenu?.();
		unfollowMenu = undefined;
		if (!menuPopover || !menuButton) return;
		const open = (event as ToggleEvent).newState === 'open';
		if (open) unfollowMenu = followAnchor(menuPopover, menuButton);
		// Toggle fires a frame after opening, so the menu stays invisible until it is placed.
		menuPopover.style.visibility = open ? 'visible' : 'hidden';
	}

	function closeMenu() {
		menuPopover?.hidePopover();
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
					<input
						data-value-input
						type="checkbox"
						class="checkbox checkbox-primary checkbox-xs rounded-sm"
						checked={coverCorrectionValues(finding.values[key] ?? '').includes(choice)}
						onchange={(event) => {
							finding.values[key] = toggleCoverCorrection(
								finding.values[key] ?? '',
								choice,
								event.currentTarget.checked
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
			<input
				class="input input-sm mt-1 w-full rounded-full border-base-300"
				aria-label="Other correction condition"
				maxlength={MAX_VALUE_LENGTH}
				bind:value={finding.values[key]}
				oninput={onChange}
				{disabled}
			/>
		{/if}
	{:else if column.input === 'coverDeviation' || column.input === 'phoria'}
		<div class="flex min-w-40 items-center gap-1">
			<input
				id="{uid}-{key}"
				data-value-input
				type="text"
				class="input input-sm h-8 min-w-0 flex-1 rounded-full border-base-300 px-2.5 font-mono tabular-nums"
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
			<select
				class="select select-sm h-8 w-24 shrink-0 rounded-full border-base-300 bg-base-100 px-2 text-xs"
				aria-label={`${label} direction`}
				value={deviationParts(finding.values[key] ?? '', column.input).direction}
				onchange={(event) => {
					finding.values[key] = combineDeviation(
						deviationParts(finding.values[key] ?? '', column.input).magnitude,
						event.currentTarget.value,
						column.input
					);
					onChange();
				}}
				{disabled}
			>
				<option value="">Direction</option>
				{#each choices as choice (choice)}<option value={choice}>{choice}</option>{/each}
			</select>
		</div>
	{:else if column.input === 'check'}
		<label
			class="flex h-8 min-w-28 items-center gap-2 rounded-full border border-base-300 bg-base-100 px-3 text-xs"
		>
			<input
				id="{uid}-{key}"
				data-value-input
				type="checkbox"
				class="checkbox checkbox-primary checkbox-xs"
				checked={finding.values[key] === column.normal}
				onchange={(event) => {
					finding.values[key] = event.currentTarget.checked ? (column.normal ?? choices[0]) : '';
					onChange();
				}}
				aria-label={`${label}: ${column.normal ?? choices[0]}`}
				{disabled}
			/>
			<span class="truncate">{column.normal ?? choices[0]}</span>
		</label>
		{#if finding.values[key] && finding.values[key] !== column.normal}
			<input
				class="input input-sm mt-1 w-full rounded-full border-base-300"
				aria-label={`${label} other finding`}
				maxlength={MAX_VALUE_LENGTH}
				bind:value={finding.values[key]}
				oninput={onChange}
				{disabled}
			/>
		{/if}
	{:else if column.input === 'prism'}
		<div class="flex min-w-32 items-center gap-1">
			<input
				id="{uid}-{key}"
				data-value-input
				type="text"
				class="input input-sm h-8 min-w-0 flex-1 rounded-full border-base-300 px-2.5 font-mono tabular-nums"
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
			<select
				class="select select-sm h-8 w-16 shrink-0 rounded-full border-base-300 bg-base-100 px-1.5 text-xs"
				aria-label={`${label} direction`}
				value={prismParts(finding.values[key] ?? '').direction}
				onchange={(event) => {
					finding.values[key] = combinePrism(
						prismParts(finding.values[key] ?? '').magnitude,
						event.currentTarget.value
					);
					onChange();
				}}
				disabled={disabled ||
					!/^\d+(?:\.\d+)?$/.test(prismParts(finding.values[key] ?? '').magnitude)}
			>
				<option value="">Dir.</option>
				{#each column.choices ?? [] as direction (direction)}<option value={direction}
						>{direction}</option
					>{/each}
			</select>
		</div>
	{:else if choices.length && (column.input === undefined || column.input === 'acuity')}
		<div class="min-w-28 {column.wide ? '' : 'max-w-40'}">
			<div class="flex items-center gap-1">
				{#if column.prefix && displayAffix(column, finding.values[key] ?? '')}<span
						class="font-mono text-xs text-base-content/40">{column.prefix}</span
					>{/if}
				<select
					id="{uid}-{key}"
					data-value-input
					class="select select-sm h-8 w-full rounded-full border-base-300 bg-base-100 text-xs focus:border-primary {flashed.has(
						key
					)
						? 'bg-success/15'
						: ''}"
					aria-label={label}
					value={isCustom(key, choices) ? '__custom__' : (finding.values[key] ?? '')}
					onchange={(event) => chooseValue(key, event.currentTarget.value)}
					{disabled}
				>
					<option value="">Select…</option>
					{#each choices as choice (choice)}<option value={choice}>{choice}</option>{/each}
					<option value="__custom__">Other / type…</option>
				</select>
			</div>
			{#if isCustom(key, choices)}
				<input
					id="{uid}-{key}-custom"
					data-value-input
					type="text"
					class="input input-sm mt-1 h-8 w-full rounded-full border-base-300 px-3"
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
		<label
			class="input input-sm h-8 w-full gap-1 rounded-full border-base-300 px-3 transition-colors duration-500 focus-within:border-primary {flashed.has(
				key
			)
				? 'bg-success/15'
				: 'bg-base-100'} {column.wide ? 'min-w-28' : 'min-w-[4.5rem] max-w-40'}"
		>
			{#if column.prefix && displayAffix(column, finding.values[key] ?? '')}<span
					class="-mr-0.5 font-mono text-xs text-base-content/40">{column.prefix}</span
				>{/if}
			<input
				id="{uid}-{key}"
				data-value-input
				type="text"
				class="min-w-0 placeholder:text-base-content/25 {column.wide
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
			{#if column.suffix && displayAffix(column, finding.values[key] ?? '')}<span
					class="shrink-0 text-[0.68rem] text-base-content/45">{column.suffix}</span
				>{/if}
			{#if column.input === 'time'}
				<button
					type="button"
					class="btn btn-ghost btn-xs btn-circle -mr-2 shrink-0 text-base-content/55 hover:text-primary"
					title="Record the current time"
					aria-label={`${label}: record the current time`}
					onclick={() => {
						finding.values[key] = currentExamTime();
						flash([key]);
						onChange();
					}}
					{disabled}><Clock size={13} /></button
				>
			{/if}
		</label>
	{/if}
{/snippet}

{#snippet tool(
	Icon: typeof StickyNote,
	label: string,
	onclick: () => void,
	{
		off = false,
		pressed,
		tone = '',
		dot = false
	}: { off?: boolean; pressed?: boolean; tone?: string; dot?: boolean }
)}
	<button
		type="button"
		class="btn btn-circle btn-xs tooltip tooltip-bottom relative size-7 shrink-0 border-base-300 bg-base-100 shadow-none before:max-w-64 before:whitespace-pre-line before:text-left hover:bg-base-200 disabled:bg-base-100 {pressed
			? `bg-base-200 ${tone}`
			: tone
				? `${tone} opacity-80 hover:opacity-100`
				: 'text-base-content/60 hover:text-base-content'}"
		data-tip={label}
		aria-label={label}
		aria-pressed={pressed}
		{onclick}
		disabled={disabled || off}
	>
		<Icon size={14} />
		{#if dot}<span
				class="absolute right-1.5 top-1 size-1.5 rounded-full bg-warning ring-2 ring-base-100"
			></span>{/if}
	</button>
{/snippet}

<article
	bind:this={cardElement}
	class="@container flex h-full flex-col rounded-2xl border bg-base-100 shadow-xs transition-colors focus-within:border-primary/40 {empty
		? 'border-dashed border-base-content/25'
		: 'border-base-300'}"
>
	<header
		class="flex items-center gap-1 rounded-t-2xl border-b border-base-200 bg-base-200/40 py-1 pl-1 pr-1.5"
	>
		<button
			type="button"
			class="grid size-7 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-base-content/35 transition-colors hover:bg-base-content/5 hover:text-base-content/70 focus-visible:outline-2 focus-visible:outline-primary active:cursor-grabbing"
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
			class="min-w-0 flex-1 rounded-full bg-transparent px-2.5 py-1 text-sm font-semibold outline-none transition-colors placeholder:text-base-content hover:bg-base-100/70 focus:bg-base-100 focus:ring-1 focus:ring-primary/40"
			placeholder={test.title}
			aria-label="Box title"
			maxlength="80"
			bind:value={finding.title}
			oninput={onChange}
			{disabled}
		/>
		{#if empty}
			<span
				class="hidden shrink-0 items-center gap-1 text-[0.68rem] text-base-content/45 @md:flex"
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
				tone: note ? 'text-warning' : '',
				dot: Boolean(note)
			})}
			<button
				bind:this={menuButton}
				type="button"
				class="btn btn-circle btn-xs tooltip tooltip-bottom size-7 shrink-0 border-base-300 bg-base-100 text-base-content/60 shadow-none hover:bg-base-200 hover:text-base-content"
				data-tip="More"
				aria-label="More box options"
				aria-haspopup="menu"
				popovertarget="{uid}-menu"
			>
				<Ellipsis size={14} />
			</button>
			<div
				bind:this={menuPopover}
				id="{uid}-menu"
				popover="auto"
				ontoggle={handleMenuToggle}
				style="visibility: hidden"
				class="dropdown-content fixed inset-auto m-0 w-64 rounded-2xl border border-base-300 bg-base-100 p-1.5 text-base-content shadow-xl"
			>
				<p
					class="px-2 pb-1 pt-1 text-[0.65rem] font-semibold uppercase tracking-wider text-base-content/40"
				>
					Width
				</p>
				<div
					class="mb-1 grid grid-cols-4 gap-1 rounded-full bg-base-200/70 p-1"
					role="radiogroup"
					aria-label="Box width"
				>
					{#each SIZE_OPTIONS as option (option.label)}
						{@const active = finding.size === option.value}
						<button
							type="button"
							role="radio"
							aria-checked={active}
							class="flex items-center justify-center gap-1 rounded-full py-1 text-[0.7rem] font-medium transition-colors {active
								? 'bg-base-100 shadow-xs ring-1 ring-base-300'
								: 'text-base-content/55 hover:text-base-content'}"
							onclick={() => setSize(option.value)}
						>
							<option.icon size={12} />
							{option.label}
						</button>
					{/each}
				</div>
				<ul class="menu menu-sm w-full p-0">
					<li>
						<button
							type="button"
							disabled={index === 0}
							onclick={() => {
								closeMenu();
								onMove(-1);
							}}><ArrowUp size={14} /> Move earlier</button
						>
					</li>
					<li>
						<button
							type="button"
							disabled={index === total - 1}
							onclick={() => {
								closeMenu();
								onMove(1);
							}}><ArrowDown size={14} /> Move later</button
						>
					</li>
					<li>
						<button
							type="button"
							disabled={!canDuplicate}
							onclick={() => {
								closeMenu();
								onDuplicate();
							}}><Copy size={14} /> Duplicate</button
						>
					</li>
					<li>
						<button
							type="button"
							class="text-error"
							onclick={() => {
								closeMenu();
								onRemove();
							}}><Trash2 size={14} /> Remove box</button
						>
					</li>
				</ul>
			</div>
			{@render tool(RotateCcw, 'Clear findings', clearValues, { off: empty })}
			{@render tool(
				CircleDot,
				hasNormals ? 'Normal' : 'No normal findings for this test',
				fillNormal,
				{
					off: !hasNormals,
					tone: 'text-success'
				}
			)}
			{@render tool(Equal, canMirror ? 'OS = OD' : 'No OD/OS rows to copy', copyOdToOs, {
				off: !canMirror,
				tone: 'text-info'
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
							<tr class="text-[0.7rem] text-base-content/50">
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
												class="inline-block rounded-md bg-base-200 px-1.5 py-0.5 font-mono text-[0.68rem] font-semibold text-base-content/70"
												>{row.label}</span
											>
										{:else}
											<span class="text-xs font-medium text-base-content/70">{row.label}</span>
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
										: 'text-xs font-medium text-base-content/70'
									: 'mb-0.5 block truncate px-0.5 text-[0.7rem] text-base-content/50'}
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
					<span class="mb-0.5 block px-0.5 text-[0.7rem] text-base-content/50">{section.label}</span
					>
					<textarea
						class="textarea textarea-sm w-full rounded-2xl border-base-300 px-3 transition-colors duration-500 focus:border-primary {flashed.has(
							section.key
						)
							? 'bg-success/15'
							: ''}"
						rows="2"
						maxlength={MAX_VALUE_LENGTH}
						placeholder={section.normal ?? section.sample}
						bind:value={finding.values[section.key]}
						oninput={onChange}
						{disabled}
					></textarea>
				</label>
			{/if}
		{/each}
	</div>
</article>

<dialog
	bind:this={notesDialog}
	class="modal modal-bottom sm:modal-middle"
	aria-labelledby="{uid}-note-title"
>
	<div
		class="modal-box w-full max-w-xl rounded-t-[2rem] border border-base-300 p-0 shadow-2xl sm:rounded-[1.75rem]"
	>
		<header class="flex items-center gap-3 border-b border-base-200 px-5 py-4">
			<span class="grid size-9 shrink-0 place-items-center rounded-full bg-warning/15 text-warning">
				<StickyNote size={16} />
			</span>
			<div class="min-w-0 flex-1">
				<h3 id="{uid}-note-title" class="font-semibold tracking-tight">
					{note ? 'Edit note' : 'Add note'}
				</h3>
				<p class="truncate text-xs text-base-content/55">
					{finding.title || test.title} · students open this note from the box header
				</p>
			</div>
			<button
				type="button"
				class="btn btn-ghost btn-sm btn-circle"
				aria-label="Close"
				onclick={() => notesDialog?.close()}><X size={16} /></button
			>
		</header>
		<div class="px-5 pb-2 pt-4">
			<textarea
				bind:this={notesInput}
				bind:value={noteDraft}
				class="textarea h-40 w-full resize-y rounded-2xl border-base-300 px-4 py-3 text-sm leading-relaxed focus:border-primary"
				maxlength={MAX_NOTE_LENGTH}
				placeholder="e.g., Patient squinting during testing; recheck after dilation."
				aria-label="Note"
				onkeydown={(event) => {
					if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
						event.preventDefault();
						saveNote();
					}
				}}
			></textarea>
			<div class="mt-1 flex items-center justify-between px-1 text-xs text-base-content/45">
				<span class="hidden sm:inline"
					><kbd class="kbd kbd-xs">⌘</kbd> <kbd class="kbd kbd-xs">Enter</kbd> to save</span
				>
				<span class="ml-auto tabular-nums"
					>{noteDraft.length.toLocaleString()} of {MAX_NOTE_LENGTH.toLocaleString()} characters</span
				>
			</div>
		</div>
		<footer class="flex items-center gap-2 border-t border-base-200 px-5 py-3">
			{#if note}
				<button
					type="button"
					class="btn btn-ghost btn-sm gap-1.5 rounded-full text-error"
					onclick={() => saveNote('')}><Trash2 size={14} /> Delete note</button
				>
			{/if}
			<button
				type="button"
				class="btn btn-ghost btn-sm ml-auto rounded-full"
				onclick={() => notesDialog?.close()}>Cancel</button
			>
			<button
				type="button"
				class="btn btn-primary btn-sm rounded-full px-5"
				onclick={() => saveNote()}>Save</button
			>
		</footer>
	</div>
	<form method="dialog" class="modal-backdrop bg-black/35 backdrop-blur-[3px]">
		<button aria-label="Close note">close</button>
	</form>
</dialog>

<script lang="ts">
	import { captureStudyTool } from '$lib/analytics/studyTools';
	import { useStudyToolContext } from '$lib/analytics/studyToolContext';
	import {
		createCalculationTracker,
		type StudyToolContext,
		type StudyToolDetails
	} from '$lib/analytics/studyToolEvents';
	import 'mathlive/static.css';
	import { ChevronLeft, Delete, X } from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import type { MathfieldElement } from 'mathlive';
	import type { AngleMode } from '$lib/calculator/engine';
	import { FORMULAS, type Formula } from '$lib/calculator/formulas';
	import { fillFormula, numberToLatex } from '$lib/calculator/format';
	import { base } from '$app/paths';

	type Entry = {
		id: number;
		latex: string;
		value: number;
		unit?: string;
		formulaId?: string;
		values?: Record<string, string>;
	};

	const getTelemetryContext = useStudyToolContext();
	let inputMethod: NonNullable<StudyToolDetails['input_method']> = 'restored';
	let userEdited = false;
	let keypadEditing = false;
	let evaluationTimer: ReturnType<typeof setTimeout> | undefined;
	const calculationTracker = createCalculationTracker(captureStudyTool);
	let evaluationContext: StudyToolContext;
	let evaluationDetails: StudyToolDetails = {};
	let commitSource: 'button' | 'keyboard' = 'button';
	const track = (details: StudyToolDetails) =>
		captureStudyTool('study_tool_used', 'calculator', getTelemetryContext(), details);
	function markInput(method: 'typed' | 'keypad') {
		inputMethod = inputMethod === 'restored' || inputMethod === method ? method : 'mixed';
		userEdited = true;
	}
	function trackEvaluation(
		outcome: StudyToolDetails['outcome'],
		source: StudyToolDetails['source']
	) {
		if (userEdited) calculationTracker.record(sequence, outcome, source);
	}
	let { storageKey = 'guest', active = true }: { storageKey?: string; active?: boolean } = $props();
	let root: HTMLDivElement;
	let host: HTMLDivElement;
	let field = $state<MathfieldElement>();
	let loadError = $state('');
	let latex = $state('');
	let angle = $state<AngleMode>('deg');
	let result = $state<number | null>(null);
	let variables = $state<string[]>([]);
	let formula = $state<Formula | null>(null);
	let values = $state<Record<string, string>>({});
	let history = $state<Entry[]>([]);
	let view = $state<'keypad' | 'formulas'>('keypad');
	let copied = $state<string | null>(null);
	let renderMath = $state<(latex: string) => string>();
	let restored = $state(false);
	let worker: Worker | undefined;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let sequence = 0;
	let fresh = false;
	let commitWhenReady = false;
	const format = (value: number) => Number(value.toPrecision(10)).toString();
	const stateKey = $derived(`lt:calculator:state:${storageKey}`);
	const unit = $derived(formula?.unit ?? '');
	const display = $derived(formula ? fillFormula(formula.latex, values) : latex);

	// A selected formula stays the source of truth; the field shows it filled in as values are typed.
	$effect(() => {
		if (field && formula && field.value !== display)
			field.setValue(display, { silenceNotifications: true });
	});

	function restore() {
		try {
			const saved = JSON.parse(localStorage.getItem(stateKey) ?? '{}');
			if (saved.angle === 'deg' || saved.angle === 'rad') angle = saved.angle;
			if (typeof saved.latex === 'string') latex = saved.latex.slice(0, 1000);
			formula = FORMULAS.find((f) => f.id === saved.formulaId) ?? null;
			if (saved.values && typeof saved.values === 'object')
				values = Object.fromEntries(
					Object.entries(saved.values).filter(
						([symbol, value]) => /^[a-zA-Z]$/.test(symbol) && typeof value === 'string'
					)
				) as Record<string, string>;
			if (Array.isArray(saved.history))
				history = saved.history
					.filter(
						(entry: Entry) =>
							entry &&
							typeof entry.latex === 'string' &&
							Number.isFinite(entry.value) &&
							Number.isFinite(entry.id)
					)
					.slice(0, 30);
			sequence = Math.max(0, ...history.map((entry) => entry.id));
		} catch {
			/* Start fresh. */
		}
	}

	$effect(() => {
		const snapshot = JSON.stringify({
			latex,
			angle,
			formulaId: formula?.id,
			values,
			history
		});
		if (!restored) return;
		try {
			localStorage.setItem(stateKey, snapshot);
		} catch {
			/* Storage is optional. */
		}
	});

	onMount(() => {
		let disposed = false;
		restore();
		void import('mathlive')
			.then(({ MathfieldElement, convertLatexToMarkup }) => {
				if (disposed) return;
				MathfieldElement.fontsDirectory = `${base}/mathlive/fonts`;
				MathfieldElement.soundsDirectory = null;
				const mf = new MathfieldElement();
				mf.mathVirtualKeyboardPolicy = 'manual';
				mf.smartFence = true;
				mf.setAttribute('aria-label', 'Expression');
				mf.setAttribute('placeholder', '0');
				mf.addEventListener('input', () => {
					if (!keypadEditing) markInput('typed');
					latex = mf.value;
					formula = null;
					run();
				});
				mf.addEventListener('keydown', (event) => {
					if (event.key === 'Enter') {
						event.preventDefault();
						commit('keyboard');
					}
				});
				// eslint-disable-next-line svelte/no-dom-manipulating -- mounts the MathLive field imperatively
				host.append(mf);
				mf.menuItems = [];
				mf.setValue(latex, { silenceNotifications: true });
				field = mf;
				renderMath = (value) => convertLatexToMarkup(value);
				restored = true;
				run();
			})
			.catch(() => {
				track({ action: 'load', outcome: 'error' });
				loadError = 'Could not load the calculator. Reload the page to try again.';
			});
		return () => {
			disposed = true;
			clearTimeout(timer);
			clearTimeout(evaluationTimer);
			worker?.terminate();
			field?.remove();
		};
	});

	function reset() {
		clearTimeout(timer);
		worker?.terminate();
		worker = undefined;
		result = null;
	}

	function inputs() {
		const numbers: Record<string, number> = {};
		for (const [symbol, value] of Object.entries(values))
			if (value.trim() !== '') numbers[symbol] = Number(value);
		return numbers;
	}

	// Evaluates on every edit; only the response for the latest input is kept.
	function run() {
		const id = ++sequence;
		clearTimeout(evaluationTimer);
		evaluationContext = { ...getTelemetryContext() };
		evaluationDetails = { input_method: inputMethod, formula_id: formula?.id, angle_mode: angle };
		calculationTracker.start(id, evaluationContext, evaluationDetails);
		fresh = false;
		clearTimeout(timer);
		if (!latex.trim()) {
			result = null;
			variables = [];
			fresh = true;
			commitWhenReady = false;
			return;
		}
		if (!worker) {
			worker = new Worker(new URL('../../calculator/calculator.worker.ts', import.meta.url), {
				type: 'module'
			});
			worker.onerror = () => {
				trackEvaluation('error', 'automatic');
				reset();
			};
			worker.onmessage = ({ data }) => {
				if (data.id !== sequence) return;
				clearTimeout(timer);
				fresh = true;
				if (data.result) variables = data.result.variables;
				result = data.error || !Number.isFinite(data.result.value) ? null : data.result.value;
				if (commitWhenReady) commit(commitSource);
				else if (result !== null && userEdited) {
					// Count settled live results, not every keystroke or restored history.
					const evaluated = sequence;
					evaluationTimer = setTimeout(() => {
						if (evaluated === sequence) trackEvaluation('success', 'automatic');
					}, 900);
				}
			};
		}
		timer = setTimeout(() => {
			trackEvaluation('timeout', 'automatic');
			reset();
		}, 5000);
		worker.postMessage({ id, latex, angle, variables: inputs() });
	}

	function commit(source: 'button' | 'keyboard' = 'button') {
		commitSource = source;
		if (!latex.trim()) return;
		userEdited = true;
		if (!fresh) {
			commitWhenReady = true;
			return;
		}
		commitWhenReady = false;
		trackEvaluation(result === null ? 'invalid' : 'success', source);
		if (result === null) return;
		const top = history[0];
		if (top?.latex === latex && top.value === result) return;
		history = [
			{
				id: sequence,
				latex,
				value: result,
				unit: unit || undefined,
				formulaId: formula?.id,
				values: variables.length ? { ...values } : undefined
			},
			...history
		].slice(0, 30);
	}

	function focusField() {
		if (matchMedia('(pointer: fine)').matches) field?.focus();
	}
	$effect(() => {
		if (active && field) focusField();
	});
	function setExpression(
		value: string,
		next: Formula | null = null,
		nextValues = {},
		fromHistory = false
	) {
		inputMethod = fromHistory ? 'history' : next ? 'formula' : 'restored';
		userEdited = value.length > 0;
		track({
			action: fromHistory ? 'history_reused' : next ? 'formula_selected' : 'cleared',
			formula_id: next?.id
		});
		field?.setValue(value, { silenceNotifications: true });
		latex = value;
		formula = next;
		values = nextValues;
		run();
		if (next && next.variables.length) {
			view = 'keypad';
			requestAnimationFrame(() => root.querySelector<HTMLInputElement>('input')?.focus());
		} else focusField();
	}
	function insert(value: string) {
		if (!field) return;
		markInput('keypad');
		field.insert(value, { focus: true, silenceNotifications: true });
		latex = field.value;
		formula = null;
		run();
	}
	function backspace() {
		markInput('keypad');
		keypadEditing = true;
		try {
			field?.executeCommand('deleteBackward');
		} finally {
			keypadEditing = false;
		}
		latex = field?.value ?? '';
		formula = null;
		run();
		focusField();
	}
	function toggleAngle() {
		angle = angle === 'deg' ? 'rad' : 'deg';
		userEdited = true;
		track({ action: 'angle_changed', angle_mode: angle });
		run();
	}
	async function copy(value: number, key: string) {
		const context = { ...getTelemetryContext() };
		try {
			await navigator.clipboard.writeText(format(value));
			copied = key;
			captureStudyTool('study_tool_used', 'calculator', context, {
				action: 'result_copied',
				outcome: 'success',
				source: 'button'
			});
			setTimeout(() => {
				if (copied === key) copied = null;
			}, 1200);
		} catch {
			/* Clipboard unavailable. */
		}
	}

	// Keeps the caret in the expression when clicking anywhere else in the calculator.
	function keepFocus(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (target.closest('input, math-field, a')) return;
		event.preventDefault();
		if (document.activeElement?.tagName !== 'INPUT') focusField();
	}
	// The whole display is the input: clicks on its empty space type at the end of the expression.
	function focusDisplay(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (target.closest('button, math-field') || !field) return;
		event.preventDefault();
		field.focus();
		field.position = field.lastOffset;
	}

	const functions = [
		['sin', '\\sin\\left(#@\\right)'],
		['cos', '\\cos\\left(#@\\right)'],
		['tan', '\\tan\\left(#@\\right)'],
		['ln', '\\ln\\left(#@\\right)'],
		['log', '\\log_{10}\\left(#@\\right)'],
		['√', '\\sqrt{#@}'],
		['x²', '#@^{2}'],
		['xʸ', '#@^{#?}'],
		['π', '\\pi']
	];
	const keys = [
		['(', '('],
		[')', ')'],
		['÷', '/'],
		['7', '7'],
		['8', '8'],
		['9', '9'],
		['×', '\\times'],
		['4', '4'],
		['5', '5'],
		['6', '6'],
		['−', '-'],
		['1', '1'],
		['2', '2'],
		['3', '3'],
		['+', '+'],
		['0', '0'],
		['.', '.']
	];
	const operators = ['÷', '×', '−', '+'];
	const keyClass = 'btn h-12 rounded-2xl border-0 shadow-none';
</script>

{#snippet copyable(
	value: number,
	key: string,
	suffix: string | undefined,
	size: string,
	label: string
)}
	{@const done = copied === key}
	<span class="inline-flex shrink-0 items-baseline">
		<button
			type="button"
			class="relative cursor-pointer rounded-xl tabular-nums transition-colors duration-150 {size} {done
				? 'bg-primary/10 text-primary'
				: 'hover:bg-primary/10 hover:text-primary'}"
			aria-label="Copy {format(value)}"
			onclick={() => copy(value, key)}
		>
			{format(value)}
			{#if done}<span
					transition:fade={{ duration: 150 }}
					class="pointer-events-none absolute {label} rounded-md bg-base-100 px-1.5 text-[0.7rem] font-medium text-primary"
					>Copied</span
				>{/if}
		</button>
		{#if suffix}<span class="text-[0.6em] font-normal text-base-content/50">{suffix}</span>{/if}
	</span>
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={root}
	class="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4 ph-no-capture ph-mask"
	onmousedown={keepFocus}
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="cursor-text rounded-2xl bg-base-200/60 px-5 pt-3 pb-4" onmousedown={focusDisplay}>
		<div class="flex items-center justify-between gap-2">
			{#if formula}
				<span
					class="flex min-w-0 items-center gap-1 rounded-full bg-base-100 py-0.5 ps-3 pe-1 text-xs font-medium"
				>
					<span class="truncate">{formula.name}</span>
					<button
						type="button"
						class="btn btn-ghost btn-xs btn-circle"
						aria-label="Clear formula"
						onclick={() => setExpression('')}><X size={12} /></button
					>
				</span>
			{:else}
				<button
					type="button"
					class="btn btn-ghost btn-xs rounded-full font-medium text-base-content/60"
					aria-pressed={view === 'formulas'}
					onclick={() => {
						view = view === 'formulas' ? 'keypad' : 'formulas';
						if (view === 'formulas') track({ action: 'formulas_opened' });
					}}>Formulas</button
				>
			{/if}
			<button
				type="button"
				class="btn btn-ghost btn-xs rounded-full font-semibold tracking-wide text-base-content/50"
				aria-label="Angle mode: {angle === 'deg' ? 'degrees' : 'radians'}"
				onclick={toggleAngle}>{angle.toUpperCase()}</button
			>
		</div>
		<div bind:this={host} class="math-input flex min-h-20 items-end overflow-x-auto py-2"></div>
		{#if result === null}
			<div class="min-h-11"></div>
		{:else}
			<div class="flex min-h-11 items-center justify-end gap-1 text-3xl break-all font-semibold">
				<span class="text-base-content/35">=</span>
				{@render copyable(
					result,
					'current',
					unit,
					unit ? 'px-2 py-0.5' : '-me-2 px-2 py-0.5',
					'-top-5 right-1'
				)}
			</div>
		{/if}
		<span class="sr-only" aria-live="polite">{result === null ? '' : format(result)}</span>
	</div>
	{#if loadError}<p role="alert" class="text-sm text-error">{loadError}</p>{/if}

	{#if variables.length}
		<div class="grid grid-cols-2 gap-3">
			{#each variables as symbol (symbol)}
				{@const meta = formula?.variables.find((v) => v.symbol === symbol)}
				<label class="grid gap-1 text-xs font-medium text-base-content/60">
					<span>{meta?.label ?? symbol}{meta?.unit ? ` (${meta.unit})` : ''}</span>
					<input
						class="input w-full rounded-xl text-base tabular-nums"
						type="number"
						step="any"
						min={meta?.min}
						placeholder={symbol}
						value={values[symbol] ?? ''}
						oninput={(event) => {
							userEdited = true;
							if (!formula) markInput('typed');
							values[symbol] = event.currentTarget.value;
							run();
						}}
						onkeydown={(event) => {
							if (event.key === 'Enter') {
								event.preventDefault();
								commit('keyboard');
							}
						}}
					/>
				</label>
			{/each}
		</div>
	{/if}

	{#if view === 'formulas'}
		<div class="flex min-h-0 flex-1 flex-col">
			<button
				type="button"
				class="btn btn-ghost btn-xs mb-1 self-start rounded-full text-base-content/60"
				onclick={() => (view = 'keypad')}><ChevronLeft size={14} />Keypad</button
			>
			<ul class="-mx-1 min-h-0 flex-1 overflow-y-auto">
				{#each FORMULAS as item (item.id)}
					<li>
						<button
							type="button"
							class="w-full rounded-xl px-3 py-2.5 text-left hover:bg-base-200/60"
							onclick={() => setExpression(item.latex, item)}
						>
							<span class="block text-sm font-medium">{item.name}</span>
							<!-- eslint-disable svelte/no-at-html-tags -->
							<span class="block overflow-x-auto text-sm text-base-content/60"
								>{#if renderMath}{@html renderMath(item.latex)}{/if}</span
							>
							<!-- eslint-enable svelte/no-at-html-tags -->
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{:else}
		<fieldset disabled={!field} class="grid gap-3">
			<div class="grid grid-cols-5 gap-1">
				{#each functions as [label, value] (label)}<button
						type="button"
						class="btn btn-ghost btn-sm rounded-full px-0 font-normal text-base-content/70"
						onclick={() => insert(value)}>{label}</button
					>{/each}
				<button
					type="button"
					class="btn btn-ghost btn-sm rounded-full px-0 font-normal text-base-content/70"
					disabled={!history.length}
					onclick={() => insert(`(${numberToLatex(history[0].value)})`)}>Ans</button
				>
			</div>
			<div class="grid grid-cols-4 gap-1.5">
				<button
					type="button"
					class="{keyClass} bg-base-200/60 text-base font-medium text-error hover:bg-base-300"
					onclick={() => setExpression('')}>AC</button
				>
				{#each keys as [label, value] (label)}<button
						type="button"
						class="{keyClass} text-lg font-medium {operators.includes(label)
							? 'btn-soft btn-primary'
							: 'bg-base-200/60 hover:bg-base-300'}"
						onclick={() => insert(value)}>{label}</button
					>{/each}
				<button
					type="button"
					class="{keyClass} bg-base-200/60 hover:bg-base-300"
					aria-label="Backspace"
					onclick={backspace}><Delete size={20} /></button
				>
				<button
					type="button"
					class="{keyClass} btn-primary text-xl"
					aria-label="Calculate"
					onclick={() => commit('button')}>=</button
				>
			</div>
		</fieldset>

		{#if history.length}
			<div class="flex min-h-0 flex-1 flex-col border-t border-base-300 pt-3">
				<div class="flex items-center justify-between px-1 pb-1">
					<h3 class="text-xs font-semibold text-base-content/50">History</h3>
					<button
						type="button"
						class="btn btn-ghost btn-xs rounded-full text-base-content/50"
						onclick={() => {
							history = [];
							track({ action: 'history_cleared' });
						}}>Clear</button
					>
				</div>
				<ul class="-mx-1 min-h-0 flex-1 overflow-y-auto">
					{#each history as entry (entry.id)}
						<li class="flex items-center gap-2 px-1">
							<!-- eslint-disable svelte/no-at-html-tags -->
							<button
								type="button"
								class="min-w-0 flex-1 truncate py-2 ps-2 text-left text-sm text-base-content/55 transition-colors hover:text-base-content"
								aria-label="Reuse expression"
								onclick={() =>
									setExpression(
										entry.latex,
										FORMULAS.find((f) => f.id === entry.formulaId) ?? null,
										entry.values ?? {},
										true
									)}
								>{#if renderMath}{@html renderMath(
										entry.formulaId && entry.values
											? fillFormula(entry.latex, entry.values)
											: entry.latex
									)}{/if}</button
							>
							<!-- eslint-enable svelte/no-at-html-tags -->
							{@render copyable(
								entry.value,
								`history-${entry.id}`,
								entry.unit,
								'px-2 py-1 font-semibold',
								'right-full top-1/2 me-1 -translate-y-1/2'
							)}
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	{/if}
</div>

<style>
	.math-input :global(math-field) {
		width: 100%;
		border: 0;
		background: transparent;
		color: inherit;
		font-size: 1.75rem;
		outline: none;
		--caret-color: var(--color-primary);
		--selection-background-color: color-mix(in oklab, var(--color-primary) 20%, transparent);
		--placeholder-color: color-mix(in oklab, currentColor 25%, transparent);
	}
	.math-input :global(math-field::part(virtual-keyboard-toggle)),
	.math-input :global(math-field::part(menu-toggle)) {
		display: none;
	}
</style>

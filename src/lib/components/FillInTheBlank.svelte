<script lang="ts">
	import { Eye } from 'lucide-svelte';
	import { tick } from 'svelte';
	type Option = { id: string; text: string };
	let { qs = $bindable(), currentlySelected } = $props();
	let inputText: string = $state('');
	let inputEl: HTMLInputElement | null = null;

	const correctRaw = $derived(() => {
		const first = (currentlySelected?.correctAnswers && currentlySelected.correctAnswers[0]) || '';
		const opts = (currentlySelected?.options || []) as Option[];
		const fromOption = opts.find((o) => o.id === first)?.text;
		return String(fromOption ?? first ?? '');
	});

	const displayAnswer = $derived(() => {
		const raw = correctRaw();
		const [before] = String(raw || '').split(' | flags=');
		const firstColon = before.indexOf(':');
		if (firstColon > -1) {
			const maybe = before.slice(0, firstColon);
			if (['exact', 'exact_cs', 'contains', 'regex'].includes(maybe)) {
				return before.slice(firstColon + 1);
			}
		}
		return before;
	});

	function normalizeAnswer(text: string): string {
		return (text || '')
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9\s]/g, '')
			.replace(/\s+/g, ' ')
			.trim();
	}

	function hasExplanation(expl: unknown): boolean {
		if (typeof expl !== 'string') return false;
		const t = expl.trim().toLowerCase();
		if (t.length === 0) return false;
		if (t === 'undefined' || t === 'null') return false;
		return true;
	}

	$effect(() => {
		inputText = qs.selectedAnswers && qs.selectedAnswers[0] ? qs.selectedAnswers[0] : '';
		tick().then(() => inputEl?.focus());
	});


	function handleEnter() {
		qs.checkFillInTheBlank(inputText ?? '', currentlySelected);
	}

	function handleToggleSolution() {
		qs.handleSolution();
	}
</script>

<div class="flex flex-col items-center p-4 w-full">
	<p class="text-center text-base sm:text-lg mb-2">{currentlySelected.stem}</p>
	<div class="flex items-center mt-4 mb-6">
		<input
			type="text"
			placeholder="Type here"
			class="input input-bordered w-64 sm:w-72"
			value={inputText}
			oninput={(e) => {
				inputText = (e.target as HTMLInputElement).value;
			}}
			onkeydown={(e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					handleEnter();
				}
			}}
			disabled={qs.showSolution}
			bind:this={inputEl}
		/>
		<button
			class="btn btn-primary ms-2"
			onclick={handleEnter}
			disabled={qs.showSolution || !inputText.trim()}>Enter</button
		>
	</div>

	<div class="card bg-base-100 w-72 sm:w-80 shadow-md mt-6 border border-base-content/10">
		<div class="card-body">
			<h3 class="text-lg font-semibold mb-8 {qs.showSolution ? '' : 'blur'}">{displayAnswer()}</h3>
			<button class="btn" onclick={handleToggleSolution} aria-label="toggle solution">
				<Eye />
			</button>
		</div>
	</div>

	<p class="text-sm text-base-content/70 mt-6">Press tab to reveal term.</p>
</div>

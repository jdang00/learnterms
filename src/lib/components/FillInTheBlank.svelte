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

	function decodeFitb(text: string): string {
		const [before] = String(text || '').split(' | flags=');
		const firstColon = before.indexOf(':');
		if (firstColon > -1) {
			const maybe = before.slice(0, firstColon);
			if (['exact', 'exact_cs', 'contains', 'regex'].includes(maybe)) {
				return before.slice(firstColon + 1);
			}
		}
		return before;
	}

	const alternateAnswers = $derived(() => {
		const answers = (currentlySelected?.correctAnswers || []) as Array<string>;
		const opts = (currentlySelected?.options || []) as Option[];
		const texts: string[] = answers.map((a) => {
			const fromOption = opts.find((o) => o.id === a)?.text;
			return String(fromOption ?? a ?? '');
		});
		const decoded = texts.map((t) => decodeFitb(t)).filter((t) => t.length > 0);
		if (decoded.length <= 1) return [] as string[];
		return decoded.slice(1);
	});

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
	<div class="text-base sm:text-lg mb-4 text-left font-medium tiptap-content whitespace-pre-line">
		{@html currentlySelected.stem}
	</div>
	<div class="flex items-center mt-4 mb-6">
		<input
			type="text"
			placeholder="Type here"
			class="input input-bordered w-64 sm:w-72 rounded-full"
			value={inputText}
			oninput={(e) => {
				inputText = (e.target as HTMLInputElement).value;
				qs.selectedAnswers = inputText ? [inputText] : [];
				if (qs.selectedAnswers.length > 0) {
					qs.markCurrentQuestionInteracted?.();
				}
			}}
			onkeydown={(e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					handleEnter();
				} else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
					e.stopPropagation();
				}
			}}
			disabled={qs.showSolution}
			bind:this={inputEl}
		/>
		<button
			class="btn btn-primary ms-2 rounded-full"
			onclick={handleEnter}
			disabled={qs.showSolution || !inputText.trim()}>Enter</button
		>
	</div>

	<div class="card bg-base-100 w-72 sm:w-80 shadow-md mt-6 border border-base-content/10 rounded-2xl">
		<div class="card-body">
			<h3 class="text-lg font-semibold mb-2 {qs.showSolution ? '' : 'blur'}">{displayAnswer()}</h3>
			{#if qs.showSolution && alternateAnswers().length > 0}
				<div class="mt-2">
					<p class="text-sm opacity-70">Alternate answers:</p>
					<ul class="mt-1 list-disc list-inside text-sm opacity-80">
						{#each alternateAnswers() as a, i (i)}
							<li>{a}</li>
						{/each}
					</ul>
				</div>
			{/if}
			<button class="btn rounded-full" onclick={handleToggleSolution} aria-label="toggle rationale">
				<Eye />
			</button>
		</div>
	</div>

	<p class="text-sm text-base-content/70 mt-6">Press tab to reveal term.</p>
</div>

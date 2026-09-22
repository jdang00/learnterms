<script lang="ts">
	import { Calculator } from 'lucide-svelte';
	import { untrack } from 'svelte';
	import { getQuizCommands } from '$lib/components/quiz-dock/commands.svelte';
	import SidePanel from '$lib/components/side-panel/SidePanel.svelte';
	import { sidePanel } from '$lib/components/side-panel/state.svelte';
	import type CalculatorPanelType from './CalculatorPanel.svelte';
	let { storageKey = 'guest' }: { storageKey?: string } = $props();
	const registry = getQuizCommands();
	let Panel = $state<typeof CalculatorPanelType>();
	let error = $state('');

	$effect(() => {
		if (sidePanel.current !== 'calculator' || Panel) return;
		import('./CalculatorPanel.svelte')
			.then((module) => (Panel = module.default))
			.catch(() => (error = 'Could not load the calculator.'));
	});
	$effect(() =>
		untrack(() =>
			registry?.register({
				id: 'calculator',
				name: 'Calculator',
				description: 'Scientific calculator',
				scope: 'question',
				icon: Calculator,
				tone: 'info',
				look: { variant: 'ghost', tone: 'info' },
				label: () => 'Calculator',
				active: () => sidePanel.current === 'calculator',
				run: () => sidePanel.toggle('calculator')
			})
		)
	);
</script>

<SidePanel id="calculator" title="Calculator" icon={Calculator}>
	{#if Panel}<Panel {storageKey} active={sidePanel.current === 'calculator'} />{:else if error}<p
			role="alert"
			class="px-5 text-sm text-error"
		>
			{error}
		</p>{/if}
</SidePanel>

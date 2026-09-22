<script lang="ts">
	import { onMount } from 'svelte';
	import { provideStudyToolContext } from '$lib/analytics/studyToolContext';
	import { captureStudyTool } from '$lib/analytics/studyTools';
	provideStudyToolContext(() => ({ surface: 'standalone_calculator' }));
	onMount(() =>
		captureStudyTool(
			'study_tool_opened',
			'calculator',
			{
				surface: 'standalone_calculator',
				pathname: window.location.pathname
			},
			{ source: 'standalone' }
		)
	);
	import CalculatorPanel from '$lib/components/calculator/CalculatorPanel.svelte';
	import { useClerkContext } from 'svelte-clerk/client';
	const clerk = useClerkContext();
</script>

<svelte:head
	><title>Calculator — LearnTerms</title><meta
		name="description"
		content="Scientific calculator with keyboard entry and click-to-copy results."
	/></svelte:head
>
<main class="mx-auto w-full max-w-sm p-4 sm:p-6">
	<h1 class="text-2xl font-semibold mb-5">Calculator</h1>
	<div class="flex flex-col rounded-3xl border border-base-300 pt-4">
		{#key clerk.user?.id}<CalculatorPanel storageKey={clerk.user?.id ?? 'guest'} />{/key}
	</div>
</main>

<script lang="ts">
	import Actions from './overview/Actions.svelte';
	import DataDisplay from './overview/DataDisplay.svelte';
	import Feedback from './overview/Feedback.svelte';
	import Foundations from './overview/Foundations.svelte';
	import Inputs from './overview/Inputs.svelte';
	import Overlays from './overview/Overlays.svelte';
	import Study from './overview/Study.svelte';
</script>

<div class="space-y-16">
	<header>
		<h1 class="title-hero">LearnTerms design system</h1>
		<p class="mt-2 max-w-2xl text-muted-foreground">
			Every component here is the one the app ships, on fixture data. Primitives live in
			<code class="font-mono text-sm">#lib/components/ui</code>; each card names its source.
		</p>
	</header>

	<Foundations />
	<Actions />
	<Inputs />
	<Overlays />
	<Feedback />
	<DataDisplay />
	<Study />
</div>

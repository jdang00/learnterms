<script lang="ts">
	import Quiz from './quiz/quiz.svelte';

	let { data } = $props();
</script>

<div class="flex flex-col space-y-2 items-center">
	<Quiz {data} />
</div>

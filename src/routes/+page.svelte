<script lang="ts">
	import Quiz from './quiz/quiz.svelte';

	export let data;
</script>

/**/ Hello mom /**/
<div class="flex flex-col space-y-2 items-center">
	<Quiz {data} />
</div>

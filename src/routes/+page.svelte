<script lang="ts">
	let input: string = '';
	let answer: string = 'hepatostomy';
	let answerstatus: boolean = false;

	function checkAnswer(): boolean {
		if (input === answer) {
			answerstatus = true;
			return true;
		} else {
			answerstatus = false;

			return false;
		}
	}
</script>

<div class="flex items-center justify between w-full flex-col p-8 min-h-screen">
	<div class="w-full max-w-3xl">
		<h1 class="font-medium mt-3 text-3xl">Introduction to Optometry Terms</h1>
		<div class="border-b-2 border-gray-300 my-5"></div>
		<p class="mt-3 text-xl">Surgical opening of the liver</p>

		<div>
			{#if answerstatus === true}
				<input
					type="text"
					placeholder="Type here"
					class="input input-bordered w-full max-w-xs mt-5"
					bind:value={input}
				/>
			{:else}
				<input
					type="text"
					placeholder="Type here"
					class="input input-bordered input-error w-full max-w-xs mt-5"
					bind:value={input}
				/>
			{/if}
			<button class="btn btn-primary" on:click={() => checkAnswer()}>Enter</button>
		</div>
	</div>
</div>

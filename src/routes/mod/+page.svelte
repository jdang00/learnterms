<script lang="ts">
	let answer_choices: string[] = [
		'Natural penicillin',
		'Semi-synthetic penicillins',
		'Macrolides',
		'Tetracyclines'
	];
</script>

<div class="container mx-auto px-4 max-w-2xl flex flex-col items-center p-4 sm:p-8">
	<div class="w-full">
		Which of the following antibiotics are used for syphilis treatment?
		<div class="flex flex-col justify-start mt-4 space-y-4">
			{#each answer_choices as choice}
				<label class="label cursor-pointer bg-base-200 rounded-full flex items-center">
					<span class="flex-grow ml-8 my-2">
						{choice}
					</span>
					<div class="flex items-center justify-center w-16 mr-4">
						<input type="checkbox" class="checkbox checkbox-primary" />
					</div>
				</label>
			{/each}
		</div>
		<div class="flex flex-row mt-4 flex-wrap gap-x-4 justify-center">
			<button class="btn rounded-full">Clear</button>
			<button class="btn btn-primary rounded-full">Submit</button>
		</div>
	</div>
</div>

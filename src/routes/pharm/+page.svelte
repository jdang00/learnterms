<script lang="ts">
	import { ArrowRight } from 'lucide-svelte';
	let modules: String[] = ['Introduction', 'Anti-Infectives', 'Test', 'Test2'];
	let desc: String[] = [
		'An introduction to all things pharm.',
		'Fighting infections with anti-infectives.',
		'Testy test',
		'Testy-test 2'
	];
	let prog: String[] = ['70', '30', '0', '90'];
</script>

<div class="container mx-auto px-4 max-w-4xl p-4 sm:p-8">
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		{#each modules as mods, index}
			<div class="card bg-neutral text-neutral-content">
				<div class="card-body">
					<h2 class="card-title">{mods}</h2>
					<p>{desc[index]}</p>

					<div class="flex flex-row justify-between mt-4">
						<div class="flex flex-row self-center gap-4">
							<div
								class="radial-progress self-center text-success"
								style="--value:{prog[index]}; --size:2rem;"
								role="progressbar"
							></div>
							<div class="self-center">
								{prog[index]}% done.
							</div>
						</div>

						<div class="card-actions justify-end">
							<a class="btn" href="pharm/chapter/{index + 1}">
								{#if Number(prog[index]) === 0}Start{:else}Resume{/if}
								<ArrowRight />
							</a>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>

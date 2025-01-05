<script lang="ts">
	import { ArrowLeft, Eye, Flag } from 'lucide-svelte';
</script>

<div class="hidden lg:block size-2/5 lg:border-r border-base-300">
	<button class="btn btn-ghost mt-4 ms-2"> <ArrowLeft />Back</button>

	<div class="mx-8 mt-4">
		<p class="font-bold text-sm tracking-wide text-secondary mb-2">CHAPTER 2</p>
		<h1 class="text-3xl font-bold">Anti-Infectives</h1>
		<p class="text-base-content mt-2">
			Anti-infective medications, including antibiotics, antifungals, antivirals, and
			antiparasitics.
		</p>

		<div class="card bg-base-100 shadow-xl mt-12">
			<div class="card-body">
				<div class="flex flex-row justify-between border-b pb-2">
					<h2 class="card-title">Solution</h2>
					<button class="btn btn-ghost"><Eye /></button>
				</div>

				<p class="blur mt-2">
					Ophthalmic fluoroquinolones are used for severe infections, have increased affinity for
					topoisomerase IV, and are safe for children.
				</p>
			</div>
		</div>
	</div>
</div>

<div class="container mx-auto lg:w-3/5 flex flex-col items-center">
	<div class="lg:hidden flex flex-row mt-2 items-center justify-between">
		<div class="flex-shrink-0 w-24"></div>
	</div>
	<div class="flex flex-row w-full lg:mt-6 mt-4 overflow-y-scroll">
		<div class="indicator">
			<button class="btn btn-circle btn-primary mx-2">1</button>
			{#each Array(18) as _, i}
				<button class="btn btn-circle btn-soft mx-2">{i + 2}</button>
			{/each}
		</div>
	</div>

	<div class="border-t border-base-300 w-full my-6"></div>

	<div class=" mb-8 mt-2">
		<div class="mx-6 sm:mx-8">
			<div class="font-bold text-lg mb-4">
				Which of the following are true about ophthalmic fluoroquinolones?
			</div>

			<div class="flex flex-col justify-start mt-4 space-y-4">
				<label class="label cursor-pointer bg-base-200 rounded-full flex items-center">
					<span class="flex-grow ml-8 my-4">A. They are used for severe infections</span>
					<div class="flex items-center justify-center w-16 mr-4">
						<input type="checkbox" class="checkbox checkbox-primary" />
					</div>
				</label>
				<label class="label cursor-pointer bg-base-200 rounded-full flex items-center">
					<span class="flex-grow ml-8 my-2"
						>B. They have increased affinity for topoisomerase IV</span
					>
					<div class="flex items-center justify-center w-16 mr-4">
						<input type="checkbox" class="checkbox checkbox-primary" />
					</div>
				</label>
				<label class="label cursor-pointer bg-base-200 rounded-full flex items-center">
					<span class="flex-grow ml-8 my-2">C. They are used for viral infections</span>
					<div class="flex items-center justify-center w-16 mr-4">
						<input type="checkbox" class="checkbox checkbox-primary" />
					</div>
				</label>
				<label class="label cursor-pointer bg-base-200 rounded-full flex items-center">
					<span class="flex-grow ml-8 my-2">D. They are safe for children</span>
					<div class="flex items-center justify-center w-16 mr-4">
						<input type="checkbox" class="checkbox checkbox-primary" />
					</div>
				</label>
				<label class="label cursor-pointer bg-base-200 rounded-full flex items-center">
					<span class="flex-grow ml-8 my-2">E. They are used for fungal infections</span>
					<div class="flex items-center justify-center w-16 mr-4">
						<input type="checkbox" class="checkbox checkbox-primary" />
					</div>
				</label>
			</div>
		</div>
		<div class="flex flex-row justify-center mt-8 gap-4">
			<button class="btn btn-outline">Clear</button>

			<button class="btn btn-outline btn-success">Check</button>
			<button class="btn btn-warning btn-outline">
				<Flag />
			</button>
		</div>
	</div>
</div>

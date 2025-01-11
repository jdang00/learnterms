<script lang="ts">
	import {
		Eye,
		ChevronLeft,
		ChevronRight,
		Shuffle,
		RefreshCw,
		BookOpen,
		Star
	} from 'lucide-svelte';

	let showAnswer = false;

	function toggleAnswer() {
		showAnswer = !showAnswer;
	}
</script>

<div class="my-5"></div>

<div class="flex flex-col items-center p-8">
	<p class="mt-3 text-xl">Inflammation of the eyelids</p>

	<div class="flex items-center">
		<input type="text" placeholder="Type here" class="input input-bordered w-full max-w-xs mt-5" />
		<button class="btn btn-primary ms-3 mt-5">Enter</button>
	</div>
</div>

<div class="flex flex-col justify-center items-center mt-5 space-y-8 space-x-4">
	<div class="card bg-base-100 w-72 shadow-md mt-6">
		<div class="card-body">
			<div class="flex flex-row justify-between mb-8 mt-4">
				<div class="flex">
					<h2 class="card-title {showAnswer ? '' : 'blur'}">Blepharitis</h2>
				</div>
				<button class="btn btn-ghost">
					<Star class="stroke-current" />
				</button>
			</div>
			<button class="btn" onclick={toggleAnswer}><Eye /></button>
		</div>
	</div>

	<div class="flex space-x-4">
		<button class="btn" aria-label="left">
			<ChevronLeft />
		</button>
		<button class="btn" aria-label="right">
			<ChevronRight />
		</button>
	</div>

	<div class="text-center">
		<p class="text-base-content/70">Press tab to reveal term.</p>
		<progress class="progress progress-success w-72" value="50" max="100"></progress>
	</div>
</div>

<div class="mt-5 text-center">
	<p>Card 50 / 100</p>
</div>

<div class="flex flex-row gap-2 justify-center flex-wrap">
	<div class="mt-3 text-center">
		<button class="btn btn-secondary">
			<Shuffle class="mr-2" />
			Shuffle
		</button>
	</div>

	<div class="flex flex-wrap gap-2 justify-center">
		<button class="btn mt-3">
			<RefreshCw class="mr-2" />
			Reset
		</button>
		<button class="btn mt-3">
			<BookOpen />
			Quiz Starred
		</button>
	</div>
</div>

<script>
	import { ArrowRightIcon } from 'lucide-svelte';
</script>

<main class="max-w-5xl mx-auto px-10 mt-12">
	<!-- Dashboard Header -->
	<h1 class="mb-8 text-4xl font-semibold">Admin</h1>

	<!-- Admin Controls as DaisyUI Cards -->
	<div class="grid grid-cols-1 gap-6">
		<a
			href="/admin/questions"
			class="card bg-base-100 shadow-xl cursor-pointer hover:shadow-2xl transition-shadow duration-200 hover:text-primary"
		>
			<div class="card-body flex flex-row justify-between">
				<div>
					<h2 class="card-title">✏️ Manage Questions</h2>
					<p>Edit and organize quiz questions.</p>
				</div>
				<button class="btn btn-primary rounded-full self-center"><ArrowRightIcon /></button>
			</div>
		</a>

		<a
			href="/admin/challenge"
			class="card bg-base-100 shadow-xl cursor-pointer hover:shadow-2xl transition-shadow duration-200 hover:text-primary"
		>
			<div class="card-body flex flex-row justify-between">
				<div>
					<h2 class="card-title">🧠 Manage Challenge Questions</h2>
					<p>Create, edit, and organize challenge questions.</p>
				</div>
				<button class="btn btn-primary rounded-full self-center"><ArrowRightIcon /></button>
			</div>
		</a>

		<a
			href="/admin/progress"
			class="card bg-base-100 shadow-xl cursor-pointer hover:shadow-2xl transition-shadow duration-200 hover:text-primary"
		>
			<div class="card-body flex flex-row justify-between">
				<div>
					<h2 class="card-title">⏰ Track User Progress</h2>
					<p>View and analyze student progress through course materials and quizzes.</p>
				</div>
				<button class="btn btn-primary rounded-full self-center"><ArrowRightIcon /></button>
			</div>
		</a>
	</div>
</main>

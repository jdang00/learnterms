<script lang="ts">
	import { Plus, Trash2 } from 'lucide-svelte';

	type GradeEntry = {
		score: number | null;
		total: number | null;
	};

	type QuizEntry = GradeEntry & { id: number };

	// --- Base State ---
	let lectureExam1 = $state<GradeEntry>({ score: null, total: 100 });
	let lectureExam2 = $state<GradeEntry>({ score: null, total: 100 });
	let labExam1 = $state<GradeEntry>({ score: null, total: 100 });
	let labExam2 = $state<GradeEntry>({ score: null, total: 100 });
	let finalExam = $state<GradeEntry>({ score: null, total: 100 });
	let quizzes = $state<QuizEntry[]>([{ id: Date.now(), score: null, total: 20 }]);

	// --- State to hold calculated results ---
	let report = $state({
		finalPercentage: 0,
		letterGrade: 'N/A', // Start with N/A or similar
		quizTotalScore: 0,
		quizTotalPossible: 0,
		quizPercentage: 0,
		quizValidEntries: 0
	});

	// --- Helper Functions ---
	function calculatePercentage(score: number | null, total: number | null): number {
		if (score === null || total === null || total <= 0 || score < 0 || score > total) {
			return 0;
		}
		return (score / total) * 100;
	}

	function addQuiz() {
		quizzes = [...quizzes, { id: Date.now(), score: null, total: 20 }];
	}

	function removeQuiz(idToRemove: number) {
		quizzes = quizzes.filter((q) => q.id !== idToRemove);
	}

	// --- Calculation Function ---
	function calculateGradeReport() {
		// Calculate component percentages directly from base state
		const lec1P = calculatePercentage(lectureExam1.score, lectureExam1.total);
		const lec2P = calculatePercentage(lectureExam2.score, lectureExam2.total);
		const lab1P = calculatePercentage(labExam1.score, labExam1.total);
		const lab2P = calculatePercentage(labExam2.score, labExam2.total);
		const finalP = calculatePercentage(finalExam.score, finalExam.total);

		// Calculate averages
		const avgLecP = (lec1P + lec2P) / 2;
		const avgLabP = (lab1P + lab2P) / 2;

		// Calculate quiz aggregates and percentage
		let qTotalScore = 0;
		let qTotalPossible = 0;
		let qValidEntries = 0;
		for (const quiz of quizzes) {
			if (
				quiz.score !== null &&
				quiz.total !== null &&
				quiz.total > 0 &&
				quiz.score >= 0 &&
				quiz.score <= quiz.total
			) {
				qTotalScore += quiz.score;
				qTotalPossible += quiz.total;
				qValidEntries++;
			}
		}
		const qPercentage = qTotalPossible > 0 ? (qTotalScore / qTotalPossible) * 100 : 0;

		// Calculate final percentage
		const finalPcnt = avgLecP * 0.3 + avgLabP * 0.3 + qPercentage * 0.2 + finalP * 0.2;

		// Determine letter grade
		let letter = 'F'; // Default
		if (finalPcnt >= 89.5) letter = 'A';
		else if (finalPcnt >= 79.5) letter = 'B';
		else if (finalPcnt >= 69.5) letter = 'C';

		// Check if all inputs are filled (optional, for 'N/A' state)
		const allInputsFilled =
			lectureExam1.score !== null &&
			lectureExam2.score !== null &&
			labExam1.score !== null &&
			labExam2.score !== null &&
			finalExam.score !== null &&
			quizzes.every((q) => q.score !== null); // Basic check, might need refinement

		// Update the report state object
		report.finalPercentage = finalPcnt;
		report.letterGrade = allInputsFilled ? letter : 'N/A'; // Show N/A if not all filled?
		report.quizTotalScore = qTotalScore;
		report.quizTotalPossible = qTotalPossible;
		report.quizPercentage = qPercentage;
		report.quizValidEntries = qValidEntries;
	}

	// --- Effect to trigger recalculation ---
	$effect(() => {
		// This effect will re-run whenever any state variable read
		// inside calculateGradeReport() changes.
		calculateGradeReport();
	});
</script>

<div class="container mx-auto max-w-3xl px-4 py-8">
	<h1 class="text-3xl font-bold mb-6 text-center">OA&P Grade Calculator</h1>
	<p class="text-center text-base-content/80 mb-8">
		Enter your scores to estimate your final grade based on the course policy.
	</p>

	<!-- Input Cards (remain the same) -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
		<!-- Lecture Exams Card -->
		<div class="card bg-base-100 border border-base-content/10 shadow">
			<div class="card-body">
				<h2 class="card-title">Lecture Exams (30%)</h2>
				<div class="form-control">
					<label class="label" for="lec1-score">
						<span class="label-text">Exam 1 Score / Total</span>
					</label>
					<div class="flex gap-2">
						<input
							id="lec1-score"
							type="number"
							placeholder="Score"
							class="input input-bordered w-full"
							bind:value={lectureExam1.score}
							min="0"
							max={lectureExam1.total ?? undefined}
						/>
						<input
							type="number"
							placeholder="Total"
							class="input input-bordered w-full"
							bind:value={lectureExam1.total}
							min="1"
						/>
					</div>
				</div>
				<div class="form-control">
					<label class="label" for="lec2-score">
						<span class="label-text">Exam 2 Score / Total</span>
					</label>
					<div class="flex gap-2">
						<input
							id="lec2-score"
							type="number"
							placeholder="Score"
							class="input input-bordered w-full"
							bind:value={lectureExam2.score}
							min="0"
							max={lectureExam2.total ?? undefined}
						/>
						<input
							type="number"
							placeholder="Total"
							class="input input-bordered w-full"
							bind:value={lectureExam2.total}
							min="1"
						/>
					</div>
				</div>
			</div>
		</div>
		<!-- Lab Exams Card -->
		<div class="card bg-base-100 border border-base-content/10 shadow">
			<div class="card-body">
				<h2 class="card-title">Lab Exams (30%)</h2>
				<div class="form-control">
					<label class="label" for="lab1-score">
						<span class="label-text">Exam 1 Score / Total</span>
					</label>
					<div class="flex gap-2">
						<input
							id="lab1-score"
							type="number"
							placeholder="Score"
							class="input input-bordered w-full"
							bind:value={labExam1.score}
							min="0"
							max={labExam1.total ?? undefined}
						/>
						<input
							type="number"
							placeholder="Total"
							class="input input-bordered w-full"
							bind:value={labExam1.total}
							min="1"
						/>
					</div>
				</div>
				<div class="form-control">
					<label class="label" for="lab2-score">
						<span class="label-text">Exam 2 Score / Total</span>
					</label>
					<div class="flex gap-2">
						<input
							id="lab2-score"
							type="number"
							placeholder="Score"
							class="input input-bordered w-full"
							bind:value={labExam2.score}
							min="0"
							max={labExam2.total ?? undefined}
						/>
						<input
							type="number"
							placeholder="Total"
							class="input input-bordered w-full"
							bind:value={labExam2.total}
							min="1"
						/>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Quizzes Card -->
	<div class="card bg-base-100 border border-base-content/10 shadow mb-8">
		<div class="card-body">
			<div class="flex justify-between items-center mb-4">
				<h2 class="card-title">Quizzes (20%)</h2>
				<button class="btn btn-sm btn-primary" onclick={addQuiz}>
					<Plus size={16} /> Add Quiz
				</button>
			</div>
			<div class="space-y-3 max-h-60 overflow-y-auto pr-2">
				{#if quizzes.length === 0}
					<p class="text-center text-base-content/60 italic py-4">No quizzes added yet.</p>
				{/if}
				{#each quizzes as quiz (quiz.id)}
					<div class="flex items-center gap-2">
						<span class="font-medium w-16 text-right text-sm">Quiz:</span>
						<input
							type="number"
							placeholder="Score"
							class="input input-sm input-bordered w-full"
							bind:value={quiz.score}
							min="0"
							max={quiz.total ?? undefined}
							aria-label="Quiz score"
						/>
						<span class="font-bold">/</span>
						<input
							type="number"
							placeholder="Total"
							class="input input-sm input-bordered w-full"
							bind:value={quiz.total}
							min="1"
							aria-label="Quiz total"
						/>
						<button
							class="btn btn-xs btn-ghost text-error hover:bg-error/10"
							onclick={() => removeQuiz(quiz.id)}
							aria-label="Remove quiz"
						>
							<Trash2 size={14} />
						</button>
					</div>
				{/each}
			</div>
			<!-- Update quiz summary display to use report state -->
			{#if report.quizValidEntries > 0}
				<div class="text-sm text-right mt-2 text-base-content/80">
					Quiz Total: {report.quizTotalScore} / {report.quizTotalPossible} ({report.quizPercentage.toFixed(
						2
					)}%)
				</div>
			{/if}
		</div>
	</div>

	<!-- Final Exam Card (remains the same) -->
	<div class="card bg-base-100 border border-base-content/10 shadow mb-8">
		<div class="card-body">
			<h2 class="card-title">Final Exam (20%)</h2>
			<div class="form-control">
				<label class="label" for="final-score">
					<span class="label-text">Final Exam Score / Total</span>
				</label>
				<div class="flex gap-2">
					<input
						id="final-score"
						type="number"
						placeholder="Score"
						class="input input-bordered w-full"
						bind:value={finalExam.score}
						min="0"
						max={finalExam.total ?? undefined}
					/>
					<input
						type="number"
						placeholder="Total"
						class="input input-bordered w-full"
						bind:value={finalExam.total}
						min="1"
					/>
				</div>
			</div>
		</div>
	</div>

	<!-- Results Card -->
	<div class="card bg-primary text-primary-content shadow-xl sticky bottom-4">
		<div class="card-body items-center text-center">
			<h2 class="card-title text-2xl">Estimated Final Grade</h2>
			<!-- Update results display to use report state -->
			<p class="text-5xl font-bold my-2">{report.finalPercentage.toFixed(2)}%</p>
			<p class="text-3xl font-semibold">Letter Grade: {report.letterGrade}</p>
		</div>
	</div>
</div>

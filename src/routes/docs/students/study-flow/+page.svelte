<script lang="ts">
	import { Eye, Flag, Shuffle, ArrowRight, ArrowLeft, BookOpenText, Settings, Check } from 'lucide-svelte';
</script>

<h1>Study Flow</h1>

<p>You’ll move through one question at a time, check your work, and track your progress without losing focus. This page shows you how the study screen works and what each control does.</p>

<h2>Start a module</h2>
<ol>
	<li>Open your class, then select a module.</li>
	<li>Your progress appears at the top of the sidebar (e.g., <em>13% done</em>).</li>
	<li>Each question shows a clear stem with answer options below.</li>
</ol>

<h2>Answering questions</h2>
<p>Select your answers, optionally eliminate distractors, then check your result when you’re ready.</p>

<h3>Answer options</h3>
<ul>
	<li><strong>Select</strong> with the checkbox.</li>
	<li><strong>Eliminate</strong> an option to gray it out and ignore it while thinking.</li>
	<li>After <strong>Check</strong>, correct options are highlighted for quick feedback.</li>
</ul>

<div class="card bg-base-100 border border-base-300 shadow-sm">
	<div class="card-body">
		<p class="text-sm text-base-content/70 mb-2">Example options preview</p>
		<div class="flex flex-col space-y-3">
			<label class="label cursor-pointer rounded-full border-2 p-3 bg-base-200">
				<input type="checkbox" class="checkbox checkbox-primary checkbox-sm ms-4" />
				<span class="flex-grow ml-3 my-3 text-sm">
					<span class="font-semibold mr-2 select-none">A.</span>
					Option text goes here
				</span>
				<button class="btn btn-ghost btn-circle btn-sm mr-4" title="Eliminate"><Eye size={16} /></button>
			</label>
			<label class="label cursor-pointer rounded-full border-2 p-3 bg-base-200">
				<input type="checkbox" class="checkbox checkbox-primary checkbox-sm ms-4" />
				<span class="flex-grow ml-3 my-3 text-sm line-through opacity-50">
					<span class="font-semibold mr-2 select-none">B.</span>
					This option has been eliminated
				</span>
				<button class="btn btn-ghost btn-circle btn-sm mr-4" title="Eliminate"><Eye size={16} /></button>
			</label>
		</div>
	</div>
</div>

<h3>Check and feedback</h3>
<ul>
	<li>Use <strong>Check</strong> to see immediate feedback.</li>
	<li>Use <strong>Clear</strong> to reset your selection and try again.</li>
	<li><strong>Flag</strong> to review later; flagged questions show a badge on their number.</li>
</ul>

<div class="alert alert-success rounded-full">
	<Check class="mr-2" size={18} />
	<span class="font-extrabold">Correct!</span>
</div>

<h2>Navigation & controls</h2>

<h3>Top question navigation</h3>
<p>Jump directly between questions. We save your interactions automatically.</p>

<div class="flex flex-row w-full overflow-x-auto space-x-4 border border-base-300 p-4 rounded-xl">
	<div class="indicator">
		<span class="indicator-item indicator-start badge badge-warning badge-xs translate-x-[-1/4] translate-y-[-1/4]"></span>
		<button class="btn btn-circle btn-soft btn-primary">1</button>
	</div>
	<div class="indicator">
		<button class="btn btn-circle btn-soft btn-outline">2</button>
	</div>
	<div class="indicator">
		<button class="btn btn-circle btn-soft btn-accent">3</button>
	</div>
	<div class="indicator">
		<button class="btn btn-circle btn-soft btn-outline">4</button>
	</div>
</div>

<h3>Action bar (desktop)</h3>
<p>Quick controls appear centered near the bottom on larger screens.</p>

<div class="flex flex-wrap items-center gap-2 p-3 rounded-full border border-base-300 shadow bg-base-100">
	<button class="btn btn-sm btn-outline">Clear</button>
	<button class="btn btn-sm btn-success btn-soft"><Check size={16} class="mr-1" /> Check</button>
	<button class="btn btn-sm btn-warning btn-soft" aria-label="flag question"><Flag size={16} class="mr-1" /> Flag</button>
	<button class="btn btn-sm btn-secondary"><Shuffle size={16} class="mr-1" /> Shuffle</button>
	<div class="divider divider-horizontal mx-1"></div>
	<button class="btn btn-sm btn-outline"><ArrowLeft size={16} class="mr-1" /> Prev</button>
	<button class="btn btn-sm btn-outline">Next <ArrowRight size={16} class="ml-1" /></button>
</div>

<h2>Sidebar</h2>
<p>Your sidebar keeps you oriented with module info, progress, solution reveal, and settings.</p>

<div class="card bg-base-100 border border-base-300 shadow-sm">
	<div class="card-body">
		<h4 class="text-sm tracking-wide text-secondary">MODULE 2</h4>
		<h2 class="font-semibold text-2xl mt-1 flex items-center gap-2">
			<BookOpenText size={18} class="text-primary/80" />
			<span>Pharmacology: Beta Blockers</span>
		</h2>
		<p class="text-base-content/70 mt-1">Core mechanisms, clinical use, and side effects.</p>
		<div class="mt-4">
			<p class="text-base-content/60 mb-1">13% done.</p>
			<progress class="progress progress-success w-full" value="13" max="100"></progress>
		</div>
		<div class="mt-4 flex gap-2">
			<button class="btn btn-ghost btn-sm"><Eye size={16} class="mr-1" /> Solution</button>
			<button class="btn btn-soft btn-sm"><Settings size={16} class="mr-1" /> Settings</button>
		</div>
	</div>
</div>

<h2>Why this design works for you</h2>
<ul>
	<li><strong>Focus over noise</strong>: One-question-at-a-time keeps your working memory clear so you can think, not hunt UI. This aligns with LearnTerms’ focus-first study flow.</li>
	<li><strong>Mastery feedback</strong>: Immediate <em>Check</em> results help you course-correct quickly, building mastery through tight feedback loops.</li>
	<li><strong>Personal pace</strong>: Progress, flags, and elimination tools let you tailor practice to what you need right now.</li>
	<li><strong>Exam realism</strong>: Shuffle and fast navigation simulate test conditions and reduce order-memory bias.</li>
	<li><strong>Cohort-aligned</strong>: Questions come from your class’s modules so every rep is relevant to your exams.</li>
</ul>

<h2>Tips</h2>
<ul>
	<li><strong>One-at-a-time</strong>: Focus on the current question while keeping navigation nearby.</li>
	<li><strong>Use flags</strong>: Mark tricky questions to revisit before finishing a module.</li>
	<li><strong>Shuffle</strong>: Mix the order to simulate exam conditions and reduce memorization effects.</li>
	<li><strong>Reset progress</strong>: Start fresh anytime from the sidebar reset control.</li>
</ul>

<h2>FAQ</h2>
<ul>
	<li><strong>Will I lose answers when navigating?</strong> No—your selections are saved as you go.</li>
	<li><strong>Where’s the solution?</strong> Use the Solution control in the sidebar; it reveals the explanation when available.</li>
	<li><strong>Mobile view?</strong> The layout adapts; controls stay accessible and unobtrusive.</li>
</ul>

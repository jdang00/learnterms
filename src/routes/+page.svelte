<script lang="ts">
	import {
		ArrowRight,
		Brain,
		Sigma,
		ChartScatter,
		Pencil,
		BookmarkCheck,
		GraduationCap
	} from 'lucide-svelte';
	import Mock from '$lib/components/mock.svelte';
	import Quiz from '$lib/components/quiz.svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import { onMount, onDestroy } from 'svelte';

	const schools = [
		'Welcome, UAMS College of Pharmacy!',
		'Welcome, NSU Oklahoma College of Optometry!',
		'Welcome, Southern College of Optometry!'
	];
	let schoolIndex = $state(0);
	let intervalId: ReturnType<typeof setInterval> | null = null;
	let fading = $state(false);

	onMount(() => {
		intervalId = setInterval(() => {
			fading = true;
			setTimeout(() => {
				schoolIndex = (schoolIndex + 1) % schools.length;
				fading = false;
			}, 600);
		}, 5000);
	});

	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
	});
</script>

<main class="flex flex-col items-center mt-8">
	<div class="w-full max-w-6xl mx-auto px-4 sm:px-12">
		<!-- Rotating welcome banner (decorative) -->
		<div class="w-full text-center text-base-content/70 h-6 overflow-hidden" aria-hidden="true">
			<p class="transition-opacity duration-300 ease-in-out" class:opacity-0={fading}>
				{schools[schoolIndex]}
			</p>
		</div>

		<!-- Hero -->
		<section aria-labelledby="hero-title">
			<div in:fade={{ duration: 1000 }}>
				<div class="space-y-4 max-w-3xl">
					<h1 id="hero-title" class="font-bold text-5xl lg:text-6xl mt-12  relative">
						Build your board prep as you learn.
					</h1>
					<p class="text-base-content text-2xl">
						LearnTerms helps you study smarter today—and automatically builds your personalized
						board-prep Q-bank for tomorrow.
					</p>
				</div>

				<a
					class="btn btn-primary my-8"
					href="/sign-in"
					in:fly={{ y: 20, duration: 500, delay: 200 }}
					aria-label="Get started with LearnTerms"
				>
					Get Started <ArrowRight aria-hidden="true" />
				</a>
			</div>

			<div
				in:scale={{ duration: 800, delay: 200 }}
				class="mockup-browser border-base-300 border mt-4 hidden md:block"
			>
				<div class="mockup-browser-toolbar">
					<div class="input border-base-300 border">app.learnterms.com</div>
				</div>
				<div class="border-base-300 flex justify-center border-t px-6">
					<Mock />
				</div>
			</div>
		</section>

		<!-- Getting Started -->
		<section
			class=" mt-16 sm:mt-28 px-4 sm:px-0"
			aria-labelledby="getting-started-title"
			in:fade={{ duration: 1000 }}
		>
			<h2 id="getting-started-title" class="font-bold text-5xl text-base-content">
				Getting Started Is Easy.
			</h2>
			<p class="text-2xl mt-4 text-base-content/80">
				Start studying smarter today — and build your own custom board prep system along the way.
			</p>
			<div class="mt-16">
				<div class="flex flex-col lg:flex-row gap-8">
					<!-- Card 1 -->
					<div
						class="group flex flex-col lg:w-1/3 rounded-2xl border border-base-200/70 bg-base-100/60 backdrop-blur-sm p-6 lg:p-7 transition hover:-translate-y-0.5 hover:shadow-sm"
						in:fade={{ duration: 800, delay: 100 }}
					>
						<div class="relative inline-flex items-center w-fit">
							<Pencil
								size="28"
								class="relative z-10 text-base-content/70 transition-colors duration-300 group-hover:text-primary"
								aria-hidden="true"
							/>
							<span
								class="pointer-events-none absolute inset-0 -z-10 opacity-0 blur-lg rounded-full bg-gradient-to-r from-primary/40 via-primary/30 to-secondary/40 transition-opacity duration-300 group-hover:opacity-100"
							></span>
						</div>
						<h3 class="mt-4 font-semibold text-2xl leading-tight text-base-content">
							Create & Practice
						</h3>
						<p class="mt-2 text-lg leading-relaxed text-base-content/80">
							Write your own questions or use AI to generate them. Tag by lesson, quiz yourself, and
							master concepts as you go.
						</p>
					</div>
					<!-- Card 2 -->
					<div
						class="group flex flex-col lg:w-1/3 rounded-2xl border border-base-200/70 bg-base-100/60 backdrop-blur-sm p-6 lg:p-7 transition hover:-translate-y-0.5 hover:shadow-sm"
						in:fade={{ duration: 800, delay: 200 }}
					>
						<div class="relative inline-flex items-center w-fit">
							<BookmarkCheck
								size="28"
								class="relative z-10 text-base-content/70 transition-colors duration-300 group-hover:text-primary"
								aria-hidden="true"
							/>
							<span
								class="pointer-events-none absolute inset-0 -z-10 opacity-0 blur-lg rounded-full bg-gradient-to-r from-primary/40 via-primary/30 to-secondary/40 transition-opacity duration-300 group-hover:opacity-100"
							></span>
						</div>
						<h3 class="mt-4 font-semibold text-2xl leading-tight text-base-content">
							Track What Matters
						</h3>
						<p class="mt-2 text-lg leading-relaxed text-base-content/80">
							Star, flag, and eliminate options — LearnTerms learns what you're struggling with and
							helps you focus where it counts.
						</p>
					</div>
					<!-- Card 3 -->
					<div
						class="group flex flex-col lg:w-1/3 rounded-2xl border border-base-200/70 bg-base-100/60 backdrop-blur-sm p-6 lg:p-7 transition hover:-translate-y-0.5 hover:shadow-sm"
						in:fade={{ duration: 800, delay: 300 }}
					>
						<div class="relative inline-flex items-center w-fit">
							<GraduationCap
								size="28"
								class="relative z-10 text-base-content/70 transition-colors duration-300 group-hover:text-primary"
								aria-hidden="true"
							/>
							<span
								class="pointer-events-none absolute inset-0 -z-10 opacity-0 blur-lg rounded-full bg-gradient-to-r from-primary/40 via-primary/30 to-secondary/40 transition-opacity duration-300 group-hover:opacity-100"
							></span>
						</div>
						<h3 class="mt-4 font-semibold text-2xl leading-tight text-base-content">
							Board prep, automatically.
						</h3>
						<p class="mt-2 text-lg leading-relaxed text-base-content/80">
							Every quiz you take now builds your personalized board prep Q-bank — automatically
							curated and ready when you are.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Demo / Mastery section -->
		<section
			class="mt-16 lg:mt-32 flex flex-col lg:flex-row gap-y-10 gap-x-8 lg:gap-x-24"
			aria-labelledby="mastery-title"
		>
			<div
				class="max-w-lg self-center lg:w-2/5 px-4 sm:px-0"
				in:fly={{ x: -40, duration: 800, delay: 100 }}
			>
				<h2 id="mastery-title" class="font-bold text-4xl">Laser Focused and Built for Mastery.</h2>
				<p class="text-xl mt-4">
					LearnTerms is a study platform full of tools built to make mastering complex topics easier
					and faster. Whether you're prepping for exams or fine-tuning your knowledge, LearnTerms is
					flexible, practical, and designed with you in mind.
				</p>
			</div>
			<div class="mockup-phone mt-8 lg:mt-0 mx-auto" in:fly={{ x: 40, duration: 800, delay: 200 }}>
				<div class="mockup-phone-camera"></div>
				<div class="mockup-phone-display grid place-content-center bg-base-100">
					<Quiz />
				</div>
			</div>
		</section>

		<!-- Powered by -->
		<section
			class="mt-36 px-4 sm:px-0"
			aria-labelledby="powered-title"
			in:fade={{ duration: 1000 }}
		>
			<h2 id="powered-title" class="font-bold text-5xl">Powered By The Latest and Greatest.</h2>
			<p class="text-2xl mt-4">
				Transform your studying by leveraging cutting edge features, all designed in a seamless
				experience.
			</p>
			<div class="mt-16">
				<div class="flex flex-col lg:flex-row gap-6">
					<div class="flex flex-col gap-y-2 lg:w-1/3" in:fade={{ duration: 800, delay: 100 }}>
						<Brain size="36" aria-hidden="true" />
						<h3 class="font-semibold text-2xl">Artificial Intelligence</h3>
						<p class="text-lg">
							Advanced language models are utilized to generate accurate and detailed practice
							questions tailored to specific course content, offering an unmatched preparation
							experience.
						</p>
					</div>
					<div class="flex flex-col gap-y-2 lg:w-1/3" in:fade={{ duration: 800, delay: 200 }}>
						<Sigma size="36" aria-hidden="true" />
						<h3 class="font-semibold text-2xl">Spaced & targeted practice</h3>
						<p class="text-lg">
							Predictive models identify and prioritize terms and questions with the highest
							likelihood of appearing on quizzes and exams, ensuring targeted and efficient study
							sessions.
						</p>
					</div>
					<div class="flex flex-col gap-y-2 lg:w-1/3" in:fade={{ duration: 800, delay: 300 }}>
						<ChartScatter size="36" aria-hidden="true" />
						<h3 class="font-semibold text-2xl">Detailed Analytics</h3>
						<p class="text-lg">
							Comprehensive progress tracking analyzes performance data to provide actionable
							insights, enabling a more focused and effective approach to mastering complex topics.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Crafted with care -->
		<section
			class="mt-36 px-4 sm:px-0"
			aria-labelledby="crafted-title"
			in:fade={{ duration: 1000 }}
		>
			<h2 id="crafted-title" class="font-bold text-4xl text-center">
				Crafted With Care, By People You Trust.
			</h2>
			<p class="text-lg mt-4 text-center">
				LearnTerms is actively developed by familiar faces who are committed to fine-tuning every
				feature to meet your needs. We’re in this together!
			</p>
			<div class="flex justify-center mt-10" in:scale={{ duration: 600, delay: 200 }}>
				<img
					src="https://utfs.io/f/DYlXFqnaImOrxA6g7hMjopGvhFXsSYTPmnUcH1rDawbJ7kQL"
					alt="NSUOCO Class of 2028—friends and builders behind LearnTerms"
					width="1280"
					height="720"
					loading="lazy"
					decoding="async"
					class="rounded-lg transform scale-95 transition duration-500 hover:scale-100 max-w-full"
				/>
			</div>
			<p class="text-base-content text-center mt-8">NSUOCO Class of 2028</p>
		</section>
	</div>
</main>

<style>
	@media (prefers-reduced-motion: reduce) {
		* {
			animation: none !important;
			transition: none !important;
		}
	}
</style>

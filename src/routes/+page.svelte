<script lang="ts">
	import {
		ArrowRight,
		Pencil,
		BookmarkCheck,
		GraduationCap,
		PlayCircle
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

<main class="flex flex-col items-center mt-6 sm:mt-10 mb-56">
	<div class="w-full max-w-5xl mx-auto px-4 sm:px-12">
        <div class="w-full text-center text-base-content/70 h-6 overflow-hidden" aria-hidden="true">
            <p class="transition-opacity duration-300 ease-in-out" class:opacity-0={fading}>
                {schools[schoolIndex]}
            </p>
        </div>

		<section aria-labelledby="hero-title" class="pt-4">
			<div in:fade={{ duration: 1000 }}>
				<div class="space-y-5 max-w-3xl">
					<h1 id="hero-title" class="font-bold text-5xl lg:text-6xl mt-10 leading-tight">
						<span class="text-primary relative">
							LearnTerms
							<span
								class="absolute inset-0 -z-10 bg-primary opacity-30 blur-xl rounded-lg transform -translate-y-1/2 top-1/2 animate-pulse"
							></span>
						</span> is Smarter Studying, Simplified.
					</h1>
					<p class="text-base-content/90 text-xl sm:text-2xl">
						Your class‑to‑boards study engine - helping you master today’s material while building tomorrow’s board‑prep bank.				</div>

				<div class="flex flex-col sm:flex-row gap-3 sm:gap-4 my-8 " in:fly={{ y: 20, duration: 500, delay: 150 }}>
					<a class="btn btn-primary" href="/sign-in" aria-label="Get started with LearnTerms">
						Get Started <ArrowRight aria-hidden="true" />
					</a>
	
				</div>
			</div>

			<div
				in:scale={{ duration: 800, delay: 200 }}
				class="mockup-browser border-base-300 border mt-24 hidden md:block"
			>
				<div class="mockup-browser-toolbar">
					<div class="input border-base-300 border">app.learnterms.com</div>
				</div>
				<div class="border-base-300 flex justify-center border-t px-6">
					<Mock />
				</div>
			</div>
		</section>

		<section class="mt-16 sm:mt-24 px-4 sm:px-0" aria-labelledby="features-title" in:fade={{ duration: 900 }}>
			<h2 id="features-title" class="font-bold text-4xl sm:text-5xl">Learn faster today. Bank your prep for tomorrow.</h2>
			<p class="text-lg sm:text-xl mt-4 text-base-content/80">A focused workflow that compounds your learning - without extra effort.</p>
			<div class="mt-12">
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
					<div class="group flex flex-col rounded-2xl border border-base-200/70 bg-base-100/60 backdrop-blur-sm p-6 lg:p-7 transition hover:-translate-y-0.5 hover:shadow-sm" in:fade={{ duration: 700, delay: 100 }}>
						<div class="relative inline-flex items-center w-fit">
							<Pencil size="28" class="relative z-10 text-base-content/70 transition-colors duration-300 group-hover:text-primary" aria-hidden="true" />
							<span class="pointer-events-none absolute inset-0 -z-10 opacity-0 blur-lg rounded-full bg-gradient-to-r from-primary/40 via-primary/30 to-secondary/40 transition-opacity duration-300 group-hover:opacity-100"></span>
						</div>
						<h3 class="mt-4 font-semibold text-2xl leading-tight">Create & practice</h3>
						<p class="mt-2 text-base leading-relaxed text-base-content/80">Write your own questions or use AI to generate them. Tag by lesson and quiz as you go.</p>
					</div>
					<div class="group flex flex-col rounded-2xl border border-base-200/70 bg-base-100/60 backdrop-blur-sm p-6 lg:p-7 transition hover:-translate-y-0.5 hover:shadow-sm" in:fade={{ duration: 700, delay: 180 }}>
						<div class="relative inline-flex items-center w-fit">
							<BookmarkCheck size="28" class="relative z-10 text-base-content/70 transition-colors duration-300 group-hover:text-primary" aria-hidden="true" />
							<span class="pointer-events-none absolute inset-0 -z-10 opacity-0 blur-lg rounded-full bg-gradient-to-r from-primary/40 via-primary/30 to-secondary/40 transition-opacity duration-300 group-hover:opacity-100"></span>
						</div>
						<h3 class="mt-4 font-semibold text-2xl leading-tight">Track what matters</h3>
						<p class="mt-2 text-base leading-relaxed text-base-content/80">Star, flag, and eliminate options. Focus where it counts with spaced review.</p>
					</div>
					<div class="group flex flex-col rounded-2xl border border-base-200/70 bg-base-100/60 backdrop-blur-sm p-6 lg:p-7 transition hover:-translate-y-0.5 hover:shadow-sm" in:fade={{ duration: 700, delay: 260 }}>
						<div class="relative inline-flex items-center w-fit">
							<GraduationCap size="28" class="relative z-10 text-base-content/70 transition-colors duration-300 group-hover:text-primary" aria-hidden="true" />
							<span class="pointer-events-none absolute inset-0 -z-10 opacity-0 blur-lg rounded-full bg-gradient-to-r from-primary/40 via-primary/30 to-secondary/40 transition-opacity duration-300 group-hover:opacity-100"></span>
						</div>
						<h3 class="mt-4 font-semibold text-2xl leading-tight">Board prep, automatically</h3>
						<p class="mt-2 text-base leading-relaxed text-base-content/80">Every quiz builds your personalized board‑prep Q‑bank—ready when you are.</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Demo / Mastery section -->
		<section class="mt-16 lg:mt-28 flex flex-col lg:flex-row gap-y-10 gap-x-8 lg:gap-x-24" aria-labelledby="mastery-title">
			<div
				class="max-w-lg self-center lg:w-2/5 px-4 sm:px-0"
				in:fly={{ x: -40, duration: 800, delay: 100 }}
			>
				<h2 id="mastery-title" class="font-bold text-4xl">Laser‑focused. Built for mastery.</h2>
				<p class="text-lg sm:text-xl mt-4">Purpose‑built tools that make mastering complex topics faster. From first exposure to confident recall.</p>
			</div>
			<div class="mockup-phone mt-8 lg:mt-0 mx-auto" in:fly={{ x: 40, duration: 800, delay: 200 }}>
				<div class="mockup-phone-camera"></div>
				<div class="mockup-phone-display grid place-content-center bg-base-100">
					<Quiz />
				</div>
			</div>
		</section>



		
</main>

<style>
	@media (prefers-reduced-motion: reduce) {
		* {
			animation: none !important;
			transition: none !important;
		}
	}
</style>

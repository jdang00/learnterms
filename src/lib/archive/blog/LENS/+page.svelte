<script lang="ts">
	import { Link } from 'lucide-svelte';
</script>

<div class="mt-10 flex min-h-screen w-full flex-col items-center justify-between p-8">
	<div class="w-full max-w-3xl">
		<div class="flex flex-col flex-wrap justify-between">
			<h1 class="text-4xl font-bold">The LENS Algorithm: Playing the Numbers Game</h1>
			<span>16 October 2024</span>

			<div class="mt-8 flex flex-row flex-wrap gap-6">
				<a href="https://www.justindang.dev/" target="_blank">
					<div class="avatar">
						<div class="ring-primary ring-offset-base-100 w-14 rounded-full ring ring-offset-2">
							<img
								src="https://utfs.io/f/DYlXFqnaImOrNYQ0L9zP0UTz89wOGJKi17DasVtufbylgkQF"
								alt="Justin Dang"
							/>
						</div>
					</div>
				</a>
				<div class="flex flex-col text-sm">
					<div class="font-semibold">Justin A. Dang</div>
					<div class="text-base-content">NSU Oklahoma College of Optometry</div>
					<div class="text-base-content">Class of 2028</div>
				</div>
			</div>
			<div class="mt-8 flex flex-col gap-2">
				Read the LENS Algorithm paper here:
				<a
					href="https://utfs.io/f/DYlXFqnaImOrDUuam6qnaImOrwFJXt2vDNoh9uC37QZKg0VR"
					class="btn btn-soft btn-primary"
					target="_blank"
				>
					<Link />
					The LENS Algorithm for Introduction to Optometry 4001
				</a>
			</div>
		</div>
		<div class="divider"></div>

		<p class="mt-8">
			For the past 4 weeks, LearnTerms users have not been studying the entire list of words from
			the terms workbook.
		</p>

		<p class="mt-8">
			That sounds a little crazy. I know. But this is highly intentional. As I took more quizzes for
			4001, I picked up on certain patterns. Words about the eye tended to make it on there. Big
			long combining words were not ever tested on. Eventually, it made me realize that I could
			predict to a certain degree whether some terms would be tested or not. I did some whiteboard
			work and came up with an algorithm that would systemically cut out terms that were
			mathematically not likely to be tested. This ends up creating smaller decks and more efficient
			studying habits. Here's how it works.
		</p>

		<h2 class="mt-10 text-xl font-semibold">LENS: Learning Efficiency and Nomenclature Scoring</h2>

		<p class="mt-2">LENS works by taking three things into account:</p>
		<ul class="m-8 mt-4">
			<li>
				<b>Importance:</b> How relevant is it to the eye?
			</li>
			<li>
				<b>Quizability</b> How likely is it to show up on a quiz?
			</li>
			<li>
				<b>Difficulty:</b> How hard is it to learn?
			</li>
		</ul>

		<p class="mt-8">
			These factors, determined in part by manual sorting and with the help of AI and scripting,
			contribute to a LENS value for every term. A threshold score is produced to decide whether or
			not the card made it into the deck. If a term had a high LENS value, it would be in the deck.
			If it had a low value, it was discarded since it was determined to be an irrelevant card.
		</p>

		<p class="mt-8">
			Naturally, there is a certain amount of risk to this. The main concern is this: "What if we
			get quizzed over a term that was discarded?" As of the implementation of LENS in week 5, there
			has been a 100% correspondence between tested terms and terms in the deck. This is in part due
			to a conservative threshold. The algorithm does a very good job in marking relevant terms
			based on the patterns of tested terms on the quizzes. If there is a discarded term asked on a
			quiz, the LearnTerms decks are built specifically to help learn roots. There is a great chance
			you can put the word together on your own.
		</p>

		<p class="mt-8">
			If you want to find out how the LENS algorithm works, I've attached a paper that I wrote
			detailing the mathematical basis of how LENS values are determined. You can also see an
			analysis of effectivness in card reduction and quiz scores.
		</p>

		<a
			href="https://utfs.io/f/DYlXFqnaImOrDUuam6qnaImOrwFJXt2vDNoh9uC37QZKg0VR"
			class="btn btn-soft btn-primary mt-8"
			target="_blank"
		>
			<Link />

			The LENS Algorithm for Introduction to Optometry 4001
		</a>

		<p class="mt-8">
			Thank you again for your trust in the platform. I'm working every day to help you to study
			better and more efficiently.
		</p>

		<p class="mt-8">JD</p>
	</div>
</div>

<style>
	ul {
		list-style-type: '✨ ';
	}
</style>

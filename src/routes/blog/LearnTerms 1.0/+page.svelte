<script>
	import { Confetti } from 'svelte-confetti';
</script>

<div
	style="
 position: fixed;
 top: -50px;
 left: 0;
 height: 100vh;
 width: 100vw;
 display: flex;
 justify-content: center;
 overflow: hidden;
 pointer-events: none;"
>
	<Confetti
		x={[-5, 5]}
		y={[0, 0.1]}
		delay={[500, 2000]}
		duration="2000"
		amount="200"
		fallDistance="100vh"
	/>
</div>
<div class="mt-10 flex min-h-screen w-full flex-col items-center justify-between p-8">
	<div class="w-full max-w-3xl">
		<div class="flex flex-col flex-wrap justify-between">
			<h1 class="text-4xl font-bold">LearnTerms 1.0 Release</h1>
			<span>22 September 2024</span>

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
		</div>
		<div class="divider"></div>

		<p class="mt-8">
			I’m thrilled to announce that LearnTerms has officially reached its 1.0 production release!
			What began as a personal study tool for mastering the 100+ definitions we had to learn weekly
			in Introduction to Optometry has grown into a full-fledged quizzing platform. Initially, I
			created it to help myself prepare for quizzes, which required the term in its exact spelling.
			Soon after sharing it with the class, you all started using it too, and requests for new
			features came in. After weeks of continuous development, LearnTerms is now ready to support
			anyone looking to do well on their Intro quizzes.
		</p>

		<h2 class="mt-10 text-xl font-semibold">Why Choose LearnTerms?</h2>

		<p class="mt-2">
			LearnTerms stands out as the best tool for studying Intro to Optometry terms for several
			reasons:
		</p>
		<ul class="m-8 mt-4">
			<li>
				<b>Reinforce learning through typing:</b> Typing terms enhances memory retention, spelling accuracy,
				and familiarity with word roots.
			</li>
			<li>
				<b>Completely free:</b> Ad-free, free to use forever, and no log-in required.
				<i>*cough cough Quizlet cough*</i>
			</li>
			<li>
				<b>Direct feedback from the developer:</b> As the sole developer, I’m available to fix errors
				or implement feature requests. Your input drives improvements!
			</li>
		</ul>

		<h2 class="mt-10 text-xl font-semibold">Key Features</h2>

		<p class="mt-2">
			Here are some of the features I’m most proud of, carefully designed to make studying easier
			and more effective:
		</p>
		<ul class="m-8 mt-4">
			<li>
				<b>Starred card review:</b> For
				<a
					href="https://quizlet.com/user/emmabrockman04/sets"
					target="_blank"
					class="link-secondary">Quizlet</a
				> enthusiasts, you can now star terms and focus on reviewing them. After a session, you can review
				starred terms or those you missed.
			</li>
			<li>
				<b>Decks Tab:</b> <a class="link-secondary" target="_blank" href="/terms">This tab</a> allows
				you to view all cards from the current week. You can toggle between a flashcard view or a table
				of terms and definitions. The search bar is perfect for open-note quizzes, providing fast and
				precise results through partial or full searches.
			</li>
			<li>
				<b>Changelog:</b> Stay updated on site improvements via the
				<a class="link-secondary" target="_blank" href="/changelog">changelog </a>in the footer. I’m
				continuously refining the platform to improve your study experience.
			</li>
			<li>
				<b>Customizable Themes:</b> Themes add a fun twist to your study routine. Got a favorite color
				scheme? Let me know!
			</li>
			<li>
				<b>Login for Enhanced Features:</b> While you can use LearnTerms without an account, logging
				in allows you to star cards. I don’t collect personal information, and your activity remains
				private once you’re logged in.
			</li>
		</ul>

		<h2 class="mt-10 text-xl font-semibold">A Personal Note</h2>

		<p class="mt-2">
			Since learning to <a
				class="link-secondary"
				href="https://www.linkedin.com/posts/justin-a-dang_great-work-by-noah-and-team-special-thanks-activity-7191453181728448512--g_-/"
				target="_blank">code in college</a
			>, I’ve always wanted to build something meaningful. LearnTerms is the realization of that
			dream. Whether you use it as your primary study tool or as a supplement, I’m grateful for the
			opportunity to help. Even if you don’t use the platform, feedback from non-users has been
			instrumental in refining the term database. My goal is for LearnTerms to become the NSUOCO
			Class of 2028’s go-to resource for studying.
		</p>

		<h2 class="mt-10 text-xl font-semibold">Special Thanks</h2>

		<ul class="m-8 mt-4">
			<li>
				<b>Kate:</b> The site’s first user. Seeing you use LearnTerms 20 minutes before class that first
				week gave me the motivation to develop this into something bigger.
			</li>
			<li>
				<b>Collin, Julia, Cori, Matt:</b> Your feature suggestions have made the site far better.
			</li>
			<li>
				<b
					>Eric, Sam, Kaity, <a href="/student-of-the-week" class="link-secondary" target="_blanks"
						>Courtney</a
					>, Cooper, Nate, Austin, Colby:</b
				> Your feedback has been invaluable. Knowing LearnTerms has been helpful makes my heart warm.
			</li>
		</ul>
		<p class="mt-10">
			And thank you to the rest of the class for your support on this. This year we’ve been pushed
			and challenged more than ever. But I believe this to be the brightest collection of
			individuals I’ve had the privilege to learn with. Good luck with this week’s quiz!
		</p>

		<p class="mt-5 font-bold">JD</p>
	</div>
</div>

<style>
	ul {
		list-style-type: '✨ ';
	}
</style>

<div class="max-w-3xl px-10 mt-5">
	<h1 class="text-4xl mt-5 font-semibold mb-5">Changelog</h1>

	<div class="ms-8">
		<h3 class="text-xl mt-3 font-medium text-base-content">February 3, 2025</h3>
		<p class="ms-2">
			We are a week or two out from the final v2 release, and we're crushing bugs and adding the
			final features!
		</p>

		<ul class="mt-1 m-8">
			<li>User progress saving now works on refresh and across the site.</li>
			<li>Sort functions fully done.</li>
			<li>Revamped backend for a much better dev experience.</li>
			<li>Added a reset button to clear progress.</li>
			<li>Performance updates across all features.</li>
			<li>
				Added a stage environment to prevent random bugs from getting into the live production site.
				This should lead to significantly reduced broken features to the site at any given time.
			</li>
			<li>
				Question generation model is now more fine-tuned to make more complex questions while being
				more stable.
			</li>
			<li>Question selection now moves smoothly to always keep it in view.</li>
		</ul>

		<h3 class="text-xl mt-3 font-medium text-base-content">January 27, 2025</h3>
		<p class="ms-2">
			Over the past few days, LearnTerms v2 has been getting some new features suggested by users
			like you!
		</p>

		<ul class="mt-1 m-8">
			<li>
				LearnTerms now saves user progress for all chapters. (This might still be a little buggy
				from time to time but I will roll fixes as I work on the backend service that supports
				tracking the questions.
			</li>
			<li>Eliminate answers is now fully implemented and working well.</li>

			<li>On show solution, the options now highlight their answer status for quick navigation.</li>
			<li>Added a shuffle button.</li>
			<li>Add a progress bar.</li>
			<li>Fixed bugs on mobile that were introduced on various builds.</li>
			<li>The analytics engine is now swapped out from Posthog to Vercel.</li>
			<li>Sort by flagged</li>
			<li>Sort by incomplete</li>
			<li>Improved mobile menu</li>
		</ul>

		<h3 class="text-xl mt-3 font-medium text-base-content">January 21, 2025</h3>
		<p class="ms-2">The fast paced development cycle continutes!</p>

		<ul class="mt-1 m-8">
			<li>Eliminate answers feature added, a neat tool that lets you narrow down your answers</li>
			<li>
				When implementing eliminate answers, I broke like 12 things. Then I fixed it, pushed the
				changes into production the night everyone is trying to study for the quiz, and then broke
				15 other things. THIS IS WHY YOU DO NOT PUSH BREAKING CHANGES ON THE NIGHT BEFORE THE EXAM.
			</li>
			<li>Fixed breaking bugs, now should function as expected.</li>
			<li>Blur resets on question change.</li>
			<li>
				Use escape to clear, enter to check, tab to reveal solution, and arrows keys to navigate
				questions.
			</li>
			<li>
				Began implementation for saved progress on questions per user. This is a rather complex
				feature and will rollout closer to the weekend. After extended testing and implementation.
			</li>
		</ul>

		<h3 class="text-xl mt-3 font-medium text-base-content">January 20, 2025</h3>
		<p class="ms-2">The insanity begins...</p>

		<ul class="mt-1 m-8">
			<li>113 high yield questions generated for the upcoming Chapter 1 quiz</li>
			<li>Cleaned up odds and ends for production</li>
			<li>New onboarding features</li>
			<li>Making the quizzing section much more mobile friendly</li>
			<li>Analytics engine reworked to improve future features.</li>
		</ul>

		<h3 class="text-xl mt-3 font-medium text-base-content">January 10, 2025</h3>
		<p class="ms-2">It's been a while, but we've been hard at work!</p>

		<ul class="mt-1 m-8">
			<li>LearnTerms has a new look!</li>
			<li>Authentication is now completely updated to Svelte 5.</li>
			<li>Stunning new landing page</li>
			<li>Making the quizzing section much more mobile friendly</li>
			<li>
				Reworked AI RAG pipeline for question generation for improved precision. This is still well
				into beta and won't be final until a few weeks into the Spring semester.
			</li>
			<li>The site is now more responsive overall.</li>
			<li>Solutions implementation on quizzing page</li>
			<li>back and forth buttons to navigate questions</li>
			<li>Massive redesign for the dashboard</li>
		</ul>

		<h3 class="text-xl mt-3 font-medium text-base-content">December 18, 2024</h3>
		<p class="ms-2">Holiday updates continue.</p>

		<ul class="mt-1 m-8">
			<li>Dude I literally remade ExamSoft for LearnTerms...</li>
			<li>
				Additional site maintence and a change to the <a href="/about" class="link-accent">About</a>
				page to get it up to date
			</li>
			<li>Major tuning to the RAG system that will generate practice questions</li>
			<li>
				Additional database and local storage enhancments that will make the site more durable to
				outages
			</li>
			<li>
				<a href="https://www.youtube.com/watch?v=xeSwrFKFNFw" class="link-accent" target="_blank"
					>Acanthamoeba</a
				>
			</li>
		</ul>

		<h3 class="text-xl mt-3 font-medium text-base-content">December 15, 2024</h3>
		<p class="ms-2">LearnTerms Holiday updates are underway!</p>

		<ul class="mt-1 m-8">
			<li>Revamped the home page by archiving the Intro quizzing functions.</li>
			<li>Added new Nord theme.</li>
			<li>
				Complete transition to Svelte 5! Comes with performance and speed updates across the board.
			</li>
			<li>Begin working on LLM infrastructure that will be core to new pharm focused site.</li>
			<li>Rebuilding site backend to accommodate expected incoming user data.</li>
		</ul>

		<h3 class="text-xl mt-3 font-medium text-base-content">October 25, 2024</h3>
		<p class="ms-2">With the publishing of the LENS Algorithm, feature updates are back!</p>

		<ul class="mt-1 m-8">
			<li>
				The "Redo Missed Cards" session will now remove cards as you get them right. The flow here
				is yet to be determined, but it will likley change to a "remove from review" or "keep in
				review" prompt. Thanks to Matt W.
			</li>
			<li>
				Progress now persists without logging in. Thanks to Kaity S. This actually turned out to be
				a very neat feature. I had my doubts.
			</li>
			<li>Begin transitioning site code to Svelte 5 for performance gains.</li>
			<li>
				<a class="link-accent" target="_blank" href="/student-of-the-week"
					>Student of the week, changes every month</a
				>
			</li>
		</ul>

		<h3 class="text-xl mt-3 font-medium text-base-content">September 20, 2024</h3>
		<p class="ms-2">LearnTerms 1.0 is here!</p>

		<ul class="mt-1 m-8">
			<li>Starring terms now works as a review deck on main quiz page</li>
			<li>Resetting cards now works correctly</li>
			<li>Separated development environment on the backend</li>
			<li>Lesson 5 Terms</li>
		</ul>

		<h3 class="text-xl mt-3 font-medium text-base-content">September 20, 2024</h3>
		<p class="ms-2">LearnTerms is almost in full release! Just a few more finishing touches!</p>
		<ul class="mt-1 m-8">
			<li>Major refactor of the database system</li>
			<li>Rennovated deck display for table view and flashcards view</li>
			<li>Separated development environment on the backend</li>
			<li>Search for terms!</li>
		</ul>

		<h3 class="text-xl mt-3 font-medium text-base-content">September 15, 2024</h3>
		<ul class="mt-1 m-8">
			<li>Theme changes</li>
			<li>Performance enhancments</li>
			<li>Separated development environment on the backend</li>
			<li>
				Added correct sound effect (I find that this gets old pretty fast, so I don't know if this
				will stay.) Feature courtesy of Julia
			</li>
			<li>
				Removed correct/incorrect counters. You can now see how many you missed via the review deck
				counter.
			</li>
			<li>Now more mobile friendly than ever for that last minute studying.</li>
		</ul>

		<h3 class="text-xl mt-3 font-medium text-base-content">September 14, 2024</h3>
		<ul class="mt-1 m-8">
			<li>
				<a class="link-accent" target="_blank" href="/student-of-the-week"
					>Student of the week, changes every month</a
				>
			</li>
		</ul>

		<h3 class="text-xl mt-3 font-medium text-base-content">September 11, 2024</h3>
		<ul class="mt-1 m-8">
			<li>Progress bar added, courtesy of Collin</li>
			<li>Lesson 4 Terms added</li>
			<li>Fully functional starring function (previous implementation was a little sus)</li>
			<li>Local review deck feature, courtesy of Cori</li>
		</ul>

		<h3 class="text-xl mt-3 font-medium text-base-content">September 10, 2024</h3>
		<ul class="mt-1 m-8">
			<li>Added shuffling cards functionality (future decks will be in lesson workbook order)</li>
			<li>Added card count</li>
			<li>Added correct and incorrect counts</li>
			<li>Review wrong cards flow</li>
			<li>Slight authentication improvments</li>
			<li>Persistent dark mode</li>
		</ul>

		<h3 class="text-xl mt-3 font-medium text-base-content">September 9, 2024</h3>
		<ul class="mt-1 m-8">
			<li>Implemented Dark Mode</li>
			<li>
				Added starred cards (this behavior is currently very glitchy on the front end. Refresh to
				see all updates after starring.)
			</li>
		</ul>

		<h3 class="text-xl mt-3 font-medium text-base-content">September 8, 2024</h3>
		<ul class="mt-1 m-8">
			<li>Added tab to reveal word</li>
			<li>Added toggle switch for list and grid view for cards</li>
			<li>Cursor focus implementation</li>
			<li>Made this page</li>
			<li>Migrated card architecture to backend database (PostgreSQL)</li>
			<li>Login implementation</li>
		</ul>
	</div>

	<p class="text-gray-500 mt-3">Made with Svelte and 🧡</p>
</div>

<style>
	ul {
		list-style-type: '✨ ';
	}
</style>

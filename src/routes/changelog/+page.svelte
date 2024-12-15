<div class="max-w-3xl px-10 mt-5">
	<h1 class="text-4xl mt-5 font-semibold mb-5">Changelog</h1>

	<div class="ms-8">
		<h3 class="text-xl mt-3 font-medium text-base-content px-3">December 15, 2024</h3>
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

		<h3 class="text-xl mt-3 font-medium text-base-content px-3">October 25, 2024</h3>
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

		<h3 class="text-xl mt-3 font-medium text-base-content px-3">September 20, 2024</h3>
		<p class="ms-2">LearnTerms 1.0 is here!</p>

		<ul class="mt-1 m-8">
			<li>Starring terms now works as a review deck on main quiz page</li>
			<li>Resetting cards now works correctly</li>
			<li>Separated development environment on the backend</li>
			<li>Lesson 5 Terms</li>
		</ul>

		<h3 class="text-xl mt-3 font-medium text-base-content px-3">September 20, 2024</h3>
		<p class="ms-2">LearnTerms is almost in full release! Just a few more finishing touches!</p>
		<ul class="mt-1 m-8">
			<li>Major refactor of the database system</li>
			<li>Rennovated deck display for table view and flashcards view</li>
			<li>Separated development environment on the backend</li>
			<li>Search for terms!</li>
		</ul>

		<h3 class="text-xl mt-3 font-medium text-base-content px-3">September 15, 2024</h3>
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

		<h3 class="text-xl mt-3 font-medium text-base-content px-3">September 14, 2024</h3>
		<ul class="mt-1 m-8">
			<li>
				<a class="link-accent" target="_blank" href="/student-of-the-week"
					>Student of the week, changes every month</a
				>
			</li>
		</ul>

		<h3 class="text-xl mt-3 font-medium text-base-content px-3">September 11, 2024</h3>
		<ul class="mt-1 m-8">
			<li>Progress bar added, courtesy of Collin</li>
			<li>Lesson 4 Terms added</li>
			<li>Fully functional starring function (previous implementation was a little sus)</li>
			<li>Local review deck feature, courtesy of Cori</li>
		</ul>

		<h3 class="text-xl mt-3 font-medium text-base-content px-3">September 10, 2024</h3>
		<ul class="mt-1 m-8">
			<li>Added shuffling cards functionality (future decks will be in lesson workbook order)</li>
			<li>Added card count</li>
			<li>Added correct and incorrect counts</li>
			<li>Review wrong cards flow</li>
			<li>Slight authentication improvments</li>
			<li>Persistent dark mode</li>
		</ul>

		<h3 class="text-xl mt-3 font-medium text-base-content px-3">September 9, 2024</h3>
		<ul class="mt-1 m-8">
			<li>Implemented Dark Mode</li>
			<li>
				Added starred cards (this behavior is currently very glitchy on the front end. Refresh to
				see all updates after starring.)
			</li>
		</ul>

		<h3 class="text-xl mt-3 font-medium text-base-content px-3">September 8, 2024</h3>
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

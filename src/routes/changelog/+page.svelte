<div class="max-w-3xl px-10 mt-5">
	<div class="badge badge-accent">Breaking</div>
	<p class="mt-3">
		LearnTerms will undergoing major maintenance to finish the implementation of the Review Deck on
		Tuesday, September 17. After that time, the service will exit its beta period and ship the first
		1.0 release as a fully featured product.
	</p>

	<h1 class="text-4xl mt-5 font-semibold mb-5">Changelog</h1>

	<h3 class="text-xl mt-3 font-medium text-gray-400 px-3">September 15, 2024</h3>
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

	<h3 class="text-xl mt-3 font-medium text-gray-400 px-3">September 14, 2024</h3>
	<ul class="mt-1 m-8">
		<li>
			<a class="link-accent" target="_blank" href="/student-of-the-week"
				>Student of the week, changes every month</a
			>
		</li>
	</ul>

	<h3 class="text-xl mt-3 font-medium text-gray-400 px-3">September 11, 2024</h3>
	<ul class="mt-1 m-8">
		<li>Progress bar added, courtesy of Collin</li>
		<li>Lesson 4 Terms added</li>
		<li>Fully functional starring function (previous implementation was a little sus)</li>
		<li>Local review deck feature, courtesy of Cori</li>
	</ul>

	<h3 class="text-xl mt-3 font-medium text-gray-400 px-3">September 10, 2024</h3>
	<ul class="mt-1 m-8">
		<li>Added shuffling cards functionality (future decks will be in lesson workbook order)</li>
		<li>Added card count</li>
		<li>Added correct and incorrect counts</li>
		<li>Review wrong cards flow</li>
		<li>Slight authentication improvments</li>
		<li>Persistent dark mode</li>
	</ul>

	<h3 class="text-xl mt-3 font-medium text-gray-400 px-3">September 9, 2024</h3>
	<ul class="mt-1 m-8">
		<li>Implemented Dark Mode</li>
		<li>
			Added starred cards (this behavior is currently very glitchy on the front end. Refresh to see
			all updates after starring.)
		</li>
	</ul>

	<h3 class="text-xl mt-3 font-medium text-gray-400 px-3">September 8, 2024</h3>
	<ul class="mt-1 m-8">
		<li>Added tab to reveal word</li>
		<li>Added toggle switch for list and grid view for cards</li>
		<li>Cursor focus implementation</li>
		<li>Made this page</li>
		<li>Migrated card architecture to backend database (PostgreSQL)</li>
		<li>Login implementation</li>
	</ul>

	<p class="text-gray-500 mt-3">Made with Svelte and 🧡</p>
</div>

<style>
	ul {
		list-style-type: '✨ ';
	}
</style>

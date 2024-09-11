<div class="max-w-3xl px-10">
	<h1 class="text-4xl mt-5 font-semibold">About</h1>
	<p class="text-gray-500 mt-3">
		LearnTerms is a custom study tool created by the Northeastern State University Oklahoma College
		of Optometry Class of 2028. Designed to complement existing platforms like Quizlet and Anki, it
		offers unique features not available elsewhere or behind paywalls. LearnTerms is built to be
		flexible, practical, and completely free to use, always open source. You can access the site’s
		code on <a
			class="link link-secondary"
			href="https://github.com/jdang00/learnterms"
			target="_blank">GitHub</a
		>.
	</p>

	<div class="flex flex-col gap-3">
		<div class="collapse collapse-arrow bg-base-200 mt-5">
			<input type="radio" name="my-accordion-2" checked="checked" />
			<div class="collapse-title text-xl font-medium">Is LearnTerms the best way to study?</div>
			<div class="collapse-content">
				<p>
					Nope. Not even close. Technically the most efficent way to study is active recall coupled
					with spaced repetition. Medical students do this with Anki. <a
						href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9045547/"
						class="link link-primary"
						target="_blank"
					>
						This study
					</a> suggests that for a subject like anatomy and physiology, using Anki is the most widespread
					and effective way to study. Daily discipline of reviewing decks is key.
				</p>
			</div>
		</div>
		<div class="collapse collapse-arrow bg-base-200">
			<input type="radio" name="my-accordion-2" />
			<div class="collapse-title text-xl font-medium">So why use LearnTerms?</div>
			<div class="collapse-content">
				<p>
					LearnTerms uses the same underlying principles of active recall and spaced repition as
					Anki. But for 4101 Introduction to Optometry, the quizzes are fill in the blank will no
					room for spelling error. This is where typing it out comes in handy. Plus, the terms lists
					made for the site are extremely comprehensive and get updated weekly.
				</p>
			</div>
		</div>
		<div class="collapse collapse-arrow bg-base-200">
			<input type="radio" name="my-accordion-2" />
			<div class="collapse-title text-xl font-medium">Why can't I just use Quizlet or Anki?</div>
			<div class="collapse-content">
				<p>
					You can use both. But using LearnTerms means you don't have to put up with several
					problems the other services have. Quizlet is a heavy and ad-ridden website that tries to
					do everything. You'll have to pay for Quizlet+ for some features. With LearnTerms, all
					features are free forever and new feature requests can be made with a turnaround time of
					just a few days. Anki is great but requires a lot of setup and isn't really that pretty.
					LearnTerms is a custom made solution, ready to go out of the box, and beautiful desiged
					with modern web accessibility standards in mind. If you want to learn Intro terms, you use
					LearnTerms.
				</p>
			</div>
		</div>
	</div>
	<h1 class="text-3xl mt-5 font-semibold mb-5">Changelog</h1>

	<h3 class="text-xl mt-3 font-medium text-gray-400 px-3">September 10, 2024</h3>
	<ul class="mt-1 m-8">
		<li>Added shuffling cards functionality (future decks will be in lesson workbook order)</li>
		<li>Added card count</li>
		<li>Added correct and incorrect counts</li>
		<li>Review wrong cards flow</li>
		<li>Slighly authentication improvments</li>
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
		list-style-type: '✨';
	}
</style>

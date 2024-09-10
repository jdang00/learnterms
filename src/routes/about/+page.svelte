<script lang="ts">
</script>

<div class="max-w-3xl p-8">
	<h1 class="text-3xl mt-5 font-semibold">About</h1>
	<p class="text-gray-500 mt-3">
		Learn Terms is a custom study solution built by and for the Northeastern State University
		Oklahoma College of Optometry Class of 2028. It is meant to compliment exisiting study tools
		like Quizlet and Anki by implementing features that don't exist or need to be paid for on other
		platforms. This site will remain truly free and open source. Forever. Period. To see the source
		code of the site, visit the <a
			class="link link-secondary"
			href="https://github.com/jdang00/learnterms"
			target="_blank">GitHub</a
		>
		.
	</p>

	<h1 class="text-3xl mt-5 font-semibold">Changelog</h1>

	<h3 class="text-xl mt-3 font-medium text-gray-400 px-3">September 9, 2024</h3>
	<ul class="mt-5 m-8">
		<li>Implemented Dark Mode</li>
		<li>
			Added starred cards (this behavior is currently very glitchy on the front end. Refresh to see
			all updates after starring.)
		</li>
	</ul>

	<h3 class="text-xl mt-3 font-medium text-gray-400 px-3">September 8, 2024</h3>
	<ul class="mt-5 m-8">
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

<script>
	import 'tailwindcss/tailwind.css';
</script>

<html data-theme="light" lang="en">
	<slot />
	<footer class="footer footer-center text-base-content p-4">
		<aside class="flex flex-row">
			<p>Copyright © {new Date().getFullYear()} - Oklahoma College of Optometry Class of 2028 |</p>
			<a class="link" href="/about">About / Changelog</a>
		</aside>
	</footer>
</html>

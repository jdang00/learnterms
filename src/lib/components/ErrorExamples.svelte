<!-- Demo of error components in non-error state -->
<script lang="ts">
	import ErrorBoundary from './ErrorBoundary.svelte';
	import ErrorDisplay from './ErrorDisplay.svelte';

	// Example error objects (commented out to show non-error state)
	// const authError = { message: 'Session expired. Please authenticate again.' };
	// const networkError = { message: 'Network connection failed. Please try again.' };
	// const genericError = { message: 'Something went wrong loading the data.' };

	// Demo: Show components with null errors to see the styling/layout
	const noError = null;
</script>

<div class="p-6 space-y-6">
	<h2 class="text-2xl font-bold mb-4">Error Components - Visual Preview</h2>
	<p class="text-base-content/70 mb-6">
		Currently showing components with no errors to preview the visual design.
		Uncomment the error objects in the script section to see error states.
	</p>

	<!-- ErrorBoundary Examples -->
	<div class="space-y-4">
		<h3 class="text-xl font-semibold">ErrorBoundary Component</h3>
		<p class="text-sm text-base-content/60 mb-2">
			This component won't render anything when there's no error (null/undefined).
		</p>

		<!-- Preview with no error - shows nothing -->
		<div class="border-2 border-dashed border-base-300 rounded-lg p-8 text-center">
			<ErrorBoundary error={noError} />
			<p class="text-base-content/50 italic">No content (no error)</p>
		</div>
	</div>

	<hr class="my-8" />

	<!-- ErrorDisplay Examples -->
	<div class="space-y-4">
		<h3 class="text-xl font-semibold">ErrorDisplay Component</h3>
		<p class="text-sm text-base-content/60 mb-2">
			This component also won't render when there's no error.
		</p>

		<!-- Preview with no error - shows nothing -->
		<div class="border-2 border-dashed border-base-300 rounded-lg p-8 text-center">
			<ErrorDisplay error={noError} showReload={true} />
			<p class="text-base-content/50 italic">No content (no error)</p>
		</div>
	</div>

	<hr class="my-8" />

	<!-- Visual preview of what they look like -->
	<div class="space-y-4">
		<h3 class="text-xl font-semibold">Visual Preview</h3>
		<p class="text-sm text-base-content/60 mb-4">
			To see the actual error components, temporarily uncomment these examples:
		</p>

		<div class="bg-base-200 rounded-lg p-4">
			<pre class="text-sm overflow-x-auto"><code>{`<!-- Auth Error Example -->
<ErrorBoundary error={{ message: 'Session expired. Please authenticate again.' }} />

<!-- Network Error Example -->
<ErrorDisplay error={{ message: 'Network connection failed.' }} showReload={true} />`}</code></pre>
		</div>
	</div>
</div>

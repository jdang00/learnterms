<script lang="ts">
	import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
	import ErrorDisplay from '$lib/components/ErrorDisplay.svelte';

	const noError = null;
	const authError = { message: 'Unauthorized' };
</script>

<div class="min-h-screen bg-base-200 p-6">
	<div class="max-w-4xl mx-auto space-y-8">

		<div class="text-center mb-8">
			<h1 class="text-4xl font-bold mb-2">Error Components Demo</h1>
			<p class="text-lg text-base-content/70">
				Preview of the new reusable error components
			</p>
		</div>

		<div class="alert alert-info shadow-lg">
			<div>
				<h3 class="font-bold">Current State: Custom Styled Error Demo</h3>
				<p>Showing the new custom error styling using primary colors instead of DaisyUI's built-in alert components. Auth errors are styled with primary blue colors for a less alarming appearance.</p>
			</div>
		</div>
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title text-2xl">Consolidated Error Handling</h2>
				<p class="text-base-content/70 mb-4">
					The new QuizErrorHandler consolidates multiple errors into a single, user-friendly message.
				</p>

				<div class="border rounded-lg p-4">
					<ErrorBoundary
						error={authError}
						title="Session Refreshed"
						message="Your session has been refreshed for security."
					/>
				</div>

				<div class="divider">Comparison: Regular Error</div>
				<div class="border rounded-lg p-4">
					<ErrorBoundary
						error={{ message: 'Network connection failed' }}
						title="Connection Error"
						message="Unable to connect to the server."
					/>
				</div>
			</div>
		</div>
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title text-2xl">ErrorDisplay Component</h2>
				<p class="text-base-content/70 mb-4">
					Lightweight inline error display with icon and optional reload button.
				</p>

				<div class="border rounded-lg p-4">
					<ErrorDisplay error={authError} showReload={true} />
				</div>

				<div class="divider">Comparison: Regular Error</div>
				<div class="border rounded-lg p-4">
					<ErrorDisplay error={{ message: 'Network connection failed' }} showReload={true} />
				</div>

				<div class="divider">Size Variants with Auth Error</div>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div class="border rounded-lg p-4">
						<h4 class="font-semibold mb-2">Small Size</h4>
						<ErrorDisplay error={authError} size="small" showReload={true} />
					</div>
					<div class="border rounded-lg p-4">
						<h4 class="font-semibold mb-2">Normal Size</h4>
						<ErrorDisplay error={authError} size="normal" showReload={true} />
					</div>
					<div class="border rounded-lg p-4">
						<h4 class="font-semibold mb-2">Large Size</h4>
						<ErrorDisplay error={authError} size="large" showReload={true} />
					</div>
				</div>
			</div>
		</div>
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title text-2xl">Usage Instructions</h2>

				<div class="space-y-4">
					<div>
						<h3 class="font-semibold mb-2 text-success">✨ Consolidated Error Handling</h3>
						<p class="text-sm text-base-content/70">
							Multiple errors are now consolidated into a single, user-friendly message instead of showing 3+ separate error alerts.
							This prevents overwhelming users with auth-related errors.
						</p>
					</div>

					<div>
						<h3 class="font-semibold mb-2">Key Changes:</h3>
						<ul class="list-disc list-inside space-y-1 text-sm">
							<li><strong>Consolidated Display:</strong> Multiple auth errors show as one "Session Refreshed" message</li>
							<li><strong>Smart Suppression:</strong> Less critical errors are hidden when more important ones exist</li>
							<li><strong>Custom Styling:</strong> Primary blue colors for auth errors, red for real problems</li>
							<li><strong>Security Messaging:</strong> Auth errors explain they're for data protection</li>
							<li><strong>Component Suppression:</strong> MainQuiz and ModuleInfo hide auth errors when consolidated handler is present</li>
						</ul>
					</div>

					<div>
						<h3 class="font-semibold mb-2">How It Works:</h3>
						<div class="bg-base-200 rounded-lg p-4">
							<p class="text-sm mb-2"><strong>Before:</strong> 3 separate error messages</p>
							<ul class="text-sm list-disc list-inside mb-3 space-y-1">
								<li>❌ Questions Loading Error</li>
								<li>❌ Module Loading Error</li>
								<li>❌ Progress Loading Error</li>
							</ul>
							<p class="text-sm mb-2"><strong>After:</strong> 1 consolidated message</p>
							<p class="text-sm text-primary font-medium">✅ Session Refreshed - Multiple services need to reconnect</p>
						</div>
					</div>

					<div>
						<h3 class="font-semibold mb-2">Usage in Main Quiz Page:</h3>
						<div class="bg-base-200 rounded-lg p-4">
							<pre class="text-sm overflow-x-auto"><code>{`<QuizErrorHandler
  {questions}
  {module}
  {moduleProgress}
/>

<MainQuiz suppressAuthErrors={true} />
<ModuleInfo suppressAuthErrors={true} />`}</code></pre>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="text-center">
			<a href="/" class="btn btn-primary">Back to Home</a>
		</div>
	</div>
</div>

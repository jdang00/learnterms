<script lang="ts">
	import PublicPage from '$lib/components/landing/PublicPage.svelte';
</script>

<PublicPage title="Status" lede="All systems operational.">
	<div class="grid gap-4 md:grid-cols-2">
		<div class="panel-graph p-5">
			<div class="space-y-1">
				<div class="flex items-center justify-between">
					<h2 class="font-semibold">App & UI</h2>
					<span class="badge badge-success">Operational</span>
				</div>
				<p class="text-sm text-base-content/70">Vercel hosting and edge network.</p>
			</div>
		</div>
		<div class="panel-graph p-5">
			<div class="space-y-1">
				<div class="flex items-center justify-between">
					<h2 class="font-semibold">Convex API</h2>
					<span class="badge badge-success">Operational</span>
				</div>
				<p class="text-sm text-base-content/70">Data and actions.</p>
			</div>
		</div>
		<div class="panel-graph p-5">
			<div class="space-y-1">
				<div class="flex items-center justify-between">
					<h2 class="font-semibold">Auth (Clerk)</h2>
					<span class="badge badge-success">Operational</span>
				</div>
				<p class="text-sm text-base-content/70">Sessions and user data.</p>
			</div>
		</div>
		<div class="panel-graph p-5">
			<div class="space-y-1">
				<div class="flex items-center justify-between">
					<h2 class="font-semibold">AI Processing</h2>
					<span class="badge badge-success">Operational</span>
				</div>
				<p class="text-sm text-base-content/70">Document chunking pipeline.</p>
			</div>
		</div>
	</div>
</PublicPage>

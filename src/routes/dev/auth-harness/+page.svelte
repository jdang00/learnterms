<script lang="ts">
	import { useConvexClient } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api.js';
	import type { PageData } from './$types';
	import type { Id } from '../../../convex/_generated/dataModel';
	import { CheckCircle2, XCircle, Clock, RefreshCw, Wifi, WifiOff, Key } from 'lucide-svelte';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();
	const userData = data.userData;
	const client = useConvexClient();

	// Intercept console.log to detect token refresh events
	let tokenRefreshCount = $state(0);
	let lastTokenRefreshTime = $state<string | null>(null);

	// Timer state
	let sessionStartTime = $state(Date.now());
	let currentTime = $state(Date.now());

	// Query state
	let queryAttempts = $state(0);
	let successCount = $state(0);
	let errorCount = $state(0);
	let lastError = $state<string | null>(null);
	let lastQueryTime = $state<string>('');
	let isQueryInProgress = $state(false);
	let queryHistory = $state<Array<{ id: number; time: string; status: 'success' | 'error'; message: string }>>([]);
	let historyId = $state(0);

	// Current query result
	let currentResult = $state<any>(null);

	// Connection state (only on client)
	let isConnected = $state(false);
	let isClientReady = $state(false);

	// Poll interval (check every 3 seconds)
	const POLL_INTERVAL = 3000;

	// Computed values
	const elapsedSeconds = $derived(Math.floor((currentTime - sessionStartTime) / 1000));
	const elapsedMinutes = $derived(Math.floor(elapsedSeconds / 60));
	const remainingSeconds = $derived(elapsedSeconds % 60);

	function addToHistory(status: 'success' | 'error', message: string) {
		const now = new Date();
		const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

		queryHistory = [
			{ id: historyId++, time: timeStr, status, message },
			...queryHistory.slice(0, 19) // Keep last 20 entries
		];

		lastQueryTime = timeStr;
	}

	async function executeQuery() {
		if (!browser || !isClientReady) return; // Only run on client when ready

		if (!userData?.cohortId) {
			addToHistory('error', 'No cohort ID available');
			return;
		}

		isQueryInProgress = true;
		queryAttempts++;

		try {
			// Force a fresh query execution (not subscription)
			const result = await client.query(api.class.getUserClasses, {
				id: userData.cohortId as Id<'cohort'>
			});

			currentResult = result;
			successCount++;
			lastError = null;
			addToHistory('success', `✓ Loaded ${result.length} classes`);
		} catch (error: any) {
			errorCount++;
			lastError = error.toString();
			currentResult = null;
			addToHistory('error', `✗ ${error.message || error.toString()}`);
		} finally {
			isQueryInProgress = false;
		}
	}

	function updateConnectionState() {
		if (!browser || !isClientReady) return;
		try {
			const state = client.connectionState();
			isConnected = state.isWebSocketConnected;
		} catch (e) {
			isConnected = false;
		}
	}

	function forceRefresh() {
		executeQuery();
	}

	// Wait for client to be ready on mount
	onMount(() => {
		// Intercept Clerk's getToken to monitor token refresh calls
		if (window.Clerk?.session) {
			const originalGetToken = window.Clerk.session.getToken.bind(window.Clerk.session);
			window.Clerk.session.getToken = async (options) => {
				// Only count as refresh if skipCache is true (forced refresh)
				if (options?.skipCache) {
					tokenRefreshCount++;
					const now = new Date();
					lastTokenRefreshTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
					addToHistory('success', `🔑 Token refresh via Clerk (skipCache: true)`);
				}

				return originalGetToken(options);
			};
		}

		// Give the client a moment to initialize
		setTimeout(() => {
			isClientReady = true;
			updateConnectionState();
			executeQuery(); // Execute first query
		}, 500);
	});

	// Start intervals using $effect (only on client)
	$effect(() => {
		if (!browser || !isClientReady) return;

		// Update timer every second
		const timerInterval = setInterval(() => {
			currentTime = Date.now();
			updateConnectionState();
		}, 1000);

		// Poll query every 3 seconds
		const pollInterval = setInterval(() => {
			executeQuery();
		}, POLL_INTERVAL);

		// Cleanup
		return () => {
			clearInterval(timerInterval);
			clearInterval(pollInterval);
		};
	});
</script>

<main class="min-h-screen p-8 bg-base-200">
	<div class="max-w-6xl mx-auto">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-3xl font-bold text-base-content mb-2">🔬 Convex Auth Harness</h1>
					<p class="text-base-content/70">Real-time monitoring of Convex authentication and session timeout</p>
				</div>
				<div class="flex items-center gap-2">
					{#if !isClientReady}
						<div class="badge badge-warning gap-2">
							<div class="loading loading-spinner loading-xs"></div>
							Initializing...
						</div>
					{:else if isConnected}
						<div class="badge badge-success gap-2">
							<Wifi size={14} />
							Connected
						</div>
					{:else}
						<div class="badge badge-error gap-2">
							<WifiOff size={14} />
							Disconnected
						</div>
					{/if}
					{#if isQueryInProgress}
						<div class="loading loading-spinner loading-sm text-primary"></div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Stats Grid -->
		<div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
			<!-- Session Timer -->
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<div class="flex items-center gap-2 mb-2">
						<Clock class="text-primary" size={20} />
						<h2 class="card-title text-sm">Session Time</h2>
					</div>
					<div class="text-3xl font-mono font-bold text-primary">
						{String(elapsedMinutes).padStart(2, '0')}:{String(remainingSeconds).padStart(2, '0')}
					</div>
					<p class="text-xs text-base-content/60">{elapsedSeconds} seconds elapsed</p>
				</div>
			</div>

			<!-- Query Attempts -->
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<div class="flex items-center gap-2 mb-2">
						<RefreshCw class="text-info" size={20} />
						<h2 class="card-title text-sm">Query Attempts</h2>
					</div>
					<div class="text-3xl font-mono font-bold text-info">
						{queryAttempts}
					</div>
					<p class="text-xs text-base-content/60">Polling every {POLL_INTERVAL / 1000}s</p>
				</div>
			</div>

			<!-- Success Count -->
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<div class="flex items-center gap-2 mb-2">
						<CheckCircle2 class="text-success" size={20} />
						<h2 class="card-title text-sm">Successful</h2>
					</div>
					<div class="text-3xl font-mono font-bold text-success">
						{successCount}
					</div>
					<p class="text-xs text-base-content/60">Auth validated</p>
				</div>
			</div>

			<!-- Error Count -->
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<div class="flex items-center gap-2 mb-2">
						<XCircle class="text-error" size={20} />
						<h2 class="card-title text-sm">Errors</h2>
					</div>
					<div class="text-3xl font-mono font-bold text-error">
						{errorCount}
					</div>
					<p class="text-xs text-base-content/60">Auth failures</p>
				</div>
			</div>

			<!-- Token Refreshes -->
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<div class="flex items-center gap-2 mb-2">
						<Key class="text-warning" size={20} />
						<h2 class="card-title text-sm">Token Refreshes</h2>
					</div>
					<div class="text-3xl font-mono font-bold text-warning">
						{tokenRefreshCount}
					</div>
					<p class="text-xs text-base-content/60">
						{#if lastTokenRefreshTime}
							Last: {lastTokenRefreshTime}
						{:else}
							No refreshes yet
						{/if}
					</p>
				</div>
			</div>
		</div>

		<!-- Current Status -->
		<div class="card bg-base-100 shadow-xl mb-8">
			<div class="card-body">
				<h2 class="card-title mb-4">Current Status</h2>

				{#if isQueryInProgress}
					<div class="alert alert-info">
						<div class="loading loading-spinner loading-sm"></div>
						<span>Executing query...</span>
					</div>
				{:else if lastError}
					<div class="alert alert-error">
						<XCircle size={20} />
						<div class="flex flex-col items-start w-full">
							<span class="font-bold">Authentication Failed</span>
							<span class="text-sm font-mono break-all">{lastError}</span>
							{#if lastQueryTime}
								<span class="text-xs text-error/70 mt-1">Last attempt: {lastQueryTime}</span>
							{/if}
						</div>
					</div>
				{:else if currentResult}
					<div class="alert alert-success">
						<CheckCircle2 size={20} />
						<div class="flex flex-col items-start">
							<span>Authentication successful - Token valid</span>
							{#if lastQueryTime}
								<span class="text-xs text-success/70 mt-1">Last check: {lastQueryTime}</span>
							{/if}
						</div>
					</div>
				{:else}
					<div class="alert">
						<Clock size={20} />
						<span>Waiting for first query...</span>
					</div>
				{/if}

				<div class="divider"></div>

				<div class="flex justify-between items-center">
					<div class="flex-1">
						<h3 class="font-semibold mb-2">Query Result:</h3>
						{#if currentResult}
							<div class="bg-base-200 p-4 rounded-lg">
								<p class="text-sm text-base-content/70 mb-2">getUserClasses query returned:</p>
								<div class="font-mono text-sm">
									<span class="text-success font-bold">{currentResult.length}</span> classes found
								</div>
								{#if currentResult.length > 0}
									<ul class="mt-2 space-y-1">
										{#each currentResult.slice(0, 3) as classItem}
											<li class="text-xs text-base-content/60">• {classItem.name}</li>
										{/each}
										{#if currentResult.length > 3}
											<li class="text-xs text-base-content/60">• ... and {currentResult.length - 3} more</li>
										{/if}
									</ul>
								{/if}
							</div>
						{:else}
							<p class="text-base-content/60">No data yet</p>
						{/if}
					</div>

					<button class="btn btn-primary" onclick={forceRefresh} disabled={isQueryInProgress}>
						<RefreshCw size={16} class={isQueryInProgress ? 'animate-spin' : ''} />
						Force Refresh
					</button>
				</div>
			</div>
		</div>

		<!-- Query History -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title mb-4">Query History (Last 20)</h2>

				{#if queryHistory.length === 0}
					<p class="text-base-content/60 text-center py-8">No queries yet. Polling will start automatically.</p>
				{:else}
					<div class="overflow-x-auto">
						<table class="table table-zebra">
							<thead>
								<tr>
									<th>Time</th>
									<th>Status</th>
									<th>Message</th>
								</tr>
							</thead>
							<tbody>
								{#each queryHistory as entry (entry.id)}
									<tr>
										<td class="font-mono text-sm">{entry.time}</td>
										<td>
											{#if entry.status === 'success'}
												<div class="badge badge-success gap-2">
													<CheckCircle2 size={12} />
													Success
												</div>
											{:else}
												<div class="badge badge-error gap-2">
													<XCircle size={12} />
													Error
												</div>
											{/if}
										</td>
										<td class="font-mono text-xs text-base-content/70">{entry.message}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</div>

		<!-- How It Works -->
		<div class="card bg-success/10 border border-success/20 mt-8">
			<div class="card-body">
				<h3 class="font-semibold text-success mb-4">✅ How Token Refresh Works</h3>

				<div class="space-y-4">
					<!-- Flow Diagram -->
					<div class="bg-base-100 p-4 rounded-lg border border-base-300">
						<div class="text-sm font-mono space-y-2">
							<div class="flex items-start gap-3">
								<span class="text-success font-bold">0s:</span>
								<div>
									<div class="font-semibold">Page Load</div>
									<div class="text-xs text-base-content/70">Server generates initial Convex token via SSR</div>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<span class="text-success font-bold">~1s:</span>
								<div>
									<div class="font-semibold">Initial Auth</div>
									<div class="text-xs text-base-content/70">Convex uses SSR token (fast, no extra request)</div>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<span class="text-warning font-bold">~27s:</span>
								<div>
									<div class="font-semibold">🔑 Token Refresh Triggered</div>
									<div class="text-xs text-base-content/70">Convex calls setAuth with forceRefreshToken: true</div>
									<div class="text-xs text-base-content/70">Client fetches fresh token from Clerk (skipCache: true)</div>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<span class="text-success font-bold">30s+:</span>
								<div>
									<div class="font-semibold">Queries Continue</div>
									<div class="text-xs text-base-content/70">Auth remains valid, no errors, no page refresh needed</div>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<span class="text-info font-bold">∞:</span>
								<div>
									<div class="font-semibold">Automatic Cycle</div>
									<div class="text-xs text-base-content/70">Refresh repeats every ~27s indefinitely</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Expected Behavior -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="bg-error/10 border border-error/30 p-3 rounded-lg">
							<div class="flex items-center gap-2 mb-2">
								<XCircle size={16} class="text-error" />
								<span class="font-semibold text-sm">Before Fix</span>
							</div>
							<ul class="text-xs space-y-1 text-base-content/70">
								<li>✗ Errors at ~30 seconds</li>
								<li>✗ All queries fail</li>
								<li>✗ User must refresh page</li>
							</ul>
						</div>
						<div class="bg-success/10 border border-success/30 p-3 rounded-lg">
							<div class="flex items-center gap-2 mb-2">
								<CheckCircle2 size={16} class="text-success" />
								<span class="font-semibold text-sm">After Fix</span>
							</div>
							<ul class="text-xs space-y-1 text-base-content/70">
								<li>✓ Token refreshes at ~27s</li>
								<li>✓ Queries continue succeeding</li>
								<li>✓ Session runs indefinitely</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Info Card -->
		<div class="card bg-info/10 border border-info/20 mt-4">
			<div class="card-body">
				<h3 class="font-semibold text-info mb-2">💡 What This Harness Does</h3>
				<ul class="list-disc list-inside space-y-1 text-sm text-base-content/80">
					<li>Executes <code class="bg-base-200 px-1 rounded">getUserClasses</code> query every 3 seconds (not a subscription)</li>
					<li>Each execution is a fresh auth check - catches token issues immediately</li>
					<li>Session timer shows elapsed time (watch for behavior at ~27 and ~30 seconds)</li>
					<li>🔑 <strong>Token Refreshes</strong> counter increments when Convex fetches new tokens from Clerk</li>
					<li>Query history shows real-time success/failure with timestamps</li>
					<li>With 30-second JWT: refresh should happen at ~27s, queries continue past 30s</li>
				</ul>
			</div>
		</div>

		<!-- Debug Card -->
		<div class="card bg-base-300/50 border border-base-300 mt-4">
			<div class="card-body">
				<h3 class="font-semibold text-sm mb-2">🐛 Debug Info</h3>
				<div class="text-xs font-mono space-y-1">
					<div>Client Ready: <span class={isClientReady ? 'text-success' : 'text-error'}>{isClientReady ? 'Yes' : 'No'}</span></div>
					<div>WebSocket Connected: <span class={isConnected ? 'text-success' : 'text-error'}>{isConnected ? 'Yes' : 'No'}</span></div>
					<div>User Data Available: <span class={userData ? 'text-success' : 'text-error'}>{userData ? 'Yes' : 'No'}</span></div>
					<div>Cohort ID: <span class={userData?.cohortId ? 'text-success' : 'text-error'}>{userData?.cohortId || 'None'}</span></div>
					<div>Token Refreshes: <span class="text-warning">{tokenRefreshCount}</span> {#if lastTokenRefreshTime}(Last: {lastTokenRefreshTime}){/if}</div>
				</div>
			</div>
		</div>
	</div>
</main>

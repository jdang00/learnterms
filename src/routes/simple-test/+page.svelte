<script lang="ts">
	import { useClerkContext } from 'svelte-clerk/client';
	import { ConvexHttpClient } from 'convex/browser';
	import { api } from '../../convex/_generated/api';
	import { PUBLIC_CONVEX_URL } from '$env/static/public';

	const ctx = useClerkContext();
	const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL);
	
	let result: any = null;
	let loading = false;
	let error: string | null = null;

	async function testAuth() {
		loading = true;
		error = null;
		result = null;

		try {
			const token = await ctx.session?.getToken();

			if (!token) {
				throw new Error('No JWT token available - please sign in');
			}

			console.log('Testing authentication with Clerk API...');
			
			// Single authentication call
			const authResult = await convex.action(api.authQueries.authenticateUser, { token });
			
			// Pre-authenticated approach
			const authenticatedUser = await convex.action(api.authQueries.authenticateUser, { token });
			let authenticatedUserInfo = null;
			let userData = null;
			
			if (authenticatedUser.authenticated) {
				authenticatedUserInfo = await convex.query(api.authQueries.getAuthenticatedUserInfo, { 
					userData: authenticatedUser.user 
				});
				
				userData = await convex.query(api.authQueries.getUserData, { 
					userData: authenticatedUser.user 
				});
			}

			result = {
				authenticated: authResult.authenticated,
				user: authResult.authenticated && authResult.user ? {
					name: authResult.user.name,
					email: authResult.user.email,
					role: authResult.user.role,
					plan: authResult.user.plan,
					isAdmin: authResult.user.isAdmin,
					isStudent: authResult.user.isStudent
				} : null,
				permissions: authResult.authenticated && authResult.user ? authResult.user.permissions : null,
				error: authResult.authenticated ? null : authResult.error,
				// Pre-authenticated approach results
				authenticatedUser: authenticatedUser,
				authenticatedUserInfo: authenticatedUserInfo,
				userData: userData,
				timestamp: Date.now()
			};

		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}
</script>

<div class="container mx-auto p-8">
	<h1 class="text-3xl font-bold mb-6">Simple Auth Test</h1>
	
	<div class="mb-6">
		<button class="btn btn-primary" onclick={testAuth} disabled={loading}>
			{loading ? 'Testing...' : 'Test Authentication'}
		</button>
	</div>

	{#if error}
		<div class="alert alert-error mb-4">
			<span>Error: {error}</span>
		</div>
	{/if}

	{#if result}
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">Auth Results</h2>
				
				<div class="grid grid-cols-2 gap-4 mb-4">
					<div>
						<strong>Authenticated:</strong> 
						<span class="badge {result.authenticated ? 'badge-success' : 'badge-error'}">
							{result.authenticated ? 'Yes' : 'No'}
						</span>
					</div>
					<div>
						<strong>Data Source:</strong> 
						<span class="badge badge-info">{result.dataSource}</span>
					</div>
				</div>

				<div class="divider">User Info</div>
				
				<div class="grid grid-cols-2 gap-4 mb-4">
					<div><strong>Name:</strong> {result.user.name}</div>
					<div><strong>Email:</strong> {result.user.email}</div>
					<div><strong>Role:</strong> 
						<span class="badge {result.user.role === 'admin' ? 'badge-success' : 'badge-info'}">
							{result.user.role}
						</span>
					</div>
					<div><strong>Plan:</strong> {result.user.plan || 'None'}</div>
				</div>

				<div class="divider">Access Levels</div>
				
				<div class="grid grid-cols-2 gap-4 mb-4">
					<div>
						<strong>Admin Access:</strong>
						<span class="badge {result.user.isAdmin ? 'badge-success' : 'badge-error'}">
							{result.user.isAdmin ? 'Yes' : 'No'}
						</span>
					</div>
					<div>
						<strong>Student Access:</strong>
						<span class="badge {result.user.isStudent ? 'badge-info' : 'badge-error'}">
							{result.user.isStudent ? 'Yes' : 'No'}
						</span>
					</div>
				</div>

				<div class="divider">Permissions</div>
				
				<div class="grid grid-cols-2 gap-4">
					<div>
						<strong>Can Create:</strong>
						<span class="badge {result.permissions.canCreateContent ? 'badge-success' : 'badge-error'}">
							{result.permissions.canCreateContent ? 'Yes' : 'No'}
						</span>
					</div>
					<div>
						<strong>Can Edit:</strong>
						<span class="badge {result.permissions.canEditContent ? 'badge-success' : 'badge-error'}">
							{result.permissions.canEditContent ? 'Yes' : 'No'}
						</span>
					</div>
					<div>
						<strong>Can Delete:</strong>
						<span class="badge {result.permissions.canDeleteContent ? 'badge-success' : 'badge-error'}">
							{result.permissions.canDeleteContent ? 'Yes' : 'No'}
						</span>
					</div>
				</div>

											<div class="mt-4 text-sm text-gray-500">
					Tested at: {new Date(result.timestamp).toLocaleString()}
				</div>
			</div>
		</div>

		<!-- Pre-authenticated User Query Result -->
		{#if result.authenticatedUserInfo}
			<div class="card bg-base-100 shadow-xl mt-6">
				<div class="card-body">
					<h3 class="card-title">Pre-authenticated Query Example</h3>
					
					<div class="alert alert-success">
						<span>{result.authenticatedUserInfo.message}</span>
					</div>
					
					<div class="divider">User Info from Pre-authenticated Query</div>
					<div class="grid grid-cols-2 gap-4">
						<div><strong>Name:</strong> {result.authenticatedUserInfo.user.name}</div>
						<div><strong>Email:</strong> {result.authenticatedUserInfo.user.email}</div>
						<div><strong>Role:</strong> 
							<span class="badge {result.authenticatedUserInfo.user.role === 'admin' ? 'badge-success' : 'badge-info'}">
								{result.authenticatedUserInfo.user.role}
							</span>
						</div>
						<div><strong>Is Admin:</strong> 
							<span class="badge {result.authenticatedUserInfo.user.isAdmin ? 'badge-success' : 'badge-error'}">
								{result.authenticatedUserInfo.user.isAdmin ? 'Yes' : 'No'}
							</span>
						</div>

						<div><strong>Plan:</strong> 
							<span class="badge badge-info">{result.authenticatedUserInfo.user.plan || 'None'}</span>
						</div>
					</div>
					
					<div class="mt-4 text-sm text-gray-500">
						Pre-authenticated query executed at: {new Date(result.authenticatedUserInfo.timestamp).toLocaleString()}
					</div>
				</div>
			</div>
		{/if}

		<!-- User Data from Database -->
		{#if result.userData}
			<div class="card bg-base-100 shadow-xl mt-6">
				<div class="card-body">
					<h3 class="card-title">Database User Data</h3>
					
					<div class="alert alert-info">
						<span>{result.userData.message}</span>
					</div>
					
					<div class="divider">User Information</div>
					<div class="grid grid-cols-2 gap-4 mb-4">
						<div><strong>Clerk Name:</strong> {result.userData.user.name}</div>
						<div><strong>DB Name:</strong> {result.userData.user.dbName || 'Not set'}</div>
						<div><strong>Email:</strong> {result.userData.user.email}</div>
						<div><strong>Role:</strong> 
							<span class="badge {result.userData.user.role === 'admin' ? 'badge-success' : 'badge-info'}">
								{result.userData.user.role}
							</span>
						</div>
						<div><strong>Has DB Record:</strong> 
							<span class="badge {result.userData.hasDbRecord ? 'badge-success' : 'badge-warning'}">
								{result.userData.hasDbRecord ? 'Yes' : 'No'}
							</span>
						</div>
						<div><strong>Plan:</strong> 
							<span class="badge badge-info">{result.userData.user.plan || 'None'}</span>
						</div>
					</div>

					{#if result.userData.cohort}
						<div class="divider">Cohort Information</div>
						<div class="grid grid-cols-2 gap-4 mb-4">
							<div><strong>Cohort Name:</strong> {result.userData.cohort.name}</div>
							<div><strong>Class Code:</strong> {result.userData.cohort.classCode || 'None'}</div>
							<div><strong>Start Year:</strong> {result.userData.cohort.startYear}</div>
							<div><strong>End Year:</strong> {result.userData.cohort.endYear}</div>
							{#if result.userData.cohort.description}
								<div class="col-span-2"><strong>Description:</strong> {result.userData.cohort.description}</div>
							{/if}
						</div>
					{:else}
						<div class="divider">Cohort Information</div>
						<div class="alert alert-warning">
							<span>No cohort assigned</span>
						</div>
					{/if}

					{#if result.userData.school}
						<div class="divider">School Information</div>
						<div class="grid grid-cols-2 gap-4 mb-4">
							<div><strong>School Name:</strong> {result.userData.school.name}</div>
							<div><strong>Description:</strong> {result.userData.school.description}</div>
						</div>
					{:else if result.userData.cohort}
						<div class="divider">School Information</div>
						<div class="alert alert-warning">
							<span>No school information available</span>
						</div>
					{/if}
					
					<div class="mt-4 text-sm text-gray-500">
						Database query executed at: {new Date(result.userData.timestamp).toLocaleString()}
					</div>
				</div>
			</div>
		{/if}

		<!-- Raw JSON Data -->
		<div class="card bg-base-100 shadow-xl mt-6">
			<div class="card-body">
				<h3 class="card-title">Raw JSON Data</h3>
				<pre class="bg-base-200 p-4 rounded overflow-auto text-sm">{JSON.stringify(result, null, 2)}</pre>
			</div>
		</div>
{/if}
</div>
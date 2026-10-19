<script lang="ts">
	import { useAuth } from 'convex-svelte';

	const auth = useAuth();
</script>

<p>{auth.isLoading ? 'loading' : auth.isAuthenticated ? 'signed-in' : 'signed-out'}</p>

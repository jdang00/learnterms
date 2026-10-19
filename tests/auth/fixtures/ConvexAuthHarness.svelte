<script lang="ts">
	import { setupConvex } from 'convex-svelte';
	import ConvexAuth from '#lib/components/ConvexAuth.svelte';
	import AuthProbe from './AuthProbe.svelte';

	setupConvex('https://example.convex.cloud');
</script>

<ConvexAuth initialToken="server_token">
	<AuthProbe />
</ConvexAuth>

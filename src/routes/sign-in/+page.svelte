<script lang="ts">
	import { SignIn } from 'svelte-clerk';
</script>

<div class="min-h-screen flex items-center justify-center">
	<SignIn path="/sign-in" routing="path" redirectUrl="/" />
</div>

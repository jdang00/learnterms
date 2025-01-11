<script lang="ts">
	import { SignUp } from 'svelte-clerk';
</script>

<div class="min-h-screen flex items-center justify-center">
	<SignUp path="/sign-up" routing="path" redirectUrl="/" />
</div>

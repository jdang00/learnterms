<script lang="ts">
    import { useQuery } from 'convex-svelte';
    import { api } from '../../convex/_generated/api.js';

    const apiAny = api as any;
    const users = useQuery(apiAny.authQueries.listUsers, {});

    const errorMessage = $derived.by(() => {
        const e = users.error;
        if (!e) return '';
        const raw = typeof e === 'string' ? e : (e as any)?.message ?? String(e);
        if (raw.includes('Unauthorized')) return 'You are not authorized to view users.';
        return 'Failed to load users. Please try again.';
    });
</script>

<div class="mt-12 px-6 w-full max-w-5xl mx-auto">
    <h1 class="text-2xl font-bold mb-4">Auth Testing</h1>

    {#if users.isLoading}
        <div class="skeleton h-24 w-full"></div>
    {:else if users.error}
        <div class="alert alert-warning border border-warning/30">
            <span>{errorMessage}</span>
        </div>
    {:else}
        <div class="overflow-x-auto rounded-lg border border-base-300">
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Clerk User ID</th>
                        <th>Cohort ID</th>
                        <th>Updated At</th>
                    </tr>
                </thead>
                <tbody>
                    {#each users.data ?? [] as u (u._id)}
                        <tr>
                            <td class="truncate max-w-[12rem]">{u._id}</td>
                            <td>{u.name}</td>
                            <td class="truncate max-w-[16rem]">{u.clerkUserId}</td>
                            <td class="truncate max-w-[12rem]">{u.cohortId ?? ''}</td>
                            <td>{new Date(u.updatedAt).toLocaleString()}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>
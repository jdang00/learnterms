<script lang="ts">
	import type { Id } from '../../convex/_generated/dataModel';
	import { useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import { X, BookOpen, CheckCircle, Flag, TrendingUp, Shield, PenTool, User, Zap, Info } from 'lucide-svelte';
	import StudentStatsContent from './StudentStatsContent.svelte';

	let {
		isOpen,
		onClose,
		student,
		cohortId,
		currentUserRole = undefined,
		currentUserClerkId = undefined,
		isDev = false,
		isAdmin = false,
		updateRole = undefined
	}: {
		isOpen: boolean;
		onClose: () => void;
		student: {
			_id: Id<'users'>;
			name: string;
			firstName?: string;
			lastName?: string;
			email?: string;
			imageUrl?: string;
			role?: 'dev' | 'admin' | 'curator' | null;
			plan?: string;
			clerkUserId?: string;
		} | null;
		cohortId: Id<'cohort'>;
		currentUserRole?: 'dev' | 'admin' | 'curator' | null;
		currentUserClerkId?: string;
		isDev?: boolean;
		isAdmin?: boolean;
		updateRole?: (userId: Id<'users'>, role: 'dev' | 'admin' | 'curator' | null) => Promise<void>;
	} = $props();

	// Check if viewing own profile
	const isOwnProfile = $derived(student?.clerkUserId === currentUserClerkId);

	// Fetch subscription status source of truth
	const subscriptionQuery = useQuery(api.polar.getUserWithSubscriptionById, () => 
		student ? { userId: student._id } : 'skip'
	);
	
	const isPro = $derived(subscriptionQuery.data?.isPro ?? false);

	// Get available role options based on current user's role
	const availableRoles = $derived.by(() => {
		const roles: Array<{ value: 'dev' | 'admin' | 'curator' | null; label: string; icon: any; color: string }> = [
			{ value: null, label: 'Student', icon: User, color: 'ghost' }
		];

		if (currentUserRole === 'dev') {
			roles.push({ value: 'curator', label: 'Curator', icon: PenTool, color: 'info' });
			roles.push({ value: 'admin', label: 'Admin', icon: Shield, color: 'primary' });
		} else if (currentUserRole === 'admin') {
			roles.push({ value: 'curator', label: 'Curator', icon: PenTool, color: 'info' });
		}
		
		return roles;
	});

	// Can edit role if: admin or dev, not own profile, and not trying to edit admin/dev
	const canEditRole = $derived.by(() => {
		if (!(isAdmin || isDev) || isOwnProfile || !student) return false;
		
		const targetRole = student.role ?? null;

		if (currentUserRole === 'dev') {
			return targetRole !== 'dev';
		} else if (currentUserRole === 'admin') {
			return targetRole === null || targetRole === 'curator';
		}
		
		return false;
	});
</script>

<dialog class="modal max-w-full p-4" class:modal-open={isOpen}>
	<div class="modal-box max-w-4xl max-h-[90vh] rounded-2xl flex flex-col">
		<!-- Header -->
		<div class="flex items-start justify-between mb-4">
			<div class="flex items-center gap-4">
				{#if student?.imageUrl}
					<div class="avatar">
						<div class="w-16 h-16 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
							<img src={student.imageUrl} alt={student.name} />
						</div>
					</div>
				{:else}
					<div class="avatar placeholder">
						<div class="bg-neutral text-neutral-content w-16 h-16 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
							<span class="text-xl">
								{student?.name
									.split(' ')
									.map((n) => n[0])
									.join('')
									.slice(0, 2)
									.toUpperCase() ?? '?'}
							</span>
						</div>
					</div>
				{/if}
				<div>
					<div class="flex items-center gap-2">
						<h3 class="text-xl font-bold">{student?.name ?? 'Student'}</h3>
						{#if student?.role === 'dev'}
							<div class="tooltip tooltip-bottom" data-tip="Developer: Full system access">
								<div class="badge badge-warning badge-sm gap-1 cursor-help">
									<Shield size={14} /> dev
								</div>
							</div>
						{:else if student?.role === 'admin'}
							<div class="tooltip tooltip-bottom" data-tip="Admin: Manage cohort & users">
								<div class="badge badge-primary badge-sm gap-1 cursor-help">
									<Shield size={14} /> admin
								</div>
							</div>
						{:else if student?.role === 'curator'}
							<div class="tooltip tooltip-bottom" data-tip="Curator: Create & edit content">
								<div class="badge badge-info badge-sm gap-1 cursor-help">
									<PenTool size={14} /> curator
								</div>
							</div>
						{/if}
						{#if isPro}
							<div class="tooltip tooltip-bottom" data-tip="Pro Plan: Active subscription">
								<div class="badge badge-secondary badge-sm gap-1 cursor-help">
									<Zap size={14} /> pro
								</div>
							</div>
						{/if}
					</div>
					{#if student?.email}
						<p class="text-sm text-base-content/60">{student.email}</p>
					{/if}
				</div>
			</div>
			<button class="btn btn-sm btn-circle btn-ghost" onclick={onClose}>
				<X size={16} />
			</button>
		</div>

		<!-- Role Management (Only if editable and not own profile) -->
		{#if canEditRole && student && !isOwnProfile && updateRole}
			<div class="bg-base-200/50 rounded-2xl p-6 mb-6">
				<div class="flex items-center gap-2 mb-4">
					<Shield size={18} class="text-primary" />
					<h4 class="font-bold">Account Management</h4>
				</div>
				
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium text-base-content/70">Access Level</span>
					</div>
					
					{#if student.role === 'dev'}
						<div class="alert alert-warning py-2 rounded-xl text-xs flex items-center gap-2">
							<Info size={14} />
							<span>Dev roles are managed via the CLI for security.</span>
						</div>
					{:else}
						<div class="flex w-full gap-2">
							{#each availableRoles as roleOption}
								<button
									class="btn btn-sm rounded-full flex-1 gap-2"
									class:btn-active={(student.role ?? null) === roleOption.value}
									class:btn-primary={(student.role ?? null) === roleOption.value && roleOption.value === 'admin'}
									class:btn-info={(student.role ?? null) === roleOption.value && roleOption.value === 'curator'}
									class:btn-neutral={(student.role ?? null) === roleOption.value && roleOption.value === null}
									onclick={() => updateRole(student._id, roleOption.value)}
								>
									<roleOption.icon size={16} />
									{roleOption.label}
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Stats Content - only mount when we have a student -->
		{#if student}
			<StudentStatsContent userId={student._id} {cohortId} />
		{:else}
			<div class="flex items-center justify-center py-8">
				<span class="loading loading-spinner loading-lg"></span>
			</div>
		{/if}

		<!-- Footer -->
		<div class="modal-action mt-4">
			<button class="btn rounded-full" onclick={onClose}>Close</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button onclick={onClose}>close</button>
	</form>
</dialog>

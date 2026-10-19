<script lang="ts">
	import type { Id } from '../../../convex/_generated/dataModel';
	import { useQuery } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api';
	import X from '@lucide/svelte/icons/x';
	import Shield from '@lucide/svelte/icons/shield';
	import PenTool from '@lucide/svelte/icons/pen-tool';
	import User from '@lucide/svelte/icons/user';
	import Zap from '@lucide/svelte/icons/zap';
	import Info from '@lucide/svelte/icons/info';
	import StudentStatsContent from './StudentStatsContent.svelte';
	import type { LucideIcon } from '@lucide/svelte';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import * as Avatar from '#lib/components/ui/avatar/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { LoadingState } from '#lib/components/ui/spinner/index.js';
	import { Tip } from '#lib/components/ui/tooltip/index.js';

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
		const roles: Array<{
			value: 'dev' | 'admin' | 'curator' | null;
			label: string;
			icon: LucideIcon;
			color: 'neutral' | 'info' | 'primary';
		}> = [{ value: null, label: 'Student', icon: User, color: 'neutral' }];

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

<Dialog.Root
	open={isOpen}
	onOpenChange={(open) => {
		if (!open) onClose();
	}}
>
	<Dialog.Content
		class="flex max-h-[90dvh] flex-col gap-0 overflow-y-auto sm:max-w-4xl"
		aria-label="Student progress"
		showCloseButton={false}
	>
		<!-- Header -->
		<div class="mb-4 flex items-start justify-between">
			<div class="flex items-center gap-4">
				{#if student?.imageUrl}
					<Avatar.Root class="size-16 ring-3 ring-primary ring-offset-background ring-offset-2">
						<Avatar.Image src={student.imageUrl} alt={student.name} />
					</Avatar.Root>
				{:else}
					<Avatar.Root class="size-16 ring-3 ring-primary ring-offset-background ring-offset-2">
						<Avatar.Fallback class="bg-neutral text-xl text-neutral-foreground">
							{student?.name
								.split(' ')
								.map((n) => n[0])
								.join('')
								.slice(0, 2)
								.toUpperCase() ?? '?'}
						</Avatar.Fallback>
					</Avatar.Root>
				{/if}
				<div>
					<div class="flex items-center gap-2">
						<h3 class="text-xl font-bold">{student?.name ?? 'Student'}</h3>
						{#if student?.role === 'dev'}
							<Tip label="Developer: Full system access" side="bottom">
								<Badge variant="solid" tone="warning" size="sm" class="cursor-help gap-1">
									<Shield size={14} /> dev
								</Badge>
							</Tip>
						{:else if student?.role === 'admin'}
							<Tip label="Admin: Manage cohort & users" side="bottom">
								<Badge variant="solid" tone="primary" size="sm" class="cursor-help gap-1">
									<Shield size={14} /> admin
								</Badge>
							</Tip>
						{:else if student?.role === 'curator'}
							<Tip label="Curator: Create & edit content" side="bottom">
								<Badge variant="solid" tone="info" size="sm" class="cursor-help gap-1">
									<PenTool size={14} /> curator
								</Badge>
							</Tip>
						{/if}
						{#if isPro}
							<Tip label="Pro Plan: Active subscription" side="bottom">
								<Badge variant="solid" tone="secondary" size="sm" class="cursor-help gap-1">
									<Zap size={14} /> pro
								</Badge>
							</Tip>
						{/if}
					</div>
					{#if student?.email}
						<p class="text-sm text-foreground/60">{student.email}</p>
					{/if}
				</div>
			</div>
			<Button
				variant="ghost"
				tone="neutral"
				size="sm"
				shape="circle"
				aria-label="Close student details"
				onclick={onClose}
			>
				<X size={16} />
			</Button>
		</div>

		<!-- Role Management (Only if editable and not own profile) -->
		{#if canEditRole && student && !isOwnProfile && updateRole}
			<div class="bg-muted/50 rounded-2xl p-6 mb-6">
				<div class="flex items-center gap-2 mb-4">
					<Shield size={18} class="text-primary" />
					<h4 class="font-bold">Account Management</h4>
				</div>

				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium text-foreground/70">Access Level</span>
					</div>

					{#if student.role === 'dev'}
						<Alert.Root tone="warning" class="rounded-xl py-2 text-xs">
							<Info size={14} />
							<Alert.Description>Dev roles are managed via the CLI for security.</Alert.Description>
						</Alert.Root>
					{:else}
						<div class="flex w-full gap-2">
							{#each availableRoles as roleOption (roleOption.value ?? 'student')}
								{@const selected = (student.role ?? null) === roleOption.value}
								<Button
									variant={selected ? 'solid' : 'soft'}
									tone={selected ? roleOption.color : 'neutral'}
									size="sm"
									class="flex-1 gap-2"
									aria-pressed={selected}
									onclick={() => updateRole(student._id, roleOption.value)}
								>
									<roleOption.icon size={16} />
									{roleOption.label}
								</Button>
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
			<LoadingState />
		{/if}

		<!-- Footer -->
		<Dialog.Footer class="mt-4">
			<Button variant="soft" tone="neutral" onclick={onClose}>Close</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

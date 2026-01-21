<script lang="ts">
	import type { Id } from '../../convex/_generated/dataModel';
	import { X, BookOpen, CheckCircle, Flag, TrendingUp } from 'lucide-svelte';
	import StudentStatsContent from './StudentStatsContent.svelte';

	let {
		isOpen,
		onClose,
		student,
		cohortId
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
		} | null;
		cohortId: Id<'cohort'>;
	} = $props();
</script>

<dialog class="modal max-w-full p-4" class:modal-open={isOpen}>
	<div class="modal-box max-w-4xl max-h-[90vh] flex flex-col">
		<!-- Header -->
		<div class="flex items-start justify-between mb-4">
			<div class="flex items-center gap-4">
				{#if student?.imageUrl}
					<div class="avatar">
						<div class="w-16 h-16 rounded-full">
							<img src={student.imageUrl} alt={student.name} />
						</div>
					</div>
				{:else}
					<div class="avatar placeholder">
						<div class="bg-neutral text-neutral-content w-16 h-16 rounded-full">
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
					<h3 class="text-xl font-bold">{student?.name ?? 'Student'}</h3>
					{#if student?.email}
						<p class="text-sm text-base-content/60">{student.email}</p>
					{/if}
				</div>
			</div>
			<button class="btn btn-sm btn-circle btn-ghost" onclick={onClose}>
				<X size={16} />
			</button>
		</div>

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
			<button class="btn" onclick={onClose}>Close</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button onclick={onClose}>close</button>
	</form>
</dialog>

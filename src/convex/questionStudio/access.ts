export function assertDocumentPermission(
	user: { role?: string; cohortId?: unknown },
	cohortId: unknown,
	manage = false
) {
	if (user.role !== 'dev' && user.cohortId !== cohortId)
		throw new Error('Unauthorized for this cohort');
	if (manage && !['dev', 'admin', 'curator'].includes(user.role ?? ''))
		throw new Error('Document management requires a curator or administrator');
}

export function assertJobBinding(
	job: {
		createdByUserId: unknown;
		documentId: unknown;
		moduleId: unknown;
		requestedCount: number;
		status: string;
		dismissedAt?: number;
	},
	userId: unknown,
	args: { documentId: unknown; moduleId: unknown; total: number }
) {
	if (
		job.createdByUserId !== userId ||
		job.documentId !== args.documentId ||
		job.moduleId !== args.moduleId ||
		job.requestedCount !== args.total
	)
		throw new Error('Generation job does not belong to this request');
	if (job.dismissedAt || job.status !== 'queued')
		throw new Error('Generation job has already started or was cancelled');
}

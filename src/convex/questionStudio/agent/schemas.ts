import { z } from 'zod/v4';
import { questionTypes } from '../questionTypes';

export const itemShapes = [
	'mechanism-effect',
	'test-purpose',
	'threshold-use',
	'distinguishing-feature',
	'diagnosis-from-findings',
	'contraindication',
	'constraint-application',
	'parallel-causes',
	'other'
] as const;

/** The plan comes first: the rule tested and why each wrong option fails. */
export const blueprintSchema = z.object({
	rule: z.string().min(10).max(400),
	shape: z.enum(itemShapes),
	discriminators: z.array(z.string().max(200)).max(5),
	/** Critical thinking: the relationships the learner must combine, at least two. */
	relationships: z.array(z.string().max(300)).max(3),
	confusions: z
		.array(
			z.object({
				option: z.string().max(260),
				misconception: z.string().max(300),
				excludedBy: z.string().max(300),
				citationId: z.string().nullable()
			})
		)
		.length(3)
});

export const agentItemSchema = z.object({
	slotId: z.string(),
	blueprint: blueprintSchema,
	stem: z.string().min(12).max(900),
	options: z.array(z.string().min(1).max(260)).length(4),
	answerIndex: z.number().int().min(0).max(3),
	rationale: z.string().min(20).max(1600),
	citationIds: z.array(z.string()).min(1).max(4)
});
export type AgentItem = z.infer<typeof agentItemSchema>;

export const findExamplesInput = z.object({
	questionType: z.enum(questionTypes),
	objective: z.string().max(400),
	limit: z.number().int().min(1).max(4)
});
export const itemsInput = z.object({ items: z.array(agentItemSchema).min(1).max(3) });
export const probeInput = z.object({
	items: z
		.array(
			z.object({
				slotId: z.string(),
				options: z.array(z.string()).length(4),
				answerIndex: z.number().int().min(0).max(3)
			})
		)
		.min(1)
		.max(3)
});
export const submitInput = z.object({
	items: z.array(agentItemSchema).max(3),
	abstentions: z.array(z.object({ slotId: z.string(), reason: z.string().max(500) })).max(3)
});

/** The auditor solves blind and maps eliminations; it never rewrites. */
export const auditSchema = z.object({
	audits: z
		.array(
			z.object({
				slotId: z.string(),
				solvedIndex: z.number().int().min(-1).max(3),
				defensibleIndices: z.array(z.number().int().min(0).max(3)).max(4),
				eliminations: z
					.array(
						z.object({
							optionIndex: z.number().int().min(0).max(3),
							basis: z.enum(['stem', 'evidence', 'both', 'none']),
							reason: z.string().max(300)
						})
					)
					.max(4),
				grounded: z.boolean(),
				typeMatches: z.boolean(),
				rationaleSound: z.boolean(),
				reasons: z.array(z.string().max(500)).min(1).max(5)
			})
		)
		.max(3)
});
export type Audit = z.infer<typeof auditSchema>['audits'][number];

export const optionsOnlySchema = z.object({
	picks: z.array(z.object({ slotId: z.string(), index: z.number().int().min(0).max(3) })).max(3)
});

export const blindSolveSchema = z.object({
	solves: z
		.array(
			z.object({
				slotId: z.string(),
				index: z.number().int().min(-1).max(3),
				defensibleIndices: z.array(z.number().int().min(0).max(3)).max(4)
			})
		)
		.max(3)
});

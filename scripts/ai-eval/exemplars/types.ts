import type { Exemplar, ExemplarTier } from '../../../src/convex/questionStudio/exemplars';
import type { EvidenceBasis, ItemStats } from '../../../src/convex/questionStudio/exemplarStats';
import type { RubricResult } from '../../../src/convex/questionStudio/exemplarText';

/** One row of tmp/exemplar-bank/bank.json. Aggregate statistics only; no learner ids. */
export type BankEntry = Exemplar & {
	tier: ExemplarTier;
	quality: number;
	basis: EvidenceBasis;
	rubric: RubricResult;
	failedGates: string[];
	labelSource: 'model' | 'heuristic';
	informal?: boolean;
	dependsOnUnseen?: boolean;
	heuristicLabel: { questionType: Exemplar['questionType']; shape: string };
	firstAttempt: ItemStats | null;
	finalSelection: ItemStats | null;
	className: string;
	moduleTitle: string;
	classId: string;
	cohortId?: string;
	moduleId: string;
	/** Text embedded for retrieval (subject + stem + correct option). */
	embedText: string;
};

export const DEFAULT_BANK_PATH = 'tmp/exemplar-bank/bank.json';

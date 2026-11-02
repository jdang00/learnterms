// Option id assignment and answer normalization. Pure, so it is unit-testable.
import {
	answerTextKey,
	matchingRole,
	parsePairToken,
	resolveOptionToken,
	splitAnswerToken
} from '../../lib/utils/matching';

export function generateOptionId(used: Set<string>): string {
	let candidate = '';
	do {
		candidate = `opt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
	} while (used.has(candidate));
	return candidate;
}

export function matchingOptionKey(text: string): string {
	return `${matchingRole(text) ?? 'other'}:${answerTextKey(text)}`;
}

export function assignOptionIds(
	inputOptions: Array<{ text: string; id?: string }>,
	existingOptions?: Array<{ id: string; text: string }>
): { optionsWithIds: Array<{ id: string; text: string }>; legacyIdMap: Map<string, string> } {
	const used = new Set<string>();
	const optionsWithIds: Array<{ id: string; text: string }> = [];
	const legacyIdMap = new Map<string, string>();

	for (let index = 0; index < inputOptions.length; index++) {
		const incoming = inputOptions[index];
		const requestedId = typeof incoming.id === 'string' ? incoming.id.trim() : '';
		const fallbackExistingId = existingOptions?.[index]?.id;

		let chosenId = '';
		if (requestedId && !used.has(requestedId)) {
			chosenId = requestedId;
		} else if (fallbackExistingId && !used.has(fallbackExistingId)) {
			chosenId = fallbackExistingId;
		} else {
			chosenId = generateOptionId(used);
		}

		used.add(chosenId);
		optionsWithIds.push({ id: chosenId, text: incoming.text });

		const legacyId = existingOptions?.[index]?.id;
		if (legacyId && legacyId !== chosenId) {
			legacyIdMap.set(legacyId, chosenId);
		}
	}

	return { optionsWithIds, legacyIdMap };
}

export function assignMatchingOptionIds(
	inputOptions: Array<{ text: string; id?: string }>,
	existingOptions?: Array<{ id: string; text: string }>
): { optionsWithIds: Array<{ id: string; text: string }>; legacyIdMap: Map<string, string> } {
	const used = new Set<string>();
	const optionsWithIds: Array<{ id: string; text: string }> = [];
	const legacyIdMap = new Map<string, string>();

	const existingById = new Map((existingOptions || []).map((opt) => [opt.id, opt]));
	const existingIdsByKey = new Map<string, string[]>();
	for (const option of existingOptions || []) {
		const key = matchingOptionKey(option.text);
		const list = existingIdsByKey.get(key) ?? [];
		list.push(option.id);
		existingIdsByKey.set(key, list);
	}

	for (let index = 0; index < inputOptions.length; index++) {
		const incoming = inputOptions[index];
		const requestedId = typeof incoming.id === 'string' ? incoming.id.trim() : '';
		const fallbackExistingId = existingOptions?.[index]?.id;
		const key = matchingOptionKey(incoming.text);

		let chosenId = '';
		if (
			requestedId &&
			!used.has(requestedId) &&
			existingById.has(requestedId) &&
			matchingOptionKey(existingById.get(requestedId)!.text) === key
		) {
			chosenId = requestedId;
		} else {
			const sameTextCandidates = existingIdsByKey.get(key) ?? [];
			const nextCandidate = sameTextCandidates.find((id) => !used.has(id));
			if (nextCandidate) {
				chosenId = nextCandidate;
			} else if (fallbackExistingId && !used.has(fallbackExistingId)) {
				chosenId = fallbackExistingId;
			} else {
				chosenId = generateOptionId(used);
			}
		}

		used.add(chosenId);
		optionsWithIds.push({ id: chosenId, text: incoming.text });

		const legacyId = existingOptions?.[index]?.id;
		if (legacyId && legacyId !== chosenId) {
			legacyIdMap.set(legacyId, chosenId);
		}
	}

	return { optionsWithIds, legacyIdMap };
}

export function assignFreshOptionIds(inputOptions: Array<{ text: string; id?: string }>): {
	optionsWithIds: Array<{ id: string; text: string }>;
	legacyIdMap: Map<string, string>;
} {
	const used = new Set<string>();
	const optionsWithIds: Array<{ id: string; text: string }> = [];
	const legacyIdMap = new Map<string, string>();

	for (const incoming of inputOptions) {
		const newId = generateOptionId(used);
		used.add(newId);
		optionsWithIds.push({ id: newId, text: incoming.text });

		const previousId = typeof incoming.id === 'string' ? incoming.id.trim() : '';
		if (previousId) {
			legacyIdMap.set(previousId, newId);
		}
	}

	return { optionsWithIds, legacyIdMap };
}

export function normalizeStandardCorrectAnswers(
	rawCorrectAnswers: string[],
	optionsWithIds: Array<{ id: string; text: string }>,
	legacyIdMap?: Map<string, string>
): string[] {
	const optionIdSet = new Set(optionsWithIds.map((o) => o.id));
	const normalized: string[] = [];
	const seen = new Set<string>();

	for (const token of rawCorrectAnswers || []) {
		const resolved = resolveOptionToken(String(token), optionsWithIds, legacyIdMap);
		if (!resolved || !optionIdSet.has(resolved) || seen.has(resolved)) continue;
		normalized.push(resolved);
		seen.add(resolved);
	}

	return normalized;
}

export function normalizeMatchingCorrectAnswers(
	rawCorrectAnswers: string[],
	optionsWithIds: Array<{ id: string; text: string }>,
	legacyIdMap?: Map<string, string>
): string[] {
	const promptIds = optionsWithIds
		.filter((o) => matchingRole(o.text) === 'prompt')
		.map((o) => o.id);
	const answerIdSet = new Set(
		optionsWithIds.filter((o) => matchingRole(o.text) === 'answer').map((o) => o.id)
	);
	const promptIdSet = new Set(promptIds);
	const normalized: string[] = [];
	const usedPrompts = new Set<string>();

	for (const rawPair of rawCorrectAnswers || []) {
		const parsed = parsePairToken(String(rawPair));
		if (!parsed) continue;

		const promptId = resolveOptionToken(parsed.promptToken, optionsWithIds, legacyIdMap);
		if (!promptId || !promptIdSet.has(promptId) || usedPrompts.has(promptId)) continue;

		const candidateAnswerIds = splitAnswerToken(parsed.answerToken)
			.map((token) => resolveOptionToken(token, optionsWithIds, legacyIdMap))
			.filter((id): id is string => Boolean(id))
			.filter((id) => answerIdSet.has(id));

		if (candidateAnswerIds.length === 0) continue;

		normalized.push(`${promptId}::${candidateAnswerIds[0]}`);
		usedPrompts.add(promptId);
	}

	if (normalized.length > 0) {
		return normalized;
	}

	// Legacy fallback: answer IDs aligned with prompt order.
	const fallbackPairs = promptIds
		.map((promptId, index) => {
			const answerToken = String(rawCorrectAnswers?.[index] ?? '');
			const resolvedAnswerId = resolveOptionToken(answerToken, optionsWithIds, legacyIdMap);
			if (!resolvedAnswerId || !answerIdSet.has(resolvedAnswerId)) return null;
			return `${promptId}::${resolvedAnswerId}`;
		})
		.filter((pair): pair is string => Boolean(pair));

	if (fallbackPairs.length > 0) return fallbackPairs;

	// Last-resort fallback: zip prompt/answer order.
	const answerIds = optionsWithIds
		.filter((o) => matchingRole(o.text) === 'answer')
		.map((o) => o.id);
	const zipped: string[] = [];
	const n = Math.min(promptIds.length, answerIds.length);
	for (let i = 0; i < n; i++) {
		zipped.push(`${promptIds[i]}::${answerIds[i]}`);
	}
	return zipped;
}

export function convertQuestionType(type: string): string {
	return type.toLowerCase().replace(/\s+/g, '_');
}

export function assertPairFormattedAnswers(correctAnswers: string[] | undefined) {
	if (!(correctAnswers || []).every((s) => String(s).includes('::'))) {
		throw new Error(
			'Matching questions must use pair-formatted correctAnswers (promptToken::answerToken)'
		);
	}
}

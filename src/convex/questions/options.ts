// Option id assignment and answer normalization. Pure, so it is unit-testable.

export function generateOptionId(used: Set<string>): string {
	let candidate = '';
	do {
		candidate = `opt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
	} while (used.has(candidate));
	return candidate;
}

export function matchingRoleFromText(text: string): 'prompt' | 'answer' | null {
	const normalized = String(text ?? '')
		.trimStart()
		.toLowerCase();
	if (normalized.startsWith('prompt:')) return 'prompt';
	if (normalized.startsWith('answer:')) return 'answer';
	return null;
}

export function normalizeWhitespaceLower(value: string): string {
	return String(value ?? '')
		.trim()
		.toLowerCase()
		.replace(/\s+/g, ' ');
}

export function matchingOptionKey(text: string): string {
	const role = matchingRoleFromText(text) ?? 'other';
	const withoutPrefix =
		role === 'prompt'
			? String(text ?? '').replace(/^\s*prompt:\s*/i, '')
			: role === 'answer'
				? String(text ?? '').replace(/^\s*answer:\s*/i, '')
				: String(text ?? '');
	return `${role}:${normalizeWhitespaceLower(withoutPrefix)}`;
}

export function parseMatchingPairToken(
	value: string
): { promptToken: string; answerToken: string } | null {
	const raw = String(value ?? '').trim();
	const sep = raw.indexOf('::');
	if (sep <= 0) return null;
	const promptToken = raw.slice(0, sep).trim();
	const answerToken = raw.slice(sep + 2).trim();
	if (!promptToken || !answerToken) return null;
	return { promptToken, answerToken };
}

export function splitAnswerToken(answerToken: string): string[] {
	return String(answerToken ?? '')
		.split('|')
		.map((part) => part.trim())
		.filter((part) => part.length > 0);
}

export function resolveOptionTokenToId(
	token: string,
	optionsWithIds: Array<{ id: string; text: string }>,
	legacyIdMap?: Map<string, string>
): string | null {
	const raw = String(token ?? '').trim();
	if (!raw) return null;
	if (legacyIdMap?.has(raw)) return legacyIdMap.get(raw)!;

	const byExact = optionsWithIds.find((option) => option.id === raw);
	if (byExact) return byExact.id;

	if (/^\d+$/.test(raw)) {
		const index = Number(raw);
		if (Number.isInteger(index) && index >= 0 && index < optionsWithIds.length) {
			return optionsWithIds[index].id;
		}
	}

	return null;
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
		const resolved = resolveOptionTokenToId(String(token), optionsWithIds, legacyIdMap);
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
		.filter((o) => matchingRoleFromText(o.text) === 'prompt')
		.map((o) => o.id);
	const answerIdSet = new Set(
		optionsWithIds.filter((o) => matchingRoleFromText(o.text) === 'answer').map((o) => o.id)
	);
	const promptIdSet = new Set(promptIds);
	const normalized: string[] = [];
	const usedPrompts = new Set<string>();

	for (const rawPair of rawCorrectAnswers || []) {
		const parsed = parseMatchingPairToken(String(rawPair));
		if (!parsed) continue;

		const promptId = resolveOptionTokenToId(parsed.promptToken, optionsWithIds, legacyIdMap);
		if (!promptId || !promptIdSet.has(promptId) || usedPrompts.has(promptId)) continue;

		const candidateAnswerIds = splitAnswerToken(parsed.answerToken)
			.map((token) => resolveOptionTokenToId(token, optionsWithIds, legacyIdMap))
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
			const resolvedAnswerId = resolveOptionTokenToId(answerToken, optionsWithIds, legacyIdMap);
			if (!resolvedAnswerId || !answerIdSet.has(resolvedAnswerId)) return null;
			return `${promptId}::${resolvedAnswerId}`;
		})
		.filter((pair): pair is string => Boolean(pair));

	if (fallbackPairs.length > 0) return fallbackPairs;

	// Last-resort fallback: zip prompt/answer order.
	const answerIds = optionsWithIds
		.filter((o) => matchingRoleFromText(o.text) === 'answer')
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

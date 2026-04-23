export type GradeBand = {
	id: string;
	label: string;
	minPercentage: number;
	maxPercentage?: number | null;
	colorHint?: string | null;
};

export type CalculatorRuleset = {
	_id: string;
	name: string;
	slug: string;
	calculationMode: 'points' | 'weighted' | 'percentage' | 'hybrid';
	status: 'draft' | 'active' | 'archived';
	roundingStrategy: 'none' | 'nearest_hundredth' | 'nearest_tenth' | 'nearest_whole';
	passingPercentage: number | null;
	gradeBands: GradeBand[];
	policies: {
		allowAttendance: boolean;
		allowBonus: boolean;
		allowDrops: boolean;
		allowReplacements: boolean;
	};
};

export type CalculatorEntryInstance = {
	id: string;
	label: string;
	pointsPossible?: number | null;
	note?: string | null;
};

export type CalculatorEntry = {
	id: string;
	slug: string;
	name: string;
	shortLabel?: string | null;
	category:
		| 'assignment'
		| 'quiz'
		| 'exam'
		| 'project'
		| 'lab'
		| 'attendance'
		| 'participation'
		| 'custom';
	inputType: 'points' | 'percentage' | 'attendance' | 'pass_fail' | 'letter';
	contributionType?: 'standard' | 'bonus';
	aggregation: 'single' | 'set' | 'running_total';
	weight?: number | null;
	pointsPossible?: number | null;
	quantity?: number | null;
	instancePoints?: number[] | null;
	instanceLabels?: string[] | null;
	instances?: CalculatorEntryInstance[] | null;
	dropLowestCount?: number | null;
	required: boolean;
	rules?: {
		replacementSourceEntryIds?: string[] | null;
		replacementCondition?: 'if_higher' | 'always' | null;
		bonusTargetEntryId?: string | null;
		bonusCap?: number | null;
		attendanceValuePerSession?: number | null;
		notes?: string | null;
	} | null;
};

export type CalculatorCourse = {
	_id: string;
	name: string;
	slug: string;
	code: string | null;
	description: string | null;
	institution: string | null;
	sourceDocument: string | null;
	status: 'draft' | 'active' | 'archived';
	termLabel: string | null;
	instructor: string | null;
	entryCount: number;
	trackedItemCount: number;
	entries: CalculatorEntry[];
	ruleset: CalculatorRuleset | null;
};

export type ItemInputMap = Record<string, string>;

export type TrackableItem = {
	key: string;
	label: string;
	note: string | null;
	pointsPossible: number | null;
	inputType: CalculatorEntry['inputType'];
	contributionType: 'standard' | 'bonus';
};

export type ExpandedEntry = {
	entry: CalculatorEntry;
	items: TrackableItem[];
};

export type CalculationSummary = {
	mode: CalculatorRuleset['calculationMode'] | 'unknown';
	currentPercentage: number | null;
	projectedPercentage: number | null;
	currentLetter: string | null;
	projectedLetter: string | null;
	enteredItemCount: number;
	totalItemCount: number;
	enteredShare: number | null;
	totalKnownPossible: number | null;
	enteredPossible: number | null;
	earnedPoints: number | null;
	bonusPoints: number | null;
	totalWeight: number | null;
	enteredWeight: number | null;
};

function roundValue(value: number, strategy: CalculatorRuleset['roundingStrategy']) {
	switch (strategy) {
		case 'nearest_whole':
			return Math.round(value);
		case 'nearest_tenth':
			return Math.round(value * 10) / 10;
		case 'nearest_hundredth':
			return Math.round(value * 100) / 100;
		case 'none':
		default:
			return value;
	}
}

export function getLetterGrade(percentage: number | null, ruleset: CalculatorRuleset | null) {
	if (percentage === null || !ruleset) return null;
	const bands = [...ruleset.gradeBands].sort((a, b) => b.minPercentage - a.minPercentage);
	const match = bands.find((band) => {
		if (percentage < band.minPercentage) return false;
		if (band.maxPercentage === undefined || band.maxPercentage === null) return true;
		return percentage <= band.maxPercentage;
	});
	return match?.label ?? null;
}

export function expandEntry(entry: CalculatorEntry): ExpandedEntry {
	const contributionType = entry.contributionType ?? 'standard';
	const items: TrackableItem[] = [];

	if (entry.instances && entry.instances.length > 0) {
		for (const instance of entry.instances) {
			items.push({
				key: `${entry.id}::${instance.id}`,
				label: instance.label,
				note: instance.note ?? null,
				pointsPossible: instance.pointsPossible ?? entry.pointsPossible ?? null,
				inputType: entry.inputType,
				contributionType
			});
		}

		return { entry, items };
	}

	if (
		entry.quantity ||
		(entry.instanceLabels && entry.instanceLabels.length > 0) ||
		(entry.instancePoints && entry.instancePoints.length > 0)
	) {
		const labels = entry.instanceLabels ?? [];
		const points = entry.instancePoints ?? [];
		const count = Math.max(entry.quantity ?? 0, labels.length, points.length);

		for (let index = 0; index < count; index += 1) {
			items.push({
				key: `${entry.id}::${index + 1}`,
				label: labels[index] ?? `${entry.name} ${index + 1}`,
				note: null,
				pointsPossible: points[index] ?? entry.pointsPossible ?? null,
				inputType: entry.inputType,
				contributionType
			});
		}

		return { entry, items };
	}

	return {
		entry,
		items: [
			{
				key: entry.id,
				label: entry.name,
				note: null,
				pointsPossible: entry.pointsPossible ?? null,
				inputType: entry.inputType,
				contributionType
			}
		]
	};
}

export function expandCourseEntries(course: CalculatorCourse | null) {
	if (!course) return [];
	return course.entries.map((entry) => expandEntry(entry));
}

function parseNumericValue(raw: string | undefined) {
	if (raw === undefined || raw.trim() === '') return null;
	const value = Number(raw);
	return Number.isFinite(value) ? value : null;
}

function getItemScoreRatio(item: TrackableItem, value: number | null) {
	if (value === null) return null;

	if (item.inputType === 'percentage') {
		return value / 100;
	}

	if (item.inputType === 'points' || item.inputType === 'attendance') {
		if (!item.pointsPossible || item.pointsPossible <= 0) return null;
		return value / item.pointsPossible;
	}

	if (item.inputType === 'pass_fail') {
		return value > 0 ? 1 : 0;
	}

	return null;
}

function getWeightedEntryBasePoints(entry: ExpandedEntry) {
	const standardItems = entry.items.filter((item) => item.contributionType === 'standard');
	if (standardItems.length === 0) return null;

	if (
		standardItems.every(
			(item) =>
				item.inputType !== 'percentage' &&
				item.pointsPossible !== null &&
				item.pointsPossible !== undefined &&
				item.pointsPossible > 0
		)
	) {
		return standardItems.reduce((sum, item) => sum + (item.pointsPossible ?? 0), 0);
	}

	return null;
}

function getDroppedEnteredItemKeys(
	entry: CalculatorEntry,
	scoredItems: Array<{ item: TrackableItem; value: number }>
) {
	const dropCount = Math.max(0, entry.dropLowestCount ?? 0);
	if (dropCount === 0 || scoredItems.length === 0) return new Set<string>();

	const ranked = scoredItems
		.filter(({ item }) => item.pointsPossible !== null && item.pointsPossible > 0)
		.map(({ item, value }) => ({
			key: item.key,
			ratio: value / (item.pointsPossible ?? 1),
			earned: value,
			pointsPossible: item.pointsPossible ?? 0
		}))
		.sort((a, b) => {
			if (a.ratio !== b.ratio) return a.ratio - b.ratio;
			if (a.earned !== b.earned) return a.earned - b.earned;
			if (a.pointsPossible !== b.pointsPossible) return a.pointsPossible - b.pointsPossible;
			return a.key.localeCompare(b.key);
		});

	return new Set(ranked.slice(0, dropCount).map((candidate) => candidate.key));
}

function getDroppedProjectedItemKeys(entry: CalculatorEntry, items: TrackableItem[]) {
	const dropCount = Math.max(0, entry.dropLowestCount ?? 0);
	if (dropCount === 0 || items.length === 0) return new Set<string>();

	const ranked = items
		.filter((item) => item.pointsPossible !== null && item.pointsPossible > 0)
		.map((item) => ({
			key: item.key,
			pointsPossible: item.pointsPossible ?? 0
		}))
		.sort((a, b) => {
			if (a.pointsPossible !== b.pointsPossible) return a.pointsPossible - b.pointsPossible;
			return a.key.localeCompare(b.key);
		});

	return new Set(ranked.slice(0, dropCount).map((candidate) => candidate.key));
}

function getDroppedWeightedItemKeys(
	entry: CalculatorEntry,
	candidates: Array<{ key: string; ratio: number; share: number }>
) {
	const dropCount = Math.max(0, entry.dropLowestCount ?? 0);
	if (dropCount === 0 || candidates.length === 0) return new Set<string>();

	const ranked = [...candidates].sort((a, b) => {
		if (a.ratio !== b.ratio) return a.ratio - b.ratio;
		if (a.share !== b.share) return a.share - b.share;
		return a.key.localeCompare(b.key);
	});

	return new Set(ranked.slice(0, dropCount).map((candidate) => candidate.key));
}

export function calculateCourseSummary(
	course: CalculatorCourse | null,
	inputs: ItemInputMap
): CalculationSummary {
	if (!course || !course.ruleset) {
		return {
			mode: 'unknown',
			currentPercentage: null,
			projectedPercentage: null,
			currentLetter: null,
			projectedLetter: null,
			enteredItemCount: 0,
			totalItemCount: 0,
			enteredShare: null,
			totalKnownPossible: null,
			enteredPossible: null,
			earnedPoints: null,
			bonusPoints: null,
			totalWeight: null,
			enteredWeight: null
		};
	}

	const expandedEntries = expandCourseEntries(course);
	let enteredItemCount = 0;
	let totalItemCount = 0;

	if (course.ruleset.calculationMode === 'weighted') {
		let totalWeight = 0;
		let enteredWeight = 0;
		let earnedWeight = 0;
		let bonusPoints = 0;
		const expandedByEntryId = new Map(
			expandedEntries.map((expanded) => [expanded.entry.id, expanded])
		);

		for (const expanded of expandedEntries) {
			const entry = expanded.entry;
			const standardWeight = entry.weight ?? 0;
			const standardItems = expanded.items.filter((item) => item.contributionType === 'standard');
			totalItemCount += standardItems.length;

			if (standardWeight > 0 && entry.contributionType !== 'bonus') {
				totalWeight += standardWeight;
			}

			const validItems = standardItems.filter(
				(item) =>
					item.inputType === 'percentage' ||
					(item.pointsPossible !== null && item.pointsPossible > 0)
			);
			const shareBase =
				validItems.length > 0 &&
				validItems.every((item) => item.pointsPossible !== null && item.pointsPossible > 0)
					? validItems.reduce((sum, item) => sum + (item.pointsPossible ?? 0), 0)
					: validItems.length;

			const scoredItems = validItems
				.map((item) => {
					const value = parseNumericValue(inputs[item.key]);
					const ratio = getItemScoreRatio(item, value);
					const share =
						validItems.length === 0 || shareBase === 0
							? 0
							: standardWeight *
								(item.pointsPossible !== null &&
								item.pointsPossible > 0 &&
								validItems.every(
									(candidate) => candidate.pointsPossible !== null && candidate.pointsPossible > 0
								)
									? (item.pointsPossible ?? 0) / shareBase
									: 1 / validItems.length);

					if (value === null || ratio === null) return null;

					return {
						key: item.key,
						ratio,
						share
					};
				})
				.filter((item): item is { key: string; ratio: number; share: number } => item !== null);
			const droppedWeightedKeys = getDroppedWeightedItemKeys(entry, scoredItems);

			for (const item of scoredItems) {
				if (droppedWeightedKeys.has(item.key)) continue;

				enteredItemCount += 1;
				enteredWeight += item.share;
				earnedWeight += item.share * item.ratio;
			}
		}

		for (const expanded of expandedEntries) {
			const entry = expanded.entry;
			if ((entry.contributionType ?? 'standard') !== 'bonus') continue;

			const targetEntryId = entry.rules?.bonusTargetEntryId;
			if (!targetEntryId) continue;
			const targetExpanded = expandedByEntryId.get(targetEntryId);
			if (!targetExpanded) continue;

			const targetWeight = targetExpanded.entry.weight ?? 0;
			const targetBasePoints = getWeightedEntryBasePoints(targetExpanded);
			if (!targetWeight || !targetBasePoints || targetBasePoints <= 0) continue;

			for (const item of expanded.items) {
				totalItemCount += 1;
				const value = parseNumericValue(inputs[item.key]);
				if (value === null) continue;

				enteredItemCount += 1;
				bonusPoints += value;
				earnedWeight += (value / targetBasePoints) * targetWeight;
			}
		}

		const currentPercentage =
			enteredWeight > 0
				? roundValue((earnedWeight / enteredWeight) * 100, course.ruleset.roundingStrategy)
				: null;
		const projectedPercentage =
			totalWeight > 0
				? roundValue((earnedWeight / totalWeight) * 100, course.ruleset.roundingStrategy)
				: null;

		return {
			mode: course.ruleset.calculationMode,
			currentPercentage,
			projectedPercentage,
			currentLetter: getLetterGrade(currentPercentage, course.ruleset),
			projectedLetter: getLetterGrade(projectedPercentage, course.ruleset),
			enteredItemCount,
			totalItemCount,
			enteredShare: totalItemCount > 0 ? enteredItemCount / totalItemCount : null,
			totalKnownPossible: null,
			enteredPossible: null,
			earnedPoints: null,
			bonusPoints,
			totalWeight,
			enteredWeight
		};
	}

	if (
		course.ruleset.calculationMode === 'percentage' ||
		course.ruleset.calculationMode === 'hybrid'
	) {
		throw new Error(`Unsupported calculation mode: ${course.ruleset.calculationMode}`);
	}

	let totalKnownPossible = 0;
	let enteredPossible = 0;
	let earnedPoints = 0;
	let bonusPoints = 0;

	for (const expanded of expandedEntries) {
		const standardItems = expanded.items.filter((item) => item.contributionType !== 'bonus');
		const bonusItems = expanded.items.filter((item) => item.contributionType === 'bonus');

		for (const item of expanded.items) {
			totalItemCount += 1;
			const value = parseNumericValue(inputs[item.key]);
			if (value !== null) {
				enteredItemCount += 1;
			}
		}

		for (const item of bonusItems) {
			const value = parseNumericValue(inputs[item.key]);
			if (value !== null) {
				bonusPoints += value;
			}
		}

		const projectableItems = standardItems.filter(
			(item) => item.pointsPossible !== null && item.pointsPossible > 0
		);
		const droppedProjectedKeys = getDroppedProjectedItemKeys(expanded.entry, projectableItems);

		for (const item of projectableItems) {
			if (droppedProjectedKeys.has(item.key)) continue;
			totalKnownPossible += item.pointsPossible ?? 0;
		}

		const enteredStandardScores = standardItems
			.map((item) => ({
				item,
				value: parseNumericValue(inputs[item.key])
			}))
			.filter(
				(candidate): candidate is { item: TrackableItem; value: number } =>
					candidate.value !== null &&
					candidate.item.pointsPossible !== null &&
					candidate.item.pointsPossible > 0
			);
		const droppedEnteredKeys = getDroppedEnteredItemKeys(expanded.entry, enteredStandardScores);

		for (const { item, value } of enteredStandardScores) {
			if (droppedEnteredKeys.has(item.key)) continue;
			enteredPossible += item.pointsPossible ?? 0;
			earnedPoints += value;
		}
	}

	const currentPercentage =
		enteredPossible > 0
			? roundValue(
					((earnedPoints + bonusPoints) / enteredPossible) * 100,
					course.ruleset.roundingStrategy
				)
			: null;
	const projectedPercentage =
		totalKnownPossible > 0
			? roundValue(
					((earnedPoints + bonusPoints) / totalKnownPossible) * 100,
					course.ruleset.roundingStrategy
				)
			: null;

	return {
		mode: course.ruleset.calculationMode,
		currentPercentage,
		projectedPercentage,
		currentLetter: getLetterGrade(currentPercentage, course.ruleset),
		projectedLetter: getLetterGrade(projectedPercentage, course.ruleset),
		enteredItemCount,
		totalItemCount,
		enteredShare: totalItemCount > 0 ? enteredItemCount / totalItemCount : null,
		totalKnownPossible,
		enteredPossible,
		earnedPoints,
		bonusPoints,
		totalWeight: null,
		enteredWeight: null
	};
}

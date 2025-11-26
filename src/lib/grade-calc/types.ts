export type ComponentType = 'single' | 'group' | 'attendance';
export type CalculationType = 'points' | 'percentage';

export interface GradeScaleEntry {
	label: string;
	min: number;
}

export interface GradeScale {
	A: GradeScaleEntry;
	B: GradeScaleEntry;
	C: GradeScaleEntry;
	F: GradeScaleEntry;
}

export interface ComponentInstance {
	maxPoints?: number;
	maxScore?: number;
	earnedPoints?: number | null;
	earnedScore?: number | null;
	replaced?: boolean;
}

export interface ReplacementRule {
	enabled: boolean;
	sourceComponentId: string;
	maxReplacements: number;
	condition: 'if_higher';
}

export interface BonusRule {
	enabled: boolean;
	condition: 'source_average_exceeds_this';
	sourceComponentIds: string[];
	maxBonus: number;
	calculationMethod: 'difference';
}

export interface Component {
	id: string;
	name: string;
	type: ComponentType;

	maxPoints?: number;
	maxScore?: number;
	weight?: number;

	instances?: ComponentInstance[];
	instanceCount?: number;
	pointsPerInstance?: number;
	dropLowest?: number;

	sessionsTotal?: number;

	replacementRule?: ReplacementRule;
	bonusRule?: BonusRule;
}

export interface Course {
	id: string;
	code: string;
	name: string;
	instructor: string;
	calculationType: CalculationType;
	totalPoints?: number;
	gradingScale: GradeScale;
	components: Component[];
}

export type SingleInput = {
	earnedPoints: number | null;
	earnedScore?: number | null;
};

export type GroupInput = {
	instances: Array<{
		earnedPoints: number | null;
		earnedScore?: number | null;
	}>;
};

export type AttendanceInput = {
	sessionsAttended: number | null;
};

export type CourseInputs = Record<string, SingleInput | GroupInput | AttendanceInput>;



export type CohortItem = {
	_id: string;
	name: string;
	schoolName?: string;
	startYear?: string;
	endYear?: string;
	classCode?: string;
	stats?: {
		totalStudents?: number;
		totalQuestions?: number;
		totalModules?: number;
		averageCompletion?: number;
	};
};

export type QuickLinkItem = {
	title: string;
	description: string;
	href: string;
	icon: string;
};

export type CohortClassSearchItem = {
	_id: string;
	name: string;
	code: string;
	description: string;
	semesterName: string | null;
};

export type CohortModuleSearchItem = {
	_id: string;
	title: string;
	description: string;
	classId: string;
	className: string;
	classCode: string;
	emoji?: string;
	status: string;
	questionCount: number;
};

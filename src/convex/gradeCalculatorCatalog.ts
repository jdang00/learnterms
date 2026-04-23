export type SeedGradeBand = {
	id: string;
	label: string;
	minPercentage: number;
	maxPercentage?: number;
	colorHint?: string;
};

export type SeedRuleset = {
	slug: string;
	name: string;
	description: string;
	status: 'draft' | 'active' | 'archived';
	calculationMode: 'points' | 'weighted' | 'percentage' | 'hybrid';
	roundingStrategy: 'none' | 'nearest_hundredth' | 'nearest_tenth' | 'nearest_whole';
	passingPercentage?: number;
	gradeBands: SeedGradeBand[];
	policies: {
		allowAttendance: boolean;
		allowBonus: boolean;
		allowDrops: boolean;
		allowReplacements: boolean;
	};
};

export type SeedCourseEntry = {
	id: string;
	slug: string;
	name: string;
	shortLabel?: string;
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
	weight?: number;
	pointsPossible?: number;
	quantity?: number;
	instancePoints?: number[];
	instanceLabels?: string[];
	instances?: Array<{
		id: string;
		label: string;
		pointsPossible?: number;
		note?: string;
	}>;
	dropLowestCount?: number;
	required: boolean;
	rules?: {
		replacementSourceEntryIds?: string[];
		replacementCondition?: 'if_higher' | 'always';
		bonusCap?: number;
		attendanceValuePerSession?: number;
		notes?: string;
	};
};

export type SeedCourse = {
	name: string;
	code: string;
	sourceDocument: string;
	description: string;
	institution: string;
	termLabel: string;
	status: 'draft' | 'active' | 'archived';
	rulesetSlug: string;
	entries: SeedCourseEntry[];
};

export const initialRulesets: SeedRuleset[] = [
	{
		slug: 'weighted-standard-90',
		name: 'Weighted Standard 90',
		description: 'Weighted grading with A/B/C/F cutoffs at 90/80/70.',
		status: 'draft',
		calculationMode: 'weighted',
		roundingStrategy: 'nearest_hundredth',
		passingPercentage: 70,
		gradeBands: [
			{ id: 'a', label: 'A', minPercentage: 90, colorHint: 'success' },
			{ id: 'b', label: 'B', minPercentage: 80, maxPercentage: 89.99, colorHint: 'info' },
			{ id: 'c', label: 'C', minPercentage: 70, maxPercentage: 79.99, colorHint: 'warning' },
			{ id: 'f', label: 'F', minPercentage: 0, maxPercentage: 69.99, colorHint: 'error' }
		],
		policies: {
			allowAttendance: true,
			allowBonus: true,
			allowDrops: true,
			allowReplacements: true
		}
	},
	{
		slug: 'weighted-standard-89-9',
		name: 'Weighted Standard 89.9',
		description: 'Weighted grading with A/B/C/F cutoffs at 89.90/79.90/69.90 and no D band.',
		status: 'draft',
		calculationMode: 'weighted',
		roundingStrategy: 'nearest_hundredth',
		passingPercentage: 69.9,
		gradeBands: [
			{ id: 'a', label: 'A', minPercentage: 89.9, colorHint: 'success' },
			{ id: 'b', label: 'B', minPercentage: 79.9, maxPercentage: 89.89, colorHint: 'info' },
			{ id: 'c', label: 'C', minPercentage: 69.9, maxPercentage: 79.89, colorHint: 'warning' },
			{ id: 'f', label: 'F', minPercentage: 0, maxPercentage: 69.89, colorHint: 'error' }
		],
		policies: {
			allowAttendance: true,
			allowBonus: true,
			allowDrops: true,
			allowReplacements: true
		}
	},
	{
		slug: 'points-standard-90',
		name: 'Points Standard 90',
		description: 'Points-based grading with percentage thresholds at 90/80/70.',
		status: 'draft',
		calculationMode: 'points',
		roundingStrategy: 'nearest_hundredth',
		passingPercentage: 70,
		gradeBands: [
			{ id: 'a', label: 'A', minPercentage: 90, colorHint: 'success' },
			{ id: 'b', label: 'B', minPercentage: 80, maxPercentage: 89.99, colorHint: 'info' },
			{ id: 'c', label: 'C', minPercentage: 70, maxPercentage: 79.99, colorHint: 'warning' },
			{ id: 'f', label: 'F', minPercentage: 0, maxPercentage: 69.99, colorHint: 'error' }
		],
		policies: {
			allowAttendance: true,
			allowBonus: true,
			allowDrops: true,
			allowReplacements: true
		}
	},
	{
		slug: 'points-standard-92',
		name: 'Points Standard 92',
		description: 'Points-based grading with percentage thresholds at 92/84/76.',
		status: 'draft',
		calculationMode: 'points',
		roundingStrategy: 'nearest_hundredth',
		passingPercentage: 76,
		gradeBands: [
			{ id: 'a', label: 'A', minPercentage: 92, colorHint: 'success' },
			{ id: 'b', label: 'B', minPercentage: 84, maxPercentage: 91.99, colorHint: 'info' },
			{ id: 'c', label: 'C', minPercentage: 76, maxPercentage: 83.99, colorHint: 'warning' },
			{ id: 'f', label: 'F', minPercentage: 0, maxPercentage: 75.99, colorHint: 'error' }
		],
		policies: {
			allowAttendance: true,
			allowBonus: true,
			allowDrops: true,
			allowReplacements: true
		}
	}
];

export const initialCourses: SeedCourse[] = [
	{
		name: 'Ocular Pharmacology',
		code: 'OPT.5203',
		sourceDocument: 'Ocular Pharm 2026 Syllabus.docx',
		description:
			'Weighted course with a quizzes and activities bucket, three midterms, and a final exam. Blackboard currently shows three quizzes plus a Medication Choices Assignment, each entered as a score out of 20. This calculator does not consider the Antibiotics Review Extra Credit yet because it is ambiguous how Blackboard incorporates it.',
		institution: 'NSU Oklahoma College of Optometry',
		termLabel: 'Spring 2026',
		status: 'draft',
		rulesetSlug: 'weighted-standard-90',
		entries: [
			{
				id: 'quizzes-activities',
				slug: 'quizzes-activities',
				name: 'Quizzes / Activities',
				category: 'quiz',
				inputType: 'points',
				aggregation: 'set',
				weight: 10,
				instances: [
					{
						id: 'rx-ocular-se-quiz',
						label: "Rx/Ocular SE's Quiz",
						pointsPossible: 20
					},
					{
						id: 'antibiotics-quiz',
						label: 'Antibiotics Quiz',
						pointsPossible: 20
					},
					{
						id: 'steroids-nsaids-quiz',
						label: 'Steroids/NSAIDs Quiz',
						pointsPossible: 20
					},
					{
						id: 'medication-choices-assignment',
						label: 'Medication Choices Assignment',
						pointsPossible: 20
					}
				],
				required: true,
				rules: {
					notes:
						'This 10% category is calculated from Blackboard point entries and then weighted into the course total.'
				}
			},
			{
				id: 'midterm-1',
				slug: 'midterm-1',
				name: 'Midterm #1',
				category: 'exam',
				inputType: 'points',
				aggregation: 'single',
				weight: 20,
				pointsPossible: 40,
				required: true,
				rules: { notes: 'Scheduled for Feb 18, 2026. Enter as points out of 40.' }
			},
			{
				id: 'midterm-2',
				slug: 'midterm-2',
				name: 'Midterm #2',
				category: 'exam',
				inputType: 'points',
				aggregation: 'single',
				weight: 20,
				pointsPossible: 40,
				required: true,
				rules: { notes: 'Scheduled for Mar 25, 2026. Enter as points out of 40.' }
			},
			{
				id: 'midterm-3',
				slug: 'midterm-3',
				name: 'Midterm #3',
				category: 'exam',
				inputType: 'points',
				aggregation: 'single',
				weight: 20,
				pointsPossible: 40,
				required: true,
				rules: { notes: 'Scheduled for Apr 22, 2026. Enter as points out of 40.' }
			},
			{
				id: 'final-exam',
				slug: 'final-exam',
				name: 'Final Exam',
				category: 'exam',
				inputType: 'points',
				aggregation: 'single',
				weight: 30,
				pointsPossible: 60,
				required: true,
				rules: { notes: 'Held during finals week. Enter as points out of 60.' }
			}
		]
	},
	{
		name: 'Vision Science III',
		code: 'OPT.5215',
		sourceDocument: 'Hatley VS3 Syllabus 2026.docx',
		description:
			'Straightforward percentage-based course. Enter the Blackboard percentages for Test 1, Test 2, Final Exam, Special Project, and Lab Handouts.',
		institution: 'NSU Oklahoma College of Optometry',
		termLabel: 'Spring 2026',
		status: 'draft',
		rulesetSlug: 'weighted-standard-89-9',
		entries: [
			{
				id: 'test-1',
				slug: 'test-1',
				name: 'Test 1',
				category: 'exam',
				inputType: 'percentage',
				aggregation: 'single',
				weight: 26,
				required: true,
				rules: { notes: 'Enter the Blackboard percentage for Test 1.' }
			},
			{
				id: 'test-2',
				slug: 'test-2',
				name: 'Test 2',
				category: 'exam',
				inputType: 'percentage',
				aggregation: 'single',
				weight: 26,
				required: true,
				rules: { notes: 'Enter the Blackboard percentage for Test 2.' }
			},
			{
				id: 'final-exam',
				slug: 'final-exam',
				name: 'Final Exam',
				category: 'exam',
				inputType: 'percentage',
				aggregation: 'single',
				weight: 30,
				required: true,
				rules: { notes: 'Enter the Blackboard percentage for the Final Exam.' }
			},
			{
				id: 'special-project',
				slug: 'special-project',
				name: 'Special Project',
				category: 'project',
				inputType: 'percentage',
				aggregation: 'single',
				weight: 6,
				required: true,
				rules: { notes: 'Enter the Blackboard percentage for the Special Project.' }
			},
			{
				id: 'lab-handouts',
				slug: 'lab-handouts',
				name: 'Lab Handouts',
				category: 'lab',
				inputType: 'percentage',
				aggregation: 'running_total',
				weight: 12,
				required: true,
				rules: {
					notes: 'Enter the Blackboard percentage for the lab handouts category.'
				}
			}
		]
	},
	{
		name: 'Ophthalmic Optics II',
		code: 'OPT.5223',
		sourceDocument: 'OPT 5223 Syllabus Spring 2026.docx',
		description:
			'Points-based course that mirrors the counted Blackboard source items. Enter the individual homework, lab, project, and exam scores as shown in Blackboard; the calculator drops the lowest homework automatically and leaves out redundant rollup rows like Overall Homework and Total Homework. Recorded Presentations Quiz replaces Homework Set 4 and is included in the counted homework group.',
		institution: 'NSU Oklahoma College of Optometry',
		termLabel: 'Spring 2026',
		status: 'draft',
		rulesetSlug: 'points-standard-92',
		entries: [
			{
				id: 'homework',
				slug: 'homework',
				name: 'Homework',
				category: 'assignment',
				inputType: 'points',
				aggregation: 'set',
				instances: [
					{ id: 'homework-set-1', label: 'Homework Set 1', pointsPossible: 10 },
					{ id: 'homework-set-2', label: 'Homework Set 2', pointsPossible: 10 },
					{ id: 'homework-set-3', label: 'Homework Set 3', pointsPossible: 10 },
					{
						id: 'recorded-presentations-quiz',
						label: 'Recorded Presentations Quiz',
						pointsPossible: 10
					},
					{ id: 'homework-set-5', label: 'Homework Set 5', pointsPossible: 10 },
					{ id: 'homework-set-6', label: 'Homework Set 6', pointsPossible: 10 }
				],
				dropLowestCount: 1,
				required: true,
				rules: {
					notes:
						'Enter the individual homework items from Blackboard, including Recorded Presentations Quiz in place of Homework Set 4. The lowest entered homework is dropped automatically, matching the counted homework total.'
				}
			},
			{
				id: 'group-project',
				slug: 'group-project',
				name: 'Group Project',
				category: 'project',
				inputType: 'points',
				aggregation: 'single',
				pointsPossible: 50,
				required: true,
				rules: {
					notes:
						'Nine groups of three students. Short presentation scheduled for Mar 24 at 5:00 PM.'
				}
			},
			{
				id: 'lab-practicals',
				slug: 'lab-practicals',
				name: 'Lab Practicals',
				category: 'lab',
				inputType: 'points',
				aggregation: 'set',
				instances: [
					{
						id: 'lab-practical-1',
						label: 'Lab Practical 1',
						pointsPossible: 100
					},
					{
						id: 'lab-practical-2',
						label: 'Lab Practical 2',
						pointsPossible: 100
					}
				],
				required: true
			},
			{
				id: 'curves',
				slug: 'curves',
				name: 'Bonus',
				category: 'custom',
				inputType: 'points',
				contributionType: 'bonus',
				aggregation: 'set',
				instances: [
					{ id: 'curve-1', label: 'Curve 1' },
					{ id: 'curve-2', label: 'Curve 2' }
				],
				required: false,
				rules: {
					notes:
						'Enter any Blackboard curve points here. They add to the grade without increasing the denominator.'
				}
			},
			{
				id: 'exams',
				slug: 'exams',
				name: 'Exams',
				category: 'exam',
				inputType: 'points',
				aggregation: 'set',
				instances: [
					{ id: 'exam-1', label: 'Exam 1', pointsPossible: 100 },
					{ id: 'exam-2', label: 'Exam 2', pointsPossible: 100 },
					{ id: 'final-exam', label: 'Final Exam', pointsPossible: 150 }
				],
				required: true,
				rules: { notes: 'Two regular exams and a 150-point final exam.' }
			}
		]
	},
	{
		name: 'Pediatrics',
		code: 'OPT.5233',
		sourceDocument: 'OPT 5233_Pediatrics_Syllabus_SP 2026.pdf',
		description:
			'Points-based course totaling 365 points across participation, presentation, quizzes, tests, and final exam.',
		institution: 'NSU Oklahoma College of Optometry',
		termLabel: 'Spring 2026',
		status: 'draft',
		rulesetSlug: 'points-standard-90',
		entries: [
			{
				id: 'participation',
				slug: 'participation',
				name: 'Participation',
				category: 'participation',
				inputType: 'points',
				aggregation: 'set',
				pointsPossible: 10,
				instances: [
					{ id: 'primitive-reflex-lab', label: 'Primitive Reflex Lab', pointsPossible: 1 },
					{ id: 'lab-2-visual-acuity', label: 'Lab 2: Visual Acuity', pointsPossible: 1 },
					{
						id: 'ovdra-tour-de-optometry-assignment',
						label: 'OVDRA Tour de Optometry Assignment',
						pointsPossible: 1
					},
					{ id: 'lab-3-chair-skills', label: 'Lab 3: Chair Skills', pointsPossible: 1 },
					{
						id: 'lab-4-assessing-refractive-error-and-ocular-health',
						label: 'Lab 4: Assessing Refractive Error and Ocular Health',
						pointsPossible: 1
					},
					{ id: 'lab-5-bv-for-peds', label: 'Lab 5: BV for Peds', pointsPossible: 1 },
					{ id: 'lab-6-baby-lab-day', label: 'Lab 6: Baby Lab Day!', pointsPossible: 1 },
					{
						id: 'lab-7-oral-therapeutics-for-pediatrics',
						label: 'Lab 7: Oral Therapeutics for Pediatrics',
						pointsPossible: 1
					},
					{
						id: 'lab-8-special-needs-autism-class-participation-assignment',
						label: 'Lab 8: Special Needs/Autism Class Participation Assignment',
						pointsPossible: 1
					},
					{
						id: 'lab-9-child-abuse-reflection-assignment',
						label: 'Lab 9: Child Abuse Reflection Assignment',
						pointsPossible: 1
					}
				],
				required: true
			},
			{
				id: 'peds-presentation',
				slug: 'peds-presentation',
				name: 'Peds Presentations',
				category: 'project',
				inputType: 'points',
				aggregation: 'single',
				pointsPossible: 30,
				required: true
			},
			{
				id: 'quizzes',
				slug: 'quizzes',
				name: 'Quizzes',
				category: 'quiz',
				inputType: 'points',
				aggregation: 'set',
				instances: [
					{ id: 'quiz-1', label: 'Quiz 1: Development', pointsPossible: 5 },
					{ id: 'quiz-3', label: 'Quiz 3: Chair Skills', pointsPossible: 5 },
					{ id: 'quiz-5', label: 'Quiz 5: Refractive Conditions', pointsPossible: 5 },
					{
						id: 'quiz-7',
						label: 'Quiz 7: Systemic Disease in Peds',
						pointsPossible: 5,
						note: 'Due Apr 15'
					},
					{
						id: 'quiz-8',
						label: 'Quiz 8: Special Needs/ASD',
						pointsPossible: 5,
						note: 'Due Apr 28'
					}
				],
				required: true
			},
			{
				id: 'test-1',
				slug: 'test-1',
				name: 'Test 1',
				category: 'exam',
				inputType: 'points',
				aggregation: 'single',
				pointsPossible: 100,
				required: true
			},
			{
				id: 'test-2',
				slug: 'test-2',
				name: 'Test 2',
				category: 'exam',
				inputType: 'points',
				aggregation: 'single',
				pointsPossible: 100,
				required: true
			},
			{
				id: 'final-exam',
				slug: 'final-exam',
				name: 'Final Exam',
				category: 'exam',
				inputType: 'points',
				aggregation: 'single',
				pointsPossible: 100,
				required: true
			},
			{
				id: 'extra-credit',
				slug: 'extra-credit',
				name: 'Extra Credit',
				category: 'custom',
				inputType: 'points',
				contributionType: 'bonus',
				aggregation: 'set',
				instances: [
					{
						id: 'five-state-symposium-extra-credit',
						label: '5-State Symposium Extra Credit'
					},
					{
						id: 'bonus-quiz-history-and-visual-acuities',
						label: 'Bonus Quiz: History and Visual Acuities'
					},
					{
						id: 'bonus-quiz-ocular-health-and-cyclo',
						label: 'Bonus Quiz: Ocular Health and Cyclo'
					},
					{
						id: 'bonus-quiz-binocular-vision-for-peds',
						label: 'Bonus Quiz: Binocular Vision for Peds'
					},
					{
						id: 'bonus-quiz-peds-presentations',
						label: 'Bonus Quiz: Peds Presentations'
					},
					{
						id: 'book-reading-extra-credit',
						label: 'Book Reading Extra Credit',
						pointsPossible: 2,
						note: 'Read a book to a baby for 2 extra points.'
					}
				],
				required: false,
				rules: {
					notes:
						'Explicit bonus items from Blackboard that add on top of the standard course total.'
				}
			}
		]
	},
	{
		name: 'Contact Lenses II',
		code: 'OPT.5253',
		sourceDocument: 'Syllabus Spring 2026.docx',
		description:
			'Points-based course totaling 500 points across four exams and fifteen lab items. Instructor may round borderline grades based on attendance and participation.',
		institution: 'NSU Oklahoma College of Optometry',
		termLabel: 'Spring 2026',
		status: 'draft',
		rulesetSlug: 'points-standard-90',
		entries: [
			{
				id: 'labs',
				slug: 'labs',
				name: 'Labs',
				category: 'lab',
				inputType: 'points',
				aggregation: 'set',
				instances: [
					{ id: 'lab-1', label: 'Lab 1', pointsPossible: 5 },
					{ id: 'lab-2', label: 'Lab 2', pointsPossible: 5 },
					{ id: 'lab-3', label: 'Lab 3', pointsPossible: 5 },
					{ id: 'lab-4', label: 'Lab 4', pointsPossible: 5 },
					{ id: 'lab-5', label: 'Lab 5', pointsPossible: 5 },
					{ id: 'lab-6', label: 'Lab 6', pointsPossible: 5 },
					{ id: 'lab-7', label: 'Lab 7', pointsPossible: 5 },
					{ id: 'lab-8', label: 'Lab 8', pointsPossible: 3 },
					{ id: 'lab-9', label: 'Lab 9', pointsPossible: 10 },
					{
						id: 'lab-12',
						label: 'Lab 12 - Verification Practical',
						pointsPossible: 26
					},
					{ id: 'lab-13', label: 'Lab 13', pointsPossible: 3, note: 'Due Apr 14' },
					{ id: 'lab-14', label: 'Lab 14', pointsPossible: 3, note: 'Due Apr 21' },
					{
						id: 'lab-15',
						label: 'Lab 15 - Case Presentations',
						pointsPossible: 20,
						note: 'Due Apr 28'
					}
				],
				required: true,
				rules: {
					notes:
						'Thirteen counted lab items totaling 100 points. Practice labs 10 and 11 are excluded because they do not affect the course grade.'
				}
			},
			{
				id: 'exam-i',
				slug: 'exam-i',
				name: 'Exam I',
				category: 'exam',
				inputType: 'points',
				aggregation: 'single',
				pointsPossible: 100,
				required: true,
				rules: { notes: 'Scheduled for Feb 15, 2026.' }
			},
			{
				id: 'exam-ii',
				slug: 'exam-ii',
				name: 'Exam II',
				category: 'exam',
				inputType: 'points',
				aggregation: 'single',
				pointsPossible: 100,
				required: true,
				rules: { notes: 'Scheduled for Mar 11, 2026.' }
			},
			{
				id: 'exam-iii',
				slug: 'exam-iii',
				name: 'Exam III',
				category: 'exam',
				inputType: 'points',
				aggregation: 'single',
				pointsPossible: 100,
				required: true,
				rules: { notes: 'Scheduled for Apr 15, 2026.' }
			},
			{
				id: 'final-exam',
				slug: 'final-exam',
				name: 'Final Exam',
				category: 'exam',
				inputType: 'points',
				aggregation: 'single',
				pointsPossible: 100,
				required: true,
				rules: { notes: 'Held during finals week, May 4-8.' }
			}
		]
	},
	{
		name: 'Ocular Disease II: Glaucoma and Uveitis',
		code: 'OPT.6023',
		sourceDocument: 'Glaucoma Syllabus26.pdf',
		description:
			'Points-based course that follows the Blackboard total row for posted items. The current Blackboard total is built from Quizzes 1-4, Tests 1-2, plus Clinical Skills Bonus as numerator-only extra credit. Test 3 is estimated at 67 points and the Final Exam at 100 points based on the syllabus until Blackboard posts the exact values.',
		institution: 'NSU Oklahoma College of Optometry',
		termLabel: 'Spring 2026',
		status: 'draft',
		rulesetSlug: 'points-standard-90',
		entries: [
			{
				id: 'tests',
				slug: 'tests',
				name: 'Tests',
				category: 'exam',
				inputType: 'points',
				aggregation: 'set',
				instances: [
					{ id: 'test-1', label: 'Test 1 - Feb 20', pointsPossible: 60 },
					{ id: 'test-2', label: 'Test 2 - Apr 3', pointsPossible: 67 },
					{
						id: 'test-3',
						label: 'Test 3 - Apr 24',
						pointsPossible: 67,
						note: 'Estimated from the syllabus and prior test point values until Blackboard posts the exact total.'
					}
				],
				required: true,
				rules: {
					notes:
						'Tests 1 and 2 use posted Blackboard point values. Test 3 is currently estimated at 67 points.'
				}
			},
			{
				id: 'quizzes',
				slug: 'quizzes',
				name: 'Quizzes',
				category: 'quiz',
				inputType: 'points',
				aggregation: 'set',
				instances: [
					{ id: 'quiz-1', label: 'Quiz 1 - Jan 26', pointsPossible: 15 },
					{ id: 'quiz-2', label: 'Quiz 2 - Feb 9', pointsPossible: 21 },
					{ id: 'quiz-3', label: 'Quiz 3 - Mar 2', pointsPossible: 17 },
					{
						id: 'quiz-4',
						label: 'Quiz 4 - Apr 13',
						pointsPossible: 14
					}
				],
				required: true,
				rules: {
					notes:
						'These quiz point totals are taken directly from Blackboard so the current total matches the posted grade.'
				}
			},
			{
				id: 'final-exam',
				slug: 'final-exam',
				name: 'Final Exam',
				category: 'exam',
				inputType: 'points',
				aggregation: 'single',
				pointsPossible: 100,
				required: true,
				rules: {
					notes:
						'Estimated at 100 points from the syllabus until Blackboard posts the exact final exam denominator.'
				}
			},
			{
				id: 'clinical-skills-bonus',
				slug: 'clinical-skills-bonus',
				name: 'Clinical Skills Bonus',
				category: 'custom',
				inputType: 'points',
				contributionType: 'bonus',
				aggregation: 'single',
				required: false,
				rules: { notes: 'Extra credit clinical skills component noted in the gradebook.' }
			}
		]
	},
	{
		name: 'Research Methodology',
		code: 'OPT.6111',
		sourceDocument: 'OPT 6111_Research Methodology_Syllabus_SP 2026.pdf',
		description:
			'Weighted course split between lectures/assignments and guest lecture attendance/participation.',
		institution: 'NSU Oklahoma College of Optometry',
		termLabel: 'Spring 2026',
		status: 'draft',
		rulesetSlug: 'weighted-standard-90',
		entries: [
			{
				id: 'lectures-assignments',
				slug: 'lectures-assignments',
				name: 'Lectures & Assignments',
				category: 'assignment',
				inputType: 'percentage',
				aggregation: 'set',
				weight: 75,
				instances: [
					{ id: 'assignment-1', label: 'Assignment 1 - In-Class Lecture', pointsPossible: 5 },
					{
						id: 'assignment-2',
						label: 'Assignment 2 - Participate in Research',
						pointsPossible: 15
					},
					{ id: 'assignment-3', label: 'Assignment 3 - Journal Impact Factor', pointsPossible: 5 },
					{ id: 'assignment-4', label: 'Assignment 4 - NLM Abbreviations', pointsPossible: 5 },
					{ id: 'assignment-5', label: 'Assignment 5 - Journal Abstracts', pointsPossible: 10 },
					{ id: 'assignment-6', label: 'Assignment 6 - Research Topics', pointsPossible: 10 },
					{ id: 'assignment-7', label: 'Assignment 7 - Your Research', pointsPossible: 5 },
					{ id: 'assignment-8', label: 'Assignment 8 - Citation', pointsPossible: 5 },
					{
						id: 'assignment-9',
						label: 'Assignment 9 - Introductions',
						note: 'Points not shown in raw data.'
					},
					{ id: 'assignment-10', label: "Assignment 10 - Dr. Bradley's Advice", pointsPossible: 5 },
					{ id: 'observational-study-quiz', label: 'Observational Study Quiz', pointsPossible: 5 },
					{
						id: 'assignment-11',
						label: 'Assignment 11 - Grade an Introduction',
						pointsPossible: 5
					},
					{
						id: 'assignment-12',
						label: 'Assignment 12 - Descriptive Statistics',
						pointsPossible: 5
					},
					{
						id: 'assignment-13',
						label: 'Assignment 13 - t-test and ANOVA',
						note: 'Points not shown in raw data.'
					},
					{
						id: 'assignment-14',
						label: 'Assignment 14 - Bland-Altman, Rho, Chi-square',
						note: 'Points not shown in raw data; due Apr 29.'
					}
				],
				required: true
			},
			{
				id: 'guest-lecture-attendance-participation',
				slug: 'guest-lecture-attendance-participation',
				name: 'Guest Lecture Attendance / Participation',
				category: 'attendance',
				inputType: 'percentage',
				aggregation: 'running_total',
				weight: 25,
				required: true
			}
		]
	}
];

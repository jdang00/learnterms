import type { Course } from './models';

// ——— Vision Science I ———
const visionScienceI: Course = {
	id: crypto.randomUUID(),
	name: 'Vision Science I',
	gradingMethod: 'percent', // Based on syllabus percentages
	categories: [
		{
			id: crypto.randomUUID(),
			name: 'Exams',
			weightType: 'percent',
			weightValue: 60,
			assessments: [
				{ id: crypto.randomUUID(), score: null, total: 100 }, // Test 1
				{ id: crypto.randomUUID(), score: null, total: 100 }, // Test 2
				{ id: crypto.randomUUID(), score: null, total: 100 } // Test 3
			]
		},
		{
			id: crypto.randomUUID(),
			name: 'Final',
			weightType: 'percent',
			weightValue: 40,
			assessments: [
				{ id: crypto.randomUUID(), score: null, total: 200 } // Final Exam (Upcoming)
				// Note: Syllabus mentions weight shift if exams are missed.
				// This dynamic logic must be handled by the calculator.
			]
		}
	],
	gradingScale: [
		// Default scale, as none specified in syllabus image
		{ letter: 'A', min: 89.5 },
		{ letter: 'B', min: 79.5 },
		{ letter: 'C', min: 69.5 },
		{ letter: 'F', min: 0 }
	]
};

// --- Existing Courses ---

// ——— Ocular Anatomy ———
const ocularAnatomy: Course = {
	id: crypto.randomUUID(),
	name: 'Ocular Anatomy',
	gradingMethod: 'percent',
	categories: [
		{
			id: crypto.randomUUID(),
			name: 'Lecture Exams',
			weightType: 'percent',
			weightValue: 30,
			assessments: [
				{ id: crypto.randomUUID(), score: null, total: 47 },
				{ id: crypto.randomUUID(), score: null, total: 44 }
			]
		},
		{
			id: crypto.randomUUID(),
			name: 'Lab Exams',
			weightType: 'percent',
			weightValue: 30,
			assessments: [
				{ id: crypto.randomUUID(), score: null, total: 50 },
				{ id: crypto.randomUUID(), score: null, total: 50 }
			]
		},
		{
			id: crypto.randomUUID(),
			name: 'Quizzes',
			weightType: 'percent',
			weightValue: 20,
			assessments: [
				{ id: crypto.randomUUID(), score: null, total: 10 },
				{ id: crypto.randomUUID(), score: null, total: 15 },
				{ id: crypto.randomUUID(), score: null, total: 10 },
				{ id: crypto.randomUUID(), score: null, total: 18 },
				{ id: crypto.randomUUID(), score: null, total: 14 },
				{ id: crypto.randomUUID(), score: null, total: 17 }
			]
		},
		{
			id: crypto.randomUUID(),
			name: 'Final Exam',
			weightType: 'percent',
			weightValue: 20,
			assessments: [{ id: crypto.randomUUID(), score: null, total: 100 }]
		}
	],
	gradingScale: [
		{ letter: 'A', min: 89.5 },
		{ letter: 'B', min: 79.5 },
		{ letter: 'C', min: 69.5 },
		{ letter: 'F', min: 0 }
	]
};

// ——— General Pathology ———
const generalPathology: Course = {
	id: crypto.randomUUID(),
	name: 'General Pathology',
	gradingMethod: 'percent',
	categories: [
		{
			id: crypto.randomUUID(),
			name: 'Tests',
			weightType: 'percent',
			weightValue: 60,
			assessments: [
				{ id: crypto.randomUUID(), score: null, total: 52 },
				{ id: crypto.randomUUID(), score: null, total: 46 },
				{ id: crypto.randomUUID(), score: null, total: 52 }
			]
		},
		{
			id: crypto.randomUUID(),
			name: 'Written Assignment',
			weightType: 'percent',
			weightValue: 10,
			assessments: [{ id: crypto.randomUUID(), score: null, total: 100 }]
		},
		{
			id: crypto.randomUUID(),
			name: 'Final Exam',
			weightType: 'percent',
			weightValue: 30,
			assessments: [{ id: crypto.randomUUID(), score: null, total: 50 }]
		}
	],
	gradingScale: [
		{ letter: 'A', min: 89.5 },
		{ letter: 'B', min: 79.5 },
		{ letter: 'C', min: 69.5 },
		{ letter: 'F', min: 0 }
	]
};

// ——— Pharmacology ———
const pharmacology: Course = {
	id: crypto.randomUUID(),
	name: 'Pharmacology',
	gradingMethod: 'points',
	categories: [
		{
			id: crypto.randomUUID(),
			name: 'Quizzes',
			weightType: 'points',
			weightValue: 173, // ← updated total possible

			assessments: [
				{ id: crypto.randomUUID(), score: null, total: 17 }, // Quiz 1
				{ id: crypto.randomUUID(), score: null, total: 18 }, // Quiz 2
				{ id: crypto.randomUUID(), score: null, total: 21 }, // Quiz 3
				{ id: crypto.randomUUID(), score: null, total: 18 }, // Quiz 4
				{ id: crypto.randomUUID(), score: null, total: 13 }, // Quiz 5
				{ id: crypto.randomUUID(), score: null, total: 15 }, // Quiz 6
				{ id: crypto.randomUUID(), score: null, total: 19 }, // Quiz 7
				{ id: crypto.randomUUID(), score: null, total: 15 }, // Quiz 8
				{ id: crypto.randomUUID(), score: null, total: 24 }, // Quiz 9
				{ id: crypto.randomUUID(), score: null, total: 18 } // Quiz 10
			]
		}
		// …other categories…
	],
	gradingScale: [
		// 173 total possible → 89.5% of 173 ≈ 155; 79.5% ≈ 138; 69.5% ≈ 120
		{ letter: 'A', min: 155 },
		{ letter: 'B', min: 138 },
		{ letter: 'C', min: 120 },
		{ letter: 'F', min: 0 }
	]
};

// ——— Human Nervous System ———
const humanNervousSystem: Course = {
	id: crypto.randomUUID(),
	name: 'Human Nervous System',
	gradingMethod: 'points',
	categories: [
		{
			id: crypto.randomUUID(),
			name: 'Quizzes/Assignments',
			weightType: 'points',
			weightValue: 80,
			assessments: [
				{ id: crypto.randomUUID(), score: null, total: 10 },
				{ id: crypto.randomUUID(), score: null, total: 10 },
				{ id: crypto.randomUUID(), score: null, total: 20 },
				{ id: crypto.randomUUID(), score: null, total: 10 },
				{ id: crypto.randomUUID(), score: null, total: 10 }
			]
		},
		{
			id: crypto.randomUUID(),
			name: 'Exams',
			weightType: 'points',
			weightValue: 300,
			assessments: [
				{ id: crypto.randomUUID(), score: null, total: 100 },
				{ id: crypto.randomUUID(), score: null, total: 100 },
				{ id: crypto.randomUUID(), score: null, total: 100 }
			]
		},
		{
			id: crypto.randomUUID(),
			name: 'Final exam',
			weightType: 'points',
			weightValue: 200,
			assessments: [{ id: crypto.randomUUID(), score: null, total: 200 }]
		}
	],
	gradingScale: [
		{ letter: 'A', min: 520 },
		{ letter: 'B', min: 462 },
		{ letter: 'C', min: 404 },
		{ letter: 'F', min: 0 }
	]
};

// ——— Clinical Methods II ———
const clinicalMethodsII: Course = {
	id: crypto.randomUUID(),
	name: 'Clinical Methods II',
	gradingMethod: 'points',
	categories: [
		{
			id: crypto.randomUUID(),
			name: 'Quizzes',
			weightType: 'points',
			weightValue: 15,
			assessments: [{ id: crypto.randomUUID(), score: null, total: 15 }]
		},
		{
			id: crypto.randomUUID(),
			name: 'Class and Lab Assignments',
			weightType: 'points',
			weightValue: 70,
			assessments: [
				{ id: crypto.randomUUID(), score: null, total: 15 },
				{ id: crypto.randomUUID(), score: null, total: 9 },
				{ id: crypto.randomUUID(), score: null, total: 16 },
				{ id: crypto.randomUUID(), score: null, total: 20 },
				{ id: crypto.randomUUID(), score: null, total: 5 },
				{ id: crypto.randomUUID(), score: null, total: 5 }
			]
		},
		{
			id: crypto.randomUUID(),
			name: 'Proficiency Exam',
			weightType: 'points',
			weightValue: 65,
			assessments: [{ id: crypto.randomUUID(), score: null, total: 65 }]
		},
		{
			id: crypto.randomUUID(),
			name: 'Midterms',
			weightType: 'points',
			weightValue: 200,
			assessments: [
				{ id: crypto.randomUUID(), score: null, total: 100 },
				{ id: crypto.randomUUID(), score: null, total: 100 }
			]
		},
		{
			id: crypto.randomUUID(),
			name: 'Final Examination',
			weightType: 'points',
			weightValue: 100,
			assessments: [{ id: crypto.randomUUID(), score: null, total: 100 }]
		}
	],
	gradingScale: [
		{ letter: 'A', min: 414 },
		{ letter: 'B', min: 378 },
		{ letter: 'C', min: 337.5 },
		{ letter: 'F', min: 0 }
	]
};

// ——— Interpersonal Communications ———
const interpersonalCommunications: Course = {
	id: crypto.randomUUID(),
	name: 'Interpersonal Communications',
	gradingMethod: 'points',
	categories: [
		{
			id: crypto.randomUUID(),
			name: 'Assignments',
			weightType: 'points',
			weightValue: 100,
			assessments: [
				{ id: crypto.randomUUID(), score: null, total: 10 },
				{ id: crypto.randomUUID(), score: null, total: 10 },
				{ id: crypto.randomUUID(), score: null, total: 10 },
				{ id: crypto.randomUUID(), score: null, total: 10 },
				{ id: crypto.randomUUID(), score: null, total: 10 },
				{ id: crypto.randomUUID(), score: null, total: 10 },
				{ id: crypto.randomUUID(), score: null, total: 10 },
				{ id: crypto.randomUUID(), score: null, total: 10 },
				{ id: crypto.randomUUID(), score: null, total: 10 },
				{ id: crypto.randomUUID(), score: null, total: 10 }
			]
		},
		{
			id: crypto.randomUUID(),
			name: 'Midterm Exam',
			weightType: 'points',
			weightValue: 100,
			assessments: [{ id: crypto.randomUUID(), score: null, total: 100 }]
		},
		{
			id: crypto.randomUUID(),
			name: 'Final Exam',
			weightType: 'points',
			weightValue: 150,
			assessments: [{ id: crypto.randomUUID(), score: null, total: 150 }]
		}
	],
	gradingScale: [
		{ letter: 'A', min: 315 },
		{ letter: 'B', min: 280 },
		{ letter: 'C', min: 245 },
		{ letter: 'F', min: 0 }
	]
};

// --- Export ---
// import { $state } from '@sveltejs/magic'; // If needed

export const courses = $state<Course[]>([
	ocularAnatomy,
	generalPathology,
	pharmacology,
	humanNervousSystem,
	clinicalMethodsII,
	interpersonalCommunications,
	visionScienceI // Add the new course here
]);

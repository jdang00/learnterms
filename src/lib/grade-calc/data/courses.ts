import type { Course } from '../types';

export const courses: Course[] = [
	{
		id: 'opt5113',
		code: 'OPT 5113',
		name: 'Binocular and Refractive Anomalies',
		instructor: 'Dr. Alissa Proctor',
		calculationType: 'points',
		totalPoints: 240,
		gradingScale: {
			A: { min: 90.0, label: '90-100% (216-240 pts)' },
			B: { min: 80.0, label: '80-89.99% (192-215 pts)' },
			C: { min: 70.0, label: '70-79.99% (168-191 pts)' },
			F: { min: 0, label: 'Below 70% (<168 pts)' }
		},
		components: [
			{
				id: 'friday-challenges',
				name: 'Friday Challenges',
				type: 'group',
				instanceCount: 5,
				pointsPerInstance: 2,
				dropLowest: 0,
				instances: Array.from({ length: 5 }, () => ({
					maxPoints: 2,
					earnedPoints: null
				}))
			},
			{
				id: 'exit-tickets',
				name: 'Exit Tickets',
				type: 'group',
				instanceCount: 5,
				pointsPerInstance: 2,
				dropLowest: 0,
				instances: Array.from({ length: 5 }, () => ({
					maxPoints: 2,
					earnedPoints: null
				}))
			},
			{
				id: 'quizzes',
				name: 'Quizzes',
				type: 'group',
				instanceCount: 3,
				pointsPerInstance: 20,
				dropLowest: 0,
				instances: Array.from({ length: 3 }, () => ({
					maxPoints: 20,
					earnedPoints: null
				}))
			},
			{
				id: 'test1',
				name: 'Test 1',
				type: 'single',
				maxPoints: 50
			},
			{
				id: 'test2',
				name: 'Test 2',
				type: 'single',
				maxPoints: 50
			},
			{
				id: 'final-exam',
				name: 'Final Exam',
				type: 'single',
				maxPoints: 60
			}
		]
	},
	{
		id: 'opt5153',
		code: 'OPT 5153',
		name: 'Contact Lenses I',
		instructor: 'Dr. Latricia Pack',
		calculationType: 'points',
		totalPoints: 415,
		gradingScale: {
		  A: { min: 90.00, label: '90-100% (373.5-415 pts)' },
		  B: { min: 80.00, label: '80-89.99% (332-373.49 pts)' },
		  C: { min: 70.00, label: '70-79.99% (290.5-331.99 pts)' },
		  F: { min: 0, label: 'Below 70% (<290.5 pts)' }
		},
		components: [
		  {
			id: 'tomography-project',
			name: 'Tomography Project',
			type: 'single',
			maxPoints: 15
		  },
		  {
			id: 'exam1',
			name: 'Exam I',
			type: 'single',
			maxPoints: 100
		  },
		  {
			id: 'exam2',
			name: 'Exam II',
			type: 'single',
			maxPoints: 100
		  },
		  {
			id: 'exam3',
			name: 'Exam III',
			type: 'single',
			maxPoints: 100
		  },
		  {
			id: 'final-exam',
			name: 'Final Exam',
			type: 'single',
			maxPoints: 100
		  }
		]
	  },
	{
		id: 'opt5164',
		code: 'OPT 5164',
		name: 'Ophthalmic Optics I',
		instructor: 'Dr. Alan McKee',
		calculationType: 'points',
		totalPoints: 885,
		gradingScale: {
			A: { min: 92.0, label: '≥92% (815-885 pts)' },
			B: { min: 84.0, label: '84-91.99% (744-814 pts)' },
			C: { min: 76.0, label: '76-83.99% (673-743 pts)' },
			F: { min: 0, label: '<76% (<673 pts)' }
		},
		components: [
			{
				id: 'reading-quizzes',
				name: 'Reading Quizzes',
				type: 'group',
				instanceCount: 6,
				pointsPerInstance: 10,
				dropLowest: 1,
				instances: Array.from({ length: 6 }, () => ({
					maxPoints: 10,
					earnedPoints: null
				}))
			},
			{
				id: 'homework',
				name: 'Homework Assignments',
				type: 'group',
				instanceCount: 7,
				pointsPerInstance: 10,
				dropLowest: 1,
				instances: Array.from({ length: 7 }, () => ({
					maxPoints: 10,
					earnedPoints: null
				}))
			},
			{
				id: 'discussion-posts',
				name: 'BlackBoard Discussion Posts',
				type: 'group',
				instanceCount: 2,
				pointsPerInstance: 25,
				dropLowest: 0,
				instances: Array.from({ length: 2 }, () => ({
					maxPoints: 25,
					earnedPoints: null
				}))
			},
			{
				id: 'discussion-replies',
				name: 'BlackBoard Discussion Replies',
				type: 'group',
				instanceCount: 5,
				pointsPerInstance: 5,
				dropLowest: 0,
				instances: Array.from({ length: 5 }, () => ({
					maxPoints: 5,
					earnedPoints: null
				}))
			},
			{
				id: 'lab-prof-1',
				name: 'Lab Proficiency Exam 1',
				type: 'single',
				maxPoints: 100
			},
			{
				id: 'lab-prof-2',
				name: 'Lab Proficiency Exam 2',
				type: 'single',
				maxPoints: 100
			},
			{
				id: 'exam1',
				name: 'Class Exam 1',
				type: 'single',
				maxPoints: 100
			},
			{
				id: 'exam2',
				name: 'Class Exam 2',
				type: 'single',
				maxPoints: 100
			},
			{
				id: 'exam3',
				name: 'Class Exam 3',
				type: 'single',
				maxPoints: 100
			},
			{
				id: 'final-exam',
				name: 'Final Exam',
				type: 'single',
				maxPoints: 200
			}
		]
	},
	{
		id: 'opt5183',
		code: 'OPT 5183',
		name: 'Optometric Clinical Methods III',
		instructor: 'Dr. Alissa Proctor',
		calculationType: 'points',
		totalPoints: 522,
		gradingScale: {
			A: { min: 92.0, label: '≥92% (480.24-522 pts)' },
			B: { min: 82.0, label: '82-91.99% (428.04-480.23 pts)' },
			C: { min: 72.0, label: '72-81.99% (375.84-428.03 pts)' },
			F: { min: 0, label: '<72% (<375.83 pts)' }
		},
		components: [
			{
				id: 'lab-assignments',
				name: 'In-lab Assignments',
				type: 'single',
				maxPoints: 10
			},
			{
				id: 'participation',
				name: 'Participation Points',
				type: 'single',
				maxPoints: 12
			},
			{
				id: 'midterm-lab-prof',
				name: 'Mid-term Lab Proficiency Exam',
				type: 'single',
				maxPoints: 50
			},
			{
				id: 'final-lab-prof',
				name: 'Final Lab Proficiency Exam',
				type: 'single',
				maxPoints: 100
			},
			{
				id: 'test1',
				name: 'Test 1',
				type: 'single',
				maxPoints: 100
			},
			{
				id: 'test2',
				name: 'Test 2',
				type: 'single',
				maxPoints: 100
			},
			{
				id: 'final-exam',
				name: 'Final Exam (cumulative)',
				type: 'single',
				maxPoints: 150
			}
		]
	},
	{
		id: 'opt5134',
		code: 'OPT 5134',
		name: 'Vision Science II: Sensory Aspects',
		instructor: 'Dr. Janzen',
		calculationType: 'percentage',
		gradingScale: {
			A: { min: 90.0, label: '90-100%' },
			B: { min: 80.0, label: '80-89.99%' },
			C: { min: 70.0, label: '70-79.99%' },
			F: { min: 0, label: 'Below 70%' }
		},
		components: [
			{
				id: 'quizzes',
				name: 'Weekly Quizzes',
				type: 'group',
				weight: 24,
				instanceCount: 8,
				dropLowest: 0,
				instances: Array.from({ length: 8 }, () => ({
					maxScore: 100,
					earnedScore: null
				})),
				replacementRule: {
					enabled: true,
					sourceComponentId: 'final-exam',
					maxReplacements: 2,
					condition: 'if_higher'
				}
			},
			{
				id: 'midterm',
				name: 'Midterm',
				type: 'single',
				weight: 24,
				maxScore: 100
			},
			{
				id: 'final-exam',
				name: 'Final Exam',
				type: 'single',
				weight: 29,
				maxScore: 100,
				bonusRule: {
					enabled: true,
					condition: 'source_average_exceeds_this',
					sourceComponentIds: ['quizzes'],
					maxBonus: 3,
					calculationMethod: 'difference'
				}
			},
			{
				id: 'special-project',
				name: 'Special Project',
				type: 'single',
				weight: 8,
				maxScore: 100
			},
			{
				id: 'labs',
				name: 'Labs (Attendance)',
				type: 'attendance',
				weight: 15,
				sessionsTotal: 15
			}
		]
	},
	{
		id: 'opt5273',
		code: 'OPT 5273',
		name: 'Ocular Disease I: Cataracts, Corneal and External',
		instructor: 'Dr. Nate Lighthizer & Dr. Aubry Tackett',
		calculationType: 'percentage',
		gradingScale: {
			A: { min: 91.0, label: '91-100%' },
			B: { min: 82.0, label: '82-90.99%' },
			C: { min: 75.0, label: '75-81.99%' },
			F: { min: 0, label: 'Below 75%' }
		},
		components: [
			{
				id: 'exam1',
				name: 'Exam 1',
				type: 'single',
				weight: 25,
				maxScore: 100
			},
			{
				id: 'exam2',
				name: 'Exam 2',
				type: 'single',
				weight: 25,
				maxScore: 100
			},
			{
				id: 'exam3',
				name: 'Exam 3',
				type: 'single',
				weight: 25,
				maxScore: 100
			},
			{
				id: 'final-exam',
				name: 'Cumulative Final',
				type: 'single',
				weight: 25,
				maxScore: 100
			}
		]
	}
];



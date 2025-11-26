import { browser } from '$app/environment';
import { courses } from '../data/courses';
import type { Course, CourseInputs, GroupInput, SingleInput, AttendanceInput } from '../types';
import { calculatePointsBasedGrade, getLetterGrade } from '../utils/points';
import { calculatePercentageBasedGrade } from '../utils/percentage';

type PersistShape = {
	selectedCourseId: string;
	userInputsByCourse: Record<string, CourseInputs>;
};

const PERSIST_KEY = 'lt_gradecalc_v1';

class GradeStore {
	selectedCourseId: string = $state('opt5113');
	userInputsByCourse: Record<string, CourseInputs> = $state({});

	constructor() {
		this.#load();
		this.#ensureInputsFor(this.selectedCourseId);
	}

	get selectedCourse(): Course {
		return courses.find((c) => c.id === this.selectedCourseId) as Course;
	}

	get userInputs(): CourseInputs {
		return this.userInputsByCourse[this.selectedCourseId] ?? {};
	}

	get calculatedGrade() {
		const course = this.selectedCourse;
		if (course.calculationType === 'points') {
			const basic = calculatePointsBasedGrade(course, this.userInputs);
			const letter = getLetterGrade(basic.percentage, course);
			return {
				...basic,
				letterGrade: letter
			};
		}
		const basic = calculatePercentageBasedGrade(course, this.userInputs);
		const letter = getLetterGrade(basic.percentage, course);
		return {
			...basic,
			letterGrade: letter
		};
	}

	selectCourse(courseId: string) {
		this.selectedCourseId = courseId;
		this.#ensureInputsFor(courseId);
		this.#save();
	}

	updateSingle(componentId: string, value: number | null) {
		this.#ensureInputsFor(this.selectedCourseId);
		const inputs = this.userInputsByCourse[this.selectedCourseId];
		const current = (inputs[componentId] as SingleInput) ?? { earnedPoints: null, earnedScore: null };
		if (this.selectedCourse.calculationType === 'points') {
			inputs[componentId] = { ...current, earnedPoints: value };
		} else {
			inputs[componentId] = { ...current, earnedScore: value ?? null };
		}
		this.#save();
	}

	updateGroupInstance(componentId: string, index: number, value: number | null) {
		this.#ensureInputsFor(this.selectedCourseId);
		const inputs = this.userInputsByCourse[this.selectedCourseId];
		const group = (inputs[componentId] as GroupInput) ?? { instances: [] };
		const size = this.#getGroupSize(componentId);
		if (!group.instances || group.instances.length !== size) {
			group.instances = Array.from({ length: size }, () => ({ earnedPoints: null, earnedScore: null }));
		}
		const existing = group.instances[index] ?? { earnedPoints: null, earnedScore: null };
		if (this.selectedCourse.calculationType === 'points') {
			group.instances[index] = { ...existing, earnedPoints: value };
		} else {
			group.instances[index] = { ...existing, earnedScore: value ?? null };
		}
		inputs[componentId] = group;
		this.#save();
	}

	updateAttendance(componentId: string, sessionsAttended: number | null) {
		this.#ensureInputsFor(this.selectedCourseId);
		const inputs = this.userInputsByCourse[this.selectedCourseId];
		inputs[componentId] = { sessionsAttended };
		this.#save();
	}

	clearCurrentCourse() {
		const course = this.selectedCourse;
		this.userInputsByCourse[course.id] = this.#buildInitialInputs(course);
		this.#save();
	}

	clearAllCourses() {
		const next: Record<string, CourseInputs> = {};
		for (const c of courses) {
			next[c.id] = this.#buildInitialInputs(c);
		}
		this.userInputsByCourse = next;
		this.#save();
	}

	#getGroupSize(componentId: string) {
		const comp = this.selectedCourse.components.find((c) => c.id === componentId);
		const count = comp?.instanceCount ?? comp?.instances?.length ?? 0;
		return count;
	}

	#buildInitialInputs(course: Course): CourseInputs {
		const inputs: CourseInputs = {};
		for (const component of course.components) {
			if (component.type === 'group') {
				const count = component.instanceCount ?? component.instances?.length ?? 0;
				const groupInput: GroupInput = {
					instances: Array.from({ length: count }, () => ({
						earnedPoints: null,
						earnedScore: null
					}))
				};
				inputs[component.id] = groupInput;
			} else if (component.type === 'attendance') {
				const attendanceInput: AttendanceInput = { sessionsAttended: null };
				inputs[component.id] = attendanceInput;
			} else {
				const singleInput: SingleInput = { earnedPoints: null, earnedScore: null };
				inputs[component.id] = singleInput;
			}
		}
		return inputs;
	}

	#ensureInputsFor(courseId: string) {
		if (!this.userInputsByCourse[courseId]) {
			const course = courses.find((c) => c.id === courseId) as Course;
			this.userInputsByCourse[courseId] = this.#buildInitialInputs(course);
		}
	}

	#save() {
		if (!browser) return;
		const payload: PersistShape = {
			selectedCourseId: this.selectedCourseId,
			userInputsByCourse: this.userInputsByCourse
		};
		try {
			localStorage.setItem(PERSIST_KEY, JSON.stringify(payload));
		} catch {
			// ignore
		}
	}

	#load() {
		if (!browser) return;
		try {
			const raw = localStorage.getItem(PERSIST_KEY);
			if (!raw) return;
			const parsed = JSON.parse(raw) as PersistShape;
			if (parsed?.selectedCourseId) this.selectedCourseId = parsed.selectedCourseId;
			if (parsed?.userInputsByCourse) this.userInputsByCourse = parsed.userInputsByCourse;
		} catch {
			// ignore
		}
	}
}

export const gradeStore = new GradeStore();



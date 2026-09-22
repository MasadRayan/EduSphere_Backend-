import type { IQuery } from "../../interfaces";

export interface ICreateCourseSectionPayload {
	courseId: string;
	semesterId: string;
	sectionCode: string;
	instructorId?: string | null;
	capacity: number;
	schedule?: string;
	courseFee?: number;
}

export interface IUpdateCourseSectionPayload {
	sectionCode?: string;
	instructorId?: string | null;
	capacity?: number;
	schedule?: string;
}

export interface IAssignInstructorPayload {
	instructorId: string;
}

export interface ICourseSectionQuery extends IQuery {
	courseId?: string;
	semesterId?: string;
	instructorId?: string;
}

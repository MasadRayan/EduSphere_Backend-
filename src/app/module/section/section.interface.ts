import type { IQuery } from "../../interfaces";

export interface ICreateSectionPayload {
	courseId: string;
	semesterId: string;
	sectionCode: string;
	instructorId?: string | null;
	capacity: number;
	schedule?: string;
}

export interface IUpdateSectionPayload {
	sectionCode?: string;
	instructorId?: string | null;
	capacity?: number;
	schedule?: string;
}

export interface IAssignInstructorPayload {
	instructorId: string;
}

export interface ISectionQuery extends IQuery {
	courseId?: string;
	semesterId?: string;
	instructorId?: string;
}

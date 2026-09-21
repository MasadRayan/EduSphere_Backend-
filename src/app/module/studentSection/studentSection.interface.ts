import type { IQuery } from "../../interfaces";

export interface ICreateStudentSectionPayload {
	sectionCode: string;
	programId: string;
	enrollmentYear: number;
	capacity: number;
}

export interface IUpdateStudentSectionPayload {
	sectionCode?: string;
	capacity?: number;
}

export interface IStudentSectionQuery extends IQuery {
	programId?: string;
	enrollmentYear?: string;
}

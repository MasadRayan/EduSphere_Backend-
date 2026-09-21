import type { IQuery } from "../../interfaces";

export interface ICreateCoursePayload {
	code: string;
	title: string;
	creditHours: number;
	departmentId: string;
	prerequisiteIds?: string[];
}

export interface IUpdateCoursePayload {
	code?: string;
	title?: string;
	creditHours?: number;
	departmentId?: string;
	prerequisiteIds?: string[];
}

export interface ICourseQuery extends IQuery {
	departmentId?: string;
}
